"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/shared/icon";
import { authClient, type AuthUser } from "@/features/authentication/lib/auth-client";
import { AuthLogo, authInputClass, authPrimaryClass } from "@/features/authentication/components/auth-ui";
import { workspaceApi } from "@/features/workspace/api/client";
import type { Workspace } from "@/features/workspace/types";

const steps = ["Account Details", "Workspace Setup", "Invite Collaborators", "Connect Tools"];

export function WorkspaceOnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [invites, setInvites] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [createdWorkspace, setCreatedWorkspace] = useState<Workspace | null>(null);
  const [sentInvites, setSentInvites] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    authClient.me().then(({ user: current }) => { if (mounted) setUser(current); }).catch((cause: unknown) => {
      if (mounted) setError(cause instanceof Error ? cause.message : "Unable to load your account.");
    });
    return () => { mounted = false; };
  }, []);

  function addInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = inviteInput.trim().toLowerCase();
    if (email === user?.email.toLowerCase() || invites.includes(email)) { setError("That address is already included."); return; }
    setInvites((current) => [...current, email]); setInviteInput(""); setError("");
  }

  async function createWorkspace() {
    if (!user) { setError("Your account could not be validated. Sign in again."); return; }
    if (workspaceName.trim().length < 2) { setStep(2); setError("Workspace name must have at least two characters."); return; }
    setBusy(true); setError("");
    try {
      const workspace = createdWorkspace ?? await workspaceApi.create(workspaceName.trim());
      if (!createdWorkspace) setCreatedWorkspace(workspace);
      await workspaceApi.select(workspace.id);
      for (const email of invites) {
        if (sentInvites.includes(email)) continue;
        await workspaceApi.invite(workspace.id, email, "member");
        setSentInvites((current) => [...current, email]);
      }
      router.replace("/");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Workspace setup could not be completed.");
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-5 py-6 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <AuthLogo />
        <div className="mt-8 flex items-center justify-between"><span className="text-sm text-slate-500">Workspace setup</span><span className="text-xs text-slate-500">Account: {user?.full_name ?? "Loading…"} {user?.email ? `· ${user.email}` : ""}</span></div>
        <div className="mt-3 grid grid-cols-4 gap-2" aria-label={`Step ${step} of 4`}>{steps.map((label, index) => <div key={label} aria-current={index + 1 === step ? "step" : undefined}><div className={`h-1.5 rounded-full ${index + 1 <= step ? "bg-violet-600" : "bg-slate-200"}`} /><span className="mt-2 hidden text-xs text-slate-500 sm:block">{index + 1}. {label}</span></div>)}</div>
        <section className="mx-auto mt-10 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <p className="text-xs font-semibold tracking-widest text-violet-700">TENANT PROVISIONING · STEP {step} OF 4</p>
          <h1 className="mt-2 text-2xl font-bold">{step === 1 ? "Confirm your account details" : step === 2 ? "Configure your organization’s workspace" : step === 3 ? "Invite your collaborators" : "Connect your team tools"}</h1>
          <p className="mt-2 text-sm text-slate-500">{step === 1 ? "Your verified account will own this workspace." : step === 2 ? "Workspaces organize your projects, teams, and permissions." : step === 3 ? "Invitations are created by the Workspace service." : "Integrations are not available yet."}</p>
          {step === 1 && <div className="mt-7 grid gap-5 sm:grid-cols-2"><label className="text-sm font-medium">Full name<input readOnly className={authInputClass} value={user?.full_name ?? ""} /></label><label className="text-sm font-medium">Work email<input readOnly className={authInputClass} value={user?.email ?? ""} /></label><p className="text-xs leading-5 text-slate-500 sm:col-span-2">Account details come from your authenticated profile.</p></div>}
          {step === 2 && <div className="mt-7"><label className="text-sm font-medium">Workspace name<input required minLength={2} maxLength={120} className={authInputClass} value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="e.g. Northstar Studio" /></label><p className="mt-3 text-xs text-slate-500">The Workspace service assigns the workspace URL and stores the workspace in the database.</p></div>}
          {step === 3 && <div className="mt-7"><form onSubmit={addInvite} className="flex flex-col gap-2 sm:flex-row"><label className="flex-1 text-sm font-medium">Collaborator email<input type="email" className={authInputClass} value={inviteInput} onChange={(event) => setInviteInput(event.target.value)} placeholder="colleague@company.com" /></label><button type="submit" className="h-11 self-end rounded-lg border border-slate-200 px-4 text-sm font-semibold">Add invitation</button></form>{invites.length ? <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200 px-3">{invites.map((email) => <li key={email} className="flex items-center gap-3 py-3 text-sm"><span className="min-w-0 flex-1 truncate">{email}</span><span className="text-xs text-slate-500">Member</span><button type="button" aria-label={`Remove ${email}`} className="text-slate-500 hover:text-red-700" onClick={() => setInvites((current) => current.filter((item) => item !== email))}><Icon name="close" size={18} /></button></li>)}</ul> : <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">You can skip this step and invite members later.</p>}</div>}
          {step === 4 && <div className="mt-7 space-y-3">{["Slack", "GitHub", "Figma", "Google Drive"].map((tool) => <div key={tool} className="flex items-center justify-between rounded-lg border border-slate-200 p-3"><span className="text-sm font-medium">{tool}</span><span className="text-xs text-slate-500">Unavailable</span></div>)}<p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">Integration settings are not stored by the current backend.</p></div>}
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          <div className="mt-8 flex justify-between border-t border-slate-100 pt-5"><button type="button" className="rounded-lg border border-slate-200 px-4 py-2 text-sm" onClick={() => { setStep((current) => Math.max(1, current - 1)); setError(""); }} disabled={step === 1 || busy}>Back</button><button type="button" disabled={!user || busy} className={`${authPrimaryClass} disabled:opacity-50`} onClick={() => { setError(""); if (step === 2 && workspaceName.trim().length < 2) { setError("Workspace name must have at least two characters."); return; } if (step < 4) setStep((current) => current + 1); else void createWorkspace(); }}>{busy ? "Creating…" : step === 4 ? "Create workspace" : "Continue"}<Icon name="arrow_forward" /></button></div>
        </section>
      </div>
    </main>
  );
}
