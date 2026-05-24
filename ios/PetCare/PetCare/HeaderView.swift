// Shared header / chrome components used across screens.
//
// File slot name (`HeaderView.swift`) is historical from the previous PetCare
// build; we reuse it for these small reusable pieces so we don't have to add
// new files to the Xcode project.
//
// Contents:
//   - ScreenHeader              — title + subtitle + trailing icon, used at
//                                 the top of every tab screen.
//   - SectionLabel              — small uppercase tracking label.
//   - Chip / Pill               — used in filter strips and tags.
//   - SegPicker                 — the pill segmented control (e.g. 7D/30D/90D).
//   - CardSurface               — themed container with the standard border.
//   - StatTile                  — 4-up tile used on the Pet Detail header.
//   - FloatingActionButton      — the FAB.

import SwiftUI

// MARK: - ScreenHeader

struct ScreenHeader<Trailing: View>: View {
    let kicker: String?
    let title: String
    let trailing: () -> Trailing
    @Environment(\.theme) private var theme

    init(kicker: String? = nil,
         title: String,
         @ViewBuilder trailing: @escaping () -> Trailing = { EmptyView() }) {
        self.kicker = kicker
        self.title = title
        self.trailing = trailing
    }

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 2) {
                if let kicker = kicker {
                    Text(kicker)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(theme.textMuted)
                }
                Text(title)
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(theme.textPrimary)
            }
            Spacer()
            trailing()
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
        .padding(.bottom, 16)
    }
}

// MARK: - SectionLabel

struct SectionLabel: View {
    let text: String
    @Environment(\.theme) private var theme

    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 11, weight: .semibold))
            .tracking(0.6)
            .foregroundStyle(theme.textMuted)
    }
}

// MARK: - Chip / Pill

struct Chip: View {
    let label: String
    let active: Bool
    @Environment(\.theme) private var theme

    init(_ label: String, active: Bool = false) {
        self.label = label
        self.active = active
    }

    var body: some View {
        Text(label)
            .font(.system(size: 12, weight: .medium))
            .padding(.horizontal, 12).padding(.vertical, 6)
            .background(active ? theme.primarySoft : theme.surface)
            .foregroundStyle(active ? theme.primary : theme.textSecondary)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(active ? Color.clear : theme.border, lineWidth: 1))
    }
}

struct Pill: View {
    let label: String
    var color: Color? = nil
    var bg: Color? = nil
    @Environment(\.theme) private var theme

    var body: some View {
        Text(label)
            .font(.system(size: 11, weight: .semibold))
            .tracking(0.2)
            .padding(.horizontal, 12).padding(.vertical, 6)
            .background(bg ?? theme.primarySoft)
            .foregroundStyle(color ?? theme.primary)
            .clipShape(Capsule())
    }
}

// MARK: - SegPicker

struct SegPicker<Value: Hashable>: View {
    @Binding var selection: Value
    let options: [(Value, String)]
    @Environment(\.theme) private var theme

    var body: some View {
        HStack(spacing: 4) {
            ForEach(options, id: \.0) { item in
                let active = selection == item.0
                Button { selection = item.0 } label: {
                    Text(item.1)
                        .font(.system(size: 13, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 7)
                        .background(active ? theme.surface : Color.clear)
                        .foregroundStyle(active ? theme.textPrimary : theme.textSecondary)
                        .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(4)
        .background(theme.surfaceElev)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(theme.border, lineWidth: 1)
        )
    }
}

// MARK: - CardSurface (used heavily by screens)

struct CardSurface<Content: View>: View {
    var padding: CGFloat = 18
    var elevated: Bool = false
    @ViewBuilder var content: () -> Content
    @Environment(\.theme) private var theme

    var body: some View {
        content()
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(elevated ? theme.surfaceElev : theme.surface)
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(theme.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

// MARK: - StatTile (4-up tile on Pet Detail)

struct StatTile: View {
    let label: String
    let value: String
    let unit: String?
    @Environment(\.theme) private var theme

    var body: some View {
        VStack(spacing: 4) {
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(theme.textMuted)
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(value)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(theme.textPrimary)
                if let unit = unit {
                    Text(unit)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(theme.textMuted)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(theme.surface)
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(theme.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

// MARK: - FloatingActionButton

struct FloatingActionButton: View {
    let icon: String
    let action: () -> Void
    @Environment(\.theme) private var theme

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(theme.onPrimary)
                .frame(width: 56, height: 56)
                .background(theme.primary)
                .clipShape(Circle())
                .shadow(color: theme.primary.opacity(0.45), radius: 14, y: 8)
        }
    }
}

// MARK: - Icon button (round secondary button used in headers)

struct IconButton: View {
    let icon: String
    let action: () -> Void
    @Environment(\.theme) private var theme

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(theme.textSecondary)
                .frame(width: 36, height: 36)
                .background(theme.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(theme.border, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }
}

// MARK: - Date formatters used across screens

enum AppFormat {
    static func dayMonthYear(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "EEEE, MMM d"
        return f.string(from: date)
    }

    static func shortDay(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "MMM dd"
        return f.string(from: date)
    }

    static func time(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        return f.string(from: date)
    }

    static func relative(_ date: Date) -> String {
        let f = RelativeDateTimeFormatter()
        f.unitsStyle = .abbreviated
        return f.localizedString(for: date, relativeTo: Date())
    }
}
