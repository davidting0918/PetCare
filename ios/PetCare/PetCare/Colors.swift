// Theme tokens — translated 1:1 from docs/PetCare iOS Prototype.html.
// File is named `Colors.swift` because that's the slot the Xcode project
// already references; the content is the full design system.
//
// Six themes (Midnight is the default). Switch at runtime via
// `ThemeManager.shared.theme = .ocean` and SwiftUI views re-render through
// the `@ObservedObject themeManager`.

import SwiftUI

enum AppTheme: String, CaseIterable, Identifiable {
    case midnight, daylight, nordic, ocean, graphite, mono

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .midnight: return "Midnight"
        case .daylight: return "Daylight"
        case .nordic:   return "Nordic"
        case .ocean:    return "Ocean"
        case .graphite: return "Graphite"
        case .mono:     return "Mono"
        }
    }

    var isDark: Bool {
        switch self {
        case .midnight, .ocean, .graphite: return true
        case .daylight, .nordic, .mono:    return false
        }
    }

    var tokens: ThemeTokens { ThemeTokens.for(self) }
}

struct ThemeTokens {
    let bg: Color
    let surface: Color
    let surfaceElev: Color
    let border: Color
    let borderStrong: Color
    let textPrimary: Color
    let textSecondary: Color
    let textMuted: Color
    let primary: Color
    let primaryHover: Color
    let primarySoft: Color           // very faint primary, used for chip / pill backgrounds
    let accent: Color
    let success: Color
    let warning: Color
    let danger: Color
    let chart1: Color
    let chart2: Color
    let chart3: Color
    let chart4: Color

    // On-primary text colour (white in most themes, dark in ocean/graphite).
    let onPrimary: Color

    static func `for`(_ t: AppTheme) -> ThemeTokens {
        switch t {
        case .midnight: return midnight
        case .daylight: return daylight
        case .nordic:   return nordic
        case .ocean:    return ocean
        case .graphite: return graphite
        case .mono:     return mono
        }
    }

    static let midnight = ThemeTokens(
        bg: hex(0x0B0B16),
        surface: hex(0x16162A),
        surfaceElev: hex(0x1E1E36),
        border: hex(0x25254A),
        borderStrong: hex(0x3B3B6B),
        textPrimary: hex(0xF1F1FA),
        textSecondary: hex(0xA8A8C4),
        textMuted: hex(0x6B6B8C),
        primary: hex(0xA855F7),
        primaryHover: hex(0x9333EA),
        primarySoft: hex(0xA855F7, opacity: 0.16),
        accent: hex(0x38BDF8),
        success: hex(0x34D399),
        warning: hex(0xFBBF24),
        danger: hex(0xF87171),
        chart1: hex(0xA855F7),
        chart2: hex(0x38BDF8),
        chart3: hex(0xF472B6),
        chart4: hex(0x818CF8),
        onPrimary: .white
    )

    static let daylight = ThemeTokens(
        bg: hex(0xF4F6FB),
        surface: hex(0xFFFFFF),
        surfaceElev: hex(0xFFFFFF),
        border: hex(0xE4E7EE),
        borderStrong: hex(0xCBD0DA),
        textPrimary: hex(0x0F172A),
        textSecondary: hex(0x475569),
        textMuted: hex(0x94A3B8),
        primary: hex(0x4F46E5),
        primaryHover: hex(0x4338CA),
        primarySoft: hex(0x4F46E5, opacity: 0.10),
        accent: hex(0x64748B),
        success: hex(0x10B981),
        warning: hex(0xF59E0B),
        danger: hex(0xEF4444),
        chart1: hex(0x4F46E5),
        chart2: hex(0x06B6D4),
        chart3: hex(0x8B5CF6),
        chart4: hex(0x64748B),
        onPrimary: .white
    )

    static let nordic = ThemeTokens(
        bg: hex(0xECEFF3),
        surface: hex(0xF6F8FA),
        surfaceElev: hex(0xFFFFFF),
        border: hex(0xDDE3E8),
        borderStrong: hex(0xB6BFC8),
        textPrimary: hex(0x1F2933),
        textSecondary: hex(0x52606D),
        textMuted: hex(0x9AA5B1),
        primary: hex(0x3F7B8C),
        primaryHover: hex(0x335F6E),
        primarySoft: hex(0x3F7B8C, opacity: 0.12),
        accent: hex(0x7A8FA0),
        success: hex(0x4A8C75),
        warning: hex(0xB89248),
        danger: hex(0xB05B5B),
        chart1: hex(0x3F7B8C),
        chart2: hex(0x7A8FA0),
        chart3: hex(0x5C8C7C),
        chart4: hex(0xB6BFC8),
        onPrimary: .white
    )

