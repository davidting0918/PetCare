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
    let petName: String?
    let medicationId: String?
    let medicationName: String?
    let medicationType: String?
    let groupId: String?
    let dosage: Double?
    let dosageUnit: String?
    let frequencyDays: Int?
    let timesPerDay: [String]?
    let startDate: String?
    let endDate: String?
    let notes: String?
    let isActive: Bool?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, dosage, notes
        case petId = "pet_id"
        case petName = "pet_name"
        case medicationId = "medication_id"
        case medicationName = "medication_name"
        case medicationType = "medication_type"
        case groupId = "group_id"
        case dosageUnit = "dosage_unit"
        case frequencyDays = "frequency_days"
        case timesPerDay = "times_per_day"
        case startDate = "start_date"
        case endDate = "end_date"
        case isActive = "is_active"
        case createdAt = "created_at"
    }
}

struct TodaySchedule: Codable {
    let petId: String?
    let date: String?
    let scheduledItems: [ScheduledItem]?
    let summary: ScheduleSummary?

    enum CodingKeys: String, CodingKey {
        case date, summary
        case petId = "pet_id"
        case scheduledItems = "scheduled_items"
    }
}

struct ScheduledItem: Codable, Identifiable {
    var id: String { "\(courseId ?? "")_\(timeOfDay ?? "")" }
    let courseId: String?
    let medicationId: String?
    let medicationName: String?
    let dosage: Double?
    let dosageUnit: String?
    let timeOfDay: String?
    let isDone: Bool?
    let logId: String?
    let administeredByName: String?
    let administeredAt: String?

    enum CodingKeys: String, CodingKey {
        case dosage
        case courseId = "course_id"
        case medicationId = "medication_id"
        case medicationName = "medication_name"
        case dosageUnit = "dosage_unit"
        case timeOfDay = "time_of_day"
        case isDone = "is_done"
        case logId = "log_id"
        case administeredByName = "administered_by_name"
        case administeredAt = "administered_at"
    }
}

struct ScheduleSummary: Codable {
    let totalScheduled: Int?
    let completed: Int?
    let pending: Int?

    enum CodingKeys: String, CodingKey {
        case completed, pending
        case totalScheduled = "total_scheduled"
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
    let groupId: String
    let dosage: Double
    let dosageUnit: String
    let frequencyDays: Int
    let timesPerDay: [String]
    let startDate: String
    let endDate: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case dosage, notes
        case petId = "pet_id"
        case medicationId = "medication_id"
        case groupId = "group_id"
        case dosageUnit = "dosage_unit"
        case frequencyDays = "frequency_days"
        case timesPerDay = "times_per_day"
        case startDate = "start_date"
        case endDate = "end_date"
    }
}

struct CreateLogRequest: Codable {
    let petId: String
    let medicationId: String
    let groupId: String
    let courseId: String?
    let dosage: Double
    let dosageUnit: String
    let timeOfDay: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case dosage, notes
        case petId = "pet_id"
        case medicationId = "medication_id"
        case groupId = "group_id"
        case courseId = "course_id"
        case dosageUnit = "dosage_unit"
        case timeOfDay = "time_of_day"
    }
}
