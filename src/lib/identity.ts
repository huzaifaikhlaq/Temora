import "server-only";

import { cookies } from "next/headers";

export const SESSION_COOKIE = "temora_session";

export const SESSION_MAX_AGE = 60 * 24 * 60 * 60;

export function identityBaseUrl(): string {
  const base = process.env.IDENTITY_API_URL;

  if (!base) {
    throw new Error("IDENTITY_API_URL is required");
  }

  return base.replace(/\/$/, "");
}

export async function identityFetch(
  path: string,
  options: RequestInit = {},
  includeSession = false,
): Promise<Response> {
  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");

  if (includeSession) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return fetch(`${identityBaseUrl()}/api/auth/${path}/`, {
    ...options,
    headers,
    cache: "no-store",
    redirect: "manual",
  });
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");

  const site = request.headers.get("sec-fetch-site");

  return origin === new URL(request.url).origin && (!site || site === "same-origin");
}
