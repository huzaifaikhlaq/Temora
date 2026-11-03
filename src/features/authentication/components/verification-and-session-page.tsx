"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/shared/icon";
import {
  AuthLogo,
  authInputClass,
  authPrimaryClass,
} from "@/features/authentication/components/auth-ui";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

export function VerificationAndSessionPage() {
  const router = useRouter();
  const state = useDemoState();
  const [message, setMessage] = useState("");
  const activeWorkspace = state.workspaces.find((item) => item.id === state.activeWorkspaceId);

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-5 py-8 text-slate-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <AuthLogo />
        <span className="text-xs text-slate-500">
          {activeWorkspace?.name ?? "Workspace"} · Demo preview
        </span>
      </header>
      <div className="mx-auto mt-8 grid max-w-5xl gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="grid size-12 place-items-center rounded-xl bg-violet-50 text-violet-700">
            <Icon name="mark_email_read" size={25} />
          </div>
          <p className="mt-5 font-mono text-xs font-semibold text-violet-700">AUTH-PIN-256</p>
          <h1 className="mt-2 text-2xl font-bold">Confirm your email address</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Entering a code here will not verify your email. The frontend preview does not send
            confirmation messages.
          </p>
          <label className="mt-5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            One-time passcode
            <input
              className={`${authInputClass} mt-2 text-center font-mono text-lg tracking-[.6em]`}
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
            />
          </label>
          <p className="mt-2 text-right text-xs text-slate-500">
            Resend is unavailable in preview mode
          </p>
          <button
            type="button"
            className={`${authPrimaryClass} mt-4 w-full`}
            onClick={() =>
              setMessage(
                "Preview only: email verification is not connected, so this address was not verified.",
              )
            }
          >
            Verify & access workspace <Icon name="arrow_forward" />
          </button>
          {message && (
            <p role="status" className="mt-3 text-sm text-emerald-700">
              {message}
            </p>
          )}
          <p className="mt-5 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">
            Check your spam and quarantine folders if you expected a confirmation email.
          </p>
        </section>
        <section className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="grid size-12 place-items-center rounded-xl bg-amber-50 text-amber-700">
            <Icon name="lock_clock" size={25} />
          </div>
          <p className="mt-5 font-mono text-xs font-semibold text-amber-700">
            DEMO ERROR STATE // SESSION EXPIRED SCREEN PREVIEW
          </p>
          <h2 className="mt-2 text-2xl font-bold">Session expired</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Session re-authentication is a visual preview. This application does not create server
            sessions or keep a pending unsaved buffer.
          </p>
          <div className="mt-5 rounded-lg bg-slate-50 p-3">
            <strong className="text-sm">Demo user</strong>
            <span className="block text-xs text-slate-500">
              Local frontend preview · session service unavailable
            </span>
          </div>
          <label className="mt-4 block text-sm font-medium">
            Master password
            <input className={authInputClass} type="password" placeholder="Enter your password" />
          </label>
          <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" disabled className="accent-violet-600" />
            Unsaved work cannot be recovered in this preview
          </label>
          <button
            type="button"
            className={`${authPrimaryClass} mt-4 w-full`}
            onClick={() => setMessage("Preview only: session re-authentication is not connected.")}
          >
            Re-authenticate session <Icon name="arrow_forward" />
          </button>
          <button
            type="button"
            className="mt-3 w-full text-sm text-slate-500"
            onClick={() => router.push("/workspace/select")}
          >
            Switch demo workspace
          </button>
          {message && (
            <p role="status" className="mt-3 text-sm text-emerald-700">
              {message}
            </p>
          )}
        </section>
      </div>
      <p className="mx-auto mt-6 max-w-5xl text-center font-mono text-[10px] text-slate-400">
        Preview only · no session, 2FA, or transport security is implemented here
      </p>
    </main>
  );
}
