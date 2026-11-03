"use client";

import Link from "next/link";
import { Icon } from "@/components/shared/icon";

export default function DashboardError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-8">
      <section className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-700">
          <Icon name="error_outline" size={28} />
        </span>
        <p className="mt-5 font-mono text-xs font-semibold uppercase tracking-widest text-red-700">
          Workspace page error
        </p>
        <h1 className="mt-2 text-2xl font-bold">This page couldn’t load</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">
          The workspace preview hit an unexpected error. Try loading the page again or return to the
          overview.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-strong"
          >
            <Icon name="refresh" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-semibold"
          >
            Return to overview
          </Link>
        </div>
      </section>
    </div>
  );
}
