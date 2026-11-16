"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { MetricCard, Panel } from "@/components/shared/dashboard-ui";
import { demoRepository } from "@/features/workspace/data/demo-repository";
import type { MemberRole } from "@/features/workspace/data/model";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

type PermissionGroup =
  "Workspace & Billing" | "Project & Issue Access" | "API & Integrations" | "Security";
type Permission = { name: string; group: PermissionGroup };

const roles: MemberRole[] = ["Owner", "Admin", "Project lead", "Member", "Viewer"];
const permissions: Permission[] = [
  { name: "View workspace", group: "Workspace & Billing" },
  { name: "Manage workspace settings", group: "Workspace & Billing" },
  { name: "Manage billing & seats", group: "Workspace & Billing" },
  { name: "Create and edit issues", group: "Project & Issue Access" },
  { name: "Delete issues", group: "Project & Issue Access" },
  { name: "Manage sprint cycles", group: "Project & Issue Access" },
  { name: "Create API keys", group: "API & Integrations" },
  { name: "View security audit logs", group: "Security" },
];

function defaultPermission(permission: Permission, role: MemberRole): boolean {
  if (permission.name === "View workspace") return true;
  if (
    permission.name === "Manage workspace settings" ||
    permission.name === "Manage billing & seats"
  )
    return role === "Owner" || role === "Admin";
  if (permission.name === "Create and edit issues") return role !== "Viewer";
  if (permission.name === "Delete issues" || permission.name === "Create API keys")
    return role === "Owner" || role === "Admin";
  if (permission.name === "Manage sprint cycles")
    return role === "Owner" || role === "Admin" || role === "Project lead";
  return role === "Owner" || role === "Admin" || role === "Project lead";
}

const tabs = [
  "All scopes",
  "Workspace & Billing",
  "Project & Issue Access",
  "API & Integrations",
  "Security",
] as const;

export function PermissionsMatrix() {
  const state = useDemoState();
  const [tab, setTab] = useState<(typeof tabs)[number]>("All scopes");
  const [draft, setDraft] = useState<Record<string, Partial<Record<MemberRole, boolean>>>>({});
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const settings = state.settingsByWorkspace[state.activeWorkspaceId];
  const members = state.members.filter((member) => member.workspaceId === state.activeWorkspaceId);
  const visiblePermissions = useMemo(
    () => permissions.filter((permission) => tab === "All scopes" || permission.group === tab),
    [tab],
  );
  const activeScopes = permissions.reduce(
    (count, permission) => count + roles.filter((role) => permissionValue(permission, role)).length,
    0,
  );

  function permissionValue(permission: Permission, role: MemberRole) {
    return (
      draft[permission.name]?.[role] ??
      settings?.rolePermissions?.[permission.name]?.[role] ??
      defaultPermission(permission, role)
    );
  }

  function save() {
    try {
      demoRepository.updateSettings({
        rolePermissions: {
          ...settings?.rolePermissions,
          ...Object.fromEntries(
            Object.entries(draft).map(([name, values]) => [
              name,
              { ...settings?.rolePermissions?.[name], ...values },
            ]),
          ),
        },
      });
      setDraft({});
      setError("");
      setNotice("Permission matrix saved to this browser’s demo workspace.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save permission settings.");
    }
  }

  return (
    <main className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[.16em] text-outline">
            {state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId)?.name} /
            Access
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Roles &amp; Permissions Matrix
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Edit the local preview matrix for default workspace roles. It does not enforce server
            access.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/security/audit-logs"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-medium hover:bg-surface-low"
          >
            <Icon name="history" /> Audit preview
          </Link>
          <button
            type="button"
            onClick={save}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white hover:bg-accent-strong"
          >
            <Icon name="save" /> Save Changes
          </button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Enabled role scopes"
          value={String(activeScopes)}
          note="Local preview matrix"
          icon="verified_user"
        />
        <MetricCard
          label="Enforcement"
          value="Preview only"
          note="No backend authorization"
          icon="security"
        />
        <MetricCard
          label="Assignable roles"
          value={String(roles.length)}
          note="Owner is immutable"
          icon="badge"
        />
        <MetricCard
          label="Workspace members"
          value={String(members.length)}
          note="Active workspace"
          icon="group"
        />
      </div>

      <Panel>
        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={tab === item}
              onClick={() => setTab(item)}
              className={`rounded-lg px-3 py-2 text-xs ${tab === item ? "bg-accent text-white" : "bg-surface-low text-muted"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-outline">
                <th scope="col" className="px-3 py-3 font-medium">
                  Permission scope
                </th>
                {roles.map((role) => (
                  <th scope="col" key={role} className="px-3 py-3 text-center font-medium">
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visiblePermissions.map((permission) => (
                <tr key={permission.name} className="border-b border-border/70 last:border-0">
                  <th scope="row" className="px-3 py-3.5 font-medium">
                    {permission.name}
                  </th>
                  {roles.map((role) => {
                    const checked = permissionValue(permission, role);
                    return (
                      <td key={role} className="px-3 py-3.5 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${permission.name}: ${role}`}
                          checked={checked}
                          disabled={role === "Owner"}
                          onChange={(event) => {
                            setDraft((current) => ({
                              ...current,
                              [permission.name]: {
                                ...current[permission.name],
                                [role]: event.target.checked,
                              },
                            }));
                            setNotice("");
                          }}
                          className="size-4 accent-violet-600 disabled:opacity-70"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-4 text-sm text-emerald-700">
            {notice}
          </p>
        )}
      </Panel>
    </main>
  );
}
