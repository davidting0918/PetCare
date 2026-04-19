import Foundation

/// Centralized data store — holds all domain data in memory,
/// backed by CacheManager for persistence across app launches.
/// Views read from here (instant), background refresh keeps data fresh.
@Observable
final class DataStore {
    // MARK: - Domain data

    var pets: [PetInfo] = []
    var selectedPet: PetInfo?
    var selectedPetDetails: PetDetails?
    var groups: [PetGroup] = []
    var foods: [Food] = []
    var foodDetailsCache: [String: Food] = [:]  // foodId → full Food with nutrition
    var meals: [Meal] = []
    var todaySummary: TodaySummary?
    var weightRecords: [WeightRecord] = []
    var weightTotal: Int = 0
    var medications: [Medication] = []
    var courses: [TreatmentCourse] = []
    var todaySchedule: TodaySchedule?

    var isPreloading = false

    // MARK: - Computed

    var currentPetId: String? { selectedPet?.id }
    var currentGroupId: String? { selectedPet?.groupId }

    var averageWeight: Double? {
        guard !weightRecords.isEmpty else { return nil }
        return weightRecords.map(\.weightKg).reduce(0, +) / Double(weightRecords.count)
    }

    var weightChange: Double? {
        guard weightRecords.count >= 2, let first = weightRecords.last, let last = weightRecords.first else { return nil }
        return last.weightKg - first.weightKg
    }

    // MARK: - Load from cache (synchronous, called on app launch)

    func loadFromCache() {
        pets = CacheManager.load([PetInfo].self, forKey: CacheManager.petsKey()) ?? []
        groups = CacheManager.load([PetGroup].self, forKey: CacheManager.groupsKey()) ?? []

        if selectedPet == nil, let first = pets.first {
            selectedPet = first
        }

        if let petId = currentPetId {
            selectedPetDetails = CacheManager.load(PetDetails.self, forKey: CacheManager.petDetailsKey(petId))
            meals = CacheManager.load([Meal].self, forKey: CacheManager.mealsKey(petId)) ?? []
            todaySummary = CacheManager.load(TodaySummary.self, forKey: CacheManager.todaySummaryKey(petId))
            let cached = CacheManager.load(WeightListResponse.self, forKey: CacheManager.weightsKey(petId))
            weightRecords = cached?.records ?? []
            weightTotal = cached?.total ?? 0
            courses = CacheManager.load([TreatmentCourse].self, forKey: CacheManager.coursesKey(petId)) ?? []
            todaySchedule = CacheManager.load(TodaySchedule.self, forKey: CacheManager.todayScheduleKey(petId))
        }

        if let groupId = currentGroupId {
            foods = CacheManager.load([Food].self, forKey: CacheManager.foodsKey(groupId)) ?? []
            medications = CacheManager.load([Medication].self, forKey: CacheManager.medicationsKey(groupId)) ?? []
        }

        foodDetailsCache = CacheManager.load([String: Food].self, forKey: "food_details_all") ?? [:]
    }

    // MARK: - Preload all (async, called after login or on app launch)

