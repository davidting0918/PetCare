import SwiftUI

// MARK: - Design tokens matching frontend/src/styles/tokens.css

extension Color {
    // MARK: Surfaces (background layers, deepest → highest)
    static let surface0 = Color(red: 14/255, green: 18/255, blue: 24/255)
    static let surface1 = Color(red: 26/255, green: 31/255, blue: 43/255)
    static let surface2 = Color(red: 36/255, green: 41/255, blue: 56/255)
    static let surface3 = Color(red: 46/255, green: 52/255, blue: 74/255)

    // MARK: Borders
    static let borderSubtle = Color(red: 38/255, green: 44/255, blue: 57/255)
    static let borderDefault = Color(red: 51/255, green: 57/255, blue: 73/255)
    static let borderStrong = Color(red: 74/255, green: 80/255, blue: 102/255)

    // MARK: Text
    static let textPrimary = Color(red: 245/255, green: 247/255, blue: 250/255)
    static let textSecondary = Color(red: 142/255, green: 148/255, blue: 166/255)
    static let textTertiary = Color(red: 93/255, green: 99/255, blue: 120/255)
    static let textDisabled = Color(red: 61/255, green: 66/255, blue: 84/255)

    // MARK: Accents
    static let accentPink = Color(red: 255/255, green: 45/255, blue: 135/255)
    static let accentPinkHover = Color(red: 255/255, green: 75/255, blue: 155/255)
    static let accentTeal = Color(red: 16/255, green: 217/255, blue: 176/255)
    static let accentTealHover = Color(red: 36/255, green: 237/255, blue: 196/255)
    static let accentPurple = Color(red: 168/255, green: 85/255, blue: 247/255)
    static let accentPurpleHover = Color(red: 188/255, green: 105/255, blue: 255/255)
    static let accentBlue = Color(red: 59/255, green: 130/255, blue: 246/255)
    static let accentBlueHover = Color(red: 79/255, green: 150/255, blue: 255/255)

    // MARK: Chart series (muted palette for data-viz)
    static let chartPink = Color(red: 196/255, green: 110/255, blue: 142/255)
    static let chartTeal = Color(red: 78/255, green: 172/255, blue: 152/255)
    static let chartPurple = Color(red: 148/255, green: 118/255, blue: 198/255)
    static let chartBlue = Color(red: 96/255, green: 138/255, blue: 196/255)
    static let chartGray = Color(red: 100/255, green: 106/255, blue: 130/255)

    // MARK: Semantic
    static let success = accentTeal
    static let info = accentBlue
    static let warning = Color(red: 245/255, green: 158/255, blue: 11/255)
    static let danger = Color(red: 239/255, green: 68/255, blue: 68/255)
}
