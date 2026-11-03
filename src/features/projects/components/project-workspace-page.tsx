"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { Icon } from "@/components/shared/icon";
import { MetricCard, Panel, PanelTitle } from "@/components/shared/dashboard-ui";
import { demoRepository } from "@/features/workspace/data/demo-repository";
import type { ProjectStatus } from "@/features/workspace/data/model";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

type ProjectPageMode = "overview" | "settings" | "members";
const field =
  "h-10 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent";

export function ProjectWorkspacePage({
  projectId,
  mode,
}: {
  projectId: string;
  mode: ProjectPageMode;
}) {
  const state = useDemoState();
  const project = state.projects.find(
    (item) => item.id === projectId && item.workspaceId === state.activeWorkspaceId,
  );
  const tasks = useMemo(
    () =>
      state.tasks.filter(
        (task) => task.projectId === projectId && task.workspaceId === state.activeWorkspaceId,
      ),
    [state.tasks, projectId, state.activeWorkspaceId],
  );
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [category, setCategory] = useState(project?.category ?? "");
  const [dueDate, setDueDate] = useState(project?.dueDate ?? "");
  const [progress, setProgress] = useState(project?.progress ?? 0);
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "Planning");
  const [inviteEmail, setInviteEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  if (!project)
    return (
      <div className="mx-auto max-w-3xl p-8">
        <h1 className="text-xl font-semibold">Project not found</h1>
        <p className="mt-2 text-sm text-muted">
          The project may belong to another workspace or may have been archived.
        </p>
        <Link href="/projects" className="mt-4 inline-block text-sm text-accent">
          Back to projects →
        </Link>
      </div>
    );
  const activeProject = project;

  const workspace = state.workspaces.find((item) => item.id === project.workspaceId)!;
  const members = state.members.filter((member) => member.workspaceId === project.workspaceId);
  const projectMembers = members.filter((member) => project.memberIds.includes(member.id));
  const openTasks = tasks.filter((task) => task.status !== "Done");
  const currentSprint = state.sprints.find(
    (sprint) => sprint.projectId === project.id && sprint.status === "Active",
  );

  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      demoRepository.updateProject(activeProject.id, {
        name,
        description,
        category,
        dueDate,
        progress,
        status,
      });
      setNotice("Project settings saved in this browser.");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save project settings.");
      setNotice("");
    }
  }

  function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const member = demoRepository.inviteMember({ email: inviteEmail });
      demoRepository.updateProject(activeProject.id, {
        memberIds: [...activeProject.memberIds, member.id],
      });
      setInviteEmail("");
      setNotice(`${member.email} was added to the project and workspace demo roster.`);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add this member.");
      setNotice("");
    }
  }

  function toggleProjectMember(memberId: string, checked: boolean) {
    const next = checked
      ? [...new Set([...activeProject.memberIds, memberId])]
      : activeProject.memberIds.filter((id) => id !== memberId);
    try {
      demoRepository.updateProject(activeProject.id, { memberIds: next });
      setNotice("Project membership updated.");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update project membership.");
    }
  }

  const title =
    mode === "overview"
      ? project.name
      : mode === "settings"
        ? "Project Settings"
        : "Project Members";
  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[.16em] text-outline">
            <Link href="/projects" className="hover:text-accent">
              {workspace.name} / Projects
            </Link>{" "}
            / {project.key}
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-muted">
            {mode === "overview"
              ? project.description
              : mode === "settings"
                ? "Update project details, ownership, and delivery preferences."
                : "Choose the people who can access and contribute to this project."}
          </p>
        </div>
        {mode === "overview" && (
          <Link
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white"
            href={`/projects/${project.id}/board`}
          >
            <Icon name="view_kanban" />
            Open board
          </Link>
        )}
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-border">
        {[
          ["Overview", `/projects/${project.id}`, "overview"],
          ["Board", `/projects/${project.id}/board`, `board`],
          ["Sprints", `/projects/${project.id}/sprints`, `sprints`],
          ["Roadmap", `/projects/${project.id}/roadmap`, `roadmap`],
          ["Members", `/projects/${project.id}/members`, `members`],
          ["Settings", `/projects/${project.id}/settings`, `settings`],
        ].map(([label, href, key]) => (
          <Link
            key={key}
            href={href}
            className={`border-b-2 px-3 py-2 text-sm ${key === mode ? "border-accent font-semibold text-accent" : "border-transparent text-muted hover:text-foreground"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      {mode === "overview" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Completion"
              value={`${project.progress}%`}
              note={project.status}
              icon="task_alt"
              tone="green"
            />
            <MetricCard
              label="Open tasks"
              value={String(openTasks.length)}
              note={`${tasks.length} total`}
              icon="checklist"
            />
            <MetricCard
              label="Active sprint"
              value={currentSprint?.name ?? "None"}
              note={currentSprint?.goal ?? "No sprint running"}
              icon="cycle"
            />
            <MetricCard
              label="Project members"
              value={String(projectMembers.length)}
              note={`Lead: ${state.members.find((member) => member.id === project.leadId)?.name ?? "Unassigned"}`}
              icon="group"
            />
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
            <Panel>
              <PanelTitle
                title="Recent tasks"
                trailing={
                  <Link href="/tasks/new" className="text-sm font-semibold text-accent">
                    Create task
                  </Link>
                }
              />
              {tasks.slice(0, 6).map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.key}`}
                  className="flex flex-wrap items-center gap-3 border-b border-border py-3 text-sm last:border-0"
                >
                  <span className="font-mono text-xs text-accent">{task.key}</span>
                  <span className="min-w-40 flex-1 font-medium">{task.title}</span>
                  <span className="rounded bg-surface-low px-2 py-1 text-xs text-muted">
                    {task.status}
                  </span>
                  <span className="text-xs text-muted">{task.priority}</span>
                </Link>
              ))}
              {!tasks.length && (
                <p className="py-8 text-center text-sm text-muted">
                  No tasks yet. Add your first task to start the board.
                </p>
              )}
            </Panel>
            <Panel>
              <PanelTitle title="Project details" />
              <dl className="space-y-4 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Category</dt>
                  <dd className="font-medium">{project.category}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Status</dt>
                  <dd className="font-medium">{project.status}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Due date</dt>
                  <dd className="font-medium">{project.dueDate}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Project key</dt>
                  <dd className="font-mono font-medium">{project.key}</dd>
                </div>
              </dl>
              <Link
                href={`/projects/${project.id}/settings`}
                className="mt-5 inline-flex text-sm font-semibold text-accent"
              >
                Edit project settings →
              </Link>
            </Panel>
          </div>
        </>
      )}

      {mode === "settings" && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Panel>
            <PanelTitle title="Project details" />
            <form onSubmit={saveSettings} className="space-y-4">
              <label className="block text-sm font-medium">
                Project name
                <input
                  className={`${field} mt-1 w-full`}
                  required
                  minLength={2}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Description
                <textarea
                  className="mt-1 min-h-28 w-full rounded-lg border border-border p-3 text-sm outline-none focus:border-accent"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Team / category
                  <select
                    className={`${field} mt-1 w-full`}
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    {[
                      "Web / Marketing",
                      "iOS / Android",
                      "B2B SaaS",
                      "Product Design",
                      "Product & Engineering",
                      "Mobile Engineering",
                      "Platform",
                      "Marketing",
                      "General",
                    ].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Project status
                  <select
                    className={`${field} mt-1 w-full`}
                    value={status}
                    onChange={(event) => setStatus(event.target.value as ProjectStatus)}
                  >
                    <option>Planning</option>
                    <option>In Progress</option>
                    <option>In Review</option>
                  </select>
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Due date
                  <input
                    className={`${field} mt-1 w-full`}
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                  />
                </label>
                <label className="block text-sm font-medium">
                  Progress · {progress}%
                  <input
                    className="mt-4 w-full accent-violet-600"
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={(event) => setProgress(Number(event.target.value))}
                  />
                </label>
              </div>
              <button className="h-9 rounded-lg bg-accent px-4 text-sm font-semibold text-white">
                Save project
              </button>
            </form>
          </Panel>
          <Panel>
            <PanelTitle title="Project lead" />
            <select
              className={`${field} w-full`}
              value={project.leadId}
              onChange={(event) => {
                try {
                  demoRepository.updateProject(project.id, { leadId: event.target.value });
                  setNotice("Project lead updated.");
                  setError("");
                } catch (cause) {
                  setError(
                    cause instanceof Error ? cause.message : "Could not update project lead.",
                  );
                }
              }}
            >
              {projectMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <div className="mt-6 border-t border-border pt-5">
              <h2 className="font-semibold text-red-700">Archive project</h2>
              <p className="mt-1 text-xs leading-5 text-muted">
                Archived projects are removed from active project lists. Their tasks remain in demo
                storage.
              </p>
              <button
                className="mt-3 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700"
                onClick={() => {
                  if (window.confirm(`Archive ${project.name}?`)) {
                    demoRepository.archiveProject(project.id);
                    setNotice("Project archived.");
                  }
                }}
              >
                Archive this project
              </button>
            </div>
          </Panel>
        </div>
      )}

      {mode === "members" && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Panel>
            <PanelTitle title="Project members" />
            <div className="space-y-2">
              {members.map((member) => (
                <label
                  key={member.id}
                  className="flex items-center gap-3 rounded-lg border border-border/70 p-3"
                >
                  <input
                    type="checkbox"
                    checked={project.memberIds.includes(member.id)}
                    disabled={member.id === project.leadId}
                    onChange={(event) => toggleProjectMember(member.id, event.target.checked)}
                    className="size-4 accent-violet-600"
                  />
                  <span className="grid size-9 place-items-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{member.name}</strong>
                    <span className="text-xs text-muted">
                      {member.email} · {member.team}
                    </span>
                  </span>
                  <span className="text-xs text-muted">
                    {member.id === project.leadId ? "Lead" : member.role}
                  </span>
                </label>
              ))}
            </div>
          </Panel>
          <Panel>
            <PanelTitle title="Invite a member" />
            <form onSubmit={invite} className="space-y-3">
              <label className="block text-sm font-medium">
                Work email
                <input
                  className={`${field} mt-1 w-full`}
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="colleague@company.com"
                />
              </label>
              <p className="text-xs leading-5 text-muted">
                This adds a demo member to {workspace.name} and this project. No email will be sent.
              </p>
              <button className="h-9 rounded-lg bg-accent px-3 text-sm font-semibold text-white">
                Add demo member
              </button>
            </form>
            <div className="mt-5 border-t border-border pt-4 text-xs text-muted">
              Project membership changes are stored in this browser’s demo data.
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
