"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/shared/icon";

const roles = [
  {
    id: "engineering",
    tab: "Engineering Leads",
    icon: "terminal",
    label: "Keyboard-first developer velocity",
    title: "Ship features without context switching to your browser",
    copy: "Create branches, link issues, triage PR reviews, and track flaky tests directly with our native CLI (temora sprint current) and bidirectional GitHub / GitLab synchronization.",
    benefits: [
      "100% keyboard shortcut coverage (Vim keybindings supported)",
      "Git commit auto-parsing (closes TEM-42)",
      "CI/CD pipeline test failure triage directly on issue cards",
    ],
    visual: "terminal",
  },
  {
    id: "product",
    tab: "Product Managers",
    icon: "timeline",
    label: "Deterministic roadmaps & delivery",
    title: "Predictive milestones grounded in live engineering commit velocity",
    copy: "Never build speculative Gantt charts again. Temora maps customer requests directly to DAG nodes, showing live rollout confidence scores based on pull request review speed.",
    benefits: [
      "Automated customer feedback grouping from Slack and Zendesk",
      "Dynamic quarterly release confidence intervals",
    ],
    visual: "roadmap",
  },
  {
    id: "security",
    tab: "DevSecOps & Security",
    icon: "shield",
    label: "Cryptographic state integrity",
    title: "Zero-trust issue transitions with hardware-key FIDO2 verification",
    copy: "Ensure no task moves into production status without passing cryptographically enforced approvals. Stream structured audit logs straight into your SIEM pipeline in real-time.",
    benefits: [
      "Immutable append-only ledger for all status changes",
      "Splunk, Datadog & AWS CloudWatch SIEM push within 50ms",
    ],
    visual: "audit",
  },
  {
    id: "executives",
    tab: "Founders & Execs",
    icon: "leaderboard",
    label: "Total operational transparency",
    title: "Real-time organizational throughput without status sync meetings",
    copy: "Eliminate hours of manual reporting. Receive daily automated executive digests highlighting cross-team throughput, hiring capacity needs, and delivery risks.",
    benefits: [
      "High-altitude visibility across 50+ squads simultaneously",
      "Predictive burn and engineering capital efficiency scores",
    ],
    visual: "metrics",
  },
];

