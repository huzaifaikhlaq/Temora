import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/identity";

export async function issueFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const baseUrl = process.env.ISSUE_API_URL;
  if (!baseUrl) throw new Error("ISSUE_API_URL is required");
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!session) return Response.json({ detail: "Not authenticated" }, { status: 401 });
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${session}`);
  return fetch(`${baseUrl.replace(/\/$/, "")}/api/${path.replace(/^\/|\/$/g, "")}/`, {
    ...options,
    headers,
    cache: "no-store",
    redirect: "manual",
  });
}