    static let ocean = ThemeTokens(
        bg: hex(0x07182B),
        surface: hex(0x0F2238),
        surfaceElev: hex(0x173049),
        border: hex(0x1E3A57),
        borderStrong: hex(0x2C4F70),
        textPrimary: hex(0xE8F1FA),
        textSecondary: hex(0x93AEC9),
        textMuted: hex(0x5D7691),
        primary: hex(0x22D3EE),
        primaryHover: hex(0x06B6D4),
        primarySoft: hex(0x22D3EE, opacity: 0.12),
        accent: hex(0xBAE6FD),
        success: hex(0x2DD4BF),
        warning: hex(0xFDE68A),
        danger: hex(0xFB7185),
        chart1: hex(0x22D3EE),
        chart2: hex(0x38BDF8),
        chart3: hex(0x2DD4BF),
        chart4: hex(0x7DD3FC),
        onPrimary: hex(0x062330)
    )

    static let graphite = ThemeTokens(
        bg: hex(0x0A0A0A),
        surface: hex(0x141414),
        surfaceElev: hex(0x1C1C1C),
        border: hex(0x262626),
        borderStrong: hex(0x383838),
        textPrimary: hex(0xFAFAFA),
        textSecondary: hex(0xA3A3A3),
        textMuted: hex(0x6B6B6B),
        primary: hex(0x84CC16),
        primaryHover: hex(0x65A30D),
        primarySoft: hex(0x84CC16, opacity: 0.14),
        accent: hex(0x525252),
        success: hex(0x84CC16),
        warning: hex(0xD4D4D4),
        danger: hex(0xEF4444),
        chart1: hex(0x84CC16),
        chart2: hex(0x65A30D),
        chart3: hex(0x525252),
        chart4: hex(0xA3A3A3),
        onPrimary: hex(0x0A0A0A)
    )

    static let mono = ThemeTokens(
        bg: hex(0xFFFFFF),
        surface: hex(0xFFFFFF),
        surfaceElev: hex(0xFAFAFA),
        border: hex(0xEAEAEA),
        borderStrong: hex(0x0A0A0A),
        textPrimary: hex(0x0A0A0A),
        textSecondary: hex(0x525252),
        textMuted: hex(0xA3A3A3),
        primary: hex(0x3E5A75),
        primaryHover: hex(0x2D4660),
        primarySoft: hex(0x3E5A75, opacity: 0.08),
        accent: hex(0x525252),
        success: hex(0x3E5A75),
        warning: hex(0x525252),
        danger: hex(0x0A0A0A),
        chart1: hex(0x3E5A75),
        chart2: hex(0xA3A3A3),
        chart3: hex(0x525252),
        chart4: hex(0xD4D4D4),
        onPrimary: .white
    )
}

private func hex(_ value: UInt32, opacity: Double = 1.0) -> Color {
    let r = Double((value >> 16) & 0xFF) / 255.0
    let g = Double((value >> 8) & 0xFF) / 255.0
    let b = Double(value & 0xFF) / 255.0
    return Color(.sRGB, red: r, green: g, blue: b, opacity: opacity)
}

// MARK: - Runtime theme manager

final class ThemeManager: ObservableObject {
    static let shared = ThemeManager()

    @Published var theme: AppTheme {
        didSet {
            UserDefaults.standard.set(theme.rawValue, forKey: "petcare.theme")
        }
    }

    init() {
        let raw = UserDefaults.standard.string(forKey: "petcare.theme") ?? AppTheme.midnight.rawValue
        self.theme = AppTheme(rawValue: raw) ?? .midnight
    }

    var tokens: ThemeTokens { theme.tokens }
}

// MARK: - SwiftUI environment glue

private struct ThemeKey: EnvironmentKey {
    static let defaultValue: ThemeTokens = ThemeTokens.midnight
}

extension EnvironmentValues {
    var theme: ThemeTokens {
        get { self[ThemeKey.self] }
        set { self[ThemeKey.self] = newValue }
    }
}

