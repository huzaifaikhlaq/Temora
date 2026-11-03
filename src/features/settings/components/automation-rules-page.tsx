"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "@/components/shared/icon";
import { MetricCard, Panel } from "@/components/shared/dashboard-ui";
import { demoRepository } from "@/features/workspace/data/demo-repository";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

type AutomationTab = "Rules" | "Custom Fields" | "Templates" | "Execution History";

const templates = [
  "Assign a bug to its project lead",
  "Add a sprint-start notification",
  "Flag issues with a past due date",
];

export function AutomationRulesPage() {
  const state = useDemoState();
  const [tab, setTab] = useState<AutomationTab>("Rules");
  const [ruleName, setRuleName] = useState("");
  const [fieldName, setFieldName] = useState("");
  const [creatingRule, setCreatingRule] = useState(false);
  const [creatingField, setCreatingField] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const settings = state.settingsByWorkspace[state.activeWorkspaceId];
  const rules = settings?.automationRules ?? [];
  const fields = settings?.issueFields ?? [];

  function saveRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = ruleName.trim();
    if (!name) return;
    if (rules.some((rule) => rule.name.toLowerCase() === name.toLowerCase())) {
      setError("A rule with that name already exists in this workspace.");
      return;
    }
    const id = `demo-rule-${Date.now().toString(36)}`;
    try {
      demoRepository.updateSettings({
        automationRules: [...rules, { id, name, enabled: false, successRate: 0 }],
      });
      setRuleName("");
      setCreatingRule(false);
      setError("");
      setNotice("Rule saved in this browser. Its trigger does not execute in this preview.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save rule.");
    }
  }

  function addTemplate(name: string) {
    if (rules.some((rule) => rule.name === name)) {
      setError("This template is already in the workspace rules list.");
      return;
    }
    try {
      demoRepository.updateSettings({
        automationRules: [
          ...rules,
          { id: `demo-rule-${Date.now().toString(36)}`, name, enabled: false, successRate: 0 },
        ],
      });
      setError("");
      setNotice("Template added as a disabled demo rule. It will not execute.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add template.");
    }
  }

  function toggleRule(id: string, enabled: boolean) {
    demoRepository.updateSettings({
      automationRules: rules.map((rule) => (rule.id === id ? { ...rule, enabled } : rule)),
    });
    setNotice("Rule setting updated locally. No automation will run in this preview.");
  }

  function deleteRule(id: string) {
    demoRepository.updateSettings({ automationRules: rules.filter((rule) => rule.id !== id) });
    setNotice("Rule removed from this browser’s demo settings.");
  }

  function addField(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = fieldName.trim();
    if (!name) return;
    if (fields.some((field) => field.toLowerCase() === name.toLowerCase())) {
      setError("That custom field already exists.");
      return;
    }
    demoRepository.updateSettings({ issueFields: [...fields, name] });
    setFieldName("");
    setCreatingField(false);
    setError("");
    setNotice("Custom field added to the shared demo settings.");
  }

  function removeField(name: string) {
    demoRepository.updateSettings({ issueFields: fields.filter((field) => field !== name) });
    setNotice("Custom field removed from this browser’s demo settings.");
  }

  return (
    <main className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[.16em] text-outline">
            {state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId)?.name} /
            Settings
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Custom fields &amp; automation
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Manage browser-local issue fields and rule definitions. Rules do not execute or connect
            to external services.
          </p>
        </div>
        <div className="flex gap-2">
          {tab === "Rules" && (
            <button
              type="button"
              onClick={() => setCreatingRule(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white"
            >
              <Icon name="bolt" />
              Create Rule
            </button>
          )}
          {tab === "Custom Fields" && (
            <button
              type="button"
              onClick={() => setCreatingField(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white"
            >
              <Icon name="data_object" />
              New Custom Field
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Rule definitions"
          value={String(rules.length)}
          note={`${rules.filter((rule) => rule.enabled).length} enabled in settings`}
          icon="auto_mode"
        />
        <MetricCard
          label="Execution"
          value="Disabled"
          note="Triggers are not run"
          icon="pause_circle"
        />
        <MetricCard
          label="Custom issue fields"
          value={String(fields.length)}
          note="Shared workspace settings"
          icon="data_object"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["Rules", "Custom Fields", "Templates", "Execution History"] as const).map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={tab === item}
            onClick={() => {
              setTab(item);
              setError("");
            }}
            className={`rounded-lg px-3 py-2 text-sm ${tab === item ? "bg-accent text-white" : "bg-white text-muted"}`}
          >
            {item === "Rules"
              ? `Automation Rules (${rules.length})`
              : item === "Custom Fields"
                ? `Custom Fields (${fields.length})`
                : item}
          </button>
        ))}
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

      {tab === "Rules" && (
        <Panel>
          <h2 className="font-semibold">Workspace automation rules</h2>
          <p className="mt-1 text-xs text-muted">
            Enabled is a saved preference only; no trigger execution or external notification
            occurs.
          </p>
          <div className="mt-4 space-y-3">
            {rules.map((rule) => (
              <article key={rule.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs text-accent">{rule.id}</span>
                    <h3 className="mt-1 font-semibold">{rule.name}</h3>
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(event) => toggleRule(rule.id, event.target.checked)}
                      className="size-4 accent-violet-600"
                    />
                    Enabled in settings
                  </label>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
                  <span>Trigger execution unavailable · no run history</span>
                  <button
                    type="button"
                    onClick={() => deleteRule(rule.id)}
                    className="font-medium text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
            {rules.length === 0 && (
              <p className="rounded-lg bg-surface-low p-4 text-sm text-muted">
                No rules are configured. Add a rule or start from a template.
              </p>
            )}
          </div>
        </Panel>
      )}

      {tab === "Custom Fields" && (
        <Panel>
          <h2 className="font-semibold">Custom fields registry</h2>
          <p className="mt-1 text-xs text-muted">
            These names are stored in workspace settings; issue forms do not yet render custom field
            values.
          </p>
          <ul className="mt-4 divide-y divide-border">
            {fields.map((field) => (
              <li key={field} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span>{field}</span>
                <button
                  type="button"
                  onClick={() => removeField(field)}
                  className="text-xs font-medium text-red-700"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          {fields.length === 0 && (
            <p className="mt-3 text-sm text-muted">No custom issue fields are configured.</p>
          )}
        </Panel>
      )}

      {tab === "Templates" && (
        <Panel>
          <h2 className="font-semibold">Rule templates</h2>
          <p className="mt-1 text-xs text-muted">
            Templates add disabled rule definitions. The demo does not execute automation.
          </p>
          <div className="mt-4 space-y-3">
            {templates.map((template) => (
              <div
                key={template}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <span className="text-sm">{template}</span>
                <button
                  type="button"
                  onClick={() => addTemplate(template)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium"
                >
                  Add disabled rule
                </button>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {tab === "Execution History" && (
        <Panel>
          <h2 className="font-semibold">Execution history unavailable</h2>
          <p className="mt-2 text-sm text-muted">
            Automation rules are saved as frontend configuration only. No trigger engine or
            execution records exist in this demo.
          </p>
        </Panel>
      )}

      {creatingRule && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <form
            onSubmit={saveRule}
            className="w-full max-w-lg space-y-4 rounded-xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">Create automation rule</h2>
                <p className="mt-1 text-xs text-muted">
                  Saves a disabled local definition; no automation runs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreatingRule(false)}
                aria-label="Close"
                className="text-muted"
              >
                ×
              </button>
            </div>
            <label className="block text-sm font-medium">
              Rule name
              <input
                autoFocus
                required
                minLength={3}
                maxLength={120}
                value={ruleName}
                onChange={(event) => setRuleName(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-border px-3 text-sm"
                placeholder="e.g. Assign urgent issues"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreatingRule(false)}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
              >
                Save rule
              </button>
            </div>
          </form>
        </div>
      )}
      {creatingField && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <form
            onSubmit={addField}
            className="w-full max-w-lg space-y-4 rounded-xl bg-white p-5 shadow-2xl"
          >
            <h2 className="text-lg font-semibold">Add custom field</h2>
            <label className="block text-sm font-medium">
              Field name
              <input
                autoFocus
                required
                minLength={2}
                maxLength={80}
                value={fieldName}
                onChange={(event) => setFieldName(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-border px-3 text-sm"
                placeholder="e.g. Release train"
              />
            </label>
            <p className="text-xs text-muted">
              The demo stores the field name. Field types and issue-level values are not modeled
              yet.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreatingField(false)}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
              >
                Add field
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
