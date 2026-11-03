import type { ReactNode } from "react";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

const shell = "mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8";

export function WorkspacePageShell({ children }: { children: ReactNode }) {
  return <div className={shell}>{children}</div>;
}

export function WorkspacePageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  const state = useDemoState();
  const workspaceName = state.workspaces.find((item) => item.id === state.activeWorkspaceId)?.name;

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[.16em] text-outline">
          {workspaceName ?? "Workspace"} / Workspace
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function DataTable({ headings, rows }: { headings: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[650px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-outline">
            {headings.map((heading) => (
              <th key={heading} className="px-3 py-3 font-medium">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-border/70 last:border-0 hover:bg-surface-low/60"
            >
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-3.5">
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
