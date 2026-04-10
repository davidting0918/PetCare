import Foundation

@Observable
final class PetSelectorViewModel {
    var pets: [PetInfo] = []
    var selectedPet: PetInfo?
    var selectedPetDetails: PetDetails?
    var isLoading = false

    @MainActor
    func loadPets() async {
        isLoading = true
        do {
            pets = try await APIClient.shared.fetchAccessiblePets()
            if selectedPet == nil, let first = pets.first {
                selectPet(first)
            }
        } catch {
            #if DEBUG
            print("Failed to load pets: \(error)")
            #endif
        }
        isLoading = false
    }

    @MainActor
    func selectPet(_ pet: PetInfo) {
        selectedPet = pet
        Task { await loadPetDetails(petId: pet.id) }
    }

    @MainActor
    func loadPetDetails(petId: String) async {
        do {
            selectedPetDetails = try await APIClient.shared.fetchPetDetails(petId: petId)
        } catch {
            #if DEBUG
            print("Failed to load pet details: \(error)")
            #endif
        }
    }

    @MainActor
    func refresh() async {
        await loadPets()
        if let pet = selectedPet {
            await loadPetDetails(petId: pet.id)
        }
    }
}
