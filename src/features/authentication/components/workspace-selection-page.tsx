"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/shared/icon";
import {
  AuthLogo,
  authInputClass,
  authPrimaryClass,
} from "@/features/authentication/components/auth-ui";
import { demoRepository } from "@/features/workspace/data/demo-repository";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

export function WorkspaceSelectionPage() {
  const router = useRouter();
  const state = useDemoState();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const workspaces = state.workspaces;

  function createWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      demoRepository.createWorkspace({ name });
      router.push("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Workspace could not be created.");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-5 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <AuthLogo />
        <div className="mt-9 grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
          <section>
            <span className="text-xs font-semibold tracking-widest text-violet-700">
              LOCAL WORKSPACE SELECTION
            </span>
            <h1 className="mt-3 text-3xl font-bold">Choose your workspace</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Switch between browser-local workspaces or create a new demo workspace. No server
              session or tenant access is verified.
            </p>
            <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50 p-4">
              <span className="text-xs font-semibold text-violet-700">INVITATIONS</span>
              <h2 className="mt-2 font-semibold">No pending invitations</h2>
              <p className="mt-1 text-sm text-slate-600">
                Invitations are not included in this local demo workspace store.
              </p>
              <div className="mt-4 rounded-lg border border-violet-100 bg-white/70 p-3 text-xs text-slate-600">
                Invite acceptance will be available when pending invitations are modeled.
              </div>
            </div>
          </section>
          <section>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="font-semibold">Your Workspaces</h2>
                <p className="text-xs text-slate-500">
                  {workspaces.length} workspaces in this browser
                </p>
              </div>
              <button
                type="button"
                className="text-sm font-semibold text-violet-700"
                onClick={() => {
                  setCreating((open) => !open);
                  setError("");
                }}
              >
                + Create workspace
              </button>
            </div>
            {creating && (
              <form
                onSubmit={createWorkspace}
                className="mb-3 rounded-xl border border-violet-200 bg-white p-4"
              >
                <label className="block text-sm font-medium">
                  Workspace name
                  <input
                    autoFocus
                    required
                    minLength={2}
                    className={authInputClass}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Northstar Studio"
                  />
                </label>
                <p className="mt-2 text-xs text-slate-500">
                  Creates a local demo workspace. No account or billing service is contacted.
                </p>
                <button className={`${authPrimaryClass} mt-3 w-full`} type="submit">
                  Create workspace
                </button>
                {error && (
                  <p role="alert" className="mt-2 text-sm text-red-700">
                    {error}
                  </p>
                )}
              </form>
            )}
            <div className="space-y-3">
              {workspaces.map((workspace, index) => {
                const members = state.members.filter(
                  (member) => member.workspaceId === workspace.id,
                );
                const projects = state.projects.filter(
                  (project) => project.workspaceId === workspace.id && !project.archivedAt,
                );
                const activeMember = members.find((member) => member.id === state.activeMemberId);
                const active = workspace.id === state.activeWorkspaceId;
                return (
                  <article
                    key={workspace.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid size-10 place-items-center rounded-lg ${["bg-violet-600", "bg-sky-600", "bg-slate-800"][index % 3]} text-white`}
                      >
                        <Icon name="hub" />
                      </span>
                      <span className="flex-1">
                        <strong>{workspace.name}</strong>
                        <span className="block text-xs text-slate-500">
                          {activeMember?.role ?? "Member"} · {workspace.plan} plan ·{" "}
                          {workspace.slug}
                        </span>
                      </span>
                      {active && (
                        <span className="text-xs font-medium text-emerald-700">Active</span>
                      )}
                    </div>
                    <div className="mt-4 flex gap-4 text-xs text-slate-500">
                      <span>{members.length} members</span>
                      <span>{projects.length} projects</span>
                    </div>
                    <button
                      type="button"
                      className={`${active ? authPrimaryClass : "h-10 w-full rounded-lg border border-slate-200 text-sm font-semibold"} mt-4 w-full`}
                      disabled={active}
                      onClick={() => {
                        try {
                          demoRepository.switchWorkspace(workspace.id);
                          router.push("/");
                        } catch (cause) {
                          setError(
                            cause instanceof Error ? cause.message : "Workspace unavailable.",
                          );
                        }
                      }}
                    >
                      {active ? "Current workspace" : "Switch workspace"}
                    </button>
                  </article>
                );
              })}
            </div>
            {error && !creating && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
