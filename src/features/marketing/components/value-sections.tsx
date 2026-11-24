import Image from "next/image";
import { Icon } from "@/components/shared/icon";

const metrics = [
  { value: "4.2x", title: "Resolution Velocity", copy: "Engineered pipelines remove status chasing and synchronous blocker triage meetings.", tone: "text-[#635bff]" },
  { value: "< 18ms", title: "JQL Query Latency", copy: "Global edge indexing executes compound filters and cross-project regex in micro-moments.", tone: "text-[#00845c]" },
  { value: "99.99%", title: "SLA Uptime & Audit Trail", copy: "Cryptographically signed state transitions ensure immutable compliance for enterprise audits.", tone: "text-[#635bff]" },
  { value: "72,000+", title: "Dev Hours Saved Annually", copy: "Eliminate backlog grooming drag and duplicate sprint ceremonies across distributed squads.", tone: "text-[#493ee5]" },
];

export function MetricsSection() {
  return (
    <section aria-label="Temora performance metrics" className="bg-[#f2f3ff] py-12 sm:py-16">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:px-12">
        {metrics.map((metric) => (
          <article key={metric.title} className="flex min-h-48 flex-col rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <strong className={`text-4xl font-bold tracking-[-0.04em] sm:text-[42px] ${metric.tone}`}>{metric.value}</strong>
            <h2 className="mt-2 text-base font-bold tracking-tight text-[#181b24]">{metric.title}</h2>
            <p className="mt-2 text-sm leading-5 text-[#464555]">{metric.copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const capabilities = [
  {
    icon: "account_tree",
    label: "Graph Engine Architecture",
    title: "Directed Acyclic Dependency Graphs (DAG)",
    copy: "Prevent deadlocks before they happen. Temora models your issues as an acyclic graph, highlighting critical bottlenecks, cascading delays, and real-time blockers dynamically.",
    className: "xl:col-span-3",
    visual: "graph",
  },
  {
    icon: "terminal",
    label: "Sub-millisecond Search",
    title: "Real-time JQL & Filter Syntax",
    copy: "Query across 500,000 tasks instantly. Full compound logic, regular expressions, and zero UI lag.",
    className: "xl:col-span-1",
    visual: "query",
  },
  {
    icon: "auto_graph",
    label: "Predictive Velocity",
    title: "Automated Sprint Burndown & Rollover",
    copy: "Predictive machine-learning projections calibrate sprint rollover and eliminate end-of-cycle chaos.",
    className: "xl:col-span-1",
    visual: "sprint",
  },
  {
    icon: "schema",
    label: "Event-driven Webhooks",
    title: "Zero-Leak Automation Engine",
    copy: "Trigger custom WebAssembly functions, auto-close pull requests when QA tests pass, and route critical pager alerts with deterministic precision.",
    className: "xl:col-span-3",
    visual: "automation",
  },
];

function CapabilityVisual({ kind }: { kind: string }) {
  if (kind === "graph") {
    return (
      <div className="mt-auto rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] font-semibold text-[#464555]">
          <span>Critical Path Visualizer · Release 2.4</span>
          <span className="inline-flex items-center gap-1 text-red-600"><span className="size-2 rounded-full bg-red-600" />Blocker Detected</span>
        </div>
        <div className="mt-5 grid grid-cols-[1fr_auto_1.2fr] items-center gap-3">
          <div className="rounded-lg border border-[#c3c0ff] bg-[#ecedfa] p-3">
            <span className="font-mono text-[10px] font-semibold text-[#635bff]">TEM-98 · BLOCKING</span>
            <p className="mt-1 text-xs font-semibold">Auth cell partitioning</p>
          </div>
          <div className="text-center font-mono text-[10px] font-semibold text-red-600">
            blocks<br /><Icon name="arrow_forward" size={18} />
          </div>
          <div className="space-y-2">
            <div className="rounded-lg bg-[#f2f3ff] p-2"><span className="font-mono text-[10px] font-semibold">TEM-101</span><p className="text-[10px] text-[#464555]">Session sync broker · Waiting</p></div>
            <div className="rounded-lg bg-[#f2f3ff] p-2"><span className="font-mono text-[10px] font-semibold">TEM-104</span><p className="text-[10px] text-[#464555]">Zero-trust proxy gateway · Waiting</p></div>
          </div>
        </div>
      </div>
    );
  }

  if (kind === "query") {
    return (
      <div className="mt-auto rounded-xl bg-white p-4 font-mono text-[10px] shadow-sm sm:p-5">
        <p className="font-semibold text-[#00845c]">&gt; type = BUG AND priority in (P0, P1)</p>
        <p className="pl-3 font-semibold text-[#464555]">ORDER BY created DESC</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[#00845c]">
          <span><Icon name="check_circle" size={14} /> 14 results in 1.4ms</span>
          <span className="text-[#777587]">Shortcut: /</span>
        </div>
      </div>
    );
  }

  if (kind === "sprint") {
    return (
      <div className="mt-auto rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold">
          <span>Capacity: 120 / 140 pts</span><span className="font-mono text-[#00845c]">+92% on track</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e6e7f4]"><div className="h-full w-[86%] rounded-full bg-[#635bff]" /></div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-[#777587]">
          <span>Ideal Guideline</span><span className="font-semibold text-[#635bff]">1-Click Sprint Rollover Ready</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-auto flex flex-wrap items-center justify-center gap-2 rounded-xl bg-white p-4 shadow-sm sm:gap-3 sm:p-5">
      <span className="rounded-lg bg-[#f2f3ff] px-3 py-2 font-mono text-[10px] font-semibold text-[#635bff]">When PR merged to main</span>
      <Icon name="arrow_forward" size={18} className="text-[#777587]" />
      <span className="rounded-lg bg-[#f2f3ff] px-3 py-2 font-mono text-[10px] font-semibold text-[#00845c]">And E2E suite passes</span>
      <Icon name="arrow_forward" size={18} className="text-[#777587]" />
      <span className="rounded-lg bg-[#e2dfff] px-3 py-2 font-mono text-[10px] font-semibold text-[#493ee5]">Then deploy cell & close sprint</span>
    </div>
  );
}

export function CapabilitySection() {
  return (
    <section id="features" aria-labelledby="capabilities-title" className="scroll-mt-24 mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
      <header className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
        <span className="rounded-full bg-[#e2dfff] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#3323cc]">Autonomous Infrastructure</span>
        <h2 id="capabilities-title" className="mt-5 text-balance text-3xl font-bold leading-tight tracking-[-0.035em] sm:text-4xl">
          Every layer engineered for speed, deterministic flow, and zero friction.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[#464555] sm:text-base">
          Built from first principles on top of a low-latency graph database to handle deeply nested hierarchies without slowing down.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {capabilities.map((feature) => (
          <article key={feature.title} className={`flex min-h-[21rem] flex-col rounded-2xl bg-[#ecedfa] p-5 sm:p-7 ${feature.className}`}>
            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#635bff]">
              <Icon name={feature.icon} size={16} /> {feature.label}
            </div>
            <h3 className="text-xl font-bold leading-7 tracking-tight text-[#181b24] sm:text-2xl">{feature.title}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-5 text-[#464555]">{feature.copy}</p>
            <CapabilityVisual kind={feature.visual} />
          </article>
        ))}
      </div>
    </section>
  );
}

const complianceItems = [
  { icon: "verified_user", title: "SOC-2 Type II", copy: "Continuous annual third-party audits", tone: "text-[#00845c]" },
  { icon: "security", title: "ISO/IEC 27001", copy: "Information security management", tone: "text-[#00845c]" },
  { icon: "policy", title: "HIPAA & GDPR", copy: "BAA and localized EU data residency", tone: "text-[#00845c]" },
  { icon: "vpn_key", title: "Okta & SAML 2.0", copy: "SCIM automated group provisioning", tone: "text-[#635bff]" },
  { icon: "fingerprint", title: "FIDO2 Passkeys", copy: "Hardware token authentication", tone: "text-[#635bff]" },
  { icon: "lock_reset", title: "TLS 1.3 Strict", copy: "Zero plain-text wire transmissions", tone: "text-[#635bff]" },
];

export function EnterpriseSection() {
  return (
    <section id="enterprise" aria-labelledby="enterprise-title" className="scroll-mt-24 mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_28rem] lg:items-start lg:px-12 lg:py-24">
      <div>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#635bff]">Bank-grade Compliance</span>
        <h2 id="enterprise-title" className="mt-3 max-w-3xl text-balance text-3xl font-bold leading-tight tracking-[-0.035em] sm:text-4xl">
          Enterprise governance built into the core primitives.
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[#464555] sm:text-base">
          Temora satisfies stringent financial, aerospace, and healthcare compliance requirements from day one. You own your keys, data storage tenancy, and cryptographic audit chains.
        </p>
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {complianceItems.map((item) => (
            <li key={item.title} className="rounded-xl bg-[#ecedfa] p-4 shadow-sm">
              <div className={`flex items-center gap-2 font-mono text-[10px] font-bold ${item.tone}`}>
                <Icon name={item.icon} size={19} /> {item.title}
              </div>
              <p className="mt-2 text-xs leading-5 text-[#464555]">{item.copy}</p>
            </li>
          ))}
        </ul>
      </div>

      <aside className="rounded-2xl bg-[#ecedfa] p-5 shadow-md sm:p-6" aria-labelledby="siem-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="siem-title" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#181b24]">
            <Icon name="stream" size={19} className="text-[#635bff]" /> Live SIEM Streaming
          </h3>
          <span className="rounded-full bg-[#00845c]/15 px-2 py-1 font-mono text-[9px] font-bold text-[#006848]">Active · 100% Health</span>
        </div>
        <p className="mt-4 text-sm leading-5 text-[#464555]">Export full event telemetry directly to your enterprise log aggregators with zero retention delay.</p>
        <ul className="mt-4 space-y-2">
          {[
            { icon: "terminal", label: "Datadog Log Pipeline", value: "1.2ms latency" },
            { icon: "monitoring", label: "Splunk Cloud Indexer", value: "9.4ms latency" },
            { icon: "cloud_sync", label: "AWS CloudWatch & S3 Glacier", value: "Encrypted" },
          ].map((provider) => (
            <li key={provider.label} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-3 text-xs">
              <span className="flex min-w-0 items-center gap-2 font-mono font-semibold text-[#464555]"><Icon name={provider.icon} size={17} />{provider.label}</span>
              <span className="font-mono text-[10px] font-semibold text-[#00845c]">{provider.value}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#e6e7f4] px-3 py-3 font-mono text-[10px] text-[#464555]">
          <span>Target compliance review:</span><strong className="text-[#181b24]">Q4 Enterprise Ready</strong>
        </div>
      </aside>
    </section>
  );
}

export function TestimonialSection() {
  return (
    <section aria-label="Customer story" className="bg-[#f2f3ff] py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <figure className="grid gap-8 rounded-3xl bg-white p-6 shadow-md sm:p-9 lg:grid-cols-[1fr_20rem] lg:items-center lg:gap-12 lg:p-14">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex text-[#635bff]" aria-label="5 out of 5 stars">
                {[1, 2, 3, 4, 5].map((star) => <Icon key={star} name="star" size={19} className="text-[#635bff]" />)}
              </span>
              <span className="font-mono text-[10px] font-semibold text-[#464555]">Verified Enterprise Review</span>
            </div>
            <blockquote className="mt-5 text-xl font-medium leading-snug tracking-tight text-[#181b24] sm:text-2xl lg:text-[28px]">
              “Temora transformed our two-week sprint rituals from endless manual status updates into deterministic delivery. The DAG dependency graph alone eliminated 80% of our cross-team blockers before our code freeze.”
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-4">
              <Image
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCoA-EhQh37WvAzS2UtSEIwC20_YmIS1pY1teK500vckxT29dc-rncV3B71waHtlJiij7jzMjTAef5bLj2A2xTOxXjuxGNkNioBiOHrUlzGJ8V5Bmd5W7Sec2s7MYGbCLNZp5l2lPUah5nVnbpeGExWQ-I78145OlWk0KHrX9HApy1fKDQuIEuSMS3lHLC0FGYed3Ah7WNH4nAnYHR0irU9Zen0IG8riRay5HqHZI0B"
                alt="Alex Morgan, VP of Engineering at Northstar Studio"
                width={48}
                height={48}
                unoptimized
                className="size-12 rounded-full object-cover"
              />
              <span>
                <strong className="block text-sm font-bold text-[#181b24]">Alex Morgan</strong>
                <span className="mt-0.5 block text-xs text-[#464555]">VP of Engineering at Northstar Studio</span>
              </span>
            </figcaption>
          </div>
          <aside className="rounded-2xl bg-[#ecedfa] p-5 sm:p-6" aria-label="Northstar Studio results">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#635bff]">Northstar Studio Metrics</h3>
            <div className="mt-4">
              <strong className="text-4xl font-bold tracking-tight text-[#181b24]">+34%</strong>
              <p className="mt-1 text-sm leading-5 text-[#464555]">Engineering sprint velocity increase within 60 days</p>
            </div>
            <div className="my-5 h-px bg-[#e0e2ef]" />
            <div>
              <strong className="text-4xl font-bold tracking-tight text-[#00845c]">0</strong>
              <p className="mt-1 text-sm leading-5 text-[#464555]">Missed enterprise SLA milestones in the past 12 months</p>
            </div>
          </aside>
        </figure>
      </div>
    </section>
  );
}
