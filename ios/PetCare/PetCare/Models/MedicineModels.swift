import Foundation

struct Medication: Codable, Identifiable {
    let id: String
    let name: String
    let groupId: String?
    let isActive: Bool?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, name
        case groupId = "group_id"
        case isActive = "is_active"
        case createdAt = "created_at"
    }
}

struct TreatmentCourse: Codable, Identifiable {
    let id: String
    let petId: String?
    let medicationId: String?
    let medicationName: String?
    let dosage: String?
    let frequencyDays: Int?
    let startDate: String?
    let endDate: String?
    let status: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, dosage, status
        case petId = "pet_id"
        case medicationId = "medication_id"
        case medicationName = "medication_name"
        case frequencyDays = "frequency_days"
        case startDate = "start_date"
        case endDate = "end_date"
        case createdAt = "created_at"
    }
}

struct TodaySchedule: Codable {
    let petId: String?
    let date: String?
    let scheduledCourses: [ScheduledCourseItem]?
    let completionStatus: CompletionStatus?

    enum CodingKeys: String, CodingKey {
        case date
        case petId = "pet_id"
        case scheduledCourses = "scheduled_courses"
        case completionStatus = "completion_status"
    }
}

struct ScheduledCourseItem: Codable, Identifiable {
    var id: String { courseId ?? UUID().uuidString }
    let courseId: String?
    let medicationName: String?
    let dosage: String?
    let timesToday: Int?
    let completedLogs: [CompletedLog]?

    enum CodingKeys: String, CodingKey {
        case dosage
        case courseId = "course_id"
        case medicationName = "medication_name"
        case timesToday = "times_today"
        case completedLogs = "completed_logs"
    }

    var completedCount: Int { completedLogs?.count ?? 0 }
    var isFullyDone: Bool { completedCount >= (timesToday ?? 1) }
}

struct CompletedLog: Codable, Identifiable {
    var id: String { logId ?? UUID().uuidString }
    let logId: String?
    let loggedAt: String?
    let recordedBy: String?
    let recordedByName: String?

    enum CodingKeys: String, CodingKey {
        case logId = "log_id"
        case loggedAt = "logged_at"
        case recordedBy = "recorded_by"
        case recordedByName = "recorded_by_name"
    }
}

struct CompletionStatus: Codable {
    let totalRequired: Int?
    let totalCompleted: Int?
    let percentage: Double?

    enum CodingKeys: String, CodingKey {
        case totalRequired = "total_required"
        case totalCompleted = "total_completed"
        case percentage
    }
}

struct CreateMedicationRequest: Codable {
    let name: String
    let groupId: String

    enum CodingKeys: String, CodingKey {
        case name
        case groupId = "group_id"
    }
}

struct UpdateMedicationRequest: Codable {
    var name: String?
}

struct CreateCourseRequest: Codable {
    let petId: String
    let medicationId: String
    let dosage: String?
    let frequencyDays: Int?
    let startDate: String?
    let endDate: String?

    enum CodingKeys: String, CodingKey {
        case dosage
        case petId = "pet_id"
        case medicationId = "medication_id"
        case frequencyDays = "frequency_days"
        case startDate = "start_date"
        case endDate = "end_date"
    }
}

struct CreateLogRequest: Codable {
    let courseId: String
    let loggedAt: String?

    enum CodingKeys: String, CodingKey {
        case courseId = "course_id"
        case loggedAt = "logged_at"
    }
}
