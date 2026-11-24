import Link from "next/link";
import { Icon } from "@/components/shared/icon";

const todoItems = [
  { key: "TEM-108", title: "Audit Raft consensus quorum failover under network partition", tag: "Infra", avatar: "AK", tone: "bg-[#493ee5]", icon: "priority_high", urgent: true },
  { key: "TEM-112", title: "Implement mTLS certificate rotation for gRPC endpoints", tag: "DevSec", avatar: "ML", tone: "bg-[#00845c]", icon: "low_priority", urgent: false },
];

function WorkItemCard({
  item,
  active = false,
}: {
  item: { key: string; title: string; tag: string; avatar: string; tone: string; icon?: string; urgent?: boolean };
  active?: boolean;
}) {
  return (
    <article className={`rounded-xl bg-white p-3.5 shadow-sm ${active ? "border-2 border-[#635bff] shadow-[#635bff]/10" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] font-semibold text-[#635bff]">{item.key}</span>
        {item.icon && (
          <Icon
            name={item.icon}
            size={16}
            className={item.urgent ? "text-red-600" : "text-[#635bff]"}
          />
        )}
      </div>
      <h3 className="mt-2 text-sm font-semibold leading-5 text-[#181b24]">{item.title}</h3>
      {active && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-[#f2f3ff] px-2.5 py-2 font-mono text-[10px] text-[#464555]">
          <Icon name="link" size={14} className="text-[#00845c]" />
          <span>Blocks 2 downstream nodes</span>
          <span className="rounded bg-white px-1.5 py-1">TEM-101</span>
          <Icon name="arrow_forward" size={13} />
          <span className="rounded bg-white px-1.5 py-1">TEM-104</span>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="rounded bg-[#ecedfa] px-2 py-1 font-mono text-[10px] text-[#464555]">{item.tag}</span>
        <span className={`grid size-5 place-items-center rounded-full text-[9px] font-bold text-white ${item.tone}`}>{item.avatar}</span>
      </div>
    </article>
  );
}

export function ProductShowcase() {
  return (
    <section aria-labelledby="product-preview-title" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-12 lg:pb-24">
      <h2 id="product-preview-title" className="sr-only">Temora sprint board product preview</h2>
      <figure className="relative overflow-hidden rounded-2xl bg-white shadow-[0_2rem_4rem_rgba(24,27,36,0.18)] ring-1 ring-[#c7c4d8]/30">
        <figcaption className="sr-only">
          Example sprint board with project capacity, work item lanes, dependency details, and sprint burndown.
        </figcaption>
        <div className="absolute -top-3 left-8 z-10 hidden items-center gap-2 rounded-full bg-[#635bff] px-3 py-1.5 font-mono text-[10px] font-semibold text-white shadow-lg shadow-[#635bff]/25 lg:flex">
          <Icon name="account_tree" size={16} /> Real-time DAG Dependencies
        </div>
        <div className="absolute right-8 top-14 z-10 hidden items-center gap-2 rounded-full bg-[#00845c] px-3 py-1.5 font-mono text-[10px] font-semibold text-white shadow-lg shadow-[#00845c]/25 lg:flex">
          <Icon name="speed" size={16} /> Sub-millisecond JQL search (12ms)
        </div>
        <div className="absolute bottom-7 left-8 z-10 hidden items-center gap-2 rounded-full bg-[#e6e7f4] px-3 py-1.5 text-xs font-semibold text-[#181b24] shadow-md lg:flex">
          <Icon name="verified_user" size={16} className="text-[#00845c]" /> Immutable SOC-2 Audit Trail Active
        </div>

        <div className="flex h-12 items-center justify-between gap-3 bg-[#e6e7f4] px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="size-3 rounded-full bg-[#ba1a1a]" />
            <span className="size-3 rounded-full bg-[#c3c0ff]" />
            <span className="size-3 rounded-full bg-[#00845c]" />
            <span className="ml-1 hidden min-w-0 items-center gap-1.5 truncate rounded-md bg-[#ecedfa] px-3 py-1 font-mono text-[10px] text-[#464555] sm:inline-flex">
              <Icon name="lock" size={14} /> app.temora.internal/sprints/active-sprint-42
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="flex -space-x-1.5" aria-label="Sprint team members">
              <span className="grid size-6 place-items-center rounded-full bg-[#635bff] text-[9px] font-bold text-white">AM</span>
              <span className="grid size-6 place-items-center rounded-full bg-[#00845c] text-[9px] font-bold text-white">SK</span>
              <span className="grid size-6 place-items-center rounded-full bg-[#645efb] text-[9px] font-bold text-white">LR</span>
            </div>
            <span className="hidden rounded bg-[#00845c]/15 px-2 py-1 font-mono text-[10px] font-semibold text-[#006848] sm:inline">
              Sprint 42: Day 8 of 14
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 bg-white px-4 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-base font-bold tracking-tight text-[#181b24] sm:text-lg">Core Infrastructure Alpha</h3>
              <span className="rounded-full bg-[#e2dfff] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#3323cc]">Q2-RELEASE</span>
            </div>
            <div className="mt-2 hidden max-w-xl items-center gap-2 rounded-lg bg-[#ecedfa] px-3 py-2 font-mono text-[10px] text-[#464555] md:flex">
              <Icon name="search" size={15} />
              <span className="truncate">assignee = currentUser() AND status = &apos;In Progress&apos;</span>
              <span className="rounded bg-[#e0e2ef] px-1.5 py-0.5">0.8ms</span>
            </div>
          </div>
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
            <label className="flex items-center gap-2 rounded-lg bg-[#f2f3ff] px-3 py-2 text-[11px] sm:text-xs">
              <span className="font-mono font-bold text-[#635bff]">87.5%</span>
              <span className="text-[#464555]">capacity burned</span>
              <progress aria-label="Sprint capacity burned" value={87.5} max={100} className="h-2 w-14 accent-[#635bff]" />
            </label>
            <Link href="/work-items/new" className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg bg-[#635bff] px-3 text-xs font-semibold text-white hover:bg-[#493ee5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              <Icon name="add" size={16} /> New Task
            </Link>
          </div>
        </div>

        <div className="grid gap-4 bg-[#f2f3ff] p-4 sm:p-6 md:grid-cols-2 xl:grid-cols-12">
          <div className="flex flex-col gap-3 xl:col-span-3">
            <div className="flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-wide text-[#464555]">
              <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#777587]/50" />To Do <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px]">3</span></span>
              <Icon name="more_horiz" size={18} />
            </div>
            {todoItems.map((item) => <WorkItemCard key={item.key} item={item} />)}
          </div>

          <div className="flex flex-col gap-3 xl:col-span-4">
            <div className="flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-wide text-[#464555]">
              <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#635bff]" />In Progress <span className="rounded bg-[#e2dfff] px-1.5 py-0.5 font-mono text-[10px] text-[#3323cc]">4</span></span>
              <Icon name="more_horiz" size={18} />
            </div>
            <WorkItemCard
              active
              item={{ key: "TEM-98", title: "Shard partition metadata storage engine across multi-region cells", tag: "DAG Head", avatar: "AM", tone: "bg-[#635bff]", icon: "keyboard_double_arrow_up" }}
            />
            <WorkItemCard
              item={{ key: "TEM-103", title: "Deterministic replay sandbox for crash telemetry traces", tag: "Engine", avatar: "TC", tone: "bg-[#645efb]", icon: "flag" }}
            />
          </div>

          <aside className="rounded-xl bg-white p-4 shadow-sm md:col-span-2 xl:col-span-5" aria-label="Selected work item inspector">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-wide">
                <span className="text-[#635bff]">Inspector: TEM-98</span>
                <span className="rounded-full bg-[#00845c]/15 px-2 py-1 text-[#006848]">On Critical Path</span>
              </div>
              <div className="flex items-center gap-2 text-[#777587]" aria-hidden="true">
                <Icon name="share" size={16} /> <Icon name="fullscreen" size={16} />
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-[#f2f3ff] p-3">
              <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[#181b24]">
                <span>Sprint Burndown Trend (Velocity: 48 pts)</span>
                <span className="font-mono text-[#00845c]">+18.4% ahead</span>
              </div>
              <svg role="img" aria-label="Sprint burndown is ahead of its target completion line" viewBox="0 0 320 68" className="mt-2 h-14 w-full">
                <path d="M12 15 L66 25 L116 28 L168 41 L219 45 L272 58" fill="none" stroke="#635bff" strokeWidth="3" strokeLinecap="round" />
                <path d="M12 18 L66 26 L116 34 L168 42 L219 50 L272 58" fill="none" stroke="#a6a3ff" strokeWidth="2" strokeDasharray="4 5" />
                <circle cx="219" cy="45" r="4" fill="#635bff" />
              </svg>
              <div className="flex justify-between gap-2 font-mono text-[9px] text-[#777587]">
                <span>Sprint Start (Day 1)</span><span>Day 8 (Now)</span><span>Target Completion</span>
              </div>
            </div>
            <h4 className="mt-4 text-[11px] font-bold uppercase tracking-wide text-[#464555]">Cryptographic Trail (SHA-256)</h4>
            <div className="mt-2 space-y-2 font-mono text-[10px] text-[#464555]">
              <div className="flex items-start gap-2 rounded-lg bg-[#ecedfa] p-2.5"><Icon name="verified" size={15} className="shrink-0 text-[#00845c]" /><span className="min-w-0 flex-1">Commit 8f3c7a verified via GitHub App</span><span className="shrink-0 text-[#777587]">2m ago</span></div>
              <div className="flex items-start gap-2 rounded-lg bg-[#ecedfa] p-2.5"><Icon name="key" size={15} className="shrink-0 text-[#635bff]" /><span className="min-w-0 flex-1">Signed state transition by Alex M. (FIDO2)</span><span className="shrink-0 text-[#777587]">14m ago</span></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[9px] text-[#777587]">
              <span>Press <kbd className="rounded bg-[#ecedfa] px-1 text-[#181b24]">E</kbd> to edit</span>
              <span>Press <kbd className="rounded bg-[#ecedfa] px-1 text-[#181b24]">C</kbd> to comment</span>
              <span>Press <kbd className="rounded bg-[#ecedfa] px-1 text-[#181b24]">G then D</kbd> for Graph</span>
            </div>
          </aside>
        </div>
      </figure>
    </section>
  );
}
