"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Icon } from "@/components/shared/icon";
import { Panel } from "@/components/shared/dashboard-ui";
import { demoRepository } from "@/features/workspace/data/demo-repository";
import type { MemberRole } from "@/features/workspace/data/model";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

const roles: MemberRole[] = ["Admin", "Project lead", "Member", "Viewer"];

export function MembersDirectory() {
  const state = useDemoState();
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<MemberRole>("Member");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const workspace = state.workspaces.find((item) => item.id === state.activeWorkspaceId);
  const members = useMemo(
    () =>
      state.members.filter(
        (member) =>
          member.workspaceId === state.activeWorkspaceId &&
          `${member.name} ${member.email} ${member.team} ${member.role}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [state.members, state.activeWorkspaceId, query],
  );
  function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const invited = demoRepository.inviteMember({ email, name, role });
      setName("");
      setEmail("");
      setRole("Member");
      setNotice(
        `${invited.name} was added to the local demo roster. No invitation email was sent.`,
      );
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add member.");
      setNotice("");
    }
  }
  function changeRole(memberId: string, next: MemberRole) {
    try {
      demoRepository.updateMemberRole(memberId, next);
      setError("");
      setNotice("Member role updated in this browser.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not change this role.");
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-outline">
          {workspace?.name ?? "Workspace"} / Management
        </p>
        <h1 className="mt-1 text-2xl font-bold">Members &amp; roles</h1>
        <p className="mt-1 text-sm text-muted">
          Manage the active workspace roster and each member’s access tier.
        </p>
      </header>
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
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Workspace members</h2>
              <p className="text-xs text-muted">{members.length} people in this view</p>
            </div>
            <label className="relative">
              <Icon name="search" size={17} className="absolute left-2 top-2 text-outline" />
              <input
                aria-label="Search workspace members"
                className="h-9 rounded-lg border border-border pl-8 pr-3 text-sm"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search members"
              />
            </label>
          </div>
          <div className="mt-4 divide-y divide-border/70">
            {members.map((member) => (
              <div key={member.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="grid size-10 place-items-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                  {member.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {member.name}
                    {member.id === state.activeMemberId && (
                      <span className="ml-2 text-xs font-normal text-muted">You</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {member.email} · {member.team}
                  </p>
                </div>
                <span className="text-xs text-muted">{member.presence}</span>
                <select
                  aria-label={`${member.name} role`}
                  disabled={member.role === "Owner"}
                  value={member.role}
                  onChange={(event) => changeRole(member.id, event.target.value as MemberRole)}
                  className="h-9 rounded-lg border border-border bg-white px-2 text-sm disabled:opacity-70"
                >
                  <option>Owner</option>
                  {roles.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {members.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">No members match this search.</p>
          )}
        </Panel>
        <Panel>
          <h2 className="font-semibold">Invite a member</h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            Adds a demo member to {workspace?.name}. This does not send email.
          </p>
          <form className="mt-4 space-y-3" onSubmit={invite}>
            <label className="block text-sm font-medium">
              Name
              <input
                className="mt-1 h-10 w-full rounded-lg border border-border px-3 text-sm"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Jordan Lee"
              />
            </label>
            <label className="block text-sm font-medium">
              Work email
              <input
                required
                type="email"
                className="mt-1 h-10 w-full rounded-lg border border-border px-3 text-sm"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="colleague@company.com"
              />
            </label>
            <label className="block text-sm font-medium">
              Role
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as MemberRole)}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-white px-3 text-sm"
              >
                {roles.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <button className="h-9 rounded-lg bg-accent px-3 text-sm font-semibold text-white">
              Add demo member
            </button>
          </form>
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs font-semibold">Role overview</p>
            <p className="mt-2 text-xs leading-5 text-muted">
              Owners control workspace ownership. Admins manage settings and membership. Project
              leads coordinate delivery. Members contribute. Viewers have read access.
            </p>
          </div>
        </Panel>
      </div>
    </main>
  );
}
