"use client";

import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import { Panel } from "@/components/shared/dashboard-ui";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

export function ProjectEmptyState({ projectId }: { projectId: string }) {
  const state = useDemoState();
  const project = state.projects.find(
    (item) => item.id === projectId && item.workspaceId === state.activeWorkspaceId,
  );
  if (!project)
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">Project not found</h1>
        <Link href="/projects" className="mt-3 inline-block text-sm text-accent">
          Back to projects
        </Link>
      </div>
    );
  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
      <p className="text-sm text-muted">
        <Link href="/projects" className="hover:text-accent">
          Projects
        </Link>{" "}
        / {project.name}
      </p>
      <Panel className="mx-auto max-w-3xl py-12 text-center sm:py-16">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-accent/10 text-accent">
          <Icon name="view_kanban" size={32} />
        </span>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[.16em] text-accent">
          {project.name} · {project.key}
        </p>
        <h1 className="mt-2 text-2xl font-bold">Your project board is ready</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">
          Bring your team’s work together. Create an task to plan the first sprint, then track it
          across your board.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href={`/tasks/new?projectId=${encodeURIComponent(project.id)}`}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white"
          >
            <Icon name="add" />
            Create first task
          </Link>
          <button
            disabled
            title="External import is not connected in this frontend preview"
            className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted opacity-60"
          >
            <Icon name="cloud_download" />
            Import tasks (unavailable)
          </button>
        </div>
        <div className="mx-auto mt-9 grid max-w-xl gap-3 border-t border-border pt-6 text-left sm:grid-cols-3">
          {[
            ["01", "Add tasks", "Capture the next work item"],
            ["02", "Plan a sprint", "Set a shared team goal"],
            ["03", "Track progress", "Move work across your board"],
          ].map(([number, title, body]) => (
            <div key={number}>
              <span className="font-mono text-xs text-accent">{number}</span>
              <strong className="mt-2 block text-sm">{title}</strong>
              <p className="mt-1 text-xs text-muted">{body}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
