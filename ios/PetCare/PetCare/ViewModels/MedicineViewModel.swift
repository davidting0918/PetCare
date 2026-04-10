import Foundation

@Observable
final class MedicineViewModel {
    var medications: [Medication] = []
    var courses: [TreatmentCourse] = []
    var todaySchedule: TodaySchedule?
    var isLoading = false
    var errorMessage: String?

    @MainActor
    func loadMedications(groupId: String) async {
        do {
            medications = try await APIClient.shared.fetchMedications(groupId: groupId)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    @MainActor
    func loadCourses(petId: String) async {
        do {
            courses = try await APIClient.shared.fetchCourses(petId: petId)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    @MainActor
    func loadTodaySchedule(petId: String) async {
        do {
            todaySchedule = try await APIClient.shared.fetchTodaySchedule(petId: petId)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    @MainActor
    func createMedication(name: String, groupId: String) async throws {
        _ = try await APIClient.shared.createMedication(CreateMedicationRequest(name: name, groupId: groupId))
        await loadMedications(groupId: groupId)
    }

    @MainActor
    func updateMedication(medicationId: String, name: String, groupId: String) async throws {
        _ = try await APIClient.shared.updateMedication(medicationId: medicationId, UpdateMedicationRequest(name: name))
        await loadMedications(groupId: groupId)
    }

    @MainActor
    func deleteMedication(medicationId: String, groupId: String) async throws {
        try await APIClient.shared.deleteMedication(medicationId: medicationId)
        await loadMedications(groupId: groupId)
    }

    @MainActor
    func createCourse(_ request: CreateCourseRequest, petId: String) async throws {
        _ = try await APIClient.shared.createCourse(request)
        await loadCourses(petId: petId)
        await loadTodaySchedule(petId: petId)
    }

    @MainActor
    func endCourse(courseId: String, petId: String) async throws {
        try await APIClient.shared.endCourse(courseId: courseId)
        await loadCourses(petId: petId)
        await loadTodaySchedule(petId: petId)
    }

    @MainActor
    func markDone(courseId: String, petId: String) async throws {
        let request = CreateLogRequest(courseId: courseId, loggedAt: nil)
        try await APIClient.shared.markMedicineDone(request)
        await loadTodaySchedule(petId: petId)
    }

    @MainActor
    func undoDone(logId: String, petId: String) async throws {
        try await APIClient.shared.undoMedicineDone(logId: logId)
        await loadTodaySchedule(petId: petId)
    }

    @MainActor
    func refresh(petId: String, groupId: String) async {
        isLoading = true
        await loadMedications(groupId: groupId)
        await loadCourses(petId: petId)
        await loadTodaySchedule(petId: petId)
        isLoading = false
    }
}
