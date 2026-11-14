"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MetricCard, Panel, PanelTitle } from "@/components/shared/dashboard-ui";
import { Icon } from "@/components/shared/icon";
import { projectApi, type Project } from "@/features/projects/api/client";

export function ApiProjectWorkspacePage({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setProject(null);
    setError("");
    projectApi
      .get(workspaceId, projectId)
      .then((result) => {
        if (active) setProject(result);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Unable to load this project.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [workspaceId, projectId]);

  if (loading) {
    return <div className="p-8 text-sm text-muted">Loading project...</div>;
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <h1 className="text-xl font-semibold">Project not found</h1>
        <p className="mt-2 text-sm text-muted">
          {error || "This project may belong to another workspace or may have been archived."}
        </p>
        <Link href="/projects" className="mt-4 inline-block text-sm text-accent">
          Back to projects <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[.16em] text-outline">
            <Link href="/projects" className="hover:text-accent">
              Projects
            </Link>{" "}/ {project.key}
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{project.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {project.description || "Project overview and delivery details."}
          </p>
        </div>
        <Link
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white"
          href={`/projects/${project.id}/board`}
        >
          <Icon name="view_kanban" />
          Open board
        </Link>
      </header>

      <nav aria-label="Project navigation" className="flex flex-wrap gap-1 border-b border-border">
        <Link
          href={`/projects/${project.id}`}
          aria-current="page"
          className="border-b-2 border-accent px-3 py-2 text-sm font-semibold text-accent"
        >
          Overview
        </Link>
        <Link href={`/projects/${project.id}/board`} className="border-b-2 border-transparent px-3 py-2 text-sm text-muted hover:text-foreground">Board</Link>
        <Link href={`/projects/${project.id}/sprints`} className="border-b-2 border-transparent px-3 py-2 text-sm text-muted hover:text-foreground">Sprints</Link>
        <Link href={`/projects/${project.id}/roadmap`} className="border-b-2 border-transparent px-3 py-2 text-sm text-muted hover:text-foreground">Roadmap</Link>
        <Link href={`/projects/${project.id}/members`} className="border-b-2 border-transparent px-3 py-2 text-sm text-muted hover:text-foreground">Members</Link>
        <Link href={`/projects/${project.id}/settings`} className="border-b-2 border-transparent px-3 py-2 text-sm text-muted hover:text-foreground">Settings</Link>
      </nav>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Completion" value={`${project.progress}%`} note={project.status.replaceAll("_", " ")} icon="task_alt" tone="green" />
        <MetricCard label="Project key" value={project.key} note="Workspace project" icon="tag" />
        <MetricCard label="Category" value={project.category || "General"} note="Team / category" icon="category" />
        <MetricCard label="Due date" value={project.due_date || "—"} note="Project timeline" icon="calendar_today" />
      </div>

      <Panel>
        <PanelTitle title="Project details" />
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Status</dt>
            <dd className="mt-1 font-medium capitalize">{project.status.replaceAll("_", " ")}</dd>
          </div>
          <div>
            <dt className="text-muted">Description</dt>
            <dd className="mt-1 font-medium">{project.description || "No description yet."}</dd>
          </div>
        </dl>
      </Panel>
    </div>
  );
}
