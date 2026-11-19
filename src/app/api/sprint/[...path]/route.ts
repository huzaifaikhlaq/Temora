import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { sameOrigin, SESSION_COOKIE } from "@/lib/identity";

type Context = {
  params: Promise<{ path: string[] }>;
};

type Method = "GET" | "POST" | "PATCH" | "DELETE";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validPath(parts: string[], method: Method) {
  if (
    parts.length === 5 &&
    parts[0] === "workspaces" &&
    uuid.test(parts[1]) &&
    parts[2] === "projects" &&
    uuid.test(parts[3]) &&
    parts[4] === "sprints"
  ) {
    return method === "GET" || method === "POST";
  }

  if (parts[0] !== "sprints" || !uuid.test(parts[1])) {
    return false;
  }

  if (parts.length === 2) {
    return method === "GET" || method === "PATCH";
  }

  if (parts.length === 3) {
    const read = ["metrics", "complete", "retrospective", "burndown", "report"];

    const write = ["start", "complete", "notes", "check-in", "burndown", "themes"];

    return (
      (method === "GET" && read.includes(parts[2])) ||
      (method === "POST" && write.includes(parts[2]))
    );
  }

  if (parts.length === 4 && parts[2] === "notes" && uuid.test(parts[3])) {
    return method === "PATCH" || method === "DELETE";
  }

  if (parts.length === 5 && parts[2] === "notes" && uuid.test(parts[3])) {
    if (parts[4] === "vote") {
      return method === "POST" || method === "DELETE";
    }

    if (parts[4] === "comments") {
      return method === "POST";
    }
  }

  return false;
}

function failure(detail: string, status: number) {
  return NextResponse.json(
    { detail },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

async function forward(request: NextRequest, context: Context, method: Method) {
  const { path } = await context.params;

  if (!validPath(path, method)) {
    return failure("Invalid sprint route", 400);
  }

  if (method !== "GET" && !sameOrigin(request)) {
    return failure("Forbidden origin", 403);
  }

  const session = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!session) {
    return failure("Not authenticated", 401);
  }

  const base = process.env.SPRINT_API_URL;

  if (!base) {
    return failure("SPRINT_API_URL is missing", 503);
  }

  const headers = new Headers({
    Authorization: `Bearer ${session}`,
    Accept: "application/json, application/pdf, text/markdown",
  });

  let body: string | undefined;

  if (method === "POST" || method === "PATCH") {
    const contentType = request.headers.get("content-type")?.split(";")[0]?.trim()?.toLowerCase();

    if (contentType !== "application/json") {
      return failure("Expected JSON", 415);
    }

    try {
      body = await request.text();

      if (body.length > 100_000) {
        return failure("Request too large", 413);
      }

      JSON.parse(body);
    } catch {
      return failure("Invalid JSON", 400);
    }

    headers.set("Content-Type", "application/json");
  }

  const params = new URL(request.url).searchParams;

  const query = method === "GET" ? `?${params.toString()}` : "";

  const url = `${base.replace(/\/$/, "")}` + `/api/${path.join("/")}/${query}`;

  try {
    const upstream = await fetch(url, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });

    if (upstream.status === 204) {
      return new NextResponse(null, {
        status: 204,
      });
    }

    const type = upstream.headers.get("content-type") ?? "";

    const isReport = method === "GET" && path[2] === "report" && upstream.ok;

    if (isReport && (type.includes("application/pdf") || type.includes("text/markdown"))) {
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          "Content-Type": type,
          "Content-Disposition": upstream.headers.get("content-disposition") ?? "attachment",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    if (!type.includes("application/json")) {
      return failure("Invalid sprint service response", 502);
    }

    const response = new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });

    if (upstream.status === 401) {
      response.cookies.delete(SESSION_COOKIE);
      response.cookies.delete("temora_active_workspace");
    }

    return response;
  } catch {
    return failure("Sprint service unavailable", 503);
  }
}

export async function GET(request: NextRequest, context: Context) {
  return forward(request, context, "GET");
}

export async function POST(request: NextRequest, context: Context) {
  return forward(request, context, "POST");
}

export async function PATCH(request: NextRequest, context: Context) {
  return forward(request, context, "PATCH");
}

export async function DELETE(request: NextRequest, context: Context) {
  return forward(request, context, "DELETE");
}
