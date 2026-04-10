import Foundation

@Observable
final class PetViewModel {
    var isLoading = false
    var errorMessage: String?

    @MainActor
    func createPet(_ request: CreatePetRequest) async throws -> PetInfo {
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil
        do {
            let pet = try await APIClient.shared.createPet(request)
            return pet
        } catch {
            errorMessage = error.localizedDescription
            throw error
        }
    }

    @MainActor
    func updatePet(petId: String, _ request: UpdatePetRequest) async throws -> PetInfo {
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil
        do {
            let pet = try await APIClient.shared.updatePet(petId: petId, request)
            return pet
        } catch {
            errorMessage = error.localizedDescription
            throw error
        }
    }

    @MainActor
    func uploadPhoto(petId: String, imageData: Data) async throws {
        _ = try await APIClient.shared.uploadPetPhoto(petId: petId, data: imageData, filename: "pet_photo.jpg")
    }

    @MainActor
    func assignToGroup(petId: String, groupId: String) async throws {
        try await APIClient.shared.assignPetToGroup(petId: petId, groupId: groupId)
    }
}
