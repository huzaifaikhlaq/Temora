"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "@/components/shared/icon";
import { WorkspaceScopeProvider } from "@/features/workspace/hooks/workspace-scope";
import { LogoutButton } from "@/features/authentication/components/logout-button";
import type { AuthUser } from "@/features/authentication/lib/auth-client";
import type { Workspace } from "@/features/workspace/types";
import { projectApi, type Project as ApiProject } from "@/features/projects/api/client";

const groups: {
  label: string;
  links: {
    label: string;
    href: string;
    icon: string;
    count?: string;
    dot?: string;
    disabled?: boolean;
  }[];
}[] = [
    {
      label: "Workspace",
      links: [
        { label: "Overview", href: "/overview", icon: "grid_view" },
        { label: "My Work", href: "/my-work", icon: "check_circle" },
        { label: "Inbox", href: "/inbox", icon: "inbox" },
        { label: "Work Items", href: "/work-items", icon: "checklist" },
      ],
    },
    {
      label: "Management",
      links: [
        { label: "Members & Roles", href: "/members", icon: "group" },
        { label: "Permissions Matrix", href: "/roles", icon: "admin_panel_settings" },
        { label: "Reports & Analytics", href: "/reports", icon: "insights" },
        { label: "Integrations", href: "/integrations", icon: "hub" },
        { label: "Settings", href: "/settings", icon: "settings" },
        { label: "Plan & Billing", href: "/billing", icon: "credit_card", },
        { label: "Automation Rules", href: "/settings/automation", icon: "auto_mode" },
        { label: "Security & Audit", href: "/security/audit-logs", icon: "shield" },
      ],
    },
  ];

type DashboardShellProps = { children: ReactNode; user: AuthUser; workspaces: Workspace[]; activeWorkspace: Workspace };

export function DashboardShell(props: DashboardShellProps) {
  return <WorkspaceScopeProvider workspaceId={props.activeWorkspace.id} userId={props.user.id}><DashboardShellContent {...props} /></WorkspaceScopeProvider>;
}

