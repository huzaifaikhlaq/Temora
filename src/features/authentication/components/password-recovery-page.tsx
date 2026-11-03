"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import {
  AuthLogo,
  authInputClass,
  authPrimaryClass,
} from "@/features/authentication/components/auth-ui";

export function PasswordRecoveryPage({ mode }: { mode: "forgot-password" | "reset-password" }) {
  const [step, setStep] = useState(mode === "reset-password" ? 2 : 1);
  const [message, setMessage] = useState("");

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-5 py-8 text-slate-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <AuthLogo />
        <span className="text-xs text-slate-500">
          Frontend preview · password recovery unavailable
        </span>
      </header>
      <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <div className="flex items-center gap-3 text-xs font-semibold text-violet-700">
          <span
            className={`grid size-8 place-items-center rounded-full ${step === 1 ? "bg-violet-600 text-white" : "bg-emerald-100 text-emerald-800"}`}
          >
            1
          </span>
          <span>Request reset</span>
          <span className="h-px flex-1 bg-slate-200" />
          <span
            className={`grid size-8 place-items-center rounded-full ${step === 2 ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-400"}`}
          >
            2
          </span>
          <span>Set password</span>
        </div>
        {step === 1 ? (
          <>
            <h1 className="mt-7 text-2xl font-bold">Reset your credentials</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              This screen previews the recovery flow. No email validation, SSO redirect, or recovery
              service is connected.
            </p>
            <label className="mt-6 block text-sm font-medium">
              Work email address
              <input className={authInputClass} type="email" placeholder="you@company.com" />
            </label>
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              <Icon name="verified_user" size={16} className="mr-1 inline" />
              Demo preview · no tenant or email is verified
            </div>
            <button
              type="button"
              className={`${authPrimaryClass} mt-5 w-full`}
              onClick={() => {
                setStep(2);
                setMessage(
                  "Preview only: no recovery email or OTP was sent. Password recovery is not connected.",
                );
              }}
            >
              Send secure recovery link & OTP <Icon name="send" />
            </button>
            {message && (
              <p role="status" className="mt-3 text-sm text-emerald-700">
                {message}
              </p>
            )}
            <p className="mt-3 text-xs text-slate-500">
              Continue the visual flow on the separate screen:{" "}
              <Link href="/reset-password" className="font-medium text-violet-700 underline">
                Preview reset password
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-7 text-2xl font-bold">Set a new master password</h1>
            <p className="mt-2 text-sm text-slate-500">
              Enter your six-digit token and configure a new password for your account.
            </p>
            <label className="mt-5 block text-sm font-medium">
              6-digit security token
              <input
                className={`${authInputClass} font-mono tracking-[.45em]`}
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
              />
            </label>
            <label className="mt-4 block text-sm font-medium">
              New master password
              <input className={authInputClass} type="password" placeholder="12+ characters" />
            </label>
            <label className="mt-4 block text-sm font-medium">
              Confirm new password
              <input
                className={authInputClass}
                type="password"
                placeholder="Repeat your password"
              />
            </label>
            <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              Password validation is unavailable in this frontend preview.
              <span className="block text-xs">
                No password is stored or changed by these controls.
              </span>
            </div>
            <button
              type="button"
              className={`${authPrimaryClass} mt-5 w-full`}
              onClick={() =>
                setMessage(
                  "Preview only: no password service is connected, so no password was changed.",
                )
              }
            >
              Update password & authenticate <Icon name="arrow_forward" />
            </button>
            {message && (
              <p role="status" className="mt-3 text-sm text-emerald-700">
                {message}{" "}
                <Link href="/sign-in" className="font-semibold underline">
                  Sign in
                </Link>
              </p>
            )}
            <button
              type="button"
              className="mt-4 text-sm text-violet-700"
              onClick={() => setStep(1)}
            >
              ← Back to stage 1
            </button>
          </>
        )}
        <div className="mt-7 border-t border-slate-100 pt-4 text-center">
          <Link href="/sign-in" className="text-sm font-medium text-violet-700">
            ← Back to sign in
          </Link>
          <p className="mt-4 text-xs text-slate-400">
            Frontend preview · password recovery service not connected
          </p>
        </div>
      </div>
    </main>
  );
}
