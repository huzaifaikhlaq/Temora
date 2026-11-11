import "server-only";

import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/identity";

function workspaceBaseUrl(): string {
  const url = process.env.WORKSPACE_API_URL;

  if (!url) {
    throw new Error("WORKSPACE_API_URL is required");
  }

  return url.replace(/\/$/, "");
}

export async function workspaceFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!session) {
    return new Response(JSON.stringify({ detail: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${session}`);

  return fetch(`${workspaceBaseUrl()}/api/${path.replace(/^\/|\/$/g, "")}/`, {
    ...options,
    headers,
    cache: "no-store",
    redirect: "manual",
  });
}