function DashboardShellContent({ children, user, workspaces, activeWorkspace }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [apiProjects, setApiProjects] = useState<ApiProject[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeWorkspaceId = activeWorkspace.id;
  useEffect(() => {
    let active = true;
    projectApi
      .list(activeWorkspaceId)
      .then((projects) => {
        if (active) setApiProjects(projects);
      })
      .catch(() => {
        if (active) setApiProjects([]);
      });

    return () => {
      active = false;
    };
  }, [activeWorkspaceId]);

  const listedProjects = apiProjects
    .filter((project) => project.workspace_id === activeWorkspaceId && !project.archived_at)
    .map((project, index) => ({
      id: project.id,
      name: project.name,
      dot: ["bg-violet-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500"][index % 4],
    }));
  const planningProject = listedProjects[0]?.id;
  const navGroups: typeof groups = [
    groups[0],
    {
      label: "Projects",
      links: [
        { label: "All Projects", href: "/projects", icon: "folder_open" },
        ...listedProjects.map((project) => ({
          label: project.name,
          href: `/projects/${project.id}`,
          icon: "circle",
          dot: project.dot,
        })),
      ],
    },
    {
      label: "Planning",
      links: [
        {
          label: "Boards / Kanban",
          href: planningProject ? `/projects/${planningProject}/board` : "/projects",
          icon: "view_kanban",
        },
        {
          label: "Sprints & Backlog",
          href: planningProject ? `/projects/${planningProject}/sprints` : "/projects",
          icon: "cycle",
        },
        {
          label: "Roadmap & Timeline",
          href: planningProject ? `/projects/${planningProject}/roadmap` : "/projects",
          icon: "timeline",
        },
        { label: "Calendar", href: "/calendar", icon: "calendar_today" },
      ],
    },
    ...groups.filter((group) => group.label === "Management"),
  ];
  const currentProjectName =
    listedProjects.find(
      (project) =>
        pathname === `/projects/${project.id}` || pathname.startsWith(`/projects/${project.id}/`),
    )?.name;
  const pageTitle =
    pathname === "/overview"
      ? "Overview"
      : pathname === "/work-items"
        ? "Work Items"
        : pathname === "/work-items/new"
          ? "Create Work Item"
          : pathname.startsWith("/projects/") && pathname.includes("/issues/")
            ? "Work Item Details"
            : pathname.startsWith("/my-work")
              ? "My Work"
              : pathname.endsWith("/dependencies")
                ? "Dependencies & Audit Trail"
                : pathname.startsWith("/sprints/") && pathname.endsWith("/complete")
                  ? "Complete Sprint"
                  : pathname.endsWith("/retrospective")
                    ? "Sprint Retrospective"
                    : pathname.includes("/reports/sprints/")
                      ? "Sprint Burndown Report"
                      : pathname === "/roles"
                        ? "Roles & Permissions"
                        : pathname.includes("/settings/automation")
                          ? "Custom Fields & Automation"
                          : pathname.includes("/security/audit-logs")
                            ? "Security & Audit Logs"
                            : pathname.includes("/roadmap")
                              ? "Roadmap & Timeline"
                              : pathname.includes("/sprints")
                                ? "Sprint Planning"
                                : pathname.includes("/board")
                                  ? (currentProjectName ?? "Project Board")
                                  : pathname.startsWith("/tasks/")
                                    ? pathname.split("/").at(-1)
                                    : pathname === "/projects"
                                      ? "Projects Directory"
                                      : pathname === "/projects/new"
                                        ? "New Project"
                                        : pathname === "/inbox"
                                          ? "Inbox"
                                          : pathname === "/calendar"
                                            ? "Planning Calendar"
                                            : pathname === "/members"
                                              ? "Members & Permissions"
                                              : pathname === "/reports"
                                                ? "Reports & Analytics"
                                                : pathname === "/integrations"
                                                  ? "Integrations"
                                                  : pathname === "/billing"
                                                    ? "Billing & Subscription"
                                                    : pathname === "/settings"
                                                      ? "Workspace Settings"
                                                      : "Temora";

  return (
    <div className="min-h-screen bg-surface-low text-foreground">
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        data-open={mobileOpen}
        className="dashboard-sidebar fixed inset-y-0 left-0 z-50 flex w-[250px] flex-col border-r border-border/40 bg-surface-bright"
      >
        <div className="shrink-0 border-b border-border/30 p-4">
          <Link
            href="/overview"
            className="mb-4 flex items-center gap-2.5 text-2xl font-bold tracking-tight"
          >
            <Image
              alt="Temora logo"
              className="h-7 w-7 object-contain"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDw43DVqQmcq9E_M0x8ZHdAPHFuDaDW1tD6MFPK9O_GUjoyske-fSL4Mj65aL_YaODNAjvK0rrj5RNFosAywcTh3YwpX6dpX-zIfGD6D4d6RyWRlYzSaKSeajA5p9EM17M6gurLuIwDODQRLkq0utfRD3DlJsaHJ5ien6CRzwbcGWV9PmThlUY5MbBMblGLmdT9e1IET6PeoaPLKB74xtghLzk6EMwBWzJUn-7d-dRr"
              width={28}
              height={28}
              unoptimized
            />
            <span>Temora</span>
          </Link>
          <button
            className="flex w-full items-center justify-between rounded-lg bg-surface-low px-2.5 py-2 text-left hover:bg-surface-container"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded bg-accent px-1 font-mono text-xs font-bold text-white">
                {activeWorkspace.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {activeWorkspace.name}
                </span>
                <span className="block font-mono text-[11px] text-muted">
                  {activeWorkspace.role}
                </span>
              </span>
            </span>
            <Icon name="unfold_more" size={18} className="text-muted" />
          </button>
          {menuOpen && (
            <div className="mt-2 rounded-lg border border-border bg-white p-2 text-xs shadow-lg">
              <p className="px-2 py-1 font-semibold">Switch workspace</p>
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  className="w-full rounded px-2 py-1.5 text-left hover:bg-surface-low"
                  onClick={() => {
                    void fetch("/api/workspace/selection", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspace_id: workspace.id }) }).then(async (response) => {
                      if (!response.ok) throw new Error("Workspace could not be selected.");
                      setMenuOpen(false);
                      window.location.assign("/overview");
                    }).catch((error: unknown) => setWorkspaceError(error instanceof Error ? error.message : "Workspace could not be selected."));
                  }}
                >
                  {workspace.name}
                  {workspace.id === activeWorkspaceId && (
                    <span className="float-right text-accent">✓</span>
                  )}
                </button>
              ))}
              {workspaceError && <p role="alert" className="px-2 py-1 text-red">{workspaceError}</p>}
              <button
                className="w-full rounded px-2 py-1.5 text-left text-muted hover:bg-surface-low"
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/workspace/setup");
                }}
              >
                Create workspace…
              </button>
            </div>
          )}
          <Link
            href="/work-items/new"
            onClick={() => setMenuOpen(false)}
            className="mt-2 flex h-9 w-full items-center gap-2 rounded-lg border border-border/60 bg-white px-3 text-sm hover:bg-surface-low"
          >
            <Icon name="add" size={18} className="text-accent" />
            Create Work Item <span className="ml-auto font-mono text-xs text-outline">C</span>
          </Link>
        </div>
        <nav
          aria-label="Main navigation"
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-2 py-4"
        >
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-outline">
                {group.label}
              </div>
              <div
                className={
                  group.label === "Projects" ? "ml-3 border-l border-border/50 pl-2" : ""
                }
              >
                {group.links.map((link) => {
                  const fallbackLink =
                    group.label === "Planning" &&
                    ["/projects", "/tasks", "/reports"].includes(link.href);
                  const projectId =
                    group.label === "Projects" && link.href !== "/projects"
                      ? link.href.split("/")[2]
                      : null;
                  const active =
                    !link.disabled &&
                    !fallbackLink &&
                    (link.href === "/my-work"
                      ? pathname.startsWith("/my-work")
                      : link.href === "/work-items"
                        ? pathname === "/work-items" || (pathname.startsWith("/projects/") && pathname.includes("/issues/"))
                        : pathname === link.href ||
                        (!!projectId &&
                          (pathname === `/projects/${projectId}` ||
                            pathname.startsWith(`/projects/${projectId}/`))));
                  const className = `mb-0.5 flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${active ? "bg-accent text-white" : link.disabled ? "cursor-not-allowed text-outline" : "text-muted hover:bg-surface-container hover:text-foreground"}`;
                  const contents = (
                    <>
                      {group.label === "Projects" ? (
                        <span className={`size-1.5 rounded-full ${link.dot}`} />
                      ) : (
                        <Icon name={link.icon} size={18} />
                      )}
                      <span className="truncate">{link.label}</span>
                      {"count" in link && link.count && (
                        <span
                          className={`ml-auto rounded-full px-1.5 py-0.5 font-mono text-[11px] ${active ? "bg-white/20 text-white" : "bg-surface-high text-muted"}`}
                        >
                          {link.count}
                        </span>
                      )}
                    </>
                  );
                  return link.disabled ? (
                    <span
                      key={link.label}
                      aria-disabled="true"
                      title="This screen is not included in the current preview"
                      className={className}
                    >
                      {contents}
                    </span>
                  ) : (
                    <Link
                      key={link.label}
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={className}
                    >
                      {contents}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="shrink-0 border-t border-border/30 bg-surface-low/60 p-2">
          <div className="mb-1 flex items-center justify-between px-2 py-1 text-xs text-muted">
            <span className="flex items-center gap-2">
              <Icon name="help_outline" size={16} />
              Shortcuts
            </span>
            <kbd className="rounded bg-surface-high px-1 font-mono">⌘K</kbd>
          </div>
          <div className="relative">
            <button
              type="button"
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              onClick={() => setProfileMenuOpen((open) => !open)}
              className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-surface-container"
            >
              <span className="grid size-8 place-items-center rounded-full bg-accent/15 text-xs font-bold text-accent" aria-hidden="true">{user.full_name.split(" ").map((part) => part[0]).join("")}</span>
              <span>
                <span className="block text-sm font-semibold">{user.full_name}</span>
                <span className="block font-mono text-[11px] text-outline">
                  {activeWorkspace.role}
                </span>
              </span>
              <Icon name="more_vert" size={18} className="ml-auto text-muted" />
            </button>
            {profileMenuOpen && (
              <div role="menu" className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-border bg-white p-1.5 shadow-lg">
                <LogoutButton />
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="dashboard-main ml-[250px] min-h-screen">
        <header className="dashboard-topbar fixed left-[250px] right-0 top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border/40 bg-white/90 px-4 backdrop-blur-xl lg:px-6">
          <div className="flex min-w-0 items-center gap-2 text-sm text-muted">
            <button
              className="lg:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Icon name="menu" />
            </button>
            <span className="hidden sm:inline">{activeWorkspace.name}</span>
            <span className="text-outline">/</span>
            <span className="truncate font-semibold text-foreground">{pageTitle}</span>
          </div>
          <label className="relative mx-auto hidden w-full max-w-md items-center md:flex">
            <Icon name="search" size={18} className="absolute left-2.5 text-outline" />
            <input
              className="h-9 w-full rounded-lg border border-border/50 bg-surface-low pl-9 pr-12 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              placeholder="Search or type Cmd+K..."
            />
            <kbd className="absolute right-2 rounded border border-border/60 bg-white px-1 font-mono text-[11px] text-outline">
              ⌘K
            </kbd>
          </label>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/work-items/new"
              className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-semibold text-white shadow-sm hover:bg-accent-strong"
            >
              <Icon name="add" size={18} />
              <span className="hidden sm:inline">Create Work Item</span>
            </Link>
            <Link
              href="/inbox"
              aria-label="Notifications"
              className="relative rounded p-1 text-muted hover:bg-surface-low"
            >
              <Icon name="notifications" />
            </Link>
            <button
              aria-label="Help"
              className="hidden rounded p-1 text-muted hover:bg-surface-low sm:block"
            >
              <Icon name="help" />
            </button>
            <span
              className="grid size-8 place-items-center rounded-full bg-accent/15 text-xs font-bold text-accent"
              aria-label={user.full_name}
            >
              {user.full_name
                .split(" ")
                .map((part) => part[0])
                .join("")}
            </span>
          </div>
        </header>
        <main className="min-h-screen bg-surface-low pt-14">{children}</main>
      </div>
    </div>
  );
}
