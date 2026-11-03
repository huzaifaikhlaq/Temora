"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/shared/icon";
import {
  DataTable,
  WorkspacePageHeader,
  WorkspacePageShell,
} from "@/components/shared/workspace-page-ui";
import { MetricCard, Panel, PanelTitle } from "@/components/shared/dashboard-ui";

const button =
  "inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white hover:bg-accent-strong";
const softButton =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-medium text-foreground hover:bg-surface-low";
const field =
  "h-9 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent";
const catalog = [
  {
    name: "Slack",
    category: "Chat & notifications",
    initials: "S",
    style: "bg-purple-100 text-purple-700",
  },
  { name: "GitHub", category: "Development", initials: "GH", style: "bg-slate-900 text-white" },
  { name: "Figma", category: "Design", initials: "F", style: "bg-pink-100 text-pink-700" },
  {
    name: "Linear",
    category: "Project management",
    initials: "L",
    style: "bg-violet-100 text-violet-700",
  },
  {
    name: "Google Drive",
    category: "File sharing",
    initials: "D",
    style: "bg-blue-100 text-blue-700",
  },
  { name: "Jira", category: "Project management", initials: "J", style: "bg-sky-100 text-sky-700" },
];

export function IntegrationsPage() {
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [simulatedConnections, setSimulatedConnections] = useState<string[]>([]);
  const filteredCatalog = useMemo(
    () =>
      catalog.filter((integration) =>
        integration.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [query],
  );

  function toggleConnection(name: string) {
    const connected = simulatedConnections.includes(name);
    setSimulatedConnections((current) =>
      connected ? current.filter((item) => item !== name) : [...current, name],
    );
    setNotice(
      `${name} was ${connected ? "removed from" : "marked connected in"} this local preview.`,
    );
  }

  return (
    <WorkspacePageShell>
      <WorkspacePageHeader
        title="Integrations & Developer Webhooks"
        subtitle="Connect the tools your team uses and manage API credentials and event delivery."
        action={
          <button
            className={button}
            disabled
            title="API key generation is not connected in this frontend preview."
          >
            <Icon name="key" />
            API keys unavailable
          </button>
        }
      />
      {notice && (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        Integration controls change local preview state only. No external accounts, API keys, or
        webhooks are created.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Connected integrations"
          value={String(simulatedConnections.length)}
          note="Local preview only"
          icon="extension"
        />
        <MetricCard
          label="Webhooks"
          value="0"
          note="No webhooks configured"
          icon="webhook"
          tone="green"
        />
        <MetricCard label="API requests" value="0" note="No service connected" icon="sync_alt" />
        <MetricCard label="API keys" value="0" note="Key generation disabled" icon="vpn_key" />
      </div>
      <Panel>
        <PanelTitle
          title="App Marketplace"
          trailing={
            <input
              className={field}
              placeholder="Search integrations"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search integrations"
            />
          }
        />
        {filteredCatalog.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCatalog.map((integration) => {
              const connected = simulatedConnections.includes(integration.name);
              return (
                <div
                  key={integration.name}
                  className="flex items-center gap-3 rounded-xl border border-border p-4"
                >
                  <span
                    className={`grid size-10 place-items-center rounded-lg text-sm font-bold ${integration.style}`}
                  >
                    {integration.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block">{integration.name}</strong>
                    <span className="text-xs text-muted">{integration.category}</span>
                  </span>
                  <button className={softButton} onClick={() => toggleConnection(integration.name)}>
                    {connected ? "Disconnect demo" : "Simulate connect"}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted">No integrations match “{query}”.</p>
        )}
      </Panel>
      <Panel>
        <PanelTitle title="API keys & webhooks" />
        <p className="mb-3 text-xs text-muted">
          Example rows only. This frontend preview does not store API keys or webhook secrets.
        </p>
        <DataTable
          headings={["Name", "Created", "Last used", "Status", ""]}
          rows={["Production API", "CI Pipeline", "Analytics Read-only"].map((name) => [
            `${name} · example`,
            "Not created",
            "Never",
            "Preview",
            <button
              key={name}
              disabled
              title="Key actions are unavailable in this frontend preview."
              className="text-muted"
            >
              Unavailable
            </button>,
          ])}
        />
      </Panel>
    </WorkspacePageShell>
  );
}
