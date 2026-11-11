
"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  authClient,
} from "@/features/authentication/lib/auth-client";

import { AuthLogo } from
  "@/features/authentication/components/auth-ui";

import { WorkspaceSelectionPage } from
  "@/features/authentication/components/workspace-selection-page";

import { WorkspaceOnboardingPage } from
  "@/features/authentication/components/workspace-onboarding-page";

type AuthMode =
  | "sign-in"
  | "sign-up"
  | "forgot-password"
  | "reset-password"
  | "verify-email"
  | "workspace-select"
  | "onboarding";

const input =
  "mt-1 h-11 w-full rounded-lg border border-slate-200 " +
  "bg-white px-3 text-sm outline-none focus:border-violet-500 " +
  "focus:ring-1 focus:ring-violet-500";

const primary =
  "inline-flex h-11 items-center justify-center rounded-lg " +
  "bg-violet-600 px-4 text-sm font-semibold text-white " +
  "hover:bg-violet-700 disabled:opacity-50";

function PasswordVisibilityToggle({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={visible ? "Hide password" : "Show password"}
      aria-pressed={visible}
      onClick={onToggle}
      className="absolute right-0 top-1 flex h-11 w-11 items-center justify-center text-slate-500 hover:text-slate-700"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        {visible ? (
          <>
            <path d="M2.25 12s3.5-6.75 9.75-6.75S21.75 12 21.75 12s-3.5 6.75-9.75 6.75S2.25 12 2.25 12Z" />
            <circle cx="12" cy="12" r="3" />
          </>
        ) : (
          <>
            <path d="M3 3l18 18" />
            <path d="M10.6 5.35A10.8 10.8 0 0 1 12 5.25c6.25 0 9.75 6.75 9.75 6.75a16.8 16.8 0 0 1-3.1 3.9M6.2 6.2C3.6 7.9 2.25 12 2.25 12s3.5 6.75 9.75 6.75c1.3 0 2.45-.35 3.45-.9" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          </>
        )}
      </svg>
    </button>
  );
}

function getError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong.";
}

function AuthFormFallback() {
  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <header className="px-6 py-5 lg:px-12">
        <AuthLogo />
      </header>
      <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-14 pt-6 lg:grid-cols-2 lg:items-start lg:pt-12">
        <div className="min-h-64 animate-pulse rounded-2xl bg-[#17152c]" />
        <div className="min-h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </div>
    </main>
  );
}

