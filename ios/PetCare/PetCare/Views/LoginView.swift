import SwiftUI

struct LoginView: View {
    var authViewModel: AuthViewModel

    var body: some View {
        ZStack {
            Color.surface0.ignoresSafeArea()

            VStack(spacing: 32) {
                Spacer()

                Image(systemName: "pawprint.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(Color.accentTeal)

                Text("PetCare")
                    .font(.largeTitle).fontWeight(.bold)
                    .foregroundStyle(Color.textPrimary)

                Text("Pet Health Tracker")
                    .font(.subheadline)
                    .foregroundStyle(Color.textSecondary)

                Spacer()

                Button {
                    Task { await authViewModel.signInWithGoogle() }
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "globe")
                            .font(.title3)
                        Text("Sign in with Google")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.surface1)
                    .foregroundStyle(Color.textPrimary)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.borderDefault, lineWidth: 1)
                    )
                }
                .disabled(authViewModel.isLoading)
                .padding(.horizontal, 40)

                if authViewModel.isLoading {
                    ProgressView("Signing in...")
                        .tint(Color.accentTeal)
                        .foregroundStyle(Color.textSecondary)
                }

                if let error = authViewModel.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(Color.danger)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                }

                Spacer().frame(height: 60)
            }
        }
    }
}
