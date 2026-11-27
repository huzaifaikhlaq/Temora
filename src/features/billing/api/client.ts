import type { Plan, PlanCode, Subscription, Payment, CheckoutResponse } from "../types/billing";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/billing/${path}`, {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : "Billing request failed.");
  }

  return data as T;
}

function workspacePath(workspaceId: string, action: string) {
  return `workspaces/${workspaceId}/${action}`;
}

export const billingApi = {
  plans() {
    return request<Plan[]>("plans");
  },

  subscription(workspaceId: string) {
    return request<Subscription>(workspacePath(workspaceId, "subscription"));
  },

  invoices(workspaceId: string) {
    return request<Payment[]>(workspacePath(workspaceId, "invoices"));
  },

  checkout(workspaceId: string, plan: PlanCode) {
    return request<CheckoutResponse>(workspacePath(workspaceId, "checkout"), {
      method: "POST",
      body: JSON.stringify({ plan }),
    });
  },

  cancelCheckout(workspaceId: string) {
    return request<{ message: string }>(workspacePath(workspaceId, "checkout/cancel"), {
      method: "POST",
      body: "{}",
    });
  },

  cancel(workspaceId: string) {
    return request<Subscription>(workspacePath(workspaceId, "cancel"), {
      method: "POST",
      body: "{}",
    });
  },

  resume(workspaceId: string) {
    return request<Subscription>(workspacePath(workspaceId, "resume"), {
      method: "POST",
      body: "{}",
    });
  },
};
