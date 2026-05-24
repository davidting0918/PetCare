// Medicine DTOs — mirror backend/models/medicine.py.

import Foundation

enum MedicationType: String, Codable, CaseIterable, Identifiable {
    case oral, topical, injection, eyeDrops = "eye_drops", earDrops = "ear_drops", other
    var id: String { rawValue }
    var displayName: String {
        switch self {
        case .oral:      return "Oral"
        case .topical:   return "Topical"
        case .injection: return "Injection"
        case .eyeDrops:  return "Eye drops"
        case .earDrops:  return "Ear drops"
        case .other:     return "Other"
        }
    }
}

enum DosageUnit: String, Codable, CaseIterable, Identifiable {
    case tablet, ml, mg, drops, puff, unit, application
    var id: String { rawValue }
    var displayName: String { rawValue.capitalized }
}

enum TimeOfDay: String, Codable, CaseIterable, Identifiable {
    case allDay = "all_day"
    case morning, afternoon, evening
    var id: String { rawValue }
    var displayName: String {
        switch self {
        case .allDay:    return "All day"
        case .morning:   return "Morning"
        case .afternoon: return "Afternoon"
        case .evening:   return "Evening"
        }
    }
}

enum CourseStatusFilter: String, Codable, CaseIterable, Identifiable {
    case active, ended, all
    var id: String { rawValue }
}

struct MedicationInfo: Codable, Identifiable, Equatable {
    let id: String
    let groupId: String
    let name: String
    let medicationType: MedicationType
    let defaultDosage: Double?
    let dosageUnit: DosageUnit
    let notes: String?
    let creatorId: String?
    let isActive: Bool
    let createdAt: Date
    let updatedAt: Date
}

struct TreatmentCourseInfo: Codable, Identifiable, Equatable {
    let id: String
    let petId: String
    let petName: String
    let medicationId: String
    let medicationName: String
    let medicationType: MedicationType
    let groupId: String
    let dosage: Double
    let dosageUnit: DosageUnit
    let frequencyDays: Int
    let timesPerDay: [TimeOfDay]
    let startDate: Date
    let endDate: Date?
    let notes: String?
    let createdBy: String?
    let createdByName: String?
    let isActive: Bool
    let createdAt: Date
    let updatedAt: Date
}

struct MedicationLogInfo: Codable, Identifiable, Equatable {
    let id: String
    let petId: String
    let medicationId: String
    let medicationName: String
    let groupId: String
    let courseId: String?
    let dosage: Double
    let dosageUnit: DosageUnit
    let timeOfDay: TimeOfDay?
    let administeredAt: Date
    let administeredBy: String?
    let administeredByName: String?
    let notes: String?
    let isActive: Bool
    let createdAt: Date
    let updatedAt: Date
}

struct ScheduledItem: Codable, Identifiable, Equatable {
    var id: String { courseId + "-" + timeOfDay.rawValue }
    let courseId: String
    let medicationId: String
    let medicationName: String
    let medicationType: MedicationType
    let dosage: Double
    let dosageUnit: DosageUnit
    let timeOfDay: TimeOfDay
    let isDone: Bool
    let logId: String?
    let administeredByName: String?
    let administeredAt: Date?
}

struct TodayScheduleResponse: Codable, Equatable {
    let petId: String
    let date: String
    let scheduledItems: [ScheduledItem]
    let adHocLogs: [MedicationLogInfo]
    let totalScheduled: Int
    let totalDone: Int
    let totalAdHoc: Int
}

// ── Requests ──

struct CreateMedicationRequest: Codable {
    var groupId: String
    var name: String
    var medicationType: MedicationType
    var dosageUnit: DosageUnit
    var defaultDosage: Double?
    var notes: String?
}

struct UpdateMedicationRequest: Codable {
    let medicationId: String
    var name: String?
    var medicationType: MedicationType?
    var defaultDosage: Double?
    var dosageUnit: DosageUnit?
    var notes: String?
}

struct DeleteMedicationRequest: Codable { let medicationId: String }

struct CreateCourseRequest: Codable {
    var petId: String
    var medicationId: String
    var dosage: Double
    var dosageUnit: DosageUnit
    var startDate: Date
    var endDate: Date?
    var frequencyDays: Int = 1
    var timesPerDay: [TimeOfDay] = [.morning]
    var notes: String?
}

struct UpdateCourseRequest: Codable {
    let courseId: String
    var dosage: Double?
    var dosageUnit: DosageUnit?
    var frequencyDays: Int?
    var timesPerDay: [TimeOfDay]?
    var endDate: Date?
    var notes: String?
    var localDate: Date?
}

struct EndCourseRequest: Codable {
    let courseId: String
    var localDate: Date?
}

struct CreateLogRequest: Codable {
    var petId: String
    var medicationId: String
    var courseId: String?
    var dosage: Double
    var dosageUnit: DosageUnit
    var timeOfDay: TimeOfDay?
    var administeredAt: Date?
    var notes: String?
}

struct DeleteLogRequest: Codable { let logId: String }
