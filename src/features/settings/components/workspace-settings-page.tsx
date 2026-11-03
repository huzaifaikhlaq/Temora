"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { Icon } from "@/components/shared/icon";
import { Panel } from "@/components/shared/dashboard-ui";
import { demoRepository } from "@/features/workspace/data/demo-repository";
import type { WorkStatus } from "@/features/workspace/data/model";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

const tabs = [
  "General",
  "Workflows & Statuses",
  "Custom Fields",
  "Automation Rules",
  "Security",
  "Billing",
] as const;
const statusColors: Record<WorkStatus, string> = {
  Backlog: "bg-slate-100 text-slate-700",
  "To Do": "bg-blue-100 text-blue-800",
  "In Progress": "bg-violet-100 text-violet-800",
  "In Review": "bg-amber-100 text-amber-800",
  Done: "bg-emerald-100 text-emerald-800",
  Planned: "bg-slate-100 text-slate-700",
};

export function WorkspaceSettingsPage() {
  const state = useDemoState();
  const [tab, setTab] = useState<(typeof tabs)[number]>("General");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const workspace = state.workspaces.find((item) => item.id === state.activeWorkspaceId);
  const settings = state.settingsByWorkspace[state.activeWorkspaceId];
  const issueCounts = useMemo(
    () =>
      state.issues.reduce<Record<string, number>>((counts, issue) => {
        if (issue.workspaceId === state.activeWorkspaceId)
          counts[issue.status] = (counts[issue.status] ?? 0) + 1;
        return counts;
      }, {}),
    [state.issues, state.activeWorkspaceId],
  );
  if (!workspace || !settings) return null;
  const activeWorkspace = workspace;

  function saveGeneral(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const sprintLengthDays = Number(data.get("sprintLengthDays"));
    if (name.length < 2) {
      setError("Workspace name must have at least two characters.");
      return;
    }
    if (!Number.isInteger(sprintLengthDays) || sprintLengthDays < 1 || sprintLengthDays > 90) {
      setError("Sprint length must be between 1 and 90 whole days.");
      return;
    }
    try {
      demoRepository.updateWorkspace(activeWorkspace.id, { name });
      demoRepository.updateSettings({
        methodology: String(data.get("methodology")) as typeof settings.methodology,
        sprintLengthDays,
      });
      setNotice("Workspace settings saved to this browser.");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save workspace settings.");
    }
  }
  function toggleStatus(status: WorkStatus, enabled: boolean) {
    const next = enabled
      ? [...new Set([...settings.statuses, status])]
      : settings.statuses.filter((item) => item !== status);
    demoRepository.updateSettings({ statuses: next });
    setNotice("Workflow statuses updated in this browser.");
  }
  function toggleField(field: string, enabled: boolean) {
    const next = enabled
      ? [...new Set([...settings.issueFields, field])]
      : settings.issueFields.filter((item) => item !== field);
    demoRepository.updateSettings({ issueFields: next });
    setNotice("Issue fields updated in this browser.");
  }
  function toggleRule(ruleId: string) {
    demoRepository.updateSettings({
      automationRules: settings.automationRules.map((rule) =>
        rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule,
      ),
    });
    setNotice("Automation rule setting saved locally. No external service was called.");
  }
  function saveSecurity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const regions = [...data.getAll("region")].map(String);
    const sessionTimeoutMinutes = Number(data.get("sessionTimeoutMinutes"));
    if (
      !Number.isInteger(sessionTimeoutMinutes) ||
      sessionTimeoutMinutes < 5 ||
      sessionTimeoutMinutes > 1440
    ) {
      setError("Session timeout must be between 5 and 1,440 whole minutes.");
      return;
    }
    try {
      demoRepository.updateSettings({
        security: {
          ...settings.security,
          mfaRequired: data.get("mfaRequired") === "on",
          sessionTimeoutMinutes,
          allowedRegions: regions,
        },
      });
      setNotice("Security preferences saved to this browser.");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save security preferences.");
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-outline">
          {workspace.name} / Administration
        </p>
        <h1 className="mt-1 text-2xl font-bold">Workspace settings</h1>
        <p className="mt-1 text-sm text-muted">Workspace-scoped preferences for this local demo.</p>
      </header>
      <div className="grid gap-5 lg:grid-cols-[230px_1fr]">
        <Panel className="h-fit">
          <nav className="space-y-1">
            {tabs.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setTab(item);
                  setNotice("");
                  setError("");
                }}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${tab === item ? "bg-accent/10 font-semibold text-accent" : "text-muted hover:bg-surface-low"}`}
              >
                {item}
              </button>
            ))}
          </nav>
        </Panel>
        <div className="space-y-5">
          {notice && (
            <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {error}
            </p>
          )}
          {tab === "General" && (
            <Panel>
              <h2 className="text-lg font-semibold">General settings</h2>
              <p className="mt-1 text-sm text-muted">
                Change the workspace name and default planning preferences.
              </p>
              <form onSubmit={saveGeneral} className="mt-5 space-y-4">
                <label className="block text-sm font-medium">
                  Workspace name
                  <input
                    name="name"
                    required
                    minLength={2}
                    defaultValue={workspace.name}
                    className="mt-1 h-10 w-full rounded-lg border border-border px-3"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Default methodology
                  <select
                    name="methodology"
                    defaultValue={settings.methodology}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-white px-3"
                  >
                    {["Agile Scrum", "Kanban", "Custom"].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Sprint length in days
                  <input
                    name="sprintLengthDays"
                    type="number"
                    min="1"
                    max="90"
                    defaultValue={settings.sprintLengthDays}
                    className="mt-1 h-10 w-full rounded-lg border border-border px-3"
                  />
                </label>
                <button className="h-9 rounded-lg bg-accent px-3 text-sm font-semibold text-white">
                  Save general settings
                </button>
              </form>
            </Panel>
          )}
          {tab === "Workflows & Statuses" && (
            <Panel>
              <h2 className="text-lg font-semibold">Workflow statuses</h2>
              <p className="mt-1 text-sm text-muted">
                Enable status columns used by the workspace’s issue workflow.
              </p>
              <div className="mt-5 space-y-2">
                {(["Backlog", "To Do", "In Progress", "In Review", "Done"] as WorkStatus[]).map(
                  (status) => (
                    <label
                      key={status}
                      className="flex items-center gap-3 rounded-lg border border-border p-3"
                    >
                      <input
                        type="checkbox"
                        checked={settings.statuses.includes(status)}
                        disabled={
                          status === "Done" ||
                          ((issueCounts[status] ?? 0) > 0 && settings.statuses.includes(status))
                        }
                        onChange={(event) => toggleStatus(status, event.target.checked)}
                        className="size-4 accent-violet-600"
                      />
                      <span
                        className={`rounded px-2 py-1 text-xs font-semibold ${statusColors[status]}`}
                      >
                        {status}
                      </span>
                      <span className="flex-1 text-sm text-muted">
                        {issueCounts[status] ?? 0} issues currently use this status
                      </span>
                      {status === "Done" && <span className="text-xs text-muted">Required</span>}
                    </label>
                  ),
                )}
              </div>
              <p className="mt-3 text-xs text-muted">
                Statuses with assigned issues and the required Done status stay enabled to preserve
                issue data.
              </p>
            </Panel>
          )}
          {tab === "Custom Fields" && (
            <Panel>
              <h2 className="text-lg font-semibold">Issue fields</h2>
              <p className="mt-1 text-sm text-muted">
                Choose which optional fields appear in issue forms.
              </p>
              <div className="mt-5 space-y-2">
                {["Story points", "Labels", "Due date"].map((field) => (
                  <label
                    key={field}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <input
                      type="checkbox"
                      checked={settings.issueFields.includes(field)}
                      onChange={(event) => toggleField(field, event.target.checked)}
                      className="size-4 accent-violet-600"
                    />
                    <span className="text-sm font-medium">{field}</span>
                  </label>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted">
                Custom field definitions are stored in the workspace demo settings.
              </p>
            </Panel>
          )}
          {tab === "Automation Rules" && (
            <Panel>
              <h2 className="text-lg font-semibold">Automation rules</h2>
              <p className="mt-1 text-sm text-muted">
                Toggle local rule previews. These switches do not call GitHub, Slack, or other
                services.
              </p>
              <div className="mt-5 divide-y divide-border">
                {settings.automationRules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-3 py-4">
                    <span className="grid size-9 place-items-center rounded-lg bg-accent/10 text-accent">
                      <Icon name="auto_mode" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{rule.name}</p>
                      <p className="text-xs text-muted">
                        {rule.id} · {rule.successRate}% historical demo success
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => toggleRule(rule.id)}
                        className="size-4 accent-violet-600"
                      />
                      {rule.enabled ? "Enabled" : "Disabled"}
                    </label>
                  </div>
                ))}
              </div>
            </Panel>
          )}
          {tab === "Security" && (
            <Panel>
              <h2 className="text-lg font-semibold">Security preferences</h2>
              <p className="mt-1 text-sm text-muted">
                These options are sample UI state only; they do not enforce server-side access
                control.
              </p>
              <form className="mt-5 space-y-4" onSubmit={saveSecurity}>
                <label className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <input
                    name="mfaRequired"
                    type="checkbox"
                    defaultChecked={settings.security.mfaRequired}
                    className="mt-0.5 size-4 accent-violet-600"
                  />
                  <span>
                    <strong className="block text-sm">Require multi-factor authentication</strong>
                    <span className="text-xs text-muted">
                      Preference displayed in the demo only.
                    </span>
                  </span>
                </label>
                <fieldset>
                  <legend className="text-sm font-medium">Allowed regions</legend>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {["US-West", "US-East", "EU-Central", "AP-South"].map((region) => (
                      <label key={region} className="flex items-center gap-2 text-sm">
                        <input
                          name="region"
                          type="checkbox"
                          value={region}
                          defaultChecked={settings.security.allowedRegions.includes(region)}
                          className="size-4 accent-violet-600"
                        />
                        {region}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="block text-sm font-medium">
                  Session timeout in minutes
                  <input
                    name="sessionTimeoutMinutes"
                    type="number"
                    min="5"
                    max="1440"
                    defaultValue={settings.security.sessionTimeoutMinutes}
                    className="mt-1 h-10 w-full rounded-lg border border-border px-3"
                  />
                </label>
                <button className="h-9 rounded-lg bg-accent px-3 text-sm font-semibold text-white">
                  Save security preferences
                </button>
              </form>
            </Panel>
          )}
          {tab === "Billing" && (
            <Panel>
              <h2 className="text-lg font-semibold">Billing</h2>
              <p className="mt-1 text-sm text-muted">
                Billing controls are isolated in the demo plan view.
              </p>
              <Link
                href="/billing"
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white"
              >
                <Icon name="open_in_new" />
                View plan &amp; billing
              </Link>
            </Panel>
          )}
          <Panel>
            <h2 className="font-semibold">Workspace data</h2>
            <p className="mt-1 text-sm text-muted">
              Settings are stored in this browser. They are not tenant security controls.
            </p>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Reset this browser’s Temora demo data to the seeded sample?")) {
                  demoRepository.resetDemo();
                  setNotice("Demo data reset to its initial sample state.");
                }
              }}
              className="mt-3 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700"
            >
              Reset demo data
            </button>
          </Panel>
        </div>
      </div>
    </main>
  );
}
