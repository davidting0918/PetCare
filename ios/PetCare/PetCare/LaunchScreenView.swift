// LaunchScreenView — shown briefly during cold-launch token refresh.
// Stays close to the visual identity of the prototype's login screen so the
// transition into LoginView doesn't feel like a jump-cut.

import SwiftUI

struct LaunchScreenView: View {
    @Environment(\.theme) private var theme

    var body: some View {
        VStack(spacing: 14) {
            ZStack {
                LinearGradient(
                    colors: [theme.primary, theme.accent],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                Image(systemName: "pawprint.fill")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(theme.onPrimary)
            }
            .frame(width: 56, height: 56)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))

            Text("PetCare")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(theme.textPrimary)

            ProgressView()
                .tint(theme.primary)
                .padding(.top, 4)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(theme.bg)
    }
}
