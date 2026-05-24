// MedicineStore — medication catalog + courses + today's schedule.

import Foundation
import SwiftUI

@MainActor
final class MedicineStore: ObservableObject {
    @Published var medications: [MedicationInfo] = []
    @Published var courses: [TreatmentCourseInfo] = []
    @Published var todaySchedule: TodayScheduleResponse?
    @Published var lastError: String?
    @Published var loading: Bool = false

    func loadMedications(groupId: String) async {
        do {
            medications = try await APIClient.shared.get(
                "/medicine/medication/list",
                query: ["group_id": groupId]
            )
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
    }

    func loadCourses(petId: String, status: CourseStatusFilter = .active) async {
        do {
            courses = try await APIClient.shared.get(
                "/medicine/course/list",
                query: ["pet_id": petId, "status": status.rawValue]
            )
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
    }

    func loadToday(petId: String) async {
        loading = todaySchedule == nil
        defer { loading = false }
        do {
            let f = DateFormatter()
            f.calendar = Calendar(identifier: .iso8601)
            f.timeZone = TimeZone.current
            f.dateFormat = "yyyy-MM-dd"
            todaySchedule = try await APIClient.shared.get(
                "/medicine/today",
                query: ["pet_id": petId, "local_date": f.string(from: Date())]
            )
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
    }

    @discardableResult
    func createMedication(_ req: CreateMedicationRequest) async -> MedicationInfo? {
        do {
            let m: MedicationInfo = try await APIClient.shared.post("/medicine/medication/create", body: req)
            await loadMedications(groupId: req.groupId)
            return m
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
        return nil
    }

    @discardableResult
    func createCourse(_ req: CreateCourseRequest) async -> TreatmentCourseInfo? {
        do {
            let c: TreatmentCourseInfo = try await APIClient.shared.post("/medicine/course/create", body: req)
            await loadCourses(petId: req.petId)
            return c
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
        return nil
    }

    @discardableResult
    func markGiven(course: TreatmentCourseInfo, slot: TimeOfDay) async -> MedicationLogInfo? {
        let req = CreateLogRequest(
            petId: course.petId,
            medicationId: course.medicationId,
            courseId: course.id,
            dosage: course.dosage,
            dosageUnit: course.dosageUnit,
            timeOfDay: slot,
            administeredAt: Date(),
            notes: nil
        )
        do {
            let lg: MedicationLogInfo = try await APIClient.shared.post("/medicine/log/create", body: req)
            await loadToday(petId: course.petId)
            return lg
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
        return nil
    }

    func endCourse(_ courseId: String, petId: String) async {
        do {
            _ = try await APIClient.shared.post(
                "/medicine/course/end",
                body: EndCourseRequest(courseId: courseId, localDate: nil)) as TreatmentCourseInfo
            await loadCourses(petId: petId)
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
    }
}