function RoleVisual({ visual }: { visual: string }) {
  if (visual === "terminal") {
    return (
      <div className="w-full rounded-xl bg-[#e6e7f4] p-4 font-mono text-[10px] leading-5 text-[#464555] sm:p-5 sm:text-[11px]">
        <div className="flex items-center justify-between gap-3 border-b border-[#c7c4d8]/60 pb-2">
          <span>terminal: zsh · temora-cli v2.4</span><span className="size-2 rounded-full bg-[#00845c]" />
        </div>
        <p className="mt-3 font-semibold text-[#635bff]">$ temora issue create --title &quot;Upgrade Postgres 16 replica cell&quot; --priority P0</p>
        <p>✓ Task created: [TEM-142] · Assigned to: @alexperry</p>
        <p>✓ DAG validated: 0 circular dependencies detected</p>
        <p className="mt-2 font-semibold text-[#635bff]">$ git checkout -b feat/TEM-142-postgres-upgrade</p>
        <p className="font-semibold text-[#00845c]">✓ Sprint 42 capacity updated (+3 story points)</p>
      </div>
    );
  }

  if (visual === "roadmap") {
    return (
      <div className="w-full rounded-xl bg-[#e6e7f4] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
          <span>Milestone: Enterprise SSO Self-Serve</span><span className="font-mono text-[#00845c]">94% Confidence</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-white"><div className="h-full w-[94%] rounded-full bg-[#00845c]" /></div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#464555]">
          <span>Scheduled for Release Oct 28</span><span className="font-mono">18 / 22 Tasks Done</span>
        </div>
        <div className="mt-5 grid grid-cols-4 gap-2" aria-hidden="true">
          {["Customer", "Feedback", "DAG node", "Release"].map((step, index) => (
            <div key={step} className={`rounded-lg p-2 text-center text-[10px] font-semibold ${index < 3 ? "bg-white text-[#493ee5]" : "bg-[#e2dfff] text-[#493ee5]"}`}>
              {step}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (visual === "audit") {
    return (
      <div className="w-full rounded-xl bg-[#e6e7f4] p-4 font-mono text-[10px] leading-5 text-[#464555] sm:p-5">
        <div className="flex items-center justify-between gap-2 border-b border-[#c7c4d8]/60 pb-2">
          <span className="font-bold text-[#00845c]">AUDIT_EVENT: STATE_TRANSITION_VERIFIED</span>
          <Icon name="verified_user" size={16} className="text-[#00845c]" />
        </div>
        <dl className="mt-3 grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1.5">
          <dt className="text-[#777587]">Actor</dt><dd>alex.m@northstar.internal</dd>
          <dt className="text-[#777587]">Method</dt><dd>WebAuthn / YubiKey 5C NFC</dd>
          <dt className="text-[#777587]">Hash</dt><dd className="truncate">84a9e3381fa54e2... [SHA-256 Validated]</dd>
          <dt className="text-[#777587]">Control</dt><dd>SOC-2 Type II · PASS</dd>
        </dl>
      </div>
    );
  }

  return (
    <div className="grid w-full grid-cols-2 gap-3 rounded-xl bg-[#e6e7f4] p-4 sm:p-5">
      {[
        { label: "Org Velocity Index", value: "+34.8% QoQ", tone: "text-[#00845c]" },
        { label: "Cycle Time", value: "1.8 days", tone: "text-[#635bff]" },
        { label: "Sprint Completion", value: "98.2%", tone: "text-[#00845c]" },
        { label: "Delivery Risk", value: "Low", tone: "text-[#493ee5]" },
      ].map((metric) => (
        <div key={metric.label} className="rounded-lg bg-white p-3">
          <span className="text-[10px] text-[#464555]">{metric.label}</span>
          <strong className={`mt-1 block text-lg font-bold ${metric.tone}`}>{metric.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function RoleExperienceSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeRole = roles[activeIndex];

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % roles.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + roles.length) % roles.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = roles.length - 1;
    else return;

    event.preventDefault();
    setActiveIndex(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <section id="solutions" aria-labelledby="roles-title" className="scroll-mt-24 bg-[#f2f3ff] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#635bff]">Tailored Experience</span>
        <h2 id="roles-title" className="mt-3 text-balance text-center text-3xl font-bold leading-tight tracking-[-0.035em] sm:text-4xl">
          Superpowers calibrated for every team role
        </h2>
        <p className="mt-4 max-w-2xl text-center text-sm leading-6 text-[#464555] sm:text-base">
          No clumsy monolithic templates. Temora automatically surfaces the views, metadata, and controls you care about most.
        </p>

        <div role="tablist" aria-label="Choose a team role" className="mt-8 flex w-full max-w-3xl flex-wrap justify-center gap-1 rounded-xl bg-[#e6e7f4] p-1.5">
          {roles.map((role, index) => (
            <button
              key={role.id}
              ref={(element) => { tabRefs.current[index] = element; }}
              type="button"
              role="tab"
              id={`role-tab-${role.id}`}
              aria-selected={activeIndex === index}
              aria-controls={`role-panel-${role.id}`}
              tabIndex={activeIndex === index ? 0 : -1}
              onClick={() => setActiveIndex(index)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              className={`min-h-11 flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:min-w-36 sm:flex-none sm:text-sm ${activeIndex === index ? "bg-white text-[#635bff] shadow-sm" : "text-[#464555] hover:text-[#181b24]"}`}
            >
              {role.tab}
            </button>
          ))}
        </div>

        <div
          id={`role-panel-${activeRole.id}`}
          role="tabpanel"
          aria-labelledby={`role-tab-${activeRole.id}`}
          tabIndex={0}
          className="mt-8 grid w-full max-w-5xl gap-7 rounded-2xl bg-white p-5 shadow-md sm:p-8 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-10 lg:p-10"
        >
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#635bff]">
              <Icon name={activeRole.icon} size={17} /> {activeRole.label}
            </div>
            <h3 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-[#181b24]">{activeRole.title}</h3>
            <p className="mt-4 text-sm leading-6 text-[#464555]">{activeRole.copy}</p>
            <ul className="mt-5 space-y-2.5">
              {activeRole.benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2.5 text-sm leading-5 text-[#181b24]">
                  <Icon name="check" size={17} className="mt-0.5 shrink-0 text-[#00845c]" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
          <RoleVisual visual={activeRole.visual} />
        </div>
      </div>
    </section>
  );
}
