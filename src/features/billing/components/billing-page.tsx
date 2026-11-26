"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

// import { initializePaddle } from "@paddle/paddle-js";

import { Panel } from "@/components/shared/dashboard-ui";

import {
  useWorkspaceScope,
} from "@/features/workspace/hooks/workspace-scope";

import { billingApi } from "../api/client";

import type {
  Plan,
  Payment,
  Subscription,
} from "../types/billing";

let paddlePromise:
  // | ReturnType<typeof initializePaddle>
  | undefined;

function getPaddle() {
  const token =
    process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

  if (!token) {
    throw new Error(
      "Paddle client token is missing.",
    );
  }

  // if (!paddlePromise) {
  //   paddlePromise = initializePaddle({
  //     environment: "sandbox",
  //     token,
  //   }).then((paddle) => {
  //     if (!paddle) {
  //       paddlePromise = undefined;

  //       throw new Error(
  //         "Unable to initialize Paddle.",
  //       );
  //     }

  //     return paddle;
  //   }).catch((error) => {
  //     paddlePromise = undefined;
  //     throw error;
  //   });
  // }

  return paddlePromise;
}

function formatMoney(
  amount: number,
  currency: string,
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatLimit(value: number | null) {
  return value === null
    ? "Unlimited"
    : value.toLocaleString();
}

function BillingContent({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const [plans, setPlans] = useState<Plan[]>([]);

  const [subscription, setSubscription] =
    useState<Subscription | null>(null);

  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const [catalog, current] = await Promise.all([
        billingApi.plans(),

        billingApi.subscription(workspaceId),
      ]);

      setPlans(catalog);

      setSubscription(current);

      if (current.can_manage) {
        const invoices =
          await billingApi.invoices(workspaceId);

        setPayments(invoices);
      } else {
        setPayments([]);
      }

      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load billing.",
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();

    // Payment completion is asynchronous.
    // Refresh from the backend rather than trusting
    // the checkout success callback.

    const timer = window.setInterval(() => {
      void load();
    }, 15000);

    return () => {
      window.clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    if (
      subscription?.can_manage &&
      process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
    ) {
      void getPaddle().catch(() => {
        // Checkout displays an actionable error if opened.
      });
    }
  }, [subscription?.can_manage]);

  async function choosePlan(plan: Plan) {
    if (busy || !subscription?.can_manage) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const paddle = await getPaddle();

      const checkout = await billingApi.checkout(
        workspaceId,
        plan.code,
      );

      paddle?.Checkout.open({
        transactionId: checkout.transaction_id,

        settings: {
          displayMode: "overlay",
        },
      });

      setNotice(
        "Complete your payment in Paddle. " +
        "Your plan will update after payment verification.",
      );

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start checkout.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancelSubscription() {
    if (busy) return;

    const confirmed = window.confirm(
      "Cancel your subscription at the end " +
      "of the current billing period?",
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");

    try {
      const updated =
        await billingApi.cancel(workspaceId);

      setSubscription(updated);

      setNotice(
        "Your subscription is scheduled for cancellation.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Cancellation failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function resumeSubscription() {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const updated =
        await billingApi.resume(workspaceId);

      setSubscription(updated);

      setNotice("Subscription cancellation reversed.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to resume subscription.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancelCheckout() {
    if (busy) return;

    if (
      !window.confirm(
        "Cancel the unfinished checkout?",
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await billingApi.cancelCheckout(workspaceId);

      setNotice("Checkout canceled.");

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to cancel checkout.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-sm text-muted">
        Loading billing information...
      </div>
    );
  }

  if (!subscription) {
    return (
      <main className="p-6">
        <p role="alert" className="text-red-600">
          {error || "Billing information unavailable."}
        </p>

        <button
          onClick={() => void load()}
          className="mt-3 rounded-lg border px-4 py-2"
        >
          Retry
        </button>
      </main>
    );
  }

  const currentPlan = subscription.effective_plan;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">

      <header className="flex flex-wrap items-center justify-between gap-4">

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Workspace administration
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            Plan & Billing
          </h1>

          <p className="mt-1 text-sm text-muted">
            Manage your workspace subscription.
          </p>
        </div>

        <button
          disabled={busy}
          onClick={() => void load()}
          className="rounded-lg border border-border px-4 py-2 text-sm"
        >
          Refresh
        </button>

      </header>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {notice && (
        <p
          role="status"
          className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800"
        >
          {notice}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">

        <Panel>
          <p className="text-xs text-muted">
            Current access plan
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            {currentPlan.name}
          </h2>

          <p className="mt-1 text-sm text-muted">
            Subscription: {subscription.status}
          </p>
        </Panel>

        <Panel>
          <p className="text-xs text-muted">
            Monthly base price
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            {subscription.plan.monthly_price === null
              ? "Custom"
              : formatMoney(
                subscription.plan.monthly_price,
                subscription.plan.currency,
              )}
          </h2>

          <p className="mt-1 text-sm text-muted">
            Before taxes or discounts
          </p>
        </Panel>

        <Panel>
          <p className="text-xs text-muted">
            {subscription.cancel_at_period_end
              ? "Subscription ends"
              : "Billing period ends"}
          </p>

          <h2 className="mt-2 text-xl font-bold">
            {formatDate(
              subscription.current_period_end,
            )}
          </h2>
        </Panel>

      </div>

      {subscription.pending_checkout && (
        <Panel>
          <h2 className="font-semibold">
            Unfinished checkout
          </h2>

          <p className="mt-1 text-sm text-muted">
            {subscription.pending_checkout.status === "creating"
              ? "Checkout creation is being resolved. Do not start another payment."
              : "You can reopen or cancel your existing checkout."}
          </p>

          <button
            disabled={
              busy ||
              subscription.pending_checkout.status === "creating"
            }
            onClick={() => void cancelCheckout()}
            className="mt-3 rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
          >
            Cancel checkout
          </button>
        </Panel>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

        {plans.map((plan) => {
          const selected =
            currentPlan.code === plan.code;

          const pending =
            subscription.pending_checkout;

          const canPurchase =
            subscription.can_manage &&
            plan.checkout_available &&
            !subscription.has_paid_subscription &&
            (!pending ||
              (
                pending.plan === plan.code &&
                pending.status === "open"
              ));

          return (
            <article
              key={plan.id}
              className={`rounded-xl border bg-surface-bright p-5 ${selected
                  ? "border-accent ring-1 ring-accent"
                  : "border-border"
                }`}
            >

              <h2 className="text-lg font-bold">
                {plan.name}
              </h2>

              <p className="mt-3 text-3xl font-bold">
                {plan.monthly_price === null
                  ? "Custom"
                  : formatMoney(
                    plan.monthly_price,
                    plan.currency,
                  )}

                {plan.monthly_price !== null && (
                  <span className="ml-1 text-sm font-normal text-muted">
                    /mo
                  </span>
                )}
              </p>

              <p className="mt-3 min-h-12 text-sm text-muted">
                {plan.description}
              </p>

              <ul className="mt-4 space-y-3 border-t border-border pt-4 text-sm">

                <li>
                  {formatLimit(plan.max_members)} members
                </li>

                <li>
                  {formatLimit(plan.max_projects)} projects
                </li>

                <li>
                  {formatLimit(plan.max_issues)} issues
                </li>

                <li>Kanban boards</li>

                <li>Sprint planning</li>

              </ul>

              <button
                type="button"
                disabled={
                  busy ||
                  selected ||
                  !canPurchase
                }
                onClick={() => void choosePlan(plan)}
                className="mt-5 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {selected
                  ? "Current plan"
                  : plan.code === "enterprise"
                    ? "Custom arrangement"
                    : pending?.plan === plan.code
                      ? "Continue checkout"
                      : !subscription.can_manage
                        ? "Owner only"
                        : subscription.has_paid_subscription
                          ? "Unavailable during current subscription"
                          : "Choose plan"}
              </button>

            </article>
          );
        })}

      </section>

      <Panel>

        <h2 className="text-lg font-semibold">
          Workspace entitlements
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-3">

          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted">
              Member limit
            </p>

            <p className="mt-1 text-xl font-bold">
              {formatLimit(currentPlan.max_members)}
            </p>
          </div>

          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted">
              Project limit
            </p>

            <p className="mt-1 text-xl font-bold">
              {formatLimit(currentPlan.max_projects)}
            </p>
          </div>

          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted">
              Issue limit
            </p>

            <p className="mt-1 text-xl font-bold">
              {formatLimit(currentPlan.max_issues)}
            </p>
          </div>

        </div>

      </Panel>

      {subscription.can_manage && (

        <>

          {subscription.status === "active" && (

            <Panel>

              <h2 className="font-semibold">
                Manage subscription
              </h2>

              {subscription.cancel_at_period_end ? (
                <>
                  <p className="mt-2 text-sm text-muted">
                    Your paid access continues until{" "}
                    {formatDate(
                      subscription.current_period_end,
                    )}.
                  </p>

                  <button
                    disabled={busy}
                    onClick={() => void resumeSubscription()}
                    className="mt-4 rounded-lg border px-4 py-2 text-sm"
                  >
                    Keep subscription
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm text-muted">
                    Cancel future renewals while keeping
                    access until the current period ends.
                  </p>

                  <button
                    disabled={busy}
                    onClick={() => void cancelSubscription()}
                    className="mt-4 rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600"
                  >
                    Cancel subscription
                  </button>
                </>
              )}

            </Panel>

          )}

          <Panel>

            <h2 className="text-lg font-semibold">
              Billing history
            </h2>

            {payments.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                No billing transactions yet.
              </p>
            ) : (

              <div className="mt-4 overflow-x-auto">

                <table className="w-full text-left text-sm">

                  <thead>
                    <tr className="border-b border-border text-muted">
                      <th className="p-3">Invoice</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>

                  <tbody>

                    {payments.map((payment) => (

                      <tr
                        key={payment.id}
                        className="border-b border-border"
                      >

                        <td className="p-3">
                          {payment.invoice_number || "—"}
                        </td>

                        <td className="p-3">
                          {formatDate(
                            payment.billed_at ||
                            payment.created_at,
                          )}
                        </td>

                        <td className="p-3 font-medium">
                          {formatMoney(
                            payment.amount,
                            payment.currency,
                          )}
                        </td>

                        <td className="p-3">
                          <span className="rounded-full bg-surface-low px-2 py-1 text-xs">
                            {payment.status}
                          </span>
                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            )}

          </Panel>

        </>

      )}

      <p className="text-xs text-muted">
        Sandbox billing environment. No real payments are collected.
      </p>

    </main>
  );
}

export function BillingPage() {
  const scope = useWorkspaceScope();

  if (!scope) {
    return (
      <div className="p-6 text-sm text-muted">
        Select a workspace to manage billing.
      </div>
    );
  }

  return (
    <BillingContent
      key={scope.workspaceId}
      workspaceId={scope.workspaceId}
    />
  );
}