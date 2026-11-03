"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/shared/icon";
import {
  AuthLogo,
  authInputClass,
  authPrimaryClass,
} from "@/features/authentication/components/auth-ui";
import type { WorkspaceIndustry, WorkspaceTeamSize } from "@/features/workspace/data/model";
import { demoRepository } from "@/features/workspace/data/demo-repository";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

const steps = ["Account Details", "Workspace Setup", "Invite Collaborators", "Connect Tools"];
const input = authInputClass;
const primary = authPrimaryClass;

export function WorkspaceOnboardingPage() {
  const router = useRouter();
  const state = useDemoState();
  const member = state.members.find((item) => item.id === state.activeMemberId);
  const [step, setStep] = useState(2);
  const [profileMemberId, setProfileMemberId] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [teamSize, setTeamSize] = useState<WorkspaceTeamSize | "">("");
  const [methodology, setMethodology] = useState<"Agile Scrum" | "Kanban" | "Custom">(
    "Agile Scrum",
  );
  const [industry, setIndustry] = useState<WorkspaceIndustry>("Product & Engineering");
  const [inviteInput, setInviteInput] = useState("");
  const [invites, setInvites] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!member || profileMemberId === member.id) return;
    const timer = window.setTimeout(() => {
      setProfileMemberId(member.id);
      setProfileName(member.name);
      setProfileEmail(member.email);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [member, profileMemberId]);

  useEffect(() => {
    let timer: number | undefined;
    try {
      const draft = JSON.parse(
        window.localStorage.getItem("temora-workspace-setup-draft-v1") ?? "null",
      ) as {
        step?: number;
        profileName?: string;
        profileEmail?: string;
        workspaceName?: string;
        workspaceSlug?: string;
        teamSize?: string;
        methodology?: string;
        industry?: string;
        invites?: string[];
      } | null;
      if (!draft) return;
      timer = window.setTimeout(() => {
        if (draft.step && draft.step >= 1 && draft.step <= 4) setStep(draft.step);
        if (draft.profileName) setProfileName(draft.profileName);
        if (draft.profileEmail) setProfileEmail(draft.profileEmail);
        setWorkspaceName(draft.workspaceName ?? "");
        setWorkspaceSlug(draft.workspaceSlug ?? "");
        if (["1–10", "11–50", "51–200", "200+"].includes(draft.teamSize ?? ""))
          setTeamSize(draft.teamSize as WorkspaceTeamSize);
        if (
          draft.methodology === "Agile Scrum" ||
          draft.methodology === "Kanban" ||
          draft.methodology === "Custom"
        )
          setMethodology(draft.methodology);
        if (
          [
            "Product & Engineering",
            "Design Agency & Creative Labs",
            "SaaS Enterprise Platform",
            "Fintech & Regulated Systems",
          ].includes(draft.industry ?? "")
        )
          setIndustry(draft.industry as WorkspaceIndustry);
        if (Array.isArray(draft.invites))
          setInvites(draft.invites.filter((value) => typeof value === "string"));
      }, 0);
    } catch {
      // An invalid optional draft does not block workspace setup.
    }
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  function saveDraft() {
    try {
      window.localStorage.setItem(
        "temora-workspace-setup-draft-v1",
        JSON.stringify({
          step,
          profileName,
          profileEmail,
          workspaceName,
          workspaceSlug,
          teamSize,
          methodology,
          industry,
          invites,
        }),
      );
      setError("");
      setMessage("Setup draft saved in this browser.");
    } catch {
      setError("Setup draft could not be saved in browser storage.");
    }
  }

  function addInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = inviteInput.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (invites.includes(email) || email === profileEmail.trim().toLowerCase()) {
      setError("That address is already included.");
      return;
    }
    setInvites((current) => [...current, email]);
    setInviteInput("");
    setError("");
  }

  function createWorkspace() {
    if (profileName.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(profileEmail.trim())) {
      setError("Enter a name and valid email address before creating the workspace.");
      setStep(1);
      return;
    }
    if (workspaceName.trim().length < 2) {
      setError("Workspace name must have at least two characters.");
      setStep(2);
      return;
    }
    const normalizedInvites = invites.map((email) => email.trim().toLowerCase());
    if (new Set(normalizedInvites).size !== normalizedInvites.length) {
      setError("Remove duplicate email addresses before continuing.");
      return;
    }
    if (
      normalizedInvites.some(
        (email) => !/^\S+@\S+\.\S+$/.test(email) || email === profileEmail.trim().toLowerCase(),
      )
    ) {
      setError("Check the collaborator email addresses and remove your own address.");
      return;
    }
    try {
      const workspace = demoRepository.createWorkspace({
        name: workspaceName,
        slug: workspaceSlug || workspaceName,
        ...(teamSize ? { teamSize } : {}),
        industry,
        methodology,
      });
      const owner = demoRepository
        .getSnapshot()
        .members.find(
          (item) =>
            item.workspaceId === workspace.id &&
            item.id === demoRepository.getSnapshot().activeMemberId,
        );
      if (owner)
        demoRepository.updateMemberProfile(owner.id, { name: profileName, email: profileEmail });
      for (const email of normalizedInvites) demoRepository.inviteMember({ email });
      window.localStorage.removeItem("temora-workspace-setup-draft-v1");
      router.push("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Workspace could not be created.");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-5 py-6 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <AuthLogo />
        <div className="mt-8 flex items-center justify-between">
          <span className="text-sm text-slate-500">Workspace setup</span>
          <button type="button" className="text-sm text-slate-500" onClick={saveDraft}>
            Save draft
          </button>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2" aria-label={`Step ${step} of 4`}>
          {steps.map((label, index) => (
            <div key={label} aria-current={index + 1 === step ? "step" : undefined}>
              <div
                className={`h-1.5 rounded-full ${index + 1 <= step ? "bg-violet-600" : "bg-slate-200"}`}
              />
              <span className="mt-2 hidden text-xs text-slate-500 sm:block">
                {index + 1}. {label}
              </span>
            </div>
          ))}
        </div>
        <section className="mx-auto mt-10 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <p className="text-xs font-semibold tracking-widest text-violet-700">
            TENANT PROVISIONING · STEP {step} OF 4
          </p>
          <h1 className="mt-2 text-2xl font-bold">
            {step === 1
              ? "Confirm your account details"
              : step === 2
                ? "Configure your organization’s workspace"
                : step === 3
                  ? "Invite your collaborators"
                  : "Connect your team tools"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {step === 1
              ? "Update the local demo profile that will own this workspace. No credentials are collected."
              : step === 2
                ? "Workspaces organize your projects, teams, permissions, and billing."
                : step === 3
                  ? "Add demo members to the new workspace. No invitation emails are sent."
                  : "External services are not connected in this preview. You can review simulated integrations later."}
          </p>

          {step === 1 && (
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Full name
                <input
                  required
                  minLength={2}
                  className={input}
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                />
              </label>
              <label className="text-sm font-medium">
                Work email
                <input
                  required
                  type="email"
                  className={input}
                  value={profileEmail}
                  onChange={(event) => setProfileEmail(event.target.value)}
                />
              </label>
              <p className="text-xs leading-5 text-slate-500 sm:col-span-2">
                This updates the local demo profile only. It does not create or verify an account.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Workspace name
                <input
                  required
                  minLength={2}
                  className={input}
                  value={workspaceName}
                  onChange={(event) => {
                    setWorkspaceName(event.target.value);
                    setWorkspaceSlug("");
                  }}
                  placeholder="e.g. Northstar Studio"
                />
              </label>
              <label className="text-sm font-medium">
                Workspace URL
                <span className="mt-1 flex items-center">
                  <span className="rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                    temora.app/
                  </span>
                  <input
                    className={`${input} rounded-l-none`}
                    value={
                      workspaceSlug ||
                      workspaceName
                        .trim()
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, "")
                    }
                    onChange={(event) => setWorkspaceSlug(event.target.value)}
                    placeholder="your-team"
                  />
                </span>
              </label>
              <fieldset className="sm:col-span-2">
                <legend className="text-sm font-medium">Team size</legend>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(["1–10", "11–50", "51–200", "200+"] as const).map((value) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={teamSize === value}
                      className={`rounded-lg border p-3 text-sm hover:border-violet-400 ${teamSize === value ? "border-violet-600 bg-violet-50 text-violet-800" : "border-slate-200"}`}
                      onClick={() => setTeamSize(value)}
                    >
                      {value} seats
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="text-sm font-medium sm:col-span-2">
                Industry / domain
                <select
                  className={input}
                  value={industry}
                  onChange={(event) => setIndustry(event.target.value as WorkspaceIndustry)}
                >
                  <option>Product &amp; Engineering</option>
                  <option>Design Agency &amp; Creative Labs</option>
                  <option>SaaS Enterprise Platform</option>
                  <option>Fintech &amp; Regulated Systems</option>
                </select>
              </label>
              <fieldset className="sm:col-span-2">
                <legend className="text-sm font-medium">Default project methodology</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {(["Agile Scrum", "Kanban", "Custom"] as const).map((value) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={methodology === value}
                      className={`rounded-lg border p-3 text-left text-sm hover:border-violet-400 ${methodology === value ? "border-violet-600 bg-violet-50" : "border-slate-200"}`}
                      onClick={() => setMethodology(value)}
                    >
                      <strong className="block">{value}</strong>
                      <span className="mt-1 block text-xs text-slate-500">
                        Configure your project workflow
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {step === 3 && (
            <div className="mt-7">
              <form onSubmit={addInvite} className="flex flex-col gap-2 sm:flex-row">
                <label className="flex-1 text-sm font-medium">
                  Collaborator email
                  <input
                    type="email"
                    className={input}
                    value={inviteInput}
                    onChange={(event) => setInviteInput(event.target.value)}
                    placeholder="colleague@company.com"
                  />
                </label>
                <button
                  type="submit"
                  className="h-11 self-end rounded-lg border border-slate-200 px-4 text-sm font-semibold"
                >
                  Add demo member
                </button>
              </form>
              {invites.length > 0 ? (
                <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200 px-3">
                  {invites.map((email) => (
                    <li key={email} className="flex items-center gap-3 py-3 text-sm">
                      <span className="min-w-0 flex-1 truncate">{email}</span>
                      <span className="text-xs text-slate-500">Member</span>
                      <button
                        type="button"
                        aria-label={`Remove ${email}`}
                        className="text-slate-500 hover:text-red-700"
                        onClick={() =>
                          setInvites((current) => current.filter((item) => item !== email))
                        }
                      >
                        <Icon name="close" size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                  You can skip this step and invite demo members later.
                </p>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="mt-7 space-y-3">
              {["Slack", "GitHub", "Figma", "Google Drive"].map((tool) => (
                <div
                  key={tool}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                >
                  <span className="text-sm font-medium">{tool}</span>
                  <span className="text-xs text-slate-500">
                    Available in simulated Integrations
                  </span>
                </div>
              ))}
              <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                No external accounts or credentials are requested. The workspace will be created
                locally; integrations remain disconnected.
              </p>
            </div>
          )}

          {message && (
            <p role="status" className="mt-4 text-sm text-violet-700">
              {message}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="mt-8 flex justify-between border-t border-slate-100 pt-5">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
              onClick={() => {
                setStep((current) => Math.max(1, current - 1));
                setError("");
                setMessage("");
              }}
              disabled={step === 1}
            >
              Back
            </button>
            <button
              type="button"
              className={primary}
              onClick={() => {
                setError("");
                if (
                  step === 1 &&
                  (profileName.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(profileEmail.trim()))
                ) {
                  setError("Enter a name and valid email address.");
                  return;
                }
                if (step === 2 && workspaceName.trim().length < 2) {
                  setError("Workspace name must have at least two characters.");
                  return;
                }
                if (step < 4) setStep((current) => current + 1);
                else createWorkspace();
              }}
            >
              {step === 4 ? "Create workspace" : "Continue"}
              <Icon name="arrow_forward" />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
