"use client";

import { useState } from "react";
import { Icon } from "@/components/shared/icon";
import { Panel } from "@/components/shared/dashboard-ui";
import { demoRepository } from "@/features/workspace/data/demo-repository";
import type { Workspace } from "@/features/workspace/data/model";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

const plans: Workspace["plan"][] = ["Free", "Pro", "Team", "Enterprise"];

export function BillingPage() {
  const state = useDemoState();
  const [notice, setNotice] = useState("");
  const workspace = state.workspaces.find((item) => item.id === state.activeWorkspaceId);
  if (!workspace) return null;
  const activeWorkspace = workspace;
  const members = state.members.filter((member) => member.workspaceId === activeWorkspace.id).length;
  function choosePlan(plan: Workspace["plan"]) {
    demoRepository.updateWorkspace(activeWorkspace.id, { plan });
    setNotice(
      `${plan} is now selected in this local demo. No billing provider or payment was contacted.`,
    );
  }
  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-outline">
          {workspace.name} / Administration
        </p>
        <h1 className="mt-1 text-2xl font-bold">Plan &amp; billing</h1>
        <p className="mt-1 text-sm text-muted">
          Review demo plan and workspace usage. This screen never charges a payment method.
        </p>
      </header>
      {notice && (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <Panel>
          <span className="text-xs font-medium text-muted">Current plan</span>
          <h2 className="mt-2 text-2xl font-bold">{workspace.plan}</h2>
          <p className="mt-1 text-sm text-muted">Workspace plan selection</p>
        </Panel>
        <Panel>
          <span className="text-xs font-medium text-muted">Members</span>
          <h2 className="mt-2 text-2xl font-bold">{members}</h2>
          <p className="mt-1 text-sm text-muted">Current demo roster</p>
        </Panel>
        <Panel>
          <span className="text-xs font-medium text-muted">Projects</span>
          <h2 className="mt-2 text-2xl font-bold">{workspace.projectIds.length}</h2>
          <p className="mt-1 text-sm text-muted">Workspace projects</p>
        </Panel>
      </div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <article
            key={plan}
            className={`rounded-xl border bg-white p-5 ${workspace.plan === plan ? "border-accent ring-1 ring-accent/30" : "border-border"}`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{plan}</h2>
              {workspace.plan === plan && (
                <span className="rounded-full bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">
                  Selected
                </span>
              )}
            </div>
            <p className="mt-2 min-h-12 text-sm text-muted">
              {plan === "Free"
                ? "Core planning for a small workspace."
                : plan === "Pro"
                  ? "Expanded planning and team workflows."
                  : plan === "Team"
                    ? "Advanced collaboration for growing teams."
                    : "Configurable enterprise controls and support."}
            </p>
            <button
              type="button"
              disabled={workspace.plan === plan}
              onClick={() => choosePlan(plan)}
              className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold disabled:bg-surface-low disabled:text-muted"
            >
              <Icon name={workspace.plan === plan ? "check" : "swap_horiz"} />
              {workspace.plan === plan ? "Current plan" : "Select demo plan"}
            </button>
          </article>
        ))}
      </section>
      <p className="text-xs text-muted">
        Plan changes update only this browser’s mock workspace. No invoices, subscriptions, or
        payment records are created.
      </p>
    </main>
  );
}
