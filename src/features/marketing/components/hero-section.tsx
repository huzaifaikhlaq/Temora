import Link from "next/link";
import { Icon } from "@/components/shared/icon";

const trustPoints = [
  { icon: "verified", label: "Zero credit card required" },
  { icon: "bolt", label: "Sub-second setup" },
  { icon: "lock", label: "SOC-2 Type II Certified" },
];

const partners = [
  { icon: "change_history", name: "Vercel" },
  { icon: "bolt", name: "Supabase" },
  { icon: "pets", name: "Datadog" },
  { icon: "credit_card", name: "Stripe" },
  { icon: "cloud", name: "Cloudflare" },
  { icon: "insights", name: "Linear" },
  { icon: "widgets", name: "Retool" },
];

export function HeroSection() {
  return (
    <section className="relative mx-auto flex max-w-7xl flex-col items-center px-5 pb-14 pt-12 text-center sm:px-8 lg:px-12 lg:pb-20 lg:pt-20">
      <a
        id="changelog"
        href="#features"
        className="group mb-8 inline-flex max-w-full items-center gap-2 rounded-full bg-[#ecedfa] px-3.5 py-2 text-left shadow-sm transition-colors hover:bg-[#e6e7f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className="size-2 shrink-0 rounded-full bg-[#635bff]" aria-hidden="true" />
        <span className="hidden text-sm text-[#181b24] sm:inline" aria-hidden="true">
          ✦
        </span>
        <span className="font-mono text-[10px] font-medium tracking-tight text-[#464555] sm:text-[11px]">
          Temora 2.4 is Live · Cryptographic Audit Trails &amp; JQL Query Builder
        </span>
        <Icon
          name="arrow_forward"
          size={16}
          className="shrink-0 text-[#635bff] transition-transform group-hover:translate-x-0.5"
        />
      </a>

      <h1 className="max-w-5xl text-balance text-4xl font-bold leading-[1.08] tracking-[-0.04em] text-[#181b24] sm:text-5xl lg:text-6xl">
        Project intelligence engineered for{" "}
        <span className="bg-gradient-to-r from-[#493ee5] via-[#635bff] to-[#4b41e1] bg-clip-text text-transparent">
          precision
        </span>
        .
      </h1>
      <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-[#464555] sm:text-lg sm:leading-8">
        Replace disjointed issue trackers and sluggish roadmaps. Temora unifies Kanban sprint
        cycles, directed acyclic dependency graphs, and SOC-2 enterprise compliance in one
        blazing-fast workspace.
      </p>

      <div className="mt-9 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
        <Link
          href="/sign-up"
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-[#635bff] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-[#635bff]/20 transition hover:-translate-y-0.5 hover:bg-[#493ee5] hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span>Start Free 14-Day Trial</span>
          <kbd className="rounded bg-white/20 px-2 py-0.5 font-mono text-[10px] text-white">⌘K</kbd>
        </Link>
        <a
          href="#contact"
          className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#181b24] shadow-sm transition-colors hover:bg-[#ecedfa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span className="size-2 rounded-full bg-[#00845c]" aria-hidden="true" />
          <span>Schedule Architecture Demo</span>
          <span className="font-mono text-[10px] font-semibold text-[#464555]">Live</span>
        </a>
      </div>

      <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#464555] sm:text-sm">
        {trustPoints.map((point, index) => (
          <li key={point.label} className="inline-flex items-center gap-1.5">
            {index > 0 && <span className="mr-3 hidden text-[#777587] sm:inline" aria-hidden="true">•</span>}
            <Icon name={point.icon} size={18} className="text-[#00845c]" />
            {point.label}
          </li>
        ))}
      </ul>

      <div className="mt-14 w-full max-w-5xl">
        <p className="mb-5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#777587] sm:text-[11px]">
          Engineered for high-throughput teams at industry pioneers
        </p>
        <ul className="grid grid-cols-2 items-center justify-items-center gap-x-5 gap-y-4 opacity-70 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0 sm:grid-cols-4 md:grid-cols-7">
          {partners.map((partner) => (
            <li
              key={partner.name}
              className="flex items-center gap-1.5 text-base font-bold tracking-tight text-[#181b24] sm:text-lg"
            >
              <Icon name={partner.icon} size={20} className="text-[#635bff]" />
              {partner.name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
