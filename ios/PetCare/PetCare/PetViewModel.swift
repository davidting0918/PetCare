// PetsStore — the central pet roster + currently-selected-pet state.
// Cached on disk so the Dashboard / Pet tab don't flicker on cold launch.

import Combine
import Foundation
import SwiftUI

@MainActor
final class PetsStore: ObservableObject {
    @Published private(set) var pets: [PetSummary] = []
    @Published var selectedPetId: String?
    @Published var lastError: String?
    @Published var loading: Bool = false

    private let cacheKey = "petcare.pets.snapshot.v1"
    private let selectedKey = "petcare.pets.selected.v1"

    init() {
        // Hydrate synchronously from UserDefaults so views never see an empty
        // state on cold-launch when we already had data last session.
        if let data = UserDefaults.standard.data(forKey: cacheKey),
           let cached = try? JSONDecoder.iso8601().decode([PetSummary].self, from: data) {
            self.pets = cached
        }
        self.selectedPetId = UserDefaults.standard.string(forKey: selectedKey)
    }

    var selectedPet: PetSummary? {
        guard let id = selectedPetId else { return pets.first }
        return pets.first(where: { $0.id == id }) ?? pets.first
    }

    func select(_ id: String) {
        self.selectedPetId = id
        UserDefaults.standard.set(id, forKey: selectedKey)
    }

    func refresh() async {
        loading = pets.isEmpty
        defer { loading = false }
        do {
            let next: [PetSummary] = try await APIClient.shared.get("/pet/accessible")
            self.pets = next
            persist()
            // If our selection vanished, pick the first available pet.
            if let sel = selectedPetId, !next.contains(where: { $0.id == sel }) {
                self.selectedPetId = next.first?.id
                UserDefaults.standard.set(selectedPetId, forKey: selectedKey)
            } else if selectedPetId == nil {
                self.selectedPetId = next.first?.id
                UserDefaults.standard.set(selectedPetId, forKey: selectedKey)
            }
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
    }

    func details(petId: String) async -> PetDetails? {
        do {
            return try await APIClient.shared.get("/pet/details", query: ["pet_id": petId])
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
        return nil
    }

    @discardableResult
    func create(_ req: CreatePetRequest) async -> PetDetails? {
        do {
            let d: PetDetails = try await APIClient.shared.post("/pet/create", body: req)
            await refresh()
            self.selectedPetId = d.id
            UserDefaults.standard.set(d.id, forKey: selectedKey)
            return d
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
        return nil
    }

    @discardableResult
    func update(_ req: UpdatePetRequest) async -> PetDetails? {
        do {
            let d: PetDetails = try await APIClient.shared.post("/pet/update", body: req)
            await refresh()
            return d
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
        return nil
    }

    func delete(_ petId: String) async {
        do {
            _ = try await APIClient.shared.post(
                "/pet/delete",
                body: DeletePetRequest(petId: petId)) as EmptyResponse
            await refresh()
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
    }

    private func persist() {
        if let data = try? JSONEncoder.iso8601().encode(pets) {
            UserDefaults.standard.set(data, forKey: cacheKey)
        }
    }
}

// MARK: - JSON coder helpers (snake_case + ISO8601)

extension JSONEncoder {
    static func iso8601() -> JSONEncoder {
        let e = JSONEncoder()
        e.keyEncodingStrategy = .convertToSnakeCase
        e.dateEncodingStrategy = .iso8601
        return e
    }
}

extension JSONDecoder {
    static func iso8601() -> JSONDecoder {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        let isoFractional = ISO8601DateFormatter()
        isoFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let isoPlain = ISO8601DateFormatter()
        isoPlain.formatOptions = [.withInternetDateTime]
        d.dateDecodingStrategy = .custom { dec in
            let c = try dec.singleValueContainer()
            let raw = try c.decode(String.self)
            if let v = isoFractional.date(from: raw) { return v }
            if let v = isoPlain.date(from: raw) { return v }
            throw DecodingError.dataCorruptedError(in: c, debugDescription: "bad date: \(raw)")
        }
        return d
    }
}
