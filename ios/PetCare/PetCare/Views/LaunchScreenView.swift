import SwiftUI

struct LaunchScreenView: View {
    @State private var iconScale: CGFloat = 0.5
    @State private var iconOpacity: Double = 0
    @State private var textOpacity: Double = 0
    @State private var pulseScale: CGFloat = 1.0

    var body: some View {
        ZStack {
            Color.surface0.ignoresSafeArea()

            VStack(spacing: 20) {
                Image(systemName: "pawprint.fill")
                    .font(.system(size: 72))
                    .foregroundStyle(Color.accentTeal)
                    .scaleEffect(iconScale)
                    .opacity(iconOpacity)
                    .scaleEffect(pulseScale)

                Text("PetCare")
                    .font(.title).fontWeight(.bold)
                    .foregroundStyle(Color.textPrimary)
                    .opacity(textOpacity)

                ProgressView()
                    .tint(Color.accentPink)
                    .scaleEffect(1.2)
                    .opacity(textOpacity)
                    .padding(.top, 8)
            }
        }
        .onAppear {
            // Icon flies in
            withAnimation(.spring(response: 0.6, dampingFraction: 0.6)) {
                iconScale = 1.0
                iconOpacity = 1.0
            }
            // Text fades in after icon
            withAnimation(.easeIn(duration: 0.4).delay(0.4)) {
                textOpacity = 1.0
            }
            // Gentle pulse loop
            withAnimation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true).delay(0.8)) {
                pulseScale = 1.08
            }
        }
    }
}
