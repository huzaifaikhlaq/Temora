export type PlanCode = "free" | "pro" | "team" | "enterprise";

export type Plan = {
  id: string;

  code: PlanCode;

  name: string;

  description: string;

  monthly_price: number | null;

  currency: string;

  max_members: number | null;

  max_projects: number | null;

  max_issues: number | null;

  checkout_available: boolean;
};

export type SubscriptionStatus =
  "free" | "trialing" | "active" | "past_due" | "paused" | "canceled";

export type Subscription = {
  id: string;

  workspace_id: string;

  plan: Plan;

  effective_plan: Plan;

  status: SubscriptionStatus;

  current_period_start: string | null;

  current_period_end: string | null;

  cancel_at_period_end: boolean;

  has_paid_subscription: boolean;

  can_manage: boolean;

  pending_checkout: {
    plan: PlanCode;

    status: "creating" | "open";
  } | null;

  created_at: string;

  updated_at: string;
};

export type Payment = {
  id: string;

  invoice_number: string;

  amount: number;

  currency: string;

  status: string;

  billed_at: string | null;

  created_at: string;
};

export type CheckoutResponse = {
  checkout_id: string;

  transaction_id: string;

  checkout_url: string;
};
