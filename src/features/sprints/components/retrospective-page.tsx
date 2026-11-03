"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "@/components/shared/icon";
import { MetricCard, Panel } from "@/components/shared/dashboard-ui";
import { demoRepository } from "@/features/workspace/data/demo-repository";
import type { RetrospectiveNote } from "@/features/workspace/data/model";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

const categories: RetrospectiveNote["category"][] = ["Went well", "To improve", "Action items"];
const columnTone: Record<RetrospectiveNote["category"], string> = {
  "Went well": "bg-emerald-50",
  "To improve": "bg-amber-50",
  "Action items": "bg-violet-50",
};

function dateLabel(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function RetrospectivePage({ sprintId }: { sprintId: string }) {
  const state = useDemoState();
  const [addingCategory, setAddingCategory] = useState<RetrospectiveNote["category"] | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const sprint = state.sprints.find(
    (item) =>
      (item.id === sprintId || item.id === `sprint-${sprintId}`) &&
      item.workspaceId === state.activeWorkspaceId,
  );
  const activeSprint = sprint;
  if (!activeSprint)
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold">Sprint not found</h1>
        <p className="mt-2 text-sm text-muted">
          This sprint is not available in the active workspace.
        </p>
      </main>
    );
  const currentSprint = activeSprint!;

  const notes =
    state.settingsByWorkspace[state.activeWorkspaceId]?.retrospectiveNotes?.[currentSprint.id] ??
    [];
  const project = state.projects.find((item) => item.id === currentSprint.projectId);
  const issues = state.issues.filter(
    (issue) => issue.sprintId === currentSprint.id && issue.workspaceId === state.activeWorkspaceId,
  );
  const committedPoints = issues.reduce((total, issue) => total + issue.storyPoints, 0);
  const donePoints = issues
    .filter((issue) => issue.status === "Done")
    .reduce((total, issue) => total + issue.storyPoints, 0);
  const actionItems = notes.filter((note) => note.category === "Action items");

  function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!addingCategory) return;
    try {
      demoRepository.addRetrospectiveNote(currentSprint.id, addingCategory, draft);
      setDraft("");
      setAddingCategory(null);
      setError("");
      setNotice("Note added to this browser’s demo workspace.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add retrospective note.");
    }
  }

  function exportSummary() {
    const content = [
      `${currentSprint.name} retrospective`,
      `${project?.name ?? "Project"} · ${currentSprint.goal || "No sprint goal"}`,
      `${currentSprint.startDate} — ${currentSprint.endDate} · ${currentSprint.status}`,
      ...categories.flatMap((category) => [
        `\n${category}`,
        ...notes
          .filter((note) => note.category === category)
          .map((note) => `- ${note.body} (${note.votes.length} votes)`),
      ]),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${currentSprint.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-retrospective.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Retrospective summary downloaded.");
  }

  return (
    <main className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[.16em] text-outline">
            {project?.name ?? "Project"} / {currentSprint.name}
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Sprint retrospective &amp; insights
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Shared notes and votes are saved in this browser’s demo workspace. No external service
            is contacted.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportSummary}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-medium hover:bg-surface-low"
          >
            <Icon name="file_download" /> Export Summary
          </button>
          <button
            type="button"
            onClick={() => {
              setAddingCategory("Action items");
              setError("");
            }}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white hover:bg-accent-strong"
          >
            <Icon name="add_task" /> Create Action Item
          </button>
        </div>
      </header>

      <Panel>
        <span className="font-mono text-xs font-semibold text-accent">
          {currentSprint.name.toUpperCase()} · {currentSprint.status.toUpperCase()}
        </span>
        <h2 className="mt-1 text-xl font-bold">{currentSprint.goal || "Sprint review"}</h2>
        <p className="mt-1 text-sm text-muted">
          {dateLabel(currentSprint.startDate)}–{dateLabel(currentSprint.endDate)} ·{" "}
          {committedPoints} points in sprint issues
        </p>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Points completed"
          value={`${donePoints} / ${committedPoints}`}
          note="Based on current issue status"
          icon="bolt"
        />
        <MetricCard
          label="Sprint carryover"
          value={`${issues.filter((issue) => issue.status !== "Done").length} issues`}
          note="Issues not marked done"
          icon="sync_alt"
        />
        <MetricCard
          label="Retrospective notes"
          value={String(notes.length)}
          note="Across all categories"
          icon="forum"
        />
        <MetricCard
          label="Action items"
          value={String(actionItems.length)}
          note="Created in this demo"
          icon="task_alt"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-3">
        {categories.map((category) => (
          <Panel key={category} className={columnTone[category]}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{category}</h2>
              <button
                type="button"
                aria-label={`Add note to ${category}`}
                onClick={() => {
                  setAddingCategory(category);
                  setError("");
                }}
                className="text-accent"
              >
                <Icon name="add" />
              </button>
            </div>
            {addingCategory === category && (
              <form onSubmit={addNote} className="mt-3 rounded-lg bg-white p-3">
                <label className="block text-xs font-medium">
                  {category} note
                  <textarea
                    autoFocus
                    required
                    minLength={3}
                    maxLength={500}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    className="mt-1 min-h-24 w-full rounded-lg border border-border p-2 text-sm outline-none focus:border-accent"
                    placeholder="Add a concise team note"
                  />
                </label>
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAddingCategory(null);
                      setDraft("");
                    }}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Add note
                  </button>
                </div>
              </form>
            )}
            <div className="mt-4 space-y-3">
              {notes
                .filter((note) => note.category === category)
                .map((note) => {
                  const voted = note.votes.includes(state.activeMemberId);
                  return (
                    <article key={note.id} className="rounded-lg bg-white/90 p-3 text-sm">
                      <p>{note.body}</p>
                      <div className="mt-3 flex items-center justify-between text-xs text-muted">
                        <span>
                          {note.votes.length} votes · {dateLabel(note.createdAt)}
                        </span>
                        <button
                          type="button"
                          aria-pressed={voted}
                          onClick={() => {
                            try {
                              demoRepository.toggleRetrospectiveVote(note.id);
                              setError("");
                              setNotice(
                                voted ? "Vote removed." : "Vote recorded in the demo workspace.",
                              );
                            } catch (cause) {
                              setError(
                                cause instanceof Error ? cause.message : "Could not update vote.",
                              );
                            }
                          }}
                          className={voted ? "font-semibold text-accent" : "text-accent"}
                        >
                          {voted ? "▲ Voted" : "▲ Vote"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              {!notes.some((note) => note.category === category) && addingCategory !== category && (
                <p className="rounded-lg bg-white/70 p-3 text-sm text-muted">No notes yet.</p>
              )}
            </div>
          </Panel>
        ))}
      </div>
    </main>
  );
}
