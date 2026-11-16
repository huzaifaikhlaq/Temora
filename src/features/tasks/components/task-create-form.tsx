
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/shared/icon";

import { authClient, type AuthUser } from "@/features/authentication/lib/auth-client";
import { projectApi, type Project } from "@/features/projects/api/client";
import { workspaceApi } from "@/features/workspace/api/client";
import type { WorkspaceMember } from "@/features/workspace/types";

import {
  issueApi,
  type Issue,
  type IssueInput,
  type IssueType,
  type IssueStatus,
  type IssuePriority,
} from "@/features/issues/api/client";

type SubtaskRow = {
  title: string;
  status: IssueStatus;
};

export function TaskCreateForm({
  modal = false,
}: {
  modal?: boolean;
}) {
  const input = "h-9 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent";
  const router = useRouter();
  const search = useSearchParams();

  const [workspaceId, setWorkspaceId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("Workspace");
  const [projectId, setProjectId] = useState(
    search.get("projectId") ?? "",
  );

  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [epics, setEpics] = useState<Issue[]>([]);

  const [issueType, setIssueType] = useState<IssueType>("task");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [status, setStatus] = useState<IssueStatus>("to_do");
  const [priority, setPriority] = useState<IssuePriority>("high");
  const [assigneeId, setAssigneeId] = useState("");
  const [storyPoints, setStoryPoints] = useState<number | null>(5);
  const [epicId, setEpicId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");
  const [components, setComponents] = useState("");

  const [subtasks, setSubtasks] = useState<SubtaskRow[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  const [ready, setReady] = useState(false);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const draftRef = useRef<string | null>(null);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const publishingRef = useRef(false);
  const publishedIssueRef = useRef<Issue | null>(null);

  // Load the real workspace, projects and members.
  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [selection, workspaces, identity] =
          await Promise.all([
            workspaceApi.selected(),
            workspaceApi.list(),
            authClient.me(),
          ]);

        const wid =
          selection.workspace_id ?? workspaces[0]?.id;

        if (!wid) {
          throw new Error("Create a workspace first");
        }

        const [projectList, memberList] =
          await Promise.all([
            projectApi.list(wid),
            workspaceApi.members(wid),
          ]);

        if (!active) return;

        const available = projectList.filter(
          (p) => !p.archived_at,
        );

        setWorkspaceId(wid);
        setWorkspaceName(workspaces.find((workspace) => workspace.id === wid)?.name ?? "Workspace");
        setProjects(available);
        setMembers(memberList);
        setUser(identity.user);

        setProjectId((previous) =>
          available.some((p) => p.id === previous)
            ? previous
            : available[0]?.id ?? "",
        );
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load issue form",
          );
        }
      } finally {
        if (active) setReady(true);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  // Fetch existing epics for the selected project.
  useEffect(() => {
    if (!workspaceId || !projectId) return;

    let active = true;

    issueApi
      .list(workspaceId, projectId, "issue_type=epic")
      .then((items) => {
        if (active) setEpics(items);
      })
      .catch(() => {
        if (active) setEpics([]);
      });

    return () => {
      active = false;
    };
  }, [workspaceId, projectId]);

  const inputPayload = useCallback(
    (isDraft: boolean): IssueInput => ({
      issue_type: issueType,
      title: title.trim(),
      description,
      status,
      priority,
      assignee_id: assigneeId || null,
      story_points: storyPoints,
      epic_id:
        issueType === "epic" ? null : epicId || null,
      sprint_id: null,
      due_date: dueDate || null,

      tags: tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),

      components: components
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),

      subtasks: subtasks
        .filter((item) => item.title.trim().length >= 3)
        .map((item) => ({
          title: item.title.trim(),
          status: item.status,
        })),

      is_draft: isDraft,
    }),
    [
      issueType,
      title,
      description,
      status,
      priority,
      assigneeId,
      storyPoints,
      epicId,
      dueDate,
      tags,
      components,
      subtasks,
    ],
  );

  // Serialize writes to avoid overlapping autosave requests.
  const saveDraft = useCallback(
    (payload: IssueInput) => {
      if (!workspaceId || !projectId) {
        return Promise.reject(
          new Error("Choose a project"),
        );
      }

      const job = queueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (publishingRef.current || publishedIssueRef.current) {
            throw new Error("Issue is being published or is already published.");
          }

          const issue = draftRef.current
            ? await issueApi.update(
              workspaceId,
              projectId,
              draftRef.current,
              payload,
            )
            : await issueApi.create(
              workspaceId,
              projectId,
              payload,
            );

          draftRef.current = issue.id;
          return issue;
        });

      queueRef.current = job.catch(() => undefined);

      return job;
    },
    [workspaceId, projectId],
  );

  // Autosave changes to PostgreSQL via Issue Service.
  useEffect(() => {
    if (
      !ready ||
      !workspaceId ||
      !projectId ||
      !touched ||
      submitting ||
      publishingRef.current ||
      publishedIssueRef.current
    ) {
      return;
    }

    const timer = setTimeout(() => {
      if (publishingRef.current || publishedIssueRef.current) {
        return;
      }

      setSaving(true);

      void saveDraft(inputPayload(true))
        .then(() => {
          if (!publishingRef.current && !publishedIssueRef.current) {
            setNotice("Draft autosaved");
            setError("");
          }
        })
        .catch((cause: unknown) => {
          if (publishingRef.current || publishedIssueRef.current) {
            return;
          }

          setError(
            cause instanceof Error
              ? cause.message
              : "Autosave failed",
          );
        })
        .finally(() => setSaving(false));
    }, 1100);

    return () => clearTimeout(timer);
  }, [
    ready,
    workspaceId,
    projectId,
    touched,
    submitting,
    inputPayload,
    saveDraft,
  ]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (publishingRef.current) return;

    if (!workspaceId || !projectId || !title.trim()) {
      setError("Select a project and enter a title");
      return;
    }

    if (
      subtasks.some((item) => item.title.trim().length < 3)
    ) {
      setError(
        "Every subtask needs at least 3 characters",
      );
      return;
    }

    // Stop any further draft saves immediately.
    publishingRef.current = true;
    setSubmitting(true);
    setError("");

    try {
      // Finish an autosave already in progress.
      await queueRef.current;

      let issue = publishedIssueRef.current;

      // Publish only once.
      if (!issue) {
        const payload = inputPayload(false);

        issue = draftRef.current
          ? await issueApi.update(
            workspaceId,
            projectId,
            draftRef.current,
            payload,
          )
          : await issueApi.create(
            workspaceId,
            projectId,
            payload,
          );

        // Mark as published BEFORE uploading files.
        publishedIssueRef.current = issue;
        draftRef.current = null;
      }

      for (const file of files) {
        await issueApi.upload(
          workspaceId,
          projectId,
          issue.id,
          file,
        );

        setFiles((current) =>
          current.filter((item) => item !== file),
        );
      }

      if (createAnother) {
        publishedIssueRef.current = null;
        draftRef.current = null;
        setTitle("");
        setDescription("");
        setSubtasks([]);
        setFiles([]);
        setTouched(false);
        setNotice(`${issue.key} created successfully`);
      } else {
        router.push(`/projects/${projectId}/board`);
        router.refresh();
      }
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Unknown error";

      if (publishedIssueRef.current) {
        setError(
          `Issue ${publishedIssueRef.current.key} was created, ` +
          `but attachment upload failed: ${message}. ` +
          `Retry to upload the remaining attachments.`,
        );
      } else {
        setError(`Could not create issue: ${message}`);
      }
    } finally {
      publishingRef.current = false;
      setSubmitting(false);
    }
  }

  async function saveDraftNow() {
    if (publishingRef.current || publishedIssueRef.current) {
      setError("This issue has already been published. It cannot be saved as a draft.");
      return;
    }

    if (!workspaceId || !projectId) {
      setError("Choose a project before saving a draft.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await queueRef.current;
      const draft = await saveDraft(inputPayload(true));
      draftRef.current = draft.id;
      setNotice("Draft saved");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Draft could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  // The full JSX layout for the form, including the
  // metadata sidebar, Markdown preview, file dropzone,
  // subtasks, and buttons, is in the source package.
  // The return block is intentionally shown there
  // rather than duplicated in this shorter excerpt.


  return (
    <div
      className={modal ? "space-y-4 p-4 sm:p-6" : "mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8"}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className={`${modal ? "text-[10px]" : "text-xs"} font-semibold uppercase tracking-[.16em] text-outline`}
          >
            {workspaceName} / Tasks
          </p>
          <h1
            id={modal ? "task-create-title" : undefined}
            className={`${modal ? "mt-1 text-xl" : "mt-1 text-2xl"} font-bold`}
          >
            Create task
          </h1>
          <p className="mt-1 text-sm text-muted">
            Add a clear, actionable task to a project in this workspace.
          </p>
        </div>
        {modal ? (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Close create task"
            className="rounded-lg p-2 text-muted hover:bg-surface-low"
          >
            <Icon name="close" />
          </button>
        ) : (
          <Link href="/tasks" className="rounded-lg border border-border px-3 py-2 text-sm">
            Cancel
          </Link>
        )}
      </header>
      <form
        onSubmit={submit}
        onChange={() => {
          setTouched(true);
          setNotice("");
        }}
        className={`grid gap-4 ${modal ? "lg:grid-cols-[minmax(0,1fr)_280px]" : "xl:grid-cols-[minmax(0,1fr)_300px]"}`}
      >
        <section
          className={`rounded-xl border border-border bg-white ${modal ? "p-4 sm:p-5" : "p-5 sm:p-6"}`}
        >
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Issue type
              <select className={`${input} mt-1`} value={issueType} onChange={(event) => setIssueType(event.target.value as IssueType)}>
                {(["task", "story", "bug", "epic"] as IssueType[]).map((type) => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Status
              <select className={`${input} mt-1`} value={status} onChange={(event) => setStatus(event.target.value as IssueStatus)}>
                {([["backlog", "Backlog"], ["to_do", "To do"], ["in_progress", "In progress"], ["in_review", "In review"], ["done", "Done"]] as [IssueStatus, string][]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-sm font-semibold">
            Summary *
            <input
              className={`${input} mt-1`}
              required
              minLength={3}
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs to be done?"
            />
          </label>
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <label htmlFor="task-description" className="text-sm font-semibold">Description</label>
              <button type="button" onClick={() => setPreview((value) => !value)} className="text-xs font-medium text-accent">{preview ? "Edit" : "Preview"}</button>
            </div>
            {preview ? <div className="mt-1 min-h-36 whitespace-pre-wrap rounded-lg border border-border p-3 text-sm">{description || "Nothing to preview yet."}</div> : <textarea
              id="task-description"
              maxLength={50000}
              className="mt-1 min-h-36 w-full rounded-lg border border-border p-3 text-sm outline-none focus:border-accent"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add context, scope, and expected outcome…"
            />}
          </div>
          <label className="mt-5 block text-sm font-semibold">
            Attachments
            <input type="file" multiple accept=".png,.jpg,.jpeg,.pdf,.webm" className="mt-1 block w-full text-sm" onChange={(event) => { setFiles(Array.from(event.target.files ?? [])); setTouched(true); }} />
            <span className="mt-1 block text-xs font-normal text-muted">PNG, JPG, PDF, or WEBM · up to 25 MB each</span>
          </label>
          {files.length > 0 && <ul className="mt-2 space-y-1 text-xs text-muted">{files.map((file) => <li key={`${file.name}-${file.size}`}>{file.name} · {Math.max(1, Math.round(file.size / 1024))} KB</li>)}</ul>}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Subtasks</h2>
              <button
                type="button"
                className="text-sm font-medium text-accent"
                onClick={() => { setSubtasks((items) => [...items, { title: "", status: "to_do" }]); setTouched(true); }}
              >
                + Add subtask
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {subtasks.map((item, index) => (
                <div className="flex gap-2" key={index}>
                  <input
                    aria-label={`Subtask ${index + 1}`}
                    className={input}
                    value={item.title}
                    onChange={(event) =>
                      setSubtasks((current) =>
                        current.map((value, itemIndex) =>
                          itemIndex === index ? { ...value, title: event.target.value } : value,
                        ),
                      )
                    }
                    placeholder="Describe a subtask"
                  />
                  <button
                    type="button"
                    aria-label={`Remove subtask ${index + 1}`}
                    className="rounded-lg border border-border px-3 text-sm"
                    onClick={() => {
                      setTouched(true);
                      setSubtasks((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      );
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={createAnother} onChange={(event) => setCreateAnother(event.target.checked)} />
              Create another after this
            </label>
            <button
              type="button"
              onClick={() => void saveDraftNow()}
              disabled={saving || submitting}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              {saving ? "Saving…" : "Save draft"}
            </button>
            <button type="submit" disabled={!ready || submitting || !projects.length} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60">
              {submitting
                ? "Processing..."
                : publishedIssueRef.current
                  ? "Retry attachments"
                  : "Create task"}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="mt-3 text-sm text-emerald-700">
              {notice}
            </p>
          )}
        </section>
        <aside
          className={`h-fit space-y-4 rounded-xl border border-border bg-white ${modal ? "p-4" : "p-5"}`}
        >
          <label className="block text-xs font-semibold text-muted">
            Project
            <select
              className={`${input} mt-1`}
              value={projectId}
              onChange={(event) => {
                setProjectId(event.target.value);
              }}
              required
            >
              {projects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.key})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-muted">
            Assignee
            <select
              className={`${input} mt-1`}
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.user_id}>
                  {member.user_id === user?.id ? user.full_name : member.user_id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-muted">
            Labels
            <input
              className={`${input} mt-1`}
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="e.g. frontend, mobile"
            />
            <span className="mt-1 block font-normal">Separate labels with commas.</span>
          </label>
          <label className="block text-xs font-semibold text-muted">
            Components
            <input
              className={`${input} mt-1`}
              value={components}
              onChange={(event) => setComponents(event.target.value)}
              placeholder="e.g. web, API"
            />
            <span className="mt-1 block font-normal">Separate components with commas.</span>
          </label>
          {issueType !== "epic" && (
            <label className="block text-xs font-semibold text-muted">
              Epic
              <select className={`${input} mt-1`} value={epicId} onChange={(event) => setEpicId(event.target.value)}>
                <option value="">No epic</option>
                {epics.map((epic) => <option key={epic.id} value={epic.id}>{epic.key} · {epic.title}</option>)}
              </select>
            </label>
          )}
          <label className="block text-xs font-semibold text-muted">
            Priority
            <select
              className={`${input} mt-1`}
              value={priority}
              onChange={(event) => setPriority(event.target.value as typeof priority)}
            >
              {["Urgent", "High", "Medium", "Low"].map((item) => (
                <option key={item} value={item.toLowerCase()}>{item}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-muted">
            Story points
            <select
              className={`${input} mt-1`}
              value={storyPoints ?? ""}
              onChange={(event) => setStoryPoints(event.target.value ? Number(event.target.value) : null)}
            >
              <option value="">Not estimated</option>
              {[1, 2, 3, 5, 8, 13].map((points) => <option key={points} value={points}>{points}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-muted">
            Due date
            <input
              className={`${input} mt-1`}
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
          {projects.find((item) => item.id === projectId) && (
            <p className="text-xs leading-5 text-muted">
              This task will be added to {projects.find((item) => item.id === projectId)?.name} ({projects.find((item) => item.id === projectId)?.key}).
            </p>
          )}
          <p className="text-xs leading-5 text-muted">
            Task data is saved to this Temora workspace.
          </p>
        </aside>
      </form>
    </div>
  );
}
