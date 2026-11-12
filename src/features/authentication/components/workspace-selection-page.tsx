"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/shared/icon";
import { AuthLogo, authInputClass, authPrimaryClass } from "@/features/authentication/components/auth-ui";
import { workspaceApi } from "@/features/workspace/api/client";
import type { Workspace } from "@/features/workspace/types";

export function WorkspaceSelectionPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const [items, selection] = await Promise.all([workspaceApi.list(), workspaceApi.selected()]);
      setWorkspaces(items);
      const current = items.find((item) => item.id === selection.workspace_id);
      if (current) setSelectedId(current.id);
      else if (selection.workspace_id) {
        await fetch("/api/workspace/selection", { method: "DELETE", credentials: "same-origin" });
        setSelectedId(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load your workspaces.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function select(id: string) {
    setBusy(true); setError("");
    try {
      await workspaceApi.select(id);
      setSelectedId(id);
      router.replace("/");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Workspace could not be selected.");
    } finally { setBusy(false); }
  }

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const created = await workspaceApi.create(name.trim());
      await workspaceApi.select(created.id);
      setWorkspaces((items) => [...items, created]);
      router.replace("/");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Workspace could not be created.");
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-5 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <AuthLogo />
        <div className="mt-9 grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
          <section>
            <span className="text-xs font-semibold tracking-widest text-violet-700">WORKSPACE SELECTION</span>
            <h1 className="mt-3 text-3xl font-bold">Choose your workspace</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Select a workspace you belong to or create a new one.</p>
            <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50 p-4">
              <span className="text-xs font-semibold text-violet-700">INVITATIONS</span>
              <h2 className="mt-2 font-semibold">Accept an invitation</h2>
              <p className="mt-1 text-sm text-slate-600">Open the invitation link sent to your email to join a workspace.</p>
            </div>
          </section>
          <section>
            <div className="mb-3 flex items-end justify-between">
              <div><h2 className="font-semibold">Your Workspaces</h2><p className="text-xs text-slate-500">{workspaces.length} accessible workspaces</p></div>
              <button type="button" className="text-sm font-semibold text-violet-700" onClick={() => { setCreating((open) => !open); setError(""); }}>+ Create workspace</button>
            </div>
            {creating && <form onSubmit={createWorkspace} className="mb-3 rounded-xl border border-violet-200 bg-white p-4">
              <label className="block text-sm font-medium">Workspace name<input autoFocus required minLength={2} maxLength={120} className={authInputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Northstar Studio" /></label>
              <p className="mt-2 text-xs text-slate-500">The workspace will be created in your account.</p>
              <button disabled={busy} className={`${authPrimaryClass} mt-3 w-full disabled:opacity-50`} type="submit">{busy ? "Creating…" : "Create workspace"}</button>
            </form>}
            {loading ? <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading workspaces…</p> : workspaces.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">You do not belong to a workspace yet. Create one or accept an invitation.</div> : <div className="space-y-3">{workspaces.map((workspace, index) => {
              const active = workspace.id === selectedId;
              return <article key={workspace.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><span className={`grid size-10 place-items-center rounded-lg ${["bg-violet-600", "bg-sky-600", "bg-slate-800"][index % 3]} text-white`}><Icon name="hub" /></span><span className="flex-1"><strong>{workspace.name}</strong><span className="block text-xs capitalize text-slate-500">{workspace.role} · {workspace.slug}</span></span>{active && <span className="text-xs font-medium text-emerald-700">Active</span>}</div><button type="button" className={`${active ? authPrimaryClass : "h-10 w-full rounded-lg border border-slate-200 text-sm font-semibold"} mt-4 w-full`} disabled={active || busy} onClick={() => void select(workspace.id)}>{active ? "Current workspace" : "Switch workspace"}</button></article>;
            })}</div>}
            {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          </section>
        </div>
      </div>
    </main>
  );
}
