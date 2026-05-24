// LoginView — screen 01 from the prototype. OAuth-only (no email/password).

import SwiftUI
import UIKit

struct LoginView: View {
    @EnvironmentObject var auth: AuthStore
    @Environment(\.theme) private var theme

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Logo + name
                HStack(spacing: 12) {
                    ZStack {
                        LinearGradient(
                            colors: [theme.primary, theme.accent],
                            startPoint: .topLeading, endPoint: .bottomTrailing
                        )
                        Image(systemName: "pawprint.fill")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(theme.onPrimary)
                    }
                    .frame(width: 44, height: 44)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                    VStack(alignment: .leading, spacing: 1) {
                        Text("PetCare")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(theme.textPrimary)
                        Text("A shared home for your animals")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(theme.textMuted)
                    }
                    Spacer()
                }
                .padding(.top, 40)
                .padding(.bottom, 48)

                Text("Welcome back")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(theme.textPrimary)
                    .padding(.bottom, 8)
                Text("Sign in to keep tracking your pets' meals, weight, and meds with your family.")
                    .font(.system(size: 15))
                    .foregroundStyle(theme.textSecondary)
                    .padding(.bottom, 40)

                VStack(spacing: 12) {
                    GhostButton(
                        leading: { GoogleGlyph() },
                        title: "Continue with Google"
                    ) {
                        guard let presenter = UIViewController.topMostPresenter else { return }
                        Task { await auth.signInWithGoogle(presenting: presenter) }
                    }

                    GhostButton(
                        leading: { Image(systemName: "apple.logo").font(.system(size: 14, weight: .semibold)) },
                        title: "Continue with Apple"
                    ) {
                        Task { await auth.signInWithApple() }
                    }
                }
                .padding(.bottom, 24)

                if let err = auth.errorMessage {
                    Text(err)
                        .font(.system(size: 12))
                        .foregroundStyle(theme.danger)
                        .padding(.bottom, 12)
                }

                HStack(spacing: 16) {
                    Rectangle().fill(theme.border).frame(height: 1)
                    Text("or")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(theme.textMuted)
                    Rectangle().fill(theme.border).frame(height: 1)
                }
                .padding(.bottom, 24)

                Text("Email / password sign-in is no longer supported in PetCare. Use Google or Apple Sign-In above.")
                    .font(.system(size: 13))
                    .foregroundStyle(theme.textMuted)
                    .multilineTextAlignment(.leading)
            }
            .padding(.horizontal, 28)
            .padding(.bottom, 48)
        }
        .background(theme.bg)
        .scrollDismissesKeyboard(.interactively)
        .overlay {
            if auth.inFlight {
                ProgressView().tint(theme.primary)
            }
        }
    }
}

// MARK: - Ghost button used for the OAuth rows

private struct GhostButton<Leading: View>: View {
    let leading: () -> Leading
    let title: String
    let action: () -> Void
    @Environment(\.theme) private var theme

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                leading()
                Text(title)
                    .font(.system(size: 15, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color.clear)
            .foregroundStyle(theme.textPrimary)
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(theme.borderStrong, lineWidth: 1)
            )
        }
    }
}

private struct GoogleGlyph: View {
    var body: some View {
        // Compact "G" mark in the canonical multi-color palette.
        ZStack {
            Circle().fill(Color(red: 0.95, green: 0.97, blue: 1.0))
            Text("G")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.red, .orange, .green, .blue],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    )
                )
        }
        .frame(width: 18, height: 18)
    }
}

// MARK: - Top-most-VC helper (for GoogleSignIn presenter)

extension UIViewController {
    static var topMostPresenter: UIViewController? {
        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }
        let root = scene?.windows.first { $0.isKeyWindow }?.rootViewController
        var top = root
        while let presented = top?.presentedViewController {
            top = presented
        }
        return top
    }
}
