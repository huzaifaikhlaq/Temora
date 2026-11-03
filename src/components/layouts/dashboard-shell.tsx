"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Icon } from "@/components/shared/icon";

const groups: { label: string; links: { label: string; href: string; icon: string; count?: string; dot?: string }[] }[] = [
  {
    label: "Workspace",
    links: [
      { label: "Overview", href: "/", icon: "grid_view" },
      { label: "My Tasks", href: "/my-tasks", icon: "check_circle", count: "5" },
      { label: "Inbox", href: "/inbox", icon: "inbox", count: "3" },
    ],
  },
  {
    label: "Projects",
    links: [
      { label: "Website Redesign", href: "/projects/website-redesign/board", icon: "circle", dot: "bg-accent" },
      { label: "Mobile Application", href: "/projects/website-redesign/board", icon: "circle", dot: "bg-green" },
      { label: "Customer Portal", href: "/projects/website-redesign/board", icon: "circle", dot: "bg-outline" },
    ],
  },
  {
    label: "Planning",
    links: [
      { label: "Boards / Kanban", href: "/projects/website-redesign/board", icon: "view_kanban" },
      { label: "Sprints & Backlog", href: "/projects/website-redesign/sprints", icon: "cycle" },
      { label: "Roadmap & Timeline", href: "/projects/website-redesign/roadmap", icon: "timeline" },
      { label: "Calendar", href: "/calendar", icon: "calendar_today" },
    ],
  },
  {
    label: "Management",
    links: [
      { label: "Members & Roles", href: "/members", icon: "group" },
      { label: "Reports & Analytics", href: "/reports", icon: "insights" },
      { label: "Integrations", href: "/integrations", icon: "hub" },
      { label: "Settings", href: "/settings", icon: "settings" },
    ],
  },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-low text-foreground">
      {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside data-open={mobileOpen} className="dashboard-sidebar fixed inset-y-0 left-0 z-50 flex w-[250px] flex-col justify-between border-r border-border/40 bg-surface-bright">
        <div className="overflow-y-auto">
          <div className="border-b border-border/30 p-4">
            <Link href="/" className="mb-4 flex items-center gap-2.5 text-2xl font-bold tracking-tight">
              <Image alt="Temora logo" className="h-7 w-7 object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDw43DVqQmcq9E_M0x8ZHdAPHFuDaDW1tD6MFPK9O_GUjoyske-fSL4Mj65aL_YaODNAjvK0rrj5RNFosAywcTh3YwpX6dpX-zIfGD6D4d6RyWRlYzSaKSeajA5p9EM17M6gurLuIwDODQRLkq0utfRD3DlJsaHJ5ien6CRzwbcGWV9PmThlUY5MbBMblGLmdT9e1IET6PeoaPLKB74xtghLzk6EMwBWzJUn-7d-dRr" width={28} height={28} unoptimized/>
              <span>Temora</span>
            </Link>
            <button className="flex w-full items-center justify-between rounded-lg bg-surface-low px-2.5 py-2 text-left hover:bg-surface-container" onClick={() => setMenuOpen(!menuOpen)}>
              <span className="flex min-w-0 items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded bg-accent px-1 font-mono text-xs font-bold text-white">NS</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">Northstar Studio</span><span className="block font-mono text-[11px] text-muted">Pro Plan</span></span></span><Icon name="unfold_more" size={18} className="text-muted"/>
            </button>
            {menuOpen && <div className="mt-2 rounded-lg border border-border bg-white p-2 text-xs shadow-lg"><p className="px-2 py-1 font-semibold">Switch workspace</p><button className="w-full rounded px-2 py-1.5 text-left hover:bg-surface-low" onClick={() => setMenuOpen(false)}>Northstar Studio <span className="float-right text-accent">✓</span></button><button className="w-full rounded px-2 py-1.5 text-left text-muted hover:bg-surface-low" onClick={() => setMenuOpen(false)}>Create workspace…</button></div>}
            <button onClick={() => setCreateOpen(true)} className="mt-2 flex h-9 w-full items-center gap-2 rounded-lg border border-border/60 bg-white px-3 text-sm hover:bg-surface-low"><Icon name="add" size={18} className="text-accent"/>New Item <span className="ml-auto font-mono text-xs text-outline">C</span></button>
          </div>
          <nav className="space-y-3 px-2 py-4">
            {groups.map((group) => <div key={group.label}>
              <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-outline">{group.label}</div>
              <div className={group.label === "Projects" ? "ml-3 border-l border-border/50 pl-2" : ""}>
                {group.links.map((link) => {
                  const active = link.href === "/" ? pathname === "/" : link.href === "/my-tasks" ? pathname.startsWith("/my-tasks") : link.href.includes("/board") ? pathname.includes("/board") : link.href.includes("/sprints") ? pathname.includes("/sprints") : link.href.includes("/roadmap") ? pathname.includes("/roadmap") : false;
                  return <Link key={link.label} href={link.href} onClick={() => setMobileOpen(false)} className={`mb-0.5 flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${active ? "bg-accent text-white" : "text-muted hover:bg-surface-container hover:text-foreground"}`}>
                    {group.label === "Projects" ? <span className={`size-1.5 rounded-full ${link.dot}`} /> : <Icon name={link.icon} size={18}/>}
                    <span className="truncate">{link.label}</span>{"count" in link && link.count && <span className={`ml-auto rounded-full px-1.5 py-0.5 font-mono text-[11px] ${active ? "bg-white/20 text-white" : "bg-surface-high text-muted"}`}>{link.count}</span>}
                  </Link>;
                })}
              </div>
            </div>)}
          </nav>
        </div>
        <div className="border-t border-border/30 bg-surface-low/60 p-2">
          <div className="mb-1 flex items-center justify-between px-2 py-1 text-xs text-muted"><span className="flex items-center gap-2"><Icon name="help_outline" size={16}/>Shortcuts</span><kbd className="rounded bg-surface-high px-1 font-mono">⌘K</kbd></div>
          <button className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-surface-container"><Image alt="Alex Morgan" className="size-8 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDVZACH3vwz0-mdnc1S4x26hEgaF7B6-HBfXQx35wBw2p2c3jXqFrb5ReoWtd0BLwOIgYz_eLqgCytWO_BTNAsM12_bytb1dYnnTLM1GeMnJgyn_4_l2Sc9WhTzNlnrioScJh23EKxK8a0cDKQoHVmsfx9bR6Qz24D8R_adqM-bTehZrm-hvS0eG8wILYr0wZ4tLcO0NyhL2JIuIoYwXnEQq8YfIlr24Tj-GZQy_ica" width={32} height={32} unoptimized/><span><span className="block text-sm font-semibold">Alex Morgan</span><span className="block font-mono text-[11px] text-outline">Admin</span></span><Icon name="more_vert" size={18} className="ml-auto text-muted"/></button>
        </div>
      </aside>

      <div className="dashboard-main ml-[250px] min-h-screen">
        <header className="dashboard-topbar fixed left-[250px] right-0 top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border/40 bg-white/90 px-4 backdrop-blur-xl lg:px-6">
          <div className="flex min-w-0 items-center gap-2 text-sm text-muted"><button className="lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Icon name="menu"/></button><span className="hidden sm:inline">Northstar Studio</span><span className="text-outline">/</span><span className="truncate font-semibold text-foreground">{pathname === "/" ? "Overview" : pathname.includes("my-tasks") ? "My Tasks" : pathname.includes("roadmap") ? "Roadmap & Timeline" : pathname.includes("sprints") ? "Sprint Planning" : "Website Redesign"}</span></div>
          <label className="relative mx-auto hidden w-full max-w-md items-center md:flex"><Icon name="search" size={18} className="absolute left-2.5 text-outline"/><input className="h-9 w-full rounded-lg border border-border/50 bg-surface-low pl-9 pr-12 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent" placeholder="Search or type Cmd+K..."/><kbd className="absolute right-2 rounded border border-border/60 bg-white px-1 font-mono text-[11px] text-outline">⌘K</kbd></label>
          <div className="flex shrink-0 items-center gap-2"><button onClick={() => setCreateOpen(true)} className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-semibold text-white shadow-sm hover:bg-accent-strong"><Icon name="add" size={18}/><span className="hidden sm:inline">Create Issue</span></button><button aria-label="Notifications" className="relative rounded p-1 text-muted hover:bg-surface-low"><Icon name="notifications"/><i className="absolute right-1 top-1 size-2 rounded-full bg-red"/></button><button aria-label="Help" className="hidden rounded p-1 text-muted hover:bg-surface-low sm:block"><Icon name="help"/></button><span className="grid size-8 place-items-center rounded-full bg-accent/15 text-xs font-bold text-accent">AM</span></div>
        </header>
        <main className="min-h-screen bg-surface-low pt-14">{children}</main>
      </div>
      {createOpen && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="create-title" className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 id="create-title" className="text-lg font-semibold">Create an issue</h2><button aria-label="Close" onClick={() => setCreateOpen(false)}><Icon name="close"/></button></div><p className="mt-1 text-sm text-muted">This is a local preview. Issues are not saved to a service.</p><label className="mt-4 block text-sm font-medium">Issue title<input autoFocus className="mt-1 h-10 w-full rounded-lg border border-border px-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent" placeholder="What needs to be done?"/></label><div className="mt-4 flex justify-end gap-2"><button onClick={() => setCreateOpen(false)} className="h-9 rounded-lg border border-border px-3 text-sm">Cancel</button><button onClick={() => setCreateOpen(false)} className="h-9 rounded-lg bg-accent px-3 text-sm font-semibold text-white">Create issue</button></div></section></div>}
    </div>
  );
}
