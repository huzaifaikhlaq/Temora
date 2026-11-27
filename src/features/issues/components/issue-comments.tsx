"use client";

import {
    useEffect,
    useState,
    type FormEvent,
} from "react";

import {
    commentsApi,
    type IssueComment,
    type MentionMember,
    type CommentListResponse,
} from "@/features/issues/api/comments";

interface Props {
    workspaceId: string;
    projectId: string;
    issueId: string;
    currentUserId: string;
}

function formatDate(value: string) {
    return new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function getInitials(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join("");
}

function renderCommentBody(
    body: string,
    members: MentionMember[],
) {
    const parts = body.split(
        /((?<![\w@.+-])@[a-zA-Z0-9_-]{1,64}(?![\w-]))/g,
    );

    return parts.map((part, index) => {
        if (!part.startsWith("@") || index % 2 === 0) {
            return part;
        }

        const username = part.slice(1).toLowerCase();

        const member = members.find(
            (item) => item.username.toLowerCase() === username,
        );

        return (
            <span
                key={index}
                title={part}
                className="font-medium text-accent"
            >
                {member ? `@${member.full_name}` : part}
            </span>
        );
    });
}

function MentionPicker({
    members,
    disabled,
    onSelect,
}: {
    members: MentionMember[];
    disabled: boolean;
    onSelect: (member: MentionMember) => void;
}) {
    const [search, setSearch] = useState("");

    const filtered = members.filter((member) => {
        const query = search.toLowerCase();

        return (
            member.full_name.toLowerCase().includes(query) ||
            member.username.toLowerCase().includes(query)
        );
    });

    return (
        <div className="flex flex-wrap items-center gap-2">
            <input
                type="search"
                value={search}
                disabled={disabled}
                onChange={(event) =>
                    setSearch(event.target.value)
                }
                placeholder="Find member..."
                aria-label="Search members to mention"
                className="rounded-lg border border-border px-3 py-2 text-xs"
            />

            <select
                value=""
                disabled={disabled}
                aria-label="Mention a member"
                onChange={(event) => {
                    const member = members.find(
                        (item) => item.id === event.target.value,
                    );

                    if (member) {
                        onSelect(member);
                        setSearch("");
                    }
                }}
                className="max-w-full rounded-lg border border-border bg-white px-3 py-2 text-xs"
            >
                <option value="">@ Mention member</option>

                {filtered.map((member) => (
                    <option key={member.id} value={member.id}>
                        {member.full_name} — {member.id.slice(0, 8)}
                    </option>
                ))}
            </select>
        </div>
    );
}

function appendMention(
    body: string,
    member: MentionMember,
) {
    const separator =
        body.length > 0 && !/\s$/.test(body)
            ? " "
            : "";

    return `${body}${separator}@${member.username} `;
}

export function IssueComments({
    workspaceId,
    projectId,
    issueId,
    currentUserId,
}: Props) {
    const [data, setData] =
        useState<CommentListResponse | null>(null);

    const [body, setBody] = useState("");

    const [editingId, setEditingId] =
        useState<string | null>(null);

    const [editingBody, setEditingBody] = useState("");

    const [loading, setLoading] = useState(true);

    const [busy, setBusy] = useState(false);

    const [error, setError] = useState("");

    const [page, setPage] = useState(1);

    const [revision, setRevision] = useState(0);

    useEffect(() => {
        const controller = new AbortController();

        commentsApi
            .list(
                workspaceId,
                projectId,
                issueId,
                page,
                controller.signal,
            )
            .then((result) => {
                if (!controller.signal.aborted) {
                    setData(result);
                }
            })
            .catch((cause: unknown) => {
                if (!controller.signal.aborted) {
                    setData(null);

                    setError(
                        cause instanceof Error
                            ? cause.message
                            : "Could not load comments.",
                    );
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [
        workspaceId,
        projectId,
        issueId,
        page,
        revision,
    ]);

    function reload(nextPage = page) {
        setLoading(true);
        setPage(nextPage);
        setRevision((value) => value + 1);
    }

    async function handleCreate(event: FormEvent) {
        event.preventDefault();

        if (
            busy ||
            loading ||
            !body.trim() ||
            !data?.can_comment
        ) {
            return;
        }

        setBusy(true);
        setError("");

        try {
            await commentsApi.create(
                workspaceId,
                projectId,
                issueId,
                body.trim(),
            );

            setBody("");

            reload(1);
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : "Could not create comment.",
            );
        } finally {
            setBusy(false);
        }
    }

    function startEditing(comment: IssueComment) {
        setEditingId(comment.id);
        setEditingBody(comment.body);
        setError("");
    }

    function cancelEditing() {
        setEditingId(null);
        setEditingBody("");
    }

    async function handleUpdate(commentId: string) {
        if (
            busy ||
            loading ||
            !editingBody.trim()
        ) {
            return;
        }

        setBusy(true);
        setError("");

        try {
            await commentsApi.update(
                workspaceId,
                projectId,
                issueId,
                commentId,
                editingBody.trim(),
            );

            cancelEditing();

            reload();
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : "Could not update comment.",
            );
        } finally {
            setBusy(false);
        }
    }

    async function handleDelete(commentId: string) {
        if (busy || loading) return;

        if (!window.confirm("Delete this comment?")) {
            return;
        }

        setBusy(true);
        setError("");

        try {
            await commentsApi.remove(
                workspaceId,
                projectId,
                issueId,
                commentId,
            );

            if (editingId === commentId) {
                cancelEditing();
            }

            const nextPage =
                data?.results.length === 1 && page > 1
                    ? page - 1
                    : page;

            reload(nextPage);
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : "Could not delete comment.",
            );
        } finally {
            setBusy(false);
        }
    }

    const disabled = busy || loading;
    const members = data?.members ?? [];

    return (
        <section className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <h2 className="font-semibold text-accent">
                    Comments
                </h2>

                <span className="text-xs text-muted">
                    {data?.count ?? 0} comments
                </span>
            </div>

            {error && (
                <div
                    role="alert"
                    className="mt-4 rounded-lg bg-red/5 p-3 text-sm text-red"
                >
                    {error}

                    {!data && (
                        <button
                            type="button"
                            onClick={() => {
                                setError("");
                                reload(1);
                            }}
                            disabled={disabled}
                            className="ml-3 font-semibold underline"
                        >
                            Retry
                        </button>
                    )}
                </div>
            )}

            {loading && (
                <p className="mt-4 text-sm text-muted">
                    Loading comments...
                </p>
            )}

            {!loading && data?.results.length === 0 && (
                <p className="my-6 rounded-lg bg-surface-low p-5 text-center text-sm text-muted">
                    No comments yet.
                </p>
            )}

            <div className="divide-y divide-border/50">
                {data?.results.map((comment) => (
                    <article
                        key={comment.id}
                        className="flex gap-3 py-5"
                    >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                            {getInitials(comment.author_name)}
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold">
                                    {comment.author_id === currentUserId
                                        ? "You"
                                        : comment.author_name}
                                </span>

                                <time
                                    dateTime={comment.created_at}
                                    className="text-xs text-muted"
                                >
                                    {formatDate(comment.created_at)}
                                </time>

                                {comment.edited_at && (
                                    <span className="text-xs text-muted">
                                        (Edited)
                                    </span>
                                )}
                            </div>

                            {editingId === comment.id ? (
                                <div className="mt-3 space-y-3">
                                    <textarea
                                        value={editingBody}
                                        onChange={(event) =>
                                            setEditingBody(event.target.value)
                                        }
                                        disabled={disabled}
                                        maxLength={5000}
                                        rows={4}
                                        aria-label="Edit comment"
                                        className="w-full resize-y rounded-xl border border-border p-3 text-sm outline-none focus:border-accent"
                                    />

                                    <MentionPicker
                                        members={members}
                                        disabled={disabled}
                                        onSelect={(member) =>
                                            setEditingBody((value) =>
                                                appendMention(value, member),
                                            )
                                        }
                                    />

                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={cancelEditing}
                                            className="rounded-lg px-3 py-2 text-sm text-muted"
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="button"
                                            disabled={
                                                disabled ||
                                                !editingBody.trim() ||
                                                editingBody.length > 5000
                                            }
                                            onClick={() =>
                                                void handleUpdate(comment.id)
                                            }
                                            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                                        >
                                            Save changes
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                                        {renderCommentBody(
                                            comment.body,
                                            members,
                                        )}
                                    </p>

                                    <div className="mt-3 flex gap-4">
                                        {comment.can_edit && (
                                            <button
                                                type="button"
                                                disabled={disabled}
                                                onClick={() =>
                                                    startEditing(comment)
                                                }
                                                className="text-xs font-medium text-muted hover:text-accent"
                                            >
                                                Edit
                                            </button>
                                        )}

                                        {comment.can_delete && (
                                            <button
                                                type="button"
                                                disabled={disabled}
                                                onClick={() =>
                                                    void handleDelete(comment.id)
                                                }
                                                className="text-xs font-medium text-muted hover:text-red"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </article>
                ))}
            </div>

            {data &&
                (data.has_previous || data.has_next) && (
                    <div className="flex items-center justify-between border-t border-border pt-3">
                        <button
                            type="button"
                            disabled={
                                disabled || !data.has_previous
                            }
                            onClick={() => reload(page - 1)}
                            className="text-sm text-accent disabled:opacity-40"
                        >
                            Previous
                        </button>

                        <span className="text-xs text-muted">
                            Page {page}
                        </span>

                        <button
                            type="button"
                            disabled={disabled || !data.has_next}
                            onClick={() => reload(page + 1)}
                            className="text-sm text-accent disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                )}

            {data?.can_comment && (
                <form
                    onSubmit={handleCreate}
                    className="mt-5 space-y-3"
                >
                    <textarea
                        value={body}
                        disabled={disabled}
                        onChange={(event) =>
                            setBody(event.target.value)
                        }
                        maxLength={5000}
                        rows={4}
                        placeholder="Write a comment..."
                        aria-label="Write a comment"
                        className="w-full resize-y rounded-xl border border-border p-4 text-sm outline-none focus:border-accent"
                    />

                    <MentionPicker
                        members={members}
                        disabled={disabled}
                        onSelect={(member) =>
                            setBody((value) =>
                                appendMention(value, member),
                            )
                        }
                    />

                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted">
                            {body.length}/5000
                        </span>

                        <button
                            type="submit"
                            disabled={
                                disabled ||
                                !body.trim() ||
                                body.length > 5000
                            }
                            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50"
                        >
                            {busy ? "Processing..." : "Post comment"}
                        </button>
                    </div>
                </form>
            )}

            {data && !data.can_comment && (
                <p className="mt-4 text-xs text-muted">
                    You have read-only access to comments.
                </p>
            )}
        </section>
    );
}