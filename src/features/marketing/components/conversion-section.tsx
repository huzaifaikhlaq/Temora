"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { Icon } from "@/components/shared/icon";

export function ConversionSection() {
  const router = useRouter();

  function startTrial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    if (email) {
      try {
        window.sessionStorage.setItem("temora:pending-signup-email", email);
      } catch {
        // Continue to signup even when browser storage is disabled.
      }
    }
    router.push("/sign-up");
  }

  return (
    <section id="pricing" aria-labelledby="conversion-title" className="scroll-mt-24 mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
      <div id="contact" className="relative overflow-hidden rounded-3xl bg-[#2d303a] px-5 py-12 text-center text-white shadow-[0_2rem_4rem_rgba(24,27,36,0.2)] sm:px-10 sm:py-16 lg:px-20 lg:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute -top-32 left-1/2 h-[22rem] w-[44rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#635bff]/40 via-[#493ee5]/20 to-transparent blur-3xl" />
        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#c3c0ff]">Start in Seconds</span>
          <h2 id="conversion-title" className="mt-4 text-balance text-3xl font-bold leading-tight tracking-[-0.035em] sm:text-4xl lg:text-[46px]">
            Ready to build with mathematical precision?
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
            Join over 4,500+ engineering teams shipping faster with Temora. Free 14-day trial on Pro. No credit card required.
          </p>

          <form onSubmit={startTrial} className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row" aria-labelledby="conversion-title">
            <label htmlFor="trial-email" className="sr-only">Work email address</label>
            <input
              id="trial-email"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="email"
              required
              placeholder="name@company.com"
              className="min-h-12 min-w-0 flex-1 rounded-lg border border-white/15 bg-white/10 px-4 text-base text-white placeholder:text-white/40 focus-visible:border-[#c3c0ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c3c0ff]"
            />
            <button type="submit" className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-lg bg-[#635bff] px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#493ee5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c3c0ff]">
              Get Started Free
            </button>
          </form>

          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/65">
            <li className="inline-flex items-center gap-1.5"><Icon name="verified" size={16} className="text-[#85f8c4]" />Free 14-day trial</li>
            <li className="inline-flex items-center gap-1.5"><Icon name="lock" size={16} className="text-[#85f8c4]" />SOC-2 Type II Certified</li>
            <li className="inline-flex items-center gap-1.5"><Icon name="sync" size={16} className="text-[#85f8c4]" />1-Click Jira / Linear Migration</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
