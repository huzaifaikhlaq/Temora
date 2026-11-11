
"use client";

import { useCallback, useEffect, useState } from "react";

import { workspaceApi } from "../api/client";

import type {
    Workspace,
    WorkspaceMember,
    WorkspaceInvitation,
    WorkspaceRole,
} from "../types";

const ROLES = ["admin", "member", "viewer"] as const;

export function WorkspaceManager() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [active, setActive] = useState<Workspace | null>(null);
    const [members, setMembers] = useState<WorkspaceMember[]>([]);
    const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [inviteRole, setInviteRole] =
        useState<"admin" | "member" | "viewer">("member");

    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const canManage =
        active?.role === "owner" || active?.role === "admin";

    const load = useCallback(async () => {
        try {
            const [items, selection] = await Promise.all([
                workspaceApi.list(),
                workspaceApi.selected(),
            ]);

            setWorkspaces(items);

            const current =
                items.find((w) => w.id === selection.workspace_id) ??
                items[0] ??
                null;

            setActive(current);

            if (current) {
                const list = await workspaceApi.members(current.id);
                setMembers(list);

                if (current.role === "owner" || current.role === "admin") {
                    setInvitations(
                        await workspaceApi.invitations(current.id),
                    );
                } else {
                    setInvitations([]);
                }
            } else {
                setMembers([]);
                setInvitations([]);
            }
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Unable to load",
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    async function execute(operation: () => Promise<unknown>) {
        setBusy(true);
        setError("");
        setNotice("");

        try {
            await operation();
            await load();
            setNotice("Changes saved successfully.");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Operation failed",
            );
        } finally {
            setBusy(false);
        }
    }

    async function switchWorkspace(id: string) {
        await execute(async () => {
            await workspaceApi.select(id);
        });
    }

    async function createWorkspace(e: React.FormEvent) {
        e.preventDefault();

        if (!name.trim()) return;

        await execute(async () => {
            const created = await workspaceApi.create(name.trim());
            await workspaceApi.select(created.id);
            setName("");
        });
    }

    async function inviteMember(e: React.FormEvent) {
        e.preventDefault();
        if (!active || !email.trim()) return;

        await execute(async () => {
            await workspaceApi.invite(
                active.id,
                email.trim(),
                inviteRole,
            );
            setEmail("");
        });
    }

    async function changeRole(
        member: WorkspaceMember,
        role: WorkspaceRole,
    ) {
        if (!active || role === "owner") return;

        await execute(() =>
            workspaceApi.updateRole(active.id, member.id, role),
        );
    }

    if (loading) {
        return (
            <main className="p-6">
                <p>Loading workspaces...</p>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-5xl space-y-8 p-6">
            <header>
                <h1 className="text-2xl font-bold">
                    Workspace Management
                </h1>
                <p className="text-sm text-muted">
                    Manage organizations, memberships and permissions.
                </p>
            </header>

            {error && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">
                    {error}
                </p>
            )}

            {notice && (
                <p role="status" className="rounded-lg bg-green-50 p-3 text-green-700">
                    {notice}
                </p>
            )}

            <section className="rounded-xl border border-border p-5">
                <h2 className="mb-4 text-lg font-semibold">
                    Your Workspaces
                </h2>

                <div className="flex flex-wrap gap-3">
                    {workspaces.map((workspace) => (
                        <button
                            key={workspace.id}
                            disabled={busy}
                            onClick={() => switchWorkspace(workspace.id)}
                            className={`rounded-lg border px-4 py-3 text-left ${active?.id === workspace.id
                                    ? "border-blue-500 bg-blue-50 text-slate-900"
                                    : "border-border"
                                }`}
                        >
                            <span className="block font-semibold">
                                {workspace.name}
                            </span>
                            <span className="text-xs capitalize">
                                {workspace.role}
                            </span>
                        </button>
                    ))}
                </div>

                <form
                    onSubmit={createWorkspace}
                    className="mt-5 flex flex-wrap gap-3"
                >
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="New workspace name"
                        maxLength={120}
                        required
                        className="rounded-lg border border-border px-3 py-2"
                    />
                    <button
                        disabled={busy}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                    >
                        Create Workspace
                    </button>
                </form>
            </section>

            {active && (
                <>
                    <section className="rounded-xl border border-border p-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">
                                {active.name} — Members
                            </h2>
                            <span className="text-sm capitalize">
                                Your role: {active.role}
                            </span>
                        </div>

                        <div className="mt-4 space-y-3">
                            {members.map((member) => {
                                const editable =
                                    canManage &&
                                    member.role !== "owner" &&
                                    (
                                        active.role === "owner" ||
                                        member.role === "member" ||
                                        member.role === "viewer"
                                    );

                                return (
                                    <div
                                        key={member.id}
                                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                                    >
                                        <div>
                                            <p className="font-mono text-xs">
                                                {member.user_id}
                                            </p>
                                            <p className="text-sm capitalize">
                                                {member.role}
                                            </p>
                                        </div>

                                        {editable && (
                                            <div className="flex gap-2">
                                                <select
                                                    value={member.role}
                                                    disabled={busy}
                                                    onChange={(e) =>
                                                        changeRole(
                                                            member,
                                                            e.target.value as WorkspaceRole,
                                                        )
                                                    }
                                                    className="rounded border border-border px-2 py-1"
                                                >
                                                    {ROLES.filter(
                                                        (role) =>
                                                            active.role === "owner" ||
                                                            role !== "admin",
                                                    ).map((role) => (
                                                        <option key={role} value={role}>
                                                            {role}
                                                        </option>
                                                    ))}
                                                </select>

                                                <button
                                                    disabled={busy}
                                                    className="rounded border border-red-300 px-3 py-1 text-red-600"
                                                    onClick={() => {
                                                        if (
                                                            active &&
                                                            window.confirm("Remove this member?")
                                                        ) {
                                                            void execute(() =>
                                                                workspaceApi.removeMember(
                                                                    active.id,
                                                                    member.id,
                                                                ),
                                                            );
                                                        }
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {canManage && (
                        <section className="rounded-xl border border-border p-5">
                            <h2 className="mb-4 text-lg font-semibold">
                                Invite Member
                            </h2>

                            <form
                                onSubmit={inviteMember}
                                className="flex flex-wrap gap-3"
                            >
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="member@example.com"
                                    required
                                    className="rounded-lg border border-border px-3 py-2"
                                />

                                <select
                                    value={inviteRole}
                                    onChange={(e) =>
                                        setInviteRole(
                                            e.target.value as typeof inviteRole,
                                        )
                                    }
                                    className="rounded-lg border border-border px-3 py-2"
                                >
                                    {(active.role === "owner"
                                        ? ROLES
                                        : ROLES.filter((r) => r !== "admin")
                                    ).map((role) => (
                                        <option key={role} value={role}>
                                            {role}
                                        </option>
                                    ))}
                                </select>

                                <button
                                    disabled={busy}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-white"
                                >
                                    Send Invitation
                                </button>
                            </form>

                            <h3 className="mt-6 font-semibold">
                                Pending Invitations
                            </h3>

                            <div className="mt-3 space-y-2">
                                {invitations.map((invitation) => (
                                    <div
                                        key={invitation.id}
                                        className="flex items-center justify-between gap-3 border-b border-border py-2"
                                    >
                                        <div>
                                            <p>{invitation.email}</p>
                                            <p className="text-xs text-muted">
                                                {invitation.role} · Expires{" "}
                                                {new Date(
                                                    invitation.expires_at,
                                                ).toLocaleDateString()}
                                            </p>
                                        </div>

                                        <button
                                            disabled={busy}
                                            className="text-sm text-red-600"
                                            onClick={() =>
                                                execute(() =>
                                                    workspaceApi.revokeInvitation(
                                                        active.id,
                                                        invitation.id,
                                                    ),
                                                )
                                            }
                                        >
                                            Revoke
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {active.role === "owner" && (
                        <section className="rounded-xl border border-red-300 p-5">
                            <h2 className="font-semibold text-red-600">
                                Danger Zone
                            </h2>
                            <p className="mt-2 text-sm">
                                Deleting a workspace permanently deletes its
                                memberships and invitations.
                            </p>
                            <button
                                disabled={busy}
                                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white"
                                onClick={() => {
                                    if (
                                        window.confirm(
                                            `Permanently delete ${active.name}?`,
                                        )
                                    ) {
                                        void execute(async () => {
                                            await workspaceApi.remove(active.id);
                                            await fetch("/api/workspace/selection", {
                                                method: "DELETE",
                                            });
                                        });
                                    }
                                }}
                            >
                                Delete Workspace
                            </button>
                        </section>
                    )}

                    {active.role !== "owner" && (
                        <button
                            disabled={busy}
                            className="rounded border border-red-300 px-4 py-2 text-red-600"
                            onClick={() => {
                                if (window.confirm("Leave this workspace?")) {
                                    void execute(async () => {
                                        await workspaceApi.leave(active.id);
                                        await fetch("/api/workspace/selection", {
                                            method: "DELETE",
                                        });
                                    });
                                }
                            }}
                        >
                            Leave Workspace
                        </button>
                    )}
                </>
            )}
        </main>
    );
}
