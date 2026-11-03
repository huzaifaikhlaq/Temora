"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import { Panel } from "@/components/shared/dashboard-ui";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";
import { WorkspacePageShell } from "@/components/shared/workspace-page-ui";

const button =
  "inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white hover:bg-accent-strong";
const softButton =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-medium text-foreground hover:bg-surface-low";

export function ApplicationStatePage({ stateKind }: { stateKind: "not-found" | "forbidden" }) {
  const demoState = useDemoState();
  const [notice, setNotice] = useState("");
  const notFound = stateKind === "not-found";

  async function copyDiagnostics() {
    try {
      await navigator.clipboard.writeText(
        `Temora frontend preview\nPath: ${window.location.pathname}\nWorkspace: ${demoState.activeWorkspaceId}\nTask: ${window.location.pathname.includes("tasks/") ? window.location.pathname.split("/").at(-1) : "n/a"}`,
      );
      setNotice("Page diagnostics copied to the clipboard.");
    } catch {
      setNotice("Clipboard access is unavailable. Copy the current page address manually.");
    }
  }

  return (
    <WorkspacePageShell>
      <Panel className="mx-auto max-w-3xl py-12 text-center sm:py-16">
        <span
          className={`mx-auto grid size-16 place-items-center rounded-2xl ${notFound ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}
        >
          <Icon name={notFound ? "search_off" : "gpp_bad"} size={32} />
        </span>
        <p className="mt-6 font-mono text-xs font-semibold tracking-widest text-outline">
          {notFound ? "HTTP 404 // RESOURCE_NOT_FOUND" : "403 // INSUFFICIENT_PRIVILEGES"}
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          {notFound ? "We couldn’t find that page" : "You don’t have access to this page"}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted">
          {notFound
            ? "The requested task or resource may have moved, been archived, or no longer exists."
            : "This is a permission-state preview. No authorization service enforces roles or receives access requests."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link className={button} href="/">
            Return to overview
          </Link>
          <button
            className={softButton}
            disabled={!notFound}
            title={
              notFound
                ? "Copy diagnostic context"
                : "Access requests are not connected in this preview"
            }
            onClick={copyDiagnostics}
          >
            {notFound ? "Copy diagnostics" : "Access request unavailable"}
          </button>
        </div>
        {notice && (
          <p role="status" className="mt-4 text-sm text-accent">
            {notice}
          </p>
        )}
        <p className="mt-8 font-mono text-[11px] text-outline">
          {notFound
            ? "TENANT: LOCAL DEMO · TRACE: UNAVAILABLE"
            : "AUTHORIZATION SERVICE: NOT CONNECTED · PREVIEW ONLY"}
        </p>
      </Panel>
    </WorkspacePageShell>
  );
}
