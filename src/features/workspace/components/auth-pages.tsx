"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/shared/icon";

const input =
  "mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500";
const primary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700";

export function AuthPage({ mode }: { mode: "sign-in" | "workspace-select" | "onboarding" | "sign-up" | "forgot-password" | "verify-email" }) {
  const [step, setStep] = useState(mode === "onboarding" ? 2 : 1);
  const [message, setMessage] = useState("");
  const [method, setMethod] = useState("Email & 2FA");
  const logo = (
    <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
      <span className="grid size-9 place-items-center rounded-xl bg-violet-600 text-white">
        <Icon name="layers" />
      </span>
      Temora
    </Link>
  );

  if (mode === "sign-in")
    return (
      <main className="min-h-screen bg-[#f7f8fc] text-slate-900">
        <header className="flex items-center justify-between px-6 py-5 lg:px-12">
          {logo}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="hidden sm:inline">Enterprise SSO Ready</span>
            <span className="flex items-center gap-1">
              <Icon name="verified_user" size={16} />
              TLS 1.3 Strict
            </span>
          </div>
        </header>
        <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-14 pt-6 lg:grid-cols-[1fr_1fr] lg:items-start lg:pt-12">
          <section className="rounded-2xl bg-[#17152c] p-7 text-white sm:p-10">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
              NORTHSTAR STUDIO · TENANT DETECTED
            </span>
            <h1 className="mt-8 max-w-lg text-3xl font-bold leading-tight sm:text-4xl">
              Your team’s work, in one focused space.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/65">
              Sign in to Northstar Studio to continue planning, collaborating, and delivering
              together.
            </p>
            <div className="mt-10 space-y-4">
              {[
                ["verified_user", "Routed to US-West cluster (sfo-02)"],
                ["shield", "Enterprise identity protection"],
                ["sync", "Workspace data encrypted in transit"],
              ].map(([i, t]) => (
                <div key={t} className="flex items-center gap-3 text-sm text-white/80">
                  <Icon name={i} className="text-violet-300" />
                  {t}
                </div>
              ))}
            </div>
            <div className="mt-14 rounded-xl border border-white/10 bg-white/5 p-4">
              <span className="text-xs text-white/50">WORKSPACE</span>
              <p className="mt-1 font-semibold">Northstar Studio</p>
              <p className="text-xs text-white/60">northstar.studio</p>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-bold">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">
              Verify credentials to access the precision console.
            </p>
            <div className="mt-6 flex rounded-lg bg-slate-100 p-1">
              {["Email & 2FA", "Enterprise SSO"].map((v) => (
                <button
                  key={v}
                  onClick={() => setMethod(v)}
                  className={`flex-1 rounded-md px-2 py-2 text-sm ${method === v ? "bg-white font-semibold shadow-sm" : "text-slate-500"}`}
                >
                  {v}
                </button>
              ))}
            </div>
            {method === "Email & 2FA" ? (
              <div className="mt-5 space-y-4">
                <label className="block text-sm font-medium">
                  Work email
                  <input className={input} type="email" defaultValue="alex@northstar.studio" />
                </label>
                <label className="block text-sm font-medium">
                  Password
                  <input className={input} type="password" placeholder="Enter your password" />
                </label>
                <div className="rounded-lg bg-violet-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-violet-900">
                    <Icon name="phonelink_lock" />
                    Two-Factor Authentication
                  </div>
                  <p className="mt-1 text-xs text-violet-800">
                    Enter the 6-digit key from your authenticator app.
                  </p>
                  <input
                    className={`${input} text-center font-mono tracking-[.5em]`}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  <input type="checkbox" className="accent-violet-600" />
                  Trust this device for 30 days
                </label>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-slate-200 p-5">
                <p className="font-semibold">Organization SSO</p>
                <p className="mt-1 text-sm text-slate-500">
                  Sign in with your organization’s identity provider.
                </p>
                <label className="mt-4 block text-sm">
                  Organization domain
                  <input className={input} placeholder="company.com" />
                </label>
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <Link href="/forgot-password" className="text-xs font-medium text-violet-700 hover:underline">Forgot password?</Link>
            </div>
            <button
              className={`${primary} mt-5 w-full`}
              onClick={() =>
                setMessage("Demo sign-in is ready to connect to your authentication provider.")
              }
            >
              Sign in to Temora <Icon name="arrow_forward" />
            </button>
            {message && (
              <p role="status" className="mt-3 text-sm text-violet-700">
                {message}
              </p>
            )}
            <p className="mt-5 text-center text-xs text-slate-500">
              Protected by enterprise identity and multi-factor authentication.
            </p>
          <p className="mt-4 text-center text-sm text-slate-500">New to Temora? <Link href="/sign-up" className="font-semibold text-violet-700">Create an account</Link></p>
          </section>
        </div>
      </main>
    );

  if (mode === "sign-up")
    return (
      <main className="min-h-screen bg-[#f7f8fc] px-5 py-8 text-slate-900">
        <header className="mx-auto flex max-w-6xl items-center justify-between">{logo}<span className="text-xs text-slate-500">TLS 1.3 Strict · SOC-2 Type II Certified</span></header>
        <div className="mx-auto mt-8 grid max-w-6xl gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <section className="rounded-2xl bg-[#17152c] p-7 text-white sm:p-9"><span className="rounded-full bg-white/10 px-3 py-1 text-xs">PRO TRIAL ENABLED</span><h1 className="mt-7 text-3xl font-bold leading-tight">Create your Temora workspace</h1><p className="mt-3 text-sm leading-6 text-white/70">A 14-day free trial on Pro. No credit card required. Seamless multi-tenant sync.</p><div className="mt-7 flex flex-wrap gap-2">{["Google Workspace","GitHub","SSO"].map(x=><button key={x} className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10" onClick={()=>setMessage(`${x} sign-up selected.`)}>Continue with {x}</button>)}</div><div className="my-6 flex items-center gap-3 text-xs text-white/40"><span className="h-px flex-1 bg-white/20"/>OR USE WORK EMAIL<span className="h-px flex-1 bg-white/20"/></div><div className="space-y-3">{[["lock","SOC-2 Type II"],["verified_user","ISO 27001 policy"],["shield","GDPR ready · HIPAA compliant"]].map(([i,t])=><div key={t} className="flex items-center gap-2 text-sm text-white/75"><Icon name={i}/>{t}</div>)}</div><p className="mt-8 text-xs leading-5 text-white/50">Enterprise-grade data isolation. Continuous vulnerability audits with zero third-party telemetry leakage.</p></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><h2 className="text-xl font-bold">Get started</h2><p className="mt-1 text-sm text-slate-500">Create your account and workspace in a few steps.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Full name<input className={input} placeholder="Alex Morgan"/></label><label className="text-sm font-medium">Work email<input className={input} type="email" placeholder="you@company.com"/></label><label className="text-sm font-medium">Password<input className={input} type="password" placeholder="12+ characters"/></label><label className="text-sm font-medium">Workspace URL<div className="flex items-center"><span className="mt-1 rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 px-2.5 py-3 text-[11px] text-slate-500">https://</span><input className={`${input} min-w-0 rounded-l-none`} placeholder="your-team"/><span className="mt-1 rounded-r-lg border border-l-0 border-slate-200 bg-slate-50 px-2.5 py-3 text-[11px] text-slate-500">.temora.app</span></div></label></div><div className="mt-4 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800"><Icon name="check_circle" size={16} className="mr-1 inline"/>Strong password: 12+ characters, uppercase, number, and special symbol.</div><p className="mt-4 text-xs leading-5 text-slate-500">You can invite teammates and map custom domains after onboarding.</p><label className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" className="mt-1 accent-violet-600"/>I agree to the <a href="#msa" className="font-semibold text-violet-700">Master Services Agreement</a> and acknowledge the Privacy Policy.</label><label className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" className="mt-1 accent-violet-600"/>Send me security bulletins, sprint velocity reports, and release notes.</label><button className={`${primary} mt-5 w-full`} onClick={()=>setMessage("Account details saved. Continue to workspace setup.")}>Create workspace & continue <Icon name="arrow_forward"/></button>{message&&<p role="status" className="mt-3 text-sm text-violet-700">{message} <Link href="/workspace/setup" className="font-semibold underline">Continue setup</Link></p>}<p className="mt-4 text-center text-sm text-slate-500">Already have an organization? <Link className="font-semibold text-violet-700" href="/sign-in">Sign in</Link></p></section>
        </div>
      </main>
    );

  if (mode === "forgot-password")
    return (
      <main className="min-h-screen bg-[#f7f8fc] px-5 py-8 text-slate-900"><header className="mx-auto flex max-w-6xl items-center justify-between">{logo}<span className="text-xs text-slate-500">Enterprise Security Protocol 2.4 · AUTH GATEWAY ACTIVE</span></header><div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9"><div className="flex items-center gap-3 text-xs font-semibold text-violet-700"><span className={`grid size-8 place-items-center rounded-full ${step===1?"bg-violet-600 text-white":"bg-emerald-100 text-emerald-800"}`}>1</span><span>Request reset</span><span className="h-px flex-1 bg-slate-200"/><span className={`grid size-8 place-items-center rounded-full ${step===2?"bg-violet-600 text-white":"bg-slate-100 text-slate-400"}`}>2</span><span>Set password</span></div>{step===1?<><h1 className="mt-7 text-2xl font-bold">Reset your credentials</h1><p className="mt-2 text-sm leading-6 text-slate-500">Enter your verified work email address or enterprise SSO handle. If your organization enforces Okta or SAML, you’ll be redirected to your identity provider.</p><label className="mt-6 block text-sm font-medium">Work email address<input className={input} type="email" defaultValue="alex@northstar.studio"/></label><div className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800"><Icon name="verified_user" size={16} className="mr-1 inline"/>Verified tenant · NorthStar Engineering (US-East-1)</div><button className={`${primary} mt-5 w-full`} onClick={()=>{setStep(2);setMessage("Recovery link dispatched to a***@northstar.studio · expires in 14:58")}}>Send secure recovery link & OTP <Icon name="send"/></button>{message&&<p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}</>:<><h1 className="mt-7 text-2xl font-bold">Set a new master password</h1><p className="mt-2 text-sm text-slate-500">Enter your six-digit token and configure a new password for your account.</p><label className="mt-5 block text-sm font-medium">6-digit security token<input className={`${input} font-mono tracking-[.45em]`} inputMode="numeric" maxLength={6} placeholder="000000"/></label><label className="mt-4 block text-sm font-medium">New master password<input className={input} type="password" placeholder="12+ characters"/></label><label className="mt-4 block text-sm font-medium">Confirm new password<input className={input} type="password" placeholder="Repeat your password"/></label><div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Password strength: Strong <span className="block text-xs">✓ 12+ characters · ✓ number · ✓ special symbol · ✓ mixed casing</span></div><button className={`${primary} mt-5 w-full`} onClick={()=>setMessage("Password updated. Sign in with your new credentials.")}>Update password & authenticate <Icon name="arrow_forward"/></button>{message&&<p role="status" className="mt-3 text-sm text-emerald-700">{message} <Link href="/sign-in" className="font-semibold underline">Sign in</Link></p>}<button className="mt-4 text-sm text-violet-700" onClick={()=>setStep(1)}>← Back to stage 1</button></>}<div className="mt-7 border-t border-slate-100 pt-4 text-center"><Link href="/sign-in" className="text-sm font-medium text-violet-700">← Back to sign in</Link><p className="mt-4 text-xs text-slate-400">TLS 1.3 Strict · SOC-2 Type II Certified · Zero-Knowledge Salts</p></div></div></main>
    );

  if (mode === "verify-email")
    return (
      <main className="min-h-screen bg-[#f7f8fc] px-5 py-8 text-slate-900"><header className="mx-auto flex max-w-6xl items-center justify-between">{logo}<span className="text-xs text-slate-500">Northstar Studio · Sprint 44</span></header><div className="mx-auto mt-8 grid max-w-5xl gap-5 lg:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="grid size-12 place-items-center rounded-xl bg-violet-50 text-violet-700"><Icon name="mark_email_read" size={25}/></div><p className="mt-5 font-mono text-xs font-semibold text-violet-700">AUTH-PIN-256</p><h1 className="mt-2 text-2xl font-bold">Confirm your email address</h1><p className="mt-2 text-sm leading-6 text-slate-500">We sent a six-digit confirmation passcode to alex@northstar.studio. Enter the code to finish setting up your workspace.</p><label className="mt-5 block text-xs font-semibold uppercase tracking-wider text-slate-500">One-time passcode<input className={`${input} mt-2 text-center font-mono text-lg tracking-[.6em]`} inputMode="numeric" maxLength={6} placeholder="000000"/></label><p className="mt-2 text-right text-xs text-slate-500">Resend available in 42s</p><button className={`${primary} mt-4 w-full`} onClick={()=>setMessage("Email verified. Workspace access is ready.")}>Verify & access workspace <Icon name="arrow_forward"/></button>{message&&<p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}<p className="mt-5 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">Can’t find the email? Check junk or quarantine folders, or confirm your company uses the @northstar.studio alias.</p></section><section className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8"><div className="grid size-12 place-items-center rounded-xl bg-amber-50 text-amber-700"><Icon name="lock_clock" size={25}/></div><p className="mt-5 font-mono text-xs font-semibold text-amber-700">IDLE TIMEOUT // SECURITY BOUNDARY · 401</p><h2 className="mt-2 text-2xl font-bold">Session expired</h2><p className="mt-2 text-sm leading-6 text-slate-500">Your Northstar Studio session expired after 30 minutes. Re-authenticate to restore your unsaved board state.</p><div className="mt-5 rounded-lg bg-slate-50 p-3"><strong className="text-sm">Alex Morgan</strong><span className="block text-xs text-slate-500">alex@northstar.studio · Lead Architect · Owner</span></div><label className="mt-4 block text-sm font-medium">Master password<input className={input} type="password" placeholder="Enter your password"/></label><label className="mt-3 flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" defaultChecked className="accent-violet-600"/>Keep active sprint modifications in local buffer (+4 unsaved cards)</label><button className={`${primary} mt-4 w-full`} onClick={()=>setMessage("Session restored. Your local board changes are available.")}>Re-authenticate session <Icon name="arrow_forward"/></button><button className="mt-3 w-full text-sm text-slate-500" onClick={()=>setMessage("Tenant account switcher opened.")}>Switch tenant account · Discard buffer & sign out</button>{message&&<p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}</section></div><p className="mx-auto mt-6 max-w-5xl text-center font-mono text-[10px] text-slate-400">2FA Enforced · TLS 1.3 Strict · HSTS Valid Session Nonce · Zero-Knowledge Rehydration</p></main>
    );

  if (mode === "workspace-select")
    return (
      <main className="min-h-screen bg-[#f7f8fc] px-5 py-8 text-slate-900">
        <div className="mx-auto max-w-5xl">
          {logo}
          <div className="mt-9 grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
            <section>
              <span className="text-xs font-semibold tracking-widest text-emerald-700">
                ACTION COMPLETED · AUTH_SESSION_VALID
              </span>
              <h1 className="mt-3 text-3xl font-bold">Choose your workspace</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Switch to an existing workspace or create an isolated client environment.
              </p>
              <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-violet-700">
                      WORKSPACE INVITE · SENT 2 HOURS AGO
                    </span>
                    <h2 className="mt-2 font-semibold">Apex Systems Inc.</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Invited by Sarah Chen to collaborate on Core Engine.
                    </p>
                    <span className="mt-3 inline-flex rounded-full bg-white px-2 py-1 text-xs text-violet-700">
                      Workspace Admin
                    </span>
                  </div>
                  <button aria-label="Dismiss invite" className="text-slate-400">
                    <Icon name="close" />
                  </button>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    onClick={() => setMessage("Invitation declined.")}
                  >
                    Decline
                  </button>
                  <button className={primary} onClick={() => setMessage("Invitation accepted.")}>
                    Accept & Join
                  </button>
                </div>
              </div>
            </section>
            <section>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h2 className="font-semibold">Your Workspaces</h2>
                  <p className="text-xs text-slate-500">3 workspaces accessible</p>
                </div>
                <button
                  className="text-sm font-semibold text-violet-700"
                  onClick={() => setMessage("Workspace creation started.")}
                >
                  + Create workspace
                </button>
              </div>
              <div className="space-y-3">
                {[
                  [
                    "Northstar Studio",
                    "Owner · Pro tier",
                    "78%",
                    "12 members",
                    "4 projects",
                    "Active",
                    "bg-violet-600",
                  ],
                  [
                    "Hyperion Labs",
                    "Member · hyperion.dev",
                    "3.2 / 5 GB",
                    "8 members",
                    "2 projects",
                    "Free tier",
                    "bg-sky-600",
                  ],
                  [
                    "Apex Systems Inc.",
                    "Admin · Enterprise SLA",
                    "Enterprise",
                    "24 members",
                    "6 projects",
                    "Invite",
                    "bg-slate-800",
                  ],
                ].map((w, i) => (
                  <div
                    key={w[0]}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid size-10 place-items-center rounded-lg ${w[6]} text-white`}
                      >
                        <Icon name="hub" />
                      </span>
                      <span className="flex-1">
                        <strong>{w[0]}</strong>
                        <span className="block text-xs text-slate-500">{w[1]}</span>
                      </span>
                      <span className="text-xs font-medium text-emerald-700">{w[5]}</span>
                    </div>
                    <div className="mt-4 flex gap-4 text-xs text-slate-500">
                      <span>{w[3]}</span>
                      <span>{w[4]}</span>
                      <span>{w[2]}</span>
                    </div>
                    <button
                      className={`${i === 0 ? primary : "mt-4 h-10 w-full rounded-lg border border-slate-200 text-sm font-semibold"} mt-4 w-full`}
                      onClick={() => setMessage(`${w[0]} selected.`)}
                    >
                      {i === 0 ? "Launch workspace →" : "Switch workspace"}
                    </button>
                  </div>
                ))}
              </div>
              {message && (
                <p role="status" className="mt-3 text-sm text-violet-700">
                  {message}
                </p>
              )}
            </section>
          </div>
        </div>
      </main>
    );

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-5 py-6 text-slate-900">
      <div className="mx-auto max-w-5xl">
        {logo}
        <div className="mt-8 flex items-center justify-between">
          <span className="text-sm text-slate-500">Workspace setup</span>
          <button
            className="text-sm text-slate-500"
            onClick={() => setMessage("Your progress has been saved.")}
          >
            Save & Exit
          </button>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {["Account Details", "Workspace Setup", "Invite Collaborators", "Connect Tools"].map(
            (x, i) => (
              <div key={x}>
                <div
                  className={`h-1.5 rounded-full ${i < step ? "bg-violet-600" : "bg-slate-200"}`}
                />
                <span className="mt-2 hidden text-xs text-slate-500 sm:block">
                  {i + 1}. {x}
                </span>
              </div>
            ),
          )}
        </div>
        <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <p className="text-xs font-semibold tracking-widest text-violet-700">
            TENANT PROVISIONING · STEP {step} OF 4
          </p>
          <h1 className="mt-2 text-2xl font-bold">Configure your organization’s workspace</h1>
          <p className="mt-2 text-sm text-slate-500">
            Workspaces organize your projects, teams, permissions, and billing.
          </p>
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Workspace name
              <input className={input} placeholder="e.g. Northstar Studio" />
            </label>
            <label className="text-sm font-medium">
              Workspace URL
              <div className="flex items-center">
                <span className="mt-1 h-11 rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                  temora.app/
                </span>
                <input className={`${input} rounded-l-none`} placeholder="your-team" />
              </div>
            </label>
            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-medium">Team size</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {["1–10", "11–50", "51–200", "200+"].map((v) => (
                  <button
                    type="button"
                    key={v}
                    className="rounded-lg border border-slate-200 p-3 text-sm hover:border-violet-400"
                    onClick={() => setMessage(`Team size ${v} selected.`)}
                  >
                    {v} seats
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="text-sm font-medium sm:col-span-2">
              Industry / domain
              <select className={input}>
                <option>Product & Engineering</option>
                <option>Design Agency & Creative Labs</option>
                <option>SaaS Enterprise Platform</option>
                <option>Fintech & Regulated Systems</option>
              </select>
            </label>
            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-medium">Default project methodology</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {["Agile Scrum", "Kanban", "Custom"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    className="rounded-lg border border-slate-200 p-3 text-left text-sm hover:border-violet-400"
                    onClick={() => setMessage(`${v} methodology selected.`)}
                  >
                    <strong className="block">{v}</strong>
                    <span className="mt-1 block text-xs text-slate-500">
                      Configure your project workflow
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          {message && (
            <p role="status" className="mt-4 text-sm text-violet-700">
              {message}
            </p>
          )}
          <div className="mt-8 flex justify-between border-t border-slate-100 pt-5">
            <button
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
              onClick={() => setStep(Math.max(1, step - 1))}
            >
              Back
            </button>
            <button
              className={primary}
              onClick={() =>
                step < 4 ? setStep(step + 1) : setMessage("Workspace setup complete.")
              }
            >
              {step === 4 ? "Create workspace" : "Continue"}
              <Icon name="arrow_forward" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
