"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/shared/icon";

export function TwoFactorPreview() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-5 py-8 text-slate-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/sign-in" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl bg-violet-600 text-white">
            <Icon name="layers" />
          </span>
          Temora
        </Link>
        <span className="text-xs text-slate-500">
          Frontend preview · identity service not connected
        </span>
      </header>
      <section className="mx-auto mt-10 max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <span className="grid size-12 place-items-center rounded-xl bg-violet-50 text-violet-700">
          <Icon name="phonelink_lock" size={25} />
        </span>
        <p className="mt-5 font-mono text-xs font-semibold text-violet-700">AUTH-2FA-PREVIEW</p>
        <h1 className="mt-2 text-2xl font-bold">Two-factor authentication</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Enter a six-digit code to preview the second step of sign-in. This page does not verify
          codes or create an authenticated session.
        </p>
        <label className="mt-6 block text-sm font-medium">
          Authenticator code
          <input
            className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-center font-mono tracking-[.6em] outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            aria-label="Six-digit authenticator code"
            placeholder="000000"
          />
        </label>
        <button
          type="button"
          onClick={() => router.push("/workspace/select")}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Continue to demo workspaces <Icon name="arrow_forward" />
        </button>
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          Demo mode bypasses verification. No security check has succeeded.
        </p>
        <Link href="/sign-in" className="mt-5 inline-block text-sm font-medium text-violet-700">
          ← Back to sign in
        </Link>
      </section>
    </main>
  );
}
