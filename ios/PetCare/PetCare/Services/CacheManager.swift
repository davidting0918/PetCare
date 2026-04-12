import Foundation

/// Generic JSON cache backed by UserDefaults.
/// Keys are namespaced as "cache_{domain}_{scope}" to avoid collisions.
/// Each entry stores data + a timestamp for stale-while-revalidate.
enum CacheManager {
    private static let defaults = UserDefaults.standard
    private static let maxAgeSeconds: TimeInterval = 300 // 5 minutes

    // MARK: - Save

    static func save<T: Encodable>(_ value: T, forKey key: String) {
        guard let data = try? JSONEncoder().encode(value) else { return }
        let entry = CacheEntry(data: data, timestamp: Date())
        guard let entryData = try? JSONEncoder().encode(entry) else { return }
        defaults.set(entryData, forKey: cacheKey(key))
    }

    // MARK: - Load

    static func load<T: Decodable>(_ type: T.Type, forKey key: String) -> T? {
        guard let entryData = defaults.data(forKey: cacheKey(key)),
              let entry = try? JSONDecoder().decode(CacheEntry.self, from: entryData),
              let value = try? JSONDecoder().decode(type, from: entry.data) else {
            return nil
        }
        return value
    }

    /// Returns true if the cached entry is older than maxAgeSeconds
    static func isStale(forKey key: String) -> Bool {
        guard let entryData = defaults.data(forKey: cacheKey(key)),
              let entry = try? JSONDecoder().decode(CacheEntry.self, from: entryData) else {
            return true // No cache = stale
        }
        return Date().timeIntervalSince(entry.timestamp) > maxAgeSeconds
    }

    // MARK: - Delete

    static func remove(forKey key: String) {
        defaults.removeObject(forKey: cacheKey(key))
    }

    static func clearAll() {
        let allKeys = defaults.dictionaryRepresentation().keys
        for key in allKeys where key.hasPrefix("petcare_cache_") {
            defaults.removeObject(forKey: key)
        }
    }

    // MARK: - Key helpers

    private static func cacheKey(_ key: String) -> String {
        "petcare_cache_\(key)"
    }

    /// Standard cache keys for each domain
    static func petsKey() -> String { "pets" }
    static func petDetailsKey(_ petId: String) -> String { "pet_details_\(petId)" }
    static func groupsKey() -> String { "groups" }
    static func foodsKey(_ groupId: String) -> String { "foods_\(groupId)" }
    static func mealsKey(_ petId: String) -> String { "meals_\(petId)" }
    static func todaySummaryKey(_ petId: String) -> String { "today_summary_\(petId)" }
    static func weightsKey(_ petId: String) -> String { "weights_\(petId)" }
    static func medicationsKey(_ groupId: String) -> String { "medications_\(groupId)" }
    static func coursesKey(_ petId: String) -> String { "courses_\(petId)" }
    static func todayScheduleKey(_ petId: String) -> String { "today_schedule_\(petId)" }
}

// MARK: - Internal

private struct CacheEntry: Codable {
    let data: Data
    let timestamp: Date
}
