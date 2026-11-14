
import "server-only";

import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/identity";

function projectBaseUrl(): string {
  const url = process.env.PROJECT_API_URL;

  if (!url) {
    throw new Error("PROJECT_API_URL is required");
  }

  return url.replace(/\/$/, "");
}

export async function projectFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!session) {
    return new Response(
      JSON.stringify({ detail: "Not authenticated" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${session}`);

  return fetch(
    `${projectBaseUrl()}/api/${path.replace(/^\/|\/$/g, "")}/`,
    {
      ...options,
      headers,
      cache: "no-store",
      redirect: "manual",
    },
  );
}