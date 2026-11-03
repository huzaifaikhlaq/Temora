"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/shared/icon";
import { MetricCard, Panel, PanelTitle } from "@/components/shared/dashboard-ui";
import { IssueCreateForm } from "@/features/issues/components/issue-create-form";
import { IssuesDirectory } from "@/features/issues/components/issues-directory";
import { SprintCompletionPanel } from "@/features/sprints/components/sprint-completion-panel";

export type AdvancedPageKind =
  | "create-issue"
  | "issues"
  | "dependencies"
  | "burndown"
  | "complete-sprint"
  | "roles"
  | "retrospective"
  | "automation"
  | "audit";

const shell = "mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8";
const primary =
  "inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white hover:bg-accent-strong";
const secondary =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-medium hover:bg-surface-low";
const input =
  "h-9 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent";

function Heading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[.16em] text-outline">
          Northstar Studio / Workspace
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>
      </div>
      {action}
    </header>
  );
}

function GridTable({ heads, rows }: { heads: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-outline">
            {heads.map((h) => (
              <th key={h} className="px-3 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/70 last:border-0 hover:bg-surface-low/60">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdvancedPage({ kind }: { kind: AdvancedPageKind }) {
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("Overview");
  const [query, setQuery] = useState("");

  if (kind === "create-issue") return <IssueCreateForm />;
  if (kind === "issues") return <IssuesDirectory />;
  if (kind === "complete-sprint") return <SprintCompletionPanel />;

  if (kind === "dependencies")
    return (
      <div className={shell}>
        <Heading
          title="Dependencies & Audit Trail"
          subtitle="Website Redesign / Sprint 24 / TEM-101 · Velocity 42 / 48 points"
          action={
            <button className={secondary} onClick={() => setNotice("Issue link copied.")}>
              <Icon name="share" />
              Share
            </button>
          }
        />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5">
            <Panel>
              <div className="flex flex-wrap gap-2">
                <span className="rounded bg-accent px-2 py-1 font-mono text-xs font-bold text-white">
                  TEM-101
                </span>
                <span className="rounded bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-800">
                  In Progress
                </span>
                <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                  High priority
                </span>
                <span className="ml-auto text-sm text-muted">5 story points</span>
              </div>
              <h1 className="mt-4 text-2xl font-bold">
                Implement OAuth 2.0 PKCE authentication flow for mobile clients
              </h1>
              <p className="mt-3 leading-7 text-muted">
                Deprecate implicit grant types and transition iOS and Android native shells to
                Authorization Code with Proof Key for Code Exchange (RFC 7636). Ensure token
                rotation handshake and secure biometric keychain persistence.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-surface-low p-4 text-sm">
                <div>
                  <span className="block text-xs text-muted">Assignee</span>Alex Morgan
                </div>
                <div>
                  <span className="block text-xs text-muted">Reporter</span>Sarah Chen
                </div>
                <div>
                  <span className="block text-xs text-muted">Target</span>Sprint 24 · Oct 28
                </div>
                <div>
                  <span className="block text-xs text-muted">Issue type</span>Story
                </div>
              </div>
            </Panel>
            <Panel>
              <div className="mb-4 flex flex-wrap gap-2">
                {["Overview", "Subtasks · 3", "Dependencies · 3", "Audit Trail & History"].map(
                  (x) => (
                    <button
                      key={x}
                      onClick={() => setTab(x)}
                      className={`rounded-lg px-3 py-2 text-sm ${tab === x ? "bg-accent text-white" : "bg-surface-low text-muted"}`}
                    >
                      {x}
                    </button>
                  ),
                )}
              </div>
              <PanelTitle
                title={
                  tab.includes("Dependencies")
                    ? "Dependency graph"
                    : tab.includes("Audit")
                      ? "Audit trail & history"
                      : tab.includes("Subtasks")
                        ? "Subtasks"
                        : "Issue details"
                }
              />
              {tab.includes("Dependencies") ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ["Blocks", "TEM-108", "E2E biometric login tests"],
                    ["Blocked by", "TEM-096", "OAuth JWT refresh middleware"],
                    ["Relates to", "TEM-112", "Update mobile SDK v3.1.0"],
                  ].map((x, i) => (
                    <div
                      key={x[1]}
                      className={`rounded-xl p-4 ${i === 0 ? "bg-red-50" : i === 1 ? "bg-amber-50" : "bg-violet-50"}`}
                    >
                      <span className="text-xs font-semibold">{x[0]}</span>
                      <strong className="mt-2 block font-mono text-accent">{x[1]}</strong>
                      <p className="mt-1 text-sm">{x[2]}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    ["Alex Morgan", "Changed status to In Progress", "22m ago"],
                    ["Sarah Chen", "Added dependency TEM-096", "1h ago"],
                    ["Jordan Lee", "Updated acceptance criteria", "Yesterday"],
                  ].map((x) => (
                    <div
                      key={x[0] + x[2]}
                      className="flex justify-between gap-3 border-b border-border pb-3 text-sm"
                    >
                      <span>
                        <strong>{x[0]}</strong> {x[1]}
                      </span>
                      <span className="shrink-0 text-xs text-muted">{x[2]}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
          <Panel className="h-fit">
            <PanelTitle title="Linked work" />
            {[
              ["Blocks", "1 issue"],
              ["Blocked by", "1 issue"],
              ["Related to", "1 issue"],
            ].map((x) => (
              <div key={x[0]} className="flex justify-between border-b border-border py-3 text-sm">
                <span className="text-muted">{x[0]}</span>
                <strong>{x[1]}</strong>
              </div>
            ))}
            <button
              className={`${secondary} mt-4 w-full`}
              onClick={() => setNotice("Dependency picker opened.")}
            >
              <Icon name="account_tree" />
              Add dependency
            </button>
            {notice && (
              <p role="status" className="mt-3 text-sm text-accent">
                {notice}
              </p>
            )}
          </Panel>
        </div>
      </div>
    );

  if (kind === "burndown")
    return (
      <div className={shell}>
        <Heading
          title="Sprint 24 Burndown & Velocity Report"
          subtitle="Sprint 24 performance analytics · Closed and audited 2 hours ago"
          action={
            <div className="flex gap-2">
              <button className={secondary} onClick={() => setNotice("PDF export prepared.")}>
                <Icon name="picture_as_pdf" />
                Export PDF
              </button>
              <button className={secondary} onClick={() => setNotice("CSV export prepared.")}>
                <Icon name="csv" />
                Export CSV
              </button>
            </div>
          }
        />
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              Sprint 24 · Oct 14–28, 2025
            </span>
            <div className="flex gap-2">
              <select className={input}>
                <option>Compare with Sprint 23</option>
                <option>Compare with 3-sprint average</option>
              </select>
              <span className="self-center text-xs font-mono text-muted">NORTHSTAR-MAIN-SCRUM</span>
            </div>
          </div>
        </Panel>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Committed baseline"
            value="48 pts"
            note="Initial commitment"
            icon="assignment_turned_in"
          />
          <MetricCard
            label="Points completed"
            value="42 pts"
            note="87.5% burned"
            icon="task_alt"
            tone="green"
          />
          <MetricCard
            label="Scope ingestion"
            value="+5 pts"
            note="Added on Day 6"
            icon="playlist_add"
          />
          <MetricCard
            label="Velocity burn rate"
            value="4.2 pts/day"
            note="Target 4.8 · −12.5%"
            icon="speed"
            tone="red"
          />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel>
            <PanelTitle title="Story points burndown vs ideal guide" />
            <div className="h-64 rounded-lg bg-surface-low p-4">
              <svg
                viewBox="0 0 600 220"
                className="h-full w-full"
                role="img"
                aria-label="Sprint burndown chart"
              >
                <path d="M20 20H580M20 75H580M20 130H580M20 185H580" stroke="#deddea" />
                <path d="M20 20L580 200" stroke="#a3a0b8" strokeDasharray="6 6" />
                <path
                  d="M20 22L100 38L180 56L260 74L340 95L420 130L500 158L580 196"
                  fill="none"
                  stroke="#635bff"
                  strokeWidth="4"
                />
              </svg>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-muted">
              <span>● Actual remaining</span>
              <span>┄ Ideal guideline</span>
            </div>
          </Panel>
          <Panel>
            <PanelTitle title="Scope change & rollover" />
            <div className="space-y-4">
              {[
                ["Committed baseline", "48 pts"],
                ["Added mid-sprint · Day 6", "+5 pts"],
                ["Removed from scope", "−5 pts"],
                ["Completed at close", "42 pts"],
                ["Rollover to Sprint 25", "6 pts"],
              ].map((x) => (
                <div
                  key={x[0]}
                  className="flex justify-between border-b border-border pb-3 text-sm"
                >
                  <span className="text-muted">{x[0]}</span>
                  <strong className="font-mono">{x[1]}</strong>
                </div>
              ))}
            </div>
          </Panel>
          <Panel className="xl:col-span-2">
            <PanelTitle title="Daily remaining capacity" />
            <GridTable
              heads={["Day", "Date", "Remaining", "Completed", "Scope change"]}
              rows={Array.from({ length: 7 }, (_, i) => [
                `Day ${i * 2 + 1}`,
                `Oct ${14 + i * 2}`,
                `${48 - i * 6} pts`,
                `${i * 6} pts`,
                i === 3 ? "+5 pts" : "—",
              ])}
            />
          </Panel>
        </div>
        {notice && (
          <p role="status" className="text-sm text-accent">
            {notice}
          </p>
        )}
      </div>
    );

  if (kind === "roles")
    return (
      <div className={shell}>
        <Heading
          title="Roles & Permissions Matrix"
          subtitle="Define fine-grained capability scopes across default roles and custom team tiers."
          action={
            <div className="flex gap-2">
              <button className={secondary} onClick={() => setNotice("Role comparison opened.")}>
                <Icon name="compare_arrows" />
                Compare
              </button>
              <button className={secondary} onClick={() => setNotice("Role history opened.")}>
                <Icon name="history" />
                Audit
              </button>
              <button className={primary} onClick={() => setNotice("Role changes saved locally.")}>
                <Icon name="save" />
                Save Changes
              </button>
            </div>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Active scopes"
            value="28"
            note="Verified"
            icon="verified_user"
            tone="green"
          />
          <MetricCard
            label="Policy bound"
            value="100%"
            note="Enforced"
            icon="security"
            tone="green"
          />
          <MetricCard label="Assignable tiers" value="6 roles" note="1 immutable" icon="badge" />
          <MetricCard
            label="Provisioned users"
            value="72"
            note="0 orphan accounts"
            icon="group"
            tone="green"
          />
        </div>
        <Panel>
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              "All Scopes (28)",
              "Workspaces & Billing (6)",
              "Project & Issue Access (12)",
              "API & Integrations (6)",
              "Security (4)",
            ].map((x) => (
              <button
                key={x}
                onClick={() => setTab(x)}
                className={`rounded-lg px-3 py-2 text-xs ${tab === x ? "bg-accent text-white" : "bg-surface-low text-muted"}`}
              >
                {x}
              </button>
            ))}
          </div>
          <GridTable
            heads={["Permission scope", "Owner", "Admin", "Project Lead", "Member", "Viewer"]}
            rows={[
              ["View workspace", "✓", "✓", "✓", "✓", "✓"],
              ["Manage workspace settings", "✓", "✓", "—", "—", "—"],
              ["Create and edit issues", "✓", "✓", "✓", "✓", "—"],
              ["Delete issues", "✓", "✓", "—", "—", "—"],
              ["Manage sprint cycles", "✓", "✓", "✓", "—", "—"],
              ["Manage billing & seats", "✓", "✓", "—", "—", "—"],
              ["Create API keys", "✓", "✓", "—", "—", "—"],
              ["View security audit logs", "✓", "✓", "✓", "—", "—"],
            ].map((r, ri) =>
              r.map((v, ci) =>
                ci === 0 ? (
                  <strong key={v}>{v}</strong>
                ) : (
                  <label key={`${ri}-${ci}`} className="flex justify-center">
                    <input
                      type="checkbox"
                      aria-label={`${r[0]} ${ci}`}
                      defaultChecked={v === "✓"}
                      disabled={ci === 1}
                      className="size-4 accent-violet-600"
                    />
                  </label>
                ),
              ),
            )}
          />
        </Panel>
        {notice && (
          <p role="status" className="text-sm text-accent">
            {notice}
          </p>
        )}
      </div>
    );

  if (kind === "retrospective")
    return (
      <div className={shell}>
        <Heading
          title="Sprint 24 Retrospective & Insights"
          subtitle="Published · 14 attendees · Vote phase closed"
          action={
            <div className="flex gap-2">
              <button className={secondary} onClick={() => setNotice("Summary exported.")}>
                <Icon name="file_download" />
                Export Summary
              </button>
              <button className={primary} onClick={() => setNotice("Action item added.")}>
                <Icon name="add_task" />
                Create Action Item
              </button>
            </div>
          }
        />
        <Panel>
          <span className="font-mono text-xs font-semibold text-accent">SPRINT-24 · TEM-SP24</span>
          <h2 className="mt-1 text-xl font-bold">Identity & Multi-Tenant Core</h2>
          <p className="mt-1 text-sm text-muted">
            Oct 14–28 · 42 of 48 points burned (87.5% velocity)
          </p>
        </Panel>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Velocity output"
            value="42 / 48 pts"
            note="93.3% against commitment"
            icon="bolt"
            tone="green"
          />
          <MetricCard
            label="Sprint carryover"
            value="2 issues"
            note="6 pts to Sprint 25"
            icon="sync_alt"
          />
          <MetricCard
            label="Team sentiment"
            value="4.4 / 5.0"
            note="↑ 0.3 from Sprint 23"
            icon="sentiment_satisfied"
            tone="green"
          />
          <MetricCard label="Commitments" value="5 actions" note="3 completed" icon="task_alt" />
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {[
            [
              "Went well",
              "bg-emerald-50",
              [
                "OAuth integration shipped ahead of schedule",
                "Cross-team pairing unblocked mobile auth",
                "Daily standups stayed focused",
              ],
            ],
            [
              "To improve",
              "bg-amber-50",
              [
                "Bring QA into acceptance criteria earlier",
                "Reduce mid-sprint scope changes",
                "Clarify API documentation ownership",
              ],
            ],
            [
              "Action items",
              "bg-violet-50",
              [
                "Add contract tests to CI · Alex Morgan",
                "Schedule design review · Sarah Chen",
                "Document rollback plan · Jordan Lee",
              ],
            ],
          ].map(([title, tone, notes]) => (
            <Panel key={title as string} className={tone as string}>
              <div className="flex justify-between">
                <h2 className="font-semibold">{title}</h2>
                <button
                  aria-label={`Add to ${title}`}
                  className="text-accent"
                  onClick={() => setNotice(`${title} note added.`)}
                >
                  <Icon name="add" />
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {(notes as string[]).map((n, i) => (
                  <div key={n} className="rounded-lg bg-white/80 p-3 text-sm">
                    <p>{n}</p>
                    <div className="mt-2 flex justify-between text-xs text-muted">
                      <span>{i + 2} votes</span>
                      <button className="text-accent" onClick={() => setNotice("Vote recorded.")}>
                        ▲ Vote
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </div>
        {notice && (
          <p role="status" className="text-sm text-accent">
            {notice}
          </p>
        )}
      </div>
    );

  if (kind === "automation")
    return (
      <div className={shell}>
        <Heading
          title="Custom Fields & Automation Rules"
          subtitle="Standardize issue metadata and automate event-driven workflows."
          action={
            <div className="flex gap-2">
              <button className={secondary} onClick={() => setTab("Execution History")}>
                <Icon name="history" />
                Execution History
              </button>
              <button
                className={secondary}
                onClick={() => setNotice("Custom field builder opened.")}
              >
                <Icon name="data_object" />
                New Custom Field
              </button>
              <button className={primary} onClick={() => setNotice("Automation builder opened.")}>
                <Icon name="bolt" />
                Create Automation Rule
              </button>
            </div>
          }
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Active rules"
            value="14"
            note="99.8% success rate"
            icon="auto_mode"
            tone="green"
          />
          <MetricCard
            label="Custom fields"
            value="19"
            note="Across issue types"
            icon="data_object"
          />
          <MetricCard
            label="Executions (30d)"
            value="2,481"
            note="99.8% succeeded"
            icon="monitoring"
            tone="green"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["Automation Rules (14)", "Custom Fields Registry (19)", "Rule Trigger Templates"].map(
            (x) => (
              <button
                key={x}
                onClick={() => setTab(x)}
                className={`rounded-lg px-3 py-2 text-sm ${tab === x ? "bg-accent text-white" : "bg-white text-muted"}`}
              >
                {x}
              </button>
            ),
          )}
        </div>
        {tab.includes("Registry") ? (
          <Panel>
            <PanelTitle title="Custom fields registry" />
            <GridTable
              heads={["Field", "Type", "Issue types", "Required", "Updated"]}
              rows={[
                ["Release train", "Dropdown", "Bug, Story", "No", "Oct 26"],
                ["Security impact", "Select", "Bug", "Yes", "Oct 24"],
                ["Customer segment", "Text", "Story, Epic", "No", "Oct 21"],
                ["QA sign-off", "User", "Task, Bug", "No", "Oct 18"],
              ]}
            />
          </Panel>
        ) : (
          <Panel>
            <PanelTitle
              title={
                tab === "Execution History"
                  ? "Recent execution history"
                  : "Active automation pipelines"
              }
            />
            <div className="space-y-3">
              {[
                [
                  "RECIPE-094",
                  "Auto-close GitHub PR & notify Slack on QA sign-off",
                  "When status transitions to Done",
                  "1,240 runs",
                  "99.9%",
                ],
                [
                  "RECIPE-108",
                  "Assign bug to component owner",
                  "When issue type is Bug",
                  "684 runs",
                  "100%",
                ],
                [
                  "RECIPE-116",
                  "Sprint start notification",
                  "When a sprint starts",
                  "312 runs",
                  "99.4%",
                ],
              ].map((r) => (
                <article key={r[0]} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <span className="font-mono text-xs text-accent">{r[0]}</span>
                      <h3 className="mt-1 font-semibold">{r[1]}</h3>
                      <p className="mt-1 text-sm text-muted">{r[2]}</p>
                    </div>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" defaultChecked className="accent-violet-600" />
                      Active
                    </label>
                  </div>
                  <div className="mt-3 flex gap-4 border-t border-border pt-3 text-xs text-muted">
                    <span>{r[3]}</span>
                    <span className="text-emerald-700">{r[4]} success</span>
                    <button
                      className="ml-auto text-accent"
                      onClick={() => setNotice(`Editing ${r[0]}.`)}
                    >
                      Edit
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </Panel>
        )}
        {notice && (
          <p role="status" className="text-sm text-accent">
            {notice}
          </p>
        )}
      </div>
    );

  return (
    <div className={shell}>
      <Heading
        title="Security & Audit Logs Console"
        subtitle="Cryptographically chained events, session governance, and SIEM streaming."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              className={secondary}
              onClick={() => setNotice("Audit export prepared as CSV / JSON.")}
            >
              <Icon name="download" />
              Export Audit Log
            </button>
            <button
              className={secondary}
              onClick={() => setNotice("SIEM stream configuration opened.")}
            >
              <Icon name="cell_tower" />
              Configure SIEM
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white"
              onClick={() => setNotice("Emergency revocation needs owner confirmation.")}
            >
              <Icon name="gavel" />
              Revoke Sessions
            </button>
          </div>
        }
      />
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        <strong>SOC-2 Type II verified · TLS 1.3 · Immutable chaining</strong>
        <span className="ml-2 text-xs">Tenant: NS-PROD-092 · Zero packet loss</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Monitored events (30d)"
          value="148,290"
          note="↑ 12.4% · baseline 120k"
          icon="data_thresholding"
          tone="green"
        />
        <MetricCard label="Authorized sessions" value="8 active" note="Geo-fenced" icon="devices" />
        <MetricCard label="API principals" value="14" note="Across 4 groups" icon="vpn_key" />
        <MetricCard
          label="Policy violations"
          value="0"
          note="Systems operational"
          icon="policy"
          tone="green"
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <Panel>
          <PanelTitle
            title="Live audit log stream"
            trailing={
              <span className="flex items-center gap-2 text-xs text-emerald-700">
                <i className="size-2 animate-pulse rounded-full bg-emerald-500" />
                Live
              </span>
            }
          />
          <div className="mb-4 flex flex-wrap gap-2">
            <input
              className={input}
              placeholder="Search actor, action, IP…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select className={input}>
              <option>All event types</option>
              <option>Authentication</option>
              <option>Permission change</option>
              <option>Data access</option>
            </select>
            <select className={input}>
              <option>Last 30 days</option>
              <option>24 hours</option>
              <option>7 days</option>
            </select>
          </div>
          <GridTable
            heads={["Timestamp", "Actor", "Event", "Resource", "Result"]}
            rows={[
              [
                "10:42:18 UTC",
                "Alex Morgan",
                "Session authenticated",
                "Northstar Studio",
                "Success",
              ],
              ["10:39:04 UTC", "Sarah Chen", "Permission updated", "TEM-101", "Success"],
              [
                "10:32:51 UTC",
                "svc-ci-pipeline",
                "API token accessed",
                "GitHub integration",
                "Success",
              ],
              ["10:18:22 UTC", "Jordan Lee", "MFA challenge passed", "Northstar Studio", "Success"],
              ["09:56:07 UTC", "Unknown IP", "Login blocked by policy", "Auth gateway", "Blocked"],
            ]
              .filter((r) => r.join(" ").toLowerCase().includes(query.toLowerCase()))
              .map((r) =>
                r.map((v, i) =>
                  i === 4 ? (
                    <span
                      key={v}
                      className={`rounded px-2 py-1 text-xs font-semibold ${v === "Blocked" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"}`}
                    >
                      {v}
                    </span>
                  ) : (
                    v
                  ),
                ),
              )}
          />
        </Panel>
        <div className="space-y-5">
          <Panel>
            <PanelTitle title="Active user sessions" />
            {[
              ["Alex Morgan", "Chrome · macOS", "San Francisco · Current"],
              ["Sarah Chen", "Safari · iPhone", "New York · Active"],
              ["Jordan Lee", "Chrome · Windows", "Seattle · Active"],
            ].map((x) => (
              <div key={x[0]} className="border-b border-border py-3 text-sm">
                <strong>{x[0]}</strong>
                <span className="block text-xs text-muted">
                  {x[1]} · {x[2]}
                </span>
              </div>
            ))}
          </Panel>
          <Panel>
            <PanelTitle title="IP whitelist & geo-fencing" />
            <p className="text-sm text-muted">US-West and US-East trusted regions</p>
            <button
              className={`${secondary} mt-3 w-full`}
              onClick={() => setNotice("Network policy settings opened.")}
            >
              Manage network policy
            </button>
          </Panel>
        </div>
      </div>
      {notice && (
        <p role="status" className="text-sm text-accent">
          {notice}
        </p>
      )}
    </div>
  );
}
