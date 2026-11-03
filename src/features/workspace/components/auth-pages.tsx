"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/shared/icon";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";
import { PasswordRecoveryPage } from "@/features/authentication/components/password-recovery-page";
import { VerificationAndSessionPage } from "@/features/authentication/components/verification-and-session-page";
import { WorkspaceSelectionPage } from "@/features/authentication/components/workspace-selection-page";
import { WorkspaceOnboardingPage } from "@/features/authentication/components/workspace-onboarding-page";

const input =
  "mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500";
const primary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700";

export function AuthPage({
  mode,
}: {
  mode:
    | "sign-in"
    | "workspace-select"
    | "onboarding"
    | "sign-up"
    | "forgot-password"
    | "reset-password"
    | "verify-email";
}) {
  const router = useRouter();
  const demoState = useDemoState();
  const [message, setMessage] = useState("");
  const [method, setMethod] = useState("Email & 2FA");

  const logo = (
    <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
      <span className="grid size-9 place-items-center rounded-xl bg-violet-600 text-white">
        <Icon name="layers" />
      </span>
      Temora
    </Link>
  );

  if (mode === "sign-in")
    return (
      <main className="min-h-screen bg-[#f7f8fc] text-slate-900">
        <header className="flex items-center justify-between px-6 py-5 lg:px-12">
          {logo}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="hidden sm:inline">
              Frontend preview · identity provider not connected
            </span>
            <span className="flex items-center gap-1">
              <Icon name="verified_user" size={16} />
              Demo mode
            </span>
          </div>
        </header>
        <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-14 pt-6 lg:grid-cols-[1fr_1fr] lg:items-start lg:pt-12">
          <section className="rounded-2xl bg-[#17152c] p-7 text-white sm:p-10">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
              NORTHSTAR STUDIO · CURRENT DEMO WORKSPACE
            </span>
            <h1 className="mt-8 max-w-lg text-3xl font-bold leading-tight sm:text-4xl">
              Your team’s work, in one focused space.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/65">
              Sign in to Northstar Studio to continue planning, collaborating, and delivering
              together.
            </p>
            <div className="mt-10 space-y-4">
              {[
                ["preview", "Workspace state stored in this browser"],
                ["shield", "No real authentication or access control"],
                ["sync", "No backend service is connected"],
              ].map(([i, t]) => (
                <div key={t} className="flex items-center gap-3 text-sm text-white/80">
                  <Icon name={i} className="text-violet-300" />
                  {t}
                </div>
              ))}
            </div>
            <div className="mt-14 rounded-xl border border-white/10 bg-white/5 p-4">
              <span className="text-xs text-white/50">WORKSPACE</span>
              <p className="mt-1 font-semibold">
                {demoState.workspaces.find((item) => item.id === demoState.activeWorkspaceId)?.name}
              </p>
              <p className="text-xs text-white/60">Active demo workspace</p>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-bold">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a sign-in method for this frontend preview.
            </p>
            <div className="mt-6 flex rounded-lg bg-slate-100 p-1">
              {["Email & 2FA", "Enterprise SSO"].map((v) => (
                <button
                  key={v}
                  onClick={() => setMethod(v)}
                  className={`flex-1 rounded-md px-2 py-2 text-sm ${method === v ? "bg-white font-semibold shadow-sm" : "text-slate-500"}`}
                >
                  {v}
                </button>
              ))}
            </div>
            {method === "Email & 2FA" ? (
              <div className="mt-5 space-y-4">
                <label className="block text-sm font-medium">
                  Work email
                  <input className={input} type="email" defaultValue="alex@northstar.studio" />
                </label>
                <label className="block text-sm font-medium">
                  Password
                  <input className={input} type="password" placeholder="Enter your password" />
                </label>
                <div className="rounded-lg bg-violet-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-violet-900">
                    <Icon name="phonelink_lock" />
                    Two-Factor Authentication
                  </div>
                  <p className="mt-1 text-xs text-violet-800">
                    Enter the 6-digit key from your authenticator app.
                  </p>
                  <input
                    className={`${input} text-center font-mono tracking-[.5em]`}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  <input type="checkbox" className="accent-violet-600" />
                  Trust this device for 30 days
                </label>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-slate-200 p-5">
                <p className="font-semibold">Organization SSO</p>
                <p className="mt-1 text-sm text-slate-500">
                  Sign in with your organization’s identity provider.
                </p>
                <label className="mt-4 block text-sm">
                  Organization domain
                  <input className={input} placeholder="company.com" />
                </label>
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-violet-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <p className="mt-2 text-right text-xs text-slate-500">
              Need the separate code preview?{" "}
              <Link href="/verify-2fa" className="font-medium text-violet-700 hover:underline">
                Open 2FA step
              </Link>
            </p>
            <button
              className={`${primary} mt-5 w-full`}
              type="button"
              onClick={() => router.push("/workspace/select")}
            >
              Continue to demo workspaces <Icon name="arrow_forward" />
            </button>
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              Frontend preview only. Credentials, two-factor codes, SSO, and sessions are not
              verified by a service.
            </p>
            {message && (
              <p role="status" className="mt-3 text-sm text-violet-700">
                {message}
              </p>
            )}
            <p className="mt-5 text-center text-xs text-slate-500">
              Identity and multi-factor checks are not connected in this preview.
            </p>
            <p className="mt-4 text-center text-sm text-slate-500">
              New to Temora?{" "}
              <Link href="/sign-up" className="font-semibold text-violet-700">
                Create an account
              </Link>
            </p>
          </section>
        </div>
      </main>
    );

  if (mode === "sign-up")
    return (
      <main className="min-h-screen bg-[#f7f8fc] px-5 py-8 text-slate-900">
        <header className="mx-auto flex max-w-6xl items-center justify-between">
          {logo}
          <span className="text-xs text-slate-500">
            Frontend preview · no identity provider connected
          </span>
        </header>
        <div className="mx-auto mt-8 grid max-w-6xl gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <section className="rounded-2xl bg-[#17152c] p-7 text-white sm:p-9">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs">DEMO PREVIEW</span>
            <h1 className="mt-7 text-3xl font-bold leading-tight">Create your Temora workspace</h1>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Preview account and workspace setup with browser-local demo data.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {["Google Workspace", "GitHub", "SSO"].map((x) => (
                <button
                  key={x}
                  className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
                  onClick={() =>
                    setMessage(`${x} sign-up is a preview only; no external provider is connected.`)
                  }
                >
                  Continue with {x}
                </button>
              ))}
            </div>
            <div className="my-6 flex items-center gap-3 text-xs text-white/40">
              <span className="h-px flex-1 bg-white/20" />
              OR USE WORK EMAIL
              <span className="h-px flex-1 bg-white/20" />
            </div>
            <div className="space-y-3">
              {[
                ["lock", "Browser-local demo data"],
                ["verified_user", "No external identity provider"],
                ["shield", "No security or compliance certification claimed"],
              ].map(([i, t]) => (
                <div key={t} className="flex items-center gap-2 text-sm text-white/75">
                  <Icon name={i} />
                  {t}
                </div>
              ))}
            </div>
            <p className="mt-8 text-xs leading-5 text-white/50">
              Demo data is stored in this browser and does not provide tenant security or account
              isolation.
            </p>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold">Get started</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create your account and workspace in a few steps.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Full name
                <input className={input} placeholder="Alex Morgan" />
              </label>
              <label className="text-sm font-medium">
                Work email
                <input className={input} type="email" placeholder="you@company.com" />
              </label>
              <label className="text-sm font-medium">
                Password
                <input className={input} type="password" placeholder="12+ characters" />
              </label>
              <label className="text-sm font-medium">
                Workspace URL
                <div className="flex items-center">
                  <span className="mt-1 rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 px-2.5 py-3 text-[11px] text-slate-500">
                    https://
                  </span>
                  <input className={`${input} min-w-0 rounded-l-none`} placeholder="your-team" />
                  <span className="mt-1 rounded-r-lg border border-l-0 border-slate-200 bg-slate-50 px-2.5 py-3 text-[11px] text-slate-500">
                    .temora.app
                  </span>
                </div>
              </label>
            </div>
            <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
              <Icon name="check_circle" size={16} className="mr-1 inline" />
              Password strength is not checked. This preview does not create an account or store
              credentials.
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              You can invite teammates and map custom domains after onboarding.
            </p>
            <label className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-600">
              <input type="checkbox" className="mt-1 accent-violet-600" />I agree to the{" "}
              <a href="#msa" className="font-semibold text-violet-700">
                Master Services Agreement
              </a>{" "}
              and acknowledge the Privacy Policy.
            </label>
            <label className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-600">
              <input type="checkbox" className="mt-1 accent-violet-600" />
              Send me security bulletins, sprint velocity reports, and release notes.
            </label>
            <button
              className={`${primary} mt-5 w-full`}
              onClick={() => router.push("/workspace/setup")}
            >
              Continue with demo setup <Icon name="arrow_forward" />
            </button>
            {message && (
              <p role="status" className="mt-3 text-sm text-violet-700">
                {message}{" "}
                <Link href="/workspace/setup" className="font-semibold underline">
                  Continue setup
                </Link>
              </p>
            )}
            <p className="mt-4 text-center text-sm text-slate-500">
              Already have an organization?{" "}
              <Link className="font-semibold text-violet-700" href="/sign-in">
                Sign in
              </Link>
            </p>
          </section>
        </div>
      </main>
    );

  if (mode === "forgot-password" || mode === "reset-password")
    return <PasswordRecoveryPage mode={mode} />;

  if (mode === "verify-email") return <VerificationAndSessionPage />;

  if (mode === "workspace-select") return <WorkspaceSelectionPage />;

  if (mode === "onboarding") return <WorkspaceOnboardingPage />;

  return null;
}
