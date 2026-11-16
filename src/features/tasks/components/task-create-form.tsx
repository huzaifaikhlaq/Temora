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

export function TaskCreateForm({ modal = false, initialProjectId = "" }: { modal?: boolean; initialProjectId?: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const draftId = search.get("draftId");
  const requestedProjectId = search.get("projectId");

  const [workspaceId, setWorkspaceId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("Workspace");
  const [projectId, setProjectId] = useState(search.get("projectId") ?? initialProjectId);

  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [epics, setEpics] = useState<Issue[]>([]);

  const typeParam = search.get("type");
  const [issueType, setIssueType] = useState<IssueType>(
    typeParam === "bug" || typeParam === "story" || typeParam === "epic" ? typeParam : "task",
  );
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
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [subtasksExpanded, setSubtasksExpanded] = useState(true);

  const [ready, setReady] = useState(false);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [publishedIssue, setPublishedIssue] = useState<Issue | null>(null);
  const [createAnother, setCreateAnother] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const draftRef = useRef<string | null>(null);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const publishingRef = useRef(false);
  const publishedIssueRef = useRef<Issue | null>(null);
  const lastDraftPayloadRef = useRef<string | null>(null);
  const lastDraftIssueRef = useRef<Issue | null>(null);

  // Load the real workspace, projects and members.
  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [selection, workspaces, identity] = await Promise.all([
          workspaceApi.selected(),
          workspaceApi.list(),
          authClient.me(),
        ]);

        const wid = selection.workspace_id ?? workspaces[0]?.id;

        if (!wid) {
          throw new Error("Create a workspace first");
        }

        const [projectList, memberList] = await Promise.all([
          projectApi.list(wid),
          workspaceApi.members(wid),
        ]);

        if (!active) return;

        const available = projectList.filter((p) => !p.archived_at);

        setWorkspaceId(wid);
        setWorkspaceName(workspaces.find((workspace) => workspace.id === wid)?.name ?? "Workspace");
        setProjects(available);
        setMembers(memberList);
        setUser(identity.user);

        const draftProjectId = requestedProjectId && available.some((project) => project.id === requestedProjectId)
          ? requestedProjectId
          : available[0]?.id ?? "";
        setProjectId((previous) => available.some((project) => project.id === previous) ? previous : draftProjectId);

        if (draftId) {
          if (!draftProjectId) throw new Error("Choose a project before reopening this draft.");
          const draft = await issueApi.get(wid, draftProjectId, draftId);
          if (!draft.is_draft) throw new Error("This work item has already been published.");
          if (!active) return;
          draftRef.current = draft.id;
          lastDraftIssueRef.current = draft;
          setHasDraft(true);
          setIssueType(draft.issue_type);
          setTitle(draft.title);
          setDescription(draft.description);
          setStatus(draft.status);
          setPriority(draft.priority);
          setAssigneeId(draft.assignee_id ?? "");
          setStoryPoints(draft.story_points);
          setEpicId(draft.epic_id ?? "");
          setDueDate(draft.due_date ?? "");
          setTags(draft.tags.join(", "));
          setComponents(draft.components.join(", "));
          setSubtasks(draft.subtasks.map((item) => ({ title: item.title, status: item.status })));
          setTouched(false);
        }
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Unable to load issue form");
        }
      } finally {
        if (active) setReady(true);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [draftId, requestedProjectId]);

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
      epic_id: issueType === "epic" ? null : epicId || null,
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
        return Promise.reject(new Error("Choose a project"));
      }

      const job = queueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (publishingRef.current || publishedIssueRef.current) {
            throw new Error("Issue is being published or is already published.");
          }

          const serialized = JSON.stringify(payload);
          if (draftRef.current && serialized === lastDraftPayloadRef.current) {
            if (lastDraftIssueRef.current) return lastDraftIssueRef.current;
          }
          const issue = draftRef.current
            ? await issueApi.update(workspaceId, projectId, draftRef.current, payload)
            : await issueApi.create(workspaceId, projectId, payload);

          draftRef.current = issue.id;
          lastDraftPayloadRef.current = serialized;
          lastDraftIssueRef.current = issue;
          setHasDraft(true);
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

          setError(cause instanceof Error ? cause.message : "Autosave failed");
        })
        .finally(() => setSaving(false));
    }, 1100);

    return () => clearTimeout(timer);
  }, [ready, workspaceId, projectId, touched, submitting, inputPayload, saveDraft]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (publishingRef.current) return;

    if (!workspaceId || !projectId || !title.trim()) {
      setError("Select a project and enter a title");
      return;
    }

    if (subtasks.some((item) => item.title.trim().length < 3)) {
      setError("Every subtask needs at least 3 characters");
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
          ? await issueApi.update(workspaceId, projectId, draftRef.current, payload)
          : await issueApi.create(workspaceId, projectId, payload);

        // Mark as published BEFORE uploading files.
        publishedIssueRef.current = issue;
        setPublishedIssue(issue);
        setHasDraft(false);
        draftRef.current = null;
        lastDraftPayloadRef.current = null;
        lastDraftIssueRef.current = null;
      }

      for (const file of files) {
        await issueApi.upload(workspaceId, projectId, issue.id, file);

        setFiles((current) => current.filter((item) => item !== file));
      }

      if (createAnother) {
        publishedIssueRef.current = null;
        setPublishedIssue(null);
        setHasDraft(false);
        draftRef.current = null;
        lastDraftPayloadRef.current = null;
        lastDraftIssueRef.current = null;
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
      const message = cause instanceof Error ? cause.message : "Unknown error";

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
      setError("This work item has already been published. It cannot be saved as a draft.");
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

  const selectedProject = projects.find((item) => item.id === projectId);
  const progress = subtasks.length
    ? Math.round((subtasks.filter((item) => item.status === "done").length / subtasks.length) * 100)
    : 0;
  const field =
    "h-9 w-full rounded-lg border border-transparent bg-white px-3 text-sm text-foreground shadow-sm outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/15";
  const label = "block text-xs font-semibold text-muted";

  function addSubtask() {
    const value = newSubtaskTitle.trim();
    if (value.length < 3) return;
    setSubtasks((items) => [...items, { title: value, status: "to_do" }]);
    setNewSubtaskTitle("");
    setTouched(true);
  }

  return (
    <div
      className={
        modal
          ? "flex min-h-0 flex-1 flex-col bg-white"
          : "mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8"
      }
    >
      <div
        className={`flex items-center justify-between gap-4 border-b border-border/60 px-5 py-3 ${modal ? "shrink-0 sm:px-6" : "rounded-t-xl bg-white"}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 items-center gap-2">
            <span className="size-2.5 rounded-full bg-accent" />
            <h1
              id={modal ? "issue-create-title" : undefined}
              className="font-[Geist] text-lg font-semibold tracking-tight"
            >
              Create Work Item
            </h1>
          </div>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <div className="flex min-w-0 items-center gap-2 rounded-lg bg-surface-low px-2.5 py-1.5 text-xs">
            <span className="flex size-4 shrink-0 items-center justify-center rounded bg-green text-[9px] font-bold text-white">
              {selectedProject?.key.slice(0, 2) ?? "--"}
            </span>
            <select
              aria-label="Project"
              value={projectId}
              disabled={Boolean(publishedIssue || hasDraft || saving)}
              onChange={(event) => setProjectId(event.target.value)}
              className="max-w-[240px] min-w-0 appearance-none truncate bg-transparent font-medium outline-none disabled:opacity-60"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {workspaceName} / {project.name} ({project.key})
                </option>
              ))}
            </select>
            <Icon name="expand_more" size={16} className="shrink-0 text-muted" />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded bg-surface-low px-2 py-1 text-[10px] text-muted sm:flex">
            <span
              className={`size-1.5 rounded-full ${saving ? "animate-pulse bg-amber" : error && !publishedIssue ? "bg-red" : "bg-green"}`}
            />
            <span>{saving ? "Saving draft..." : error && !publishedIssue ? "Draft save failed" : notice || "Draft autosave on"}</span>
          </div>
          {modal ? (
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Close create work item"
              className="flex h-8 items-center gap-1 rounded-lg px-2 text-muted transition hover:bg-surface-high hover:text-foreground"
            >
              <Icon name="close" size={19} />
              <span className="hidden text-[10px] sm:inline">esc</span>
            </button>
          ) : null}
        </div>
      </div>

      <form
        onSubmit={submit}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.requestSubmit();
          }
        }}
        onPaste={(event) => {
          const pastedFiles = Array.from(event.clipboardData.files);
          if (pastedFiles.length > 0) {
            event.preventDefault();
            setFiles((current) => [...current, ...pastedFiles]);
            setTouched(true);
          }
        }}
        onChange={() => {
          setTouched(true);
          setNotice("");
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div
          className={`grid min-h-0 flex-1 grid-cols-1 divide-y divide-border/60 overflow-y-auto lg:grid-cols-12 lg:divide-x lg:divide-y-0 ${modal ? "" : "rounded-b-xl border-x border-b border-border/60 bg-white"}`}
        >
          <section className="space-y-6 p-5 sm:p-6 lg:col-span-8">
            <div className="space-y-2">
            <p className={label + " uppercase tracking-wider"}>Work Item Type</p>
              <div className="flex flex-wrap gap-2">
                {(["story", "task", "bug", "epic"] as IssueType[]).map((type) => {
                  const selected = issueType === type;
                  const symbols: Record<IssueType, string> = {
                    story: "menu_book",
                    task: "check_box",
                    bug: "bug_report",
                    epic: "bolt",
                  };
                  return (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setIssueType(type);
                        setTouched(true);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${selected ? "bg-accent text-white shadow-sm" : "bg-surface-low text-foreground hover:bg-surface-high"}`}
                    >
                      <Icon name={symbols[type]} size={17} />
                      {type[0].toUpperCase() + type.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="issue-title" className={label + " uppercase tracking-wider"}>
                  Summary <span className="text-red">*</span>
                </label>
                <span className="font-mono text-[10px] text-muted">{title.length}/120</span>
              </div>
              <input
                id="issue-title"
                required
                minLength={3}
                maxLength={120}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="What needs to be done?"
                className="h-11 w-full rounded-lg border border-border/40 bg-white px-3.5 text-base font-medium text-foreground shadow-sm outline-none transition placeholder:text-outline/60 focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="issue-description" className={label + " uppercase tracking-wider"}>
                  Description
                </label>
                <div className="flex items-center gap-3">
                  <span className="hidden text-[10px] text-muted sm:inline">
                    Markdown supported
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreview((value) => !value)}
                    className="text-xs font-semibold text-accent hover:text-accent-strong"
                  >
                    {preview ? "Edit" : "Preview"}
                  </button>
                </div>
              </div>
              <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-border/40 bg-surface-low px-3 py-2">
                  <div className="flex items-center gap-1 text-muted">
                    <Icon name="format_bold" size={16} />
                    <Icon name="format_italic" size={16} />
                    <Icon name="code" size={16} />
                    <span className="mx-1 h-4 w-px bg-border" />
                    <Icon name="format_list_bulleted" size={16} />
                    <Icon name="link" size={16} />
                  </div>
                  <span className="text-[10px] text-muted">
                    {description.length.toLocaleString()} / 50,000
                  </span>
                </div>
                {preview ? (
                  <div className="min-h-36 whitespace-pre-wrap p-3.5 text-sm leading-6 text-foreground">
                    {description || <span className="text-muted">Nothing to preview yet.</span>}
                  </div>
                ) : (
                  <textarea
                    id="issue-description"
                    maxLength={50000}
                    className="min-h-36 w-full resize-y border-0 bg-white p-3.5 text-sm leading-6 text-foreground outline-none placeholder:text-outline/60"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Add context, scope, and expected outcome..."
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="issue-attachments" className={label + " uppercase tracking-wider"}>
                  Attachments{" "}
                  {files.length > 0 && (
                    <span className="font-mono font-normal">({files.length})</span>
                  )}
                </label>
                <span className="text-[10px] text-muted">Up to 25 MB each</span>
              </div>
              <label
                htmlFor="issue-attachments"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  setFiles((current) => [...current, ...Array.from(event.dataTransfer.files)]);
                  setTouched(true);
                }}
                className="group flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg bg-surface-low px-4 py-4 text-center transition hover:bg-surface-high"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-surface-high text-muted transition group-hover:bg-accent/10 group-hover:text-accent">
                  <Icon name="cloud_upload" size={20} />
                </span>
                <span className="text-xs font-medium">
                  Drop files or paste screenshots here, or{" "}
                  <span className="text-accent">browse</span>
                </span>
                <span className="font-mono text-[10px] text-muted">
                  PNG, JPG, PDF, or WEBM - up to 25 MB each
                </span>
                <input
                  id="issue-attachments"
                  type="file"
                  multiple
                  accept=".png,.jpg,.jpeg,.pdf,.webm"
                  className="sr-only"
                  onChange={(event) => {
                    setFiles((current) => [...current, ...Array.from(event.target.files ?? [])]);
                    event.currentTarget.value = "";
                    setTouched(true);
                  }}
                />
              </label>
              {files.length > 0 && (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {files.map((file, index) => (
                    <li
                      key={`${file.name}-${file.size}-${index}`}
                      className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-white p-2.5 shadow-sm"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded bg-accent/10 text-accent">
                          <Icon
                            name={file.type === "application/pdf" ? "picture_as_pdf" : "image"}
                            size={19}
                          />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium">{file.name}</span>
                          <span className="block text-[10px] text-muted">
                            {Math.max(1, Math.round(file.size / 1024))} KB
                          </span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFiles((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                        aria-label={`Remove ${file.name}`}
                        className="rounded p-1 text-muted hover:bg-red/10 hover:text-red"
                      >
                        <Icon name="close" size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2 border-t border-border/40 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSubtasksExpanded((expanded) => !expanded)}
                    aria-expanded={subtasksExpanded}
                    className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted hover:text-foreground"
                  >
                    <Icon name={subtasksExpanded ? "expand_more" : "chevron_right"} size={17} />
                    Subtasks
                  </button>
                  <span className="rounded-full bg-surface-high px-2 py-0.5 font-mono text-[10px] text-foreground">
                    {subtasks.filter((item) => item.status === "done").length} of {subtasks.length}{" "}
                    completed
                  </span>
                </div>
                <span className="font-mono text-[10px] text-muted">{progress}% complete</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-high">
                <div
                  className="h-full rounded-full bg-green transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {subtasksExpanded && (
                <div className="space-y-1.5">
                  {subtasks.map((item, index) => {
                    const completed = item.status === "done";
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-lg bg-white p-2 shadow-sm transition hover:bg-surface-low"
                      >
                        <input
                          type="checkbox"
                          checked={completed}
                          aria-label={`Mark subtask ${index + 1} complete`}
                          className="size-4 shrink-0 accent-accent"
                          onChange={(event) => {
                            setSubtasks((current) =>
                              current.map((row, itemIndex) =>
                                itemIndex === index
                                  ? { ...row, status: event.target.checked ? "done" : "to_do" }
                                  : row,
                              ),
                            );
                            setTouched(true);
                          }}
                        />
                        <input
                          aria-label={`Child issue ${index + 1}`}
                          className="min-w-0 flex-1 bg-transparent text-xs outline-none"
                          value={item.title}
                          onChange={(event) => {
                            setSubtasks((current) =>
                              current.map((row, itemIndex) =>
                                itemIndex === index ? { ...row, title: event.target.value } : row,
                              ),
                            );
                            setTouched(true);
                          }}
                          placeholder="Describe a subtask"
                        />
                        <span className="hidden rounded bg-surface-low px-2 py-1 text-[10px] text-muted sm:inline">
                          {item.status.replace("_", " ")}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSubtasks((current) =>
                              current.filter((_, itemIndex) => itemIndex !== index),
                            );
                            setTouched(true);
                          }}
                          aria-label={`Remove subtask ${index + 1}`}
                          className="rounded p-1 text-muted hover:bg-red/10 hover:text-red"
                        >
                          <Icon name="close" size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {subtasksExpanded && (
                <div className="relative pt-1">
                  <Icon name="add" size={16} className="absolute left-2 top-3 text-muted" />
                  <input
                    className="h-9 w-full rounded-lg bg-surface-low pl-8 pr-14 text-xs outline-none placeholder:text-muted/70 focus:ring-1 focus:ring-accent/40"
                    value={newSubtaskTitle}
                    onChange={(event) => setNewSubtaskTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addSubtask();
                      }
                    }}
                    placeholder="Add a new subtask..."
                  />
                  <button
                    type="button"
                    onClick={addSubtask}
                    className="absolute right-2 top-3 font-mono text-[10px] text-muted hover:text-accent"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4 bg-surface-low/50 p-5 sm:p-6 lg:col-span-4">
            <div className="flex items-center justify-between pb-1">
              <span className={label + " uppercase tracking-wider"}>Properties</span>
              <span className="font-mono text-[10px] text-muted">Work item details</span>
            </div>
            <label className="block space-y-1">
              <span className={label}>Status</span>
              <select
                className={field}
                value={status}
                onChange={(event) => setStatus(event.target.value as IssueStatus)}
              >
                {(["backlog", "to_do", "in_progress", "in_review", "done"] as IssueStatus[]).map(
                  (item) => (
                    <option key={item} value={item}>
                      {item.replace("_", " ").replace(/^./, (char) => char.toUpperCase())}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="block space-y-1">
              <span className={label}>Assignee</span>
              <select
                className={field}
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.user_id}>
                    {member.user_id === user?.id
                      ? `${user.full_name} (you)`
                      : member.user_id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-1">
              <span className={label}>Reporter</span>
              <div className="flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-sm shadow-sm">
                <span className="grid size-5 place-items-center rounded-full bg-accent/10 text-[10px] font-semibold text-accent">{user?.full_name.split(" ").map((part) => part[0]).join("").slice(0, 2) ?? "â€”"}</span>
                <span className="truncate">{user?.full_name ?? "Current user"}</span>
                <span className="ml-auto text-[10px] text-muted">You</span>
              </div>
              <p className="text-[10px] text-muted">Reporter is set from your authenticated session.</p>
            </div>
            <label className="block space-y-1">
              <span className={label}>Priority</span>
              <select
                className={field}
                value={priority}
                onChange={(event) => setPriority(event.target.value as IssuePriority)}
              >
                {(["urgent", "high", "medium", "low"] as IssuePriority[]).map((item) => (
                  <option key={item} value={item}>
                    {item[0].toUpperCase() + item.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className={label}>Story points</span>
                <span className="font-mono text-[10px] text-muted">Fibonacci</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 5, 8, 13].map((points) => (
                  <button
                    key={points}
                    type="button"
                    aria-pressed={storyPoints === points}
                    onClick={() => {
                      setStoryPoints(storyPoints === points ? null : points);
                      setTouched(true);
                    }}
                    className={`size-8 rounded-lg font-mono text-xs transition ${storyPoints === points ? "bg-accent text-white shadow-sm" : "bg-white text-foreground shadow-sm hover:bg-surface-high"}`}
                  >
                    {points}
                  </button>
                ))}
              </div>
            </div>
            {issueType !== "epic" && (
              <label className="block space-y-1">
                <span className={label}>Epic / Parent</span>
                <select
                  className={field}
                  value={epicId}
                  onChange={(event) => setEpicId(event.target.value)}
                >
                  <option value="">No epic</option>
                  {epics.map((epic) => (
                    <option key={epic.id} value={epic.id}>
                      {epic.key}: {epic.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block space-y-1">
              <span className={label}>Target date</span>
              <span className="relative block">
                <Icon
                  name="calendar_today"
                  size={17}
                  className="pointer-events-none absolute left-3 top-2.5 text-muted"
                />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className={field + " pl-9"}
                />
              </span>
            </label>
            <label className="block space-y-1.5">
              <span className={label}>Labels</span>
              <input
                className={field}
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="security, oauth"
              />
              {tags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean).length > 0 && (
                <span className="flex flex-wrap gap-1.5">
                  {tags
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean)
                    .map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-surface-high px-2 py-1 font-mono text-[10px]"
                      >
                        #{tag}
                      </span>
                    ))}
                </span>
              )}
            </label>
            <label className="block space-y-1.5">
              <span className={label}>Components</span>
              <input
                className={field}
                value={components}
                onChange={(event) => setComponents(event.target.value)}
                placeholder="web, API"
              />
            </label>
          </aside>
        </div>

        <div
          className={`flex flex-col gap-3 border-t border-border/60 bg-white px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${modal ? "shrink-0" : "rounded-b-xl"}`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
              <input
                type="checkbox"
                checked={createAnother}
                onChange={(event) => setCreateAnother(event.target.checked)}
                className="size-4 accent-accent"
              />
              Create another work item
            </label>
            <button
              type="button"
              onClick={() => void saveDraftNow()}
              disabled={saving || submitting}
              className="rounded-lg px-3 py-2 text-xs font-medium text-muted transition hover:bg-surface-low hover:text-foreground disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save draft"}
            </button>
          </div>
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            {error && (
              <p role="alert" className="mr-auto max-w-sm text-xs text-red sm:mr-2">
                {error}
              </p>
            )}
            {notice && !error && (
              <p role="status" className="mr-auto max-w-sm text-xs text-green sm:mr-2">
                {notice}
              </p>
            )}
            {!modal && (
              <Link
                href="/work-items"
                className="rounded-lg bg-surface-container px-4 py-2 text-xs font-medium text-foreground transition hover:bg-surface-high"
              >
                Cancel
              </Link>
            )}
            <button
              type="submit"
              disabled={!ready || submitting || !projects.length}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon
                name={submitting ? "progress_activity" : "add_task"}
                size={18}
                className={
                  submitting ? "animate-spin" : "transition-transform group-hover:rotate-12"
                }
              />
              {submitting
                ? "Processing..."
                : publishedIssue
                  ? "Retry attachments"
                  : `Create ${issueType[0].toUpperCase()}${issueType.slice(1)}`}
              <kbd className="hidden rounded bg-white/20 px-1.5 py-0.5 font-mono text-[10px] md:inline">
                Ctrl+Enter
              </kbd>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