    @MainActor
    func preloadAll() async {
        isPreloading = true

        // Fetch pets first (needed for petId / groupId)
        await refreshPets()

        guard let petId = currentPetId else {
            isPreloading = false
            return
        }

        let groupId = currentGroupId

        // Fetch everything else in parallel
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.refreshPetDetails(petId: petId) }
            group.addTask { await self.refreshGroups() }
            group.addTask { await self.refreshMeals(petId: petId) }
            group.addTask { await self.refreshTodaySummary(petId: petId) }
            group.addTask { await self.refreshWeights(petId: petId) }
            group.addTask { await self.refreshCourses(petId: petId) }
            group.addTask { await self.refreshTodaySchedule(petId: petId) }
            if let gid = groupId {
                group.addTask { await self.refreshFoods(groupId: gid) }
                group.addTask { await self.refreshMedications(groupId: gid) }
            }
        }

        isPreloading = false
    }

    // MARK: - Switch pet

    @MainActor
    func switchPet(_ pet: PetInfo) async {
        selectedPet = pet

        // Load cached data for new pet immediately
        let petId = pet.id
        selectedPetDetails = CacheManager.load(PetDetails.self, forKey: CacheManager.petDetailsKey(petId))
        meals = CacheManager.load([Meal].self, forKey: CacheManager.mealsKey(petId)) ?? []
        todaySummary = CacheManager.load(TodaySummary.self, forKey: CacheManager.todaySummaryKey(petId))
        let cached = CacheManager.load(WeightListResponse.self, forKey: CacheManager.weightsKey(petId))
        weightRecords = cached?.records ?? []
        weightTotal = cached?.total ?? 0
        courses = CacheManager.load([TreatmentCourse].self, forKey: CacheManager.coursesKey(petId)) ?? []
        todaySchedule = CacheManager.load(TodaySchedule.self, forKey: CacheManager.todayScheduleKey(petId))

        if let gid = pet.groupId {
            foods = CacheManager.load([Food].self, forKey: CacheManager.foodsKey(gid)) ?? []
            medications = CacheManager.load([Medication].self, forKey: CacheManager.medicationsKey(gid)) ?? []
        }

        // Background refresh
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.refreshPetDetails(petId: petId) }
            group.addTask { await self.refreshMeals(petId: petId) }
            group.addTask { await self.refreshTodaySummary(petId: petId) }
            group.addTask { await self.refreshWeights(petId: petId) }
            group.addTask { await self.refreshCourses(petId: petId) }
            group.addTask { await self.refreshTodaySchedule(petId: petId) }
            if let gid = pet.groupId {
                group.addTask { await self.refreshFoods(groupId: gid) }
                group.addTask { await self.refreshMedications(groupId: gid) }
            }
        }
    }

    // MARK: - Per-domain refresh (fetch API → update memory → write cache)

    @MainActor
    func refreshPets() async {
        do {
            let fetched = try await APIClient.shared.fetchAccessiblePets()
            pets = fetched
            CacheManager.save(fetched, forKey: CacheManager.petsKey())
            if selectedPet == nil, let first = fetched.first {
                selectedPet = first
            }
        } catch {
            #if DEBUG
            print("DataStore.refreshPets failed: \(error)")
            #endif
        }
    }

    @MainActor
    func refreshPetDetails(petId: String) async {
        do {
            let details = try await APIClient.shared.fetchPetDetails(petId: petId)
            selectedPetDetails = details
            CacheManager.save(details, forKey: CacheManager.petDetailsKey(petId))
        } catch {
            #if DEBUG
            print("DataStore.refreshPetDetails failed: \(error)")
            #endif
        }
    }

    @MainActor
    func refreshGroups() async {
        do {
            let fetched = try await APIClient.shared.fetchMyGroups()
            groups = fetched
            CacheManager.save(fetched, forKey: CacheManager.groupsKey())
        } catch {
            #if DEBUG
            print("DataStore.refreshGroups failed: \(error)")
            #endif
        }
    }

    @MainActor
    func refreshFoods(groupId: String) async {
        do {
            let fetched = try await APIClient.shared.fetchFoods(groupId: groupId)
            foods = fetched
            CacheManager.save(fetched, forKey: CacheManager.foodsKey(groupId))
            // Background: progressively fetch full details for each food
            Task { await fetchAllFoodDetails(foods: fetched) }
        } catch {
            #if DEBUG
            print("DataStore.refreshFoods failed: \(error)")
            #endif
        }
    }

    /// Progressively fetch full details for each food in background
    @MainActor
    private func fetchAllFoodDetails(foods: [Food]) async {
        for food in foods {
            // Skip if already cached
            if foodDetailsCache[food.id] != nil { continue }
            do {
                let detail = try await APIClient.shared.fetchFoodDetails(foodId: food.id)
                foodDetailsCache[detail.id] = detail
            } catch {
                // Non-critical — user can still tap to load on demand
            }
        }
        // Persist cache
        CacheManager.save(foodDetailsCache, forKey: "food_details_all")
    }

    /// Get full food details — from cache first, fallback to the list data
    func getFoodDetail(foodId: String) -> Food? {
        foodDetailsCache[foodId] ?? foods.first { $0.id == foodId }
    }

    @MainActor
    func refreshMeals(petId: String) async {
        do {
            let fetched = try await APIClient.shared.fetchMeals(petId: petId)
            meals = fetched
            CacheManager.save(fetched, forKey: CacheManager.mealsKey(petId))
        } catch {
            #if DEBUG
            print("DataStore.refreshMeals failed: \(error)")
            #endif
        }
    }

    @MainActor
    func refreshTodaySummary(petId: String) async {
        do {
            let fmt = DateFormatter()
            fmt.dateFormat = "yyyy-MM-dd"
            let localDate = fmt.string(from: Date())
            let fetched = try await APIClient.shared.fetchTodaySummary(petId: petId, localDate: localDate)
            todaySummary = fetched
            CacheManager.save(fetched, forKey: CacheManager.todaySummaryKey(petId))
        } catch {
            #if DEBUG
            print("DataStore.refreshTodaySummary failed: \(error)")
            #endif
        }
    }

    @MainActor
    func refreshWeights(petId: String) async {
        do {
            let fetched = try await APIClient.shared.fetchWeights(petId: petId, number: 200)
            weightRecords = fetched.records
            weightTotal = fetched.total
            CacheManager.save(fetched, forKey: CacheManager.weightsKey(petId))
        } catch {
            #if DEBUG
            print("DataStore.refreshWeights failed: \(error)")
            #endif
        }
    }

    @MainActor
    func refreshMedications(groupId: String) async {
        do {
            let fetched = try await APIClient.shared.fetchMedications(groupId: groupId)
            medications = fetched
            CacheManager.save(fetched, forKey: CacheManager.medicationsKey(groupId))
        } catch {
            #if DEBUG
            print("DataStore.refreshMedications failed: \(error)")
            #endif
        }
    }

    @MainActor
    func refreshCourses(petId: String) async {
        do {
            let fetched = try await APIClient.shared.fetchCourses(petId: petId)
            courses = fetched
            CacheManager.save(fetched, forKey: CacheManager.coursesKey(petId))
        } catch {
            #if DEBUG
            print("DataStore.refreshCourses failed: \(error)")
            #endif
        }
    }

    @MainActor
    func refreshTodaySchedule(petId: String) async {
        do {
            let fmt = DateFormatter()
            fmt.dateFormat = "yyyy-MM-dd"
            let localDate = fmt.string(from: Date())
            let fetched = try await APIClient.shared.fetchTodaySchedule(petId: petId, localDate: localDate)
            todaySchedule = fetched
            CacheManager.save(fetched, forKey: CacheManager.todayScheduleKey(petId))
        } catch {
            #if DEBUG
            print("DataStore.refreshTodaySchedule failed: \(error)")
            #endif
        }
    }

    // MARK: - Clear (on logout)

    func clearAll() {
        pets = []
        selectedPet = nil
        selectedPetDetails = nil
        groups = []
        foods = []
        foodDetailsCache = [:]
        meals = []
        todaySummary = nil
        weightRecords = []
        weightTotal = 0
        medications = []
        courses = []
        todaySchedule = nil
        CacheManager.clearAll()
    }
}
