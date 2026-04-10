import Foundation

final class APIClient {
    static let shared = APIClient()

    private let baseURL = "https://petcare-staging.onrender.com"
    private let session: URLSession
    private let decoder: JSONDecoder

    /// Posted when a 401 is received — AuthViewModel listens to trigger logout.
    static let unauthorizedNotification = Notification.Name("APIClient.unauthorized")

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        session = URLSession(configuration: config)
        decoder = JSONDecoder()
    }

    private var token: String? {
        UserDefaults.standard.string(forKey: "petcare_token")
    }

    // MARK: - Auth

    func googleLogin(idToken: String) async throws -> LoginResponseData {
        let body = GoogleLoginRequest(token: idToken)
        let response: APIResponse<LoginResponseData> = try await post(path: "/auth/google/login", body: body, authenticated: false)
        return try unwrap(response)
    }

    func fetchCurrentUser() async throws -> UserInfo {
        let response: APIResponse<UserInfo> = try await get(path: "/user/me")
        return try unwrap(response)
    }

    func updateUser(_ request: UpdateUserRequest) async throws -> UserInfo {
        let response: APIResponse<UserInfo> = try await post(path: "/user/update", body: request)
        return try unwrap(response)
    }

    func uploadUserPhoto(data: Data, filename: String) async throws -> PhotoUploadResult {
        let response: APIResponse<PhotoUploadResult> = try await uploadFile(path: "/user/photo/upload", fileData: data, filename: filename)
        return try unwrap(response)
    }

    // MARK: - Pets

    func fetchAccessiblePets() async throws -> [PetInfo] {
        let response: APIResponse<[PetInfo]> = try await get(path: "/pets/accessible")
        return try unwrap(response)
    }

    func fetchPetDetails(petId: String) async throws -> PetDetails {
        let response: APIResponse<PetDetails> = try await get(path: "/pets/\(petId)/details")
        return try unwrap(response)
    }

    func createPet(_ request: CreatePetRequest) async throws -> PetInfo {
        let response: APIResponse<PetInfo> = try await post(path: "/pets/create", body: request)
        return try unwrap(response)
    }

    func updatePet(petId: String, _ request: UpdatePetRequest) async throws -> PetInfo {
        let response: APIResponse<PetInfo> = try await post(path: "/pets/\(petId)/update", body: request)
        return try unwrap(response)
    }

    func uploadPetPhoto(petId: String, data: Data, filename: String) async throws -> PhotoUploadResult {
        let response: APIResponse<PhotoUploadResult> = try await uploadFile(path: "/pets/\(petId)/photo/upload", fileData: data, filename: filename)
        return try unwrap(response)
    }

    func assignPetToGroup(petId: String, groupId: String) async throws {
        let body = AssignPetToGroupRequest(groupId: groupId)
        let _: APIResponse<AnyCodable> = try await post(path: "/pets/\(petId)/assign_group", body: body)
    }

    // MARK: - Groups

    func fetchMyGroups() async throws -> [Group] {
        let response: APIResponse<[Group]> = try await get(path: "/groups/my_groups")
        return try unwrap(response)
    }

    func fetchGroupMembers(groupId: String) async throws -> [GroupMember] {
        let response: APIResponse<[GroupMember]> = try await get(path: "/groups/\(groupId)/members")
        return try unwrap(response)
    }

    func fetchGroupPets(groupId: String) async throws -> [GroupPet] {
        let response: APIResponse<[GroupPet]> = try await get(path: "/groups/\(groupId)/pets")
        return try unwrap(response)
    }

    func createGroup(_ request: CreateGroupRequest) async throws -> Group {
        let response: APIResponse<Group> = try await post(path: "/groups/create", body: request)
        return try unwrap(response)
    }

    func deleteGroup(groupId: String) async throws {
        let _: APIResponse<AnyCodable> = try await post(path: "/groups/delete/\(groupId)", body: EmptyBody())
    }

    func createInvitation(groupId: String, role: String) async throws -> InvitationResult {
        let body = CreateInvitationRequest(role: role)
        let response: APIResponse<InvitationResult> = try await post(path: "/groups/\(groupId)/invite", body: body)
        return try unwrap(response)
    }

    func previewInvitation(inviteCode: String) async throws -> InvitationPreview {
        let response: APIResponse<InvitationPreview> = try await get(path: "/groups/invitation/\(inviteCode)")
        return try unwrap(response)
    }

    func joinGroup(inviteCode: String) async throws -> Group {
        let body = JoinGroupRequest(inviteCode: inviteCode)
        let response: APIResponse<Group> = try await post(path: "/groups/join", body: body)
        return try unwrap(response)
    }

    // MARK: - Foods

    func fetchFoods(groupId: String) async throws -> [Food] {
        let response: APIResponse<[Food]> = try await get(path: "/foods/info?group_id=\(groupId)")
        return try unwrap(response)
    }

    func fetchFoodDetails(foodId: String) async throws -> Food {
        let response: APIResponse<Food> = try await get(path: "/foods/\(foodId)/details")
        return try unwrap(response)
    }

    func createFood(groupId: String, _ request: CreateFoodRequest) async throws -> Food {
        let response: APIResponse<Food> = try await post(path: "/foods/create?group_id=\(groupId)", body: request)
        return try unwrap(response)
    }

    func updateFood(foodId: String, _ request: UpdateFoodRequest) async throws -> Food {
        let response: APIResponse<Food> = try await post(path: "/foods/\(foodId)/update", body: request)
        return try unwrap(response)
    }

    func deleteFood(foodId: String) async throws {
        let _: APIResponse<AnyCodable> = try await post(path: "/foods/\(foodId)/delete", body: EmptyBody())
    }

    func uploadFoodPhoto(foodId: String, data: Data, filename: String) async throws -> PhotoUploadResult {
        let response: APIResponse<PhotoUploadResult> = try await uploadFile(path: "/foods/\(foodId)/photo/upload", fileData: data, filename: filename)
        return try unwrap(response)
    }

    // MARK: - Meals

    func fetchMeals(petId: String, dateFrom: String? = nil, dateTo: String? = nil, limit: Int = 50) async throws -> [Meal] {
        var path = "/meals?pet_id=\(petId)&limit=\(limit)"
        if let df = dateFrom { path += "&date_from=\(df)" }
        if let dt = dateTo { path += "&date_to=\(dt)" }
        let response: APIResponse<[Meal]> = try await get(path: path)
        return try unwrap(response)
    }

    func fetchMealDetails(mealId: String) async throws -> Meal {
        let response: APIResponse<Meal> = try await get(path: "/meals/\(mealId)/details")
        return try unwrap(response)
    }

    func fetchTodaySummary(petId: String, localDate: String? = nil) async throws -> TodaySummary {
        var path = "/meals/today?pet_id=\(petId)"
        if let ld = localDate { path += "&local_date=\(ld)" }
        let response: APIResponse<TodaySummary> = try await get(path: path)
        return try unwrap(response)
    }

    func fetchMealSummary(petId: String, dateFrom: String, dateTo: String) async throws -> MealSummary {
        let path = "/meals/summary?pet_id=\(petId)&date_from=\(dateFrom)&date_to=\(dateTo)"
        let response: APIResponse<MealSummary> = try await get(path: path)
        return try unwrap(response)
    }

    func createMeal(_ request: CreateMealRequest) async throws -> Meal {
        let response: APIResponse<Meal> = try await post(path: "/meals", body: request)
        return try unwrap(response)
    }

    func updateMeal(mealId: String, _ request: UpdateMealRequest) async throws -> Meal {
        let response: APIResponse<Meal> = try await post(path: "/meals/\(mealId)/update", body: request)
        return try unwrap(response)
    }

    func deleteMeal(mealId: String) async throws {
        let _: APIResponse<AnyCodable> = try await post(path: "/meals/\(mealId)/delete", body: EmptyBody())
    }

    // MARK: - Weights

    func fetchWeights(petId: String, start: String? = nil, end: String? = nil, page: Int = 1, number: Int = 50) async throws -> WeightListResponse {
        var path = "/weights/info?pet_id=\(petId)&page=\(page)&number=\(number)&order_by=timestamp&order_direction=desc"
        if let s = start { path += "&start=\(s)" }
        if let e = end { path += "&end=\(e)" }
        let response: APIResponse<WeightListResponse> = try await get(path: path)
        return try unwrap(response)
    }

    func createWeight(_ request: CreateWeightRequest) async throws -> WeightRecord {
        let response: APIResponse<WeightRecord> = try await post(path: "/weights/create", body: request)
        return try unwrap(response)
    }

    func updateWeight(weightId: String, _ request: UpdateWeightRequest) async throws -> WeightRecord {
        let response: APIResponse<WeightRecord> = try await post(path: "/weights/update/\(weightId)", body: request)
        return try unwrap(response)
    }

    func deleteWeight(weightId: String) async throws {
        let _: APIResponse<AnyCodable> = try await post(path: "/weights/delete/\(weightId)", body: EmptyBody())
    }

    // MARK: - Medicine

    func fetchMedications(groupId: String) async throws -> [Medication] {
        let response: APIResponse<[Medication]> = try await get(path: "/medicine/list?group_id=\(groupId)")
        return try unwrap(response)
    }

    func fetchMedicationDetails(medicationId: String) async throws -> Medication {
        let response: APIResponse<Medication> = try await get(path: "/medicine/\(medicationId)")
        return try unwrap(response)
    }

    func createMedication(_ request: CreateMedicationRequest) async throws -> Medication {
        let response: APIResponse<Medication> = try await post(path: "/medicine/create", body: request)
        return try unwrap(response)
    }

    func updateMedication(medicationId: String, _ request: UpdateMedicationRequest) async throws -> Medication {
        let response: APIResponse<Medication> = try await post(path: "/medicine/\(medicationId)/update", body: request)
        return try unwrap(response)
    }

    func deleteMedication(medicationId: String) async throws {
        let _: APIResponse<AnyCodable> = try await post(path: "/medicine/\(medicationId)/delete", body: EmptyBody())
    }

    func fetchCourses(petId: String, status: String = "active") async throws -> [TreatmentCourse] {
        let response: APIResponse<[TreatmentCourse]> = try await get(path: "/medicine/course/list?pet_id=\(petId)&status=\(status)")
        return try unwrap(response)
    }

    func createCourse(_ request: CreateCourseRequest) async throws -> TreatmentCourse {
        let response: APIResponse<TreatmentCourse> = try await post(path: "/medicine/course/create", body: request)
        return try unwrap(response)
    }

    func endCourse(courseId: String) async throws {
        let _: APIResponse<AnyCodable> = try await post(path: "/medicine/course/\(courseId)/end", body: EmptyBody())
    }

    func fetchTodaySchedule(petId: String, localDate: String? = nil) async throws -> TodaySchedule {
        var path = "/medicine/today?pet_id=\(petId)"
        if let ld = localDate { path += "&local_date=\(ld)" }
        let response: APIResponse<TodaySchedule> = try await get(path: path)
        return try unwrap(response)
    }

    func markMedicineDone(_ request: CreateLogRequest) async throws {
        let _: APIResponse<AnyCodable> = try await post(path: "/medicine/log/create", body: request)
    }

    func undoMedicineDone(logId: String) async throws {
        let _: APIResponse<AnyCodable> = try await post(path: "/medicine/log/\(logId)/delete", body: EmptyBody())
    }

    // MARK: - Generic HTTP helpers

    private func get<Response: Codable>(path: String, authenticated: Bool = true) async throws -> APIResponse<Response> {
        guard let url = URL(string: baseURL + path) else { throw APIError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if authenticated, let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        return try await execute(request)
    }

    private func post<Body: Encodable, Response: Codable>(path: String, body: Body, authenticated: Bool = true) async throws -> APIResponse<Response> {
        guard let url = URL(string: baseURL + path) else { throw APIError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if authenticated, let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        request.httpBody = try JSONEncoder().encode(body)
        return try await execute(request)
    }

    private func uploadFile<Response: Codable>(path: String, fileData: Data, filename: String, authenticated: Bool = true) async throws -> APIResponse<Response> {
        guard let url = URL(string: baseURL + path) else { throw APIError.invalidURL }
        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        if authenticated, let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(fileData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body
        return try await execute(request)
    }

    private func execute<Response: Codable>(_ request: URLRequest) async throws -> APIResponse<Response> {
        let (data, httpResponse) = try await session.data(for: request)
        guard let http = httpResponse as? HTTPURLResponse else { throw APIError.invalidResponse }

        if http.statusCode == 401 {
            await MainActor.run { NotificationCenter.default.post(name: Self.unauthorizedNotification, object: nil) }
            throw APIError.unauthorized
        }

        guard (200...299).contains(http.statusCode) else {
            let message = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw APIError.httpError(statusCode: http.statusCode, message: message)
        }

        return try decoder.decode(APIResponse<Response>.self, from: data)
    }

    private func unwrap<T>(_ response: APIResponse<T>) throws -> T {
        guard response.status == 1, let data = response.data else {
            throw APIError.serverError(response.message ?? "Request failed")
        }
        return data
    }
}

// MARK: - Shared types

struct EmptyBody: Codable {}

struct AnyCodable: Codable {}

struct PhotoUploadResult: Codable {
    let photoUrl: String?

    enum CodingKeys: String, CodingKey {
        case photoUrl = "photo_url"
    }
}

// MARK: - Errors

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case unauthorized
    case httpError(statusCode: Int, message: String)
    case serverError(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .invalidResponse: return "Invalid response from server"
        case .unauthorized: return "Session expired. Please login again."
        case .httpError(let code, let message): return "HTTP \(code): \(message)"
        case .serverError(let message): return message
        }
    }
}