function AuthForm({
  mode,
}: {
  mode: Exclude<
    AuthMode,
    "workspace-select" | "onboarding"
  >;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token") ?? "";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [passwordVisible, setPasswordVisible] =
    useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isLogin = mode === "sign-in";
  const isRegister = mode === "sign-up";

  const title: Record<string, string> = {
    "sign-in": "Welcome back",
    "sign-up": "Create your account",
    "forgot-password": "Forgot your password?",
    "reset-password": "Set a new password",
    "verify-email": "Verify your email",
  };

  const buttonText: Record<string, string> = {
    "sign-in": "Sign in",
    "sign-up": "Create account",
    "forgot-password": "Send reset link",
    "reset-password": "Reset password",
    "verify-email": "Verify email",
  };

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (isLogin) {
        await authClient.login({
          email,
          password,
        });

        // Workspace service is still in demo mode.
        // Authentication itself is now real.
        router.replace("/workspace/select");
        router.refresh();
        return;
      }

      if (isRegister) {
        await authClient.register({
          full_name: fullName,
          email,
          password,
        });

        setMessage(
          "If eligible, a verification link will " +
          "be sent to your email. Check the email " +
          "service logs during local development."
        );

        return;
      }

      if (mode === "forgot-password") {
        const response =
          await authClient.forgotPassword(email);

        setMessage(response.message);
        return;
      }

      if (mode === "verify-email") {
        if (!token) {
          throw new Error(
            "The verification link is missing its token."
          );
        }

        const response =
          await authClient.verifyEmail(token);

        setMessage(response.message);
        return;
      }

      if (mode === "reset-password") {
        if (!token) {
          throw new Error(
            "The reset link is missing its token."
          );
        }

        if (password !== confirmPassword) {
          throw new Error(
            "Passwords do not match."
          );
        }

        const response =
          await authClient.resetPassword(
            token,
            password
          );

        setMessage(response.message);
      }
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <header className="px-6 py-5 lg:px-12">
        <AuthLogo />
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-14 pt-6 lg:grid-cols-2 lg:items-start lg:pt-12">
        <section className="rounded-2xl bg-[#17152c] p-7 text-white sm:p-10">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
            TEMORA WORKSPACE
          </span>

          <h1 className="mt-8 text-3xl font-bold leading-tight sm:text-4xl">
            Your team's work, in one focused space.
          </h1>

          <p className="mt-4 max-w-md text-sm leading-6 text-white/65">
            Plan projects, manage tasks, and collaborate
            across your organization with Temora.
          </p>

          <div className="mt-10 space-y-4 text-sm text-white/75">
            <p>Secure email and password authentication</p>
            <p>Verified account access</p>
            <p>Session management</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold">
            {title[mode]}
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {isLogin
              ? "Sign in to your Temora account."
              : isRegister
                ? "Register using your work email."
                : "Complete the requested security step."}
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-4"
          >
            {isRegister && (
              <label className="block text-sm font-medium">
                Full name
                <input
                  className={input}
                  value={fullName}
                  onChange={(event) =>
                    setFullName(event.target.value)
                  }
                  minLength={2}
                  maxLength={150}
                  autoComplete="name"
                  required
                />
              </label>
            )}

            {(isLogin ||
              isRegister ||
              mode === "forgot-password") && (
                <label className="block text-sm font-medium">
                  Email address
                  <input
                    className={input}
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    autoComplete="email"
                    required
                  />
                </label>
              )}

            {(isLogin ||
              isRegister ||
              mode === "reset-password") && (
                <label className="block text-sm font-medium">
                  Password
                  <div className="relative">
                    <input
                      className={`${input} pr-11`}
                      type={passwordVisible ? "text" : "password"}
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      autoComplete={
                        isLogin
                          ? "current-password"
                          : "new-password"
                      }
                      minLength={
                        isLogin ? undefined : 12
                      }
                      required
                    />
                    <PasswordVisibilityToggle
                      visible={passwordVisible}
                      onToggle={() =>
                        setPasswordVisible(!passwordVisible)
                      }
                    />
                  </div>
                </label>
              )}

            {mode === "reset-password" && (
              <label className="block text-sm font-medium">
                Confirm password
                <div className="relative">
                  <input
                    className={`${input} pr-11`}
                    type={
                      confirmPasswordVisible
                        ? "text"
                        : "password"
                    }
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    autoComplete="new-password"
                    minLength={12}
                    required
                  />
                  <PasswordVisibilityToggle
                    visible={confirmPasswordVisible}
                    onToggle={() =>
                      setConfirmPasswordVisible(
                        !confirmPasswordVisible
                      )
                    }
                  />
                </div>
              </label>
            )}

            {(mode === "verify-email" ||
              mode === "reset-password") && (
                <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  {token
                    ? "A token was found in your link."
                    : "No token was found. Open the link from your verification or recovery email."}
                </p>
              )}

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            {message && (
              <p
                role="status"
                className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`${primary} w-full`}
            >
              {loading
                ? "Please wait..."
                : buttonText[mode]}
            </button>
          </form>

          {isLogin && (
            <p className="mt-4 text-right text-sm">
              <Link
                href="/forgot-password"
                className="font-medium text-violet-700"
              >
                Forgot password?
              </Link>
            </p>
          )}

          {isRegister && (
            <p className="mt-5 text-center text-sm text-slate-500">
              Already registered?{" "}
              <Link
                href="/sign-in"
                className="font-semibold text-violet-700"
              >
                Sign in
              </Link>
            </p>
          )}

          {isLogin && (
            <p className="mt-5 text-center text-sm text-slate-500">
              New to Temora?{" "}
              <Link
                href="/sign-up"
                className="font-semibold text-violet-700"
              >
                Create an account
              </Link>
            </p>
          )}

          {!isLogin && !isRegister && (
            <p className="mt-5 text-center text-sm">
              <Link
                href="/sign-in"
                className="font-semibold text-violet-700"
              >
                Back to sign in
              </Link>
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

export function AuthPage({
  mode,
}: {
  mode: AuthMode;
}) {
  if (mode === "workspace-select") {
    return <WorkspaceSelectionPage />;
  }

  if (mode === "onboarding") {
    return <WorkspaceOnboardingPage />;
  }

  return (
    <Suspense fallback={<AuthFormFallback />}>
      <AuthForm mode={mode} />
    </Suspense>
  );
}
