import "server-only";

import { cookies } from "next/headers";

import { SESSION_COOKIE } from "@/lib/identity";

function billingBaseUrl(): string {
  const url = process.env.BILLING_API_URL;

  if (!url) {
    throw new Error("BILLING_API_URL is required");
  }

  return url.replace(/\/$/, "");
}

export async function billingFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!session) {
    return Response.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");

  headers.set("Content-Type", "application/json");

  headers.set("Authorization", `Bearer ${session}`);

  return fetch(`${billingBaseUrl()}/api/${path.replace(/^\/|\/$/g, "")}/`, {
    ...options,
    headers,
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(60000),
  });
}
