
import { NextRequest, NextResponse } from "next/server";

import { sameOrigin, SESSION_COOKIE } from "@/lib/identity";
import { projectFetch } from "@/lib/project";

type Context = {
  params: Promise<{ path: string[] }>;
};

type Method = "GET" | "POST" | "PATCH";

function errorResponse(detail: string, status: number) {
  return NextResponse.json(
    { detail },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function validPath(parts: string[]): boolean {
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (
    parts.length < 3 ||
    parts.length > 5 ||
    parts[0] !== "workspaces" ||
    parts[2] !== "projects" ||
    !uuid.test(parts[1])
  ) {
    return false;
  }

  if (parts.length >= 4 && !uuid.test(parts[3])) {
    return false;
  }

  if (
    parts.length === 5 &&
    !["archive", "restore"].includes(parts[4])
  ) {
    return false;
  }

  return true;
}

async function forward(
  request: NextRequest,
  context: Context,
  method: Method,
) {
  const { path } = await context.params;

  if (!validPath(path)) {
    return errorResponse("Invalid project path.", 400);
  }

  if (method !== "GET" && !sameOrigin(request)) {
    return errorResponse("Forbidden origin.", 403);
  }

  let body: string | undefined;

  if (method === "POST" || method === "PATCH") {
    const contentType = request.headers
      .get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();

    if (contentType !== "application/json") {
      return errorResponse("Expected JSON.", 415);
    }

    try {
      body = await request.text();

      if (body.length > 65536) {
        return errorResponse("Request too large.", 413);
      }

      JSON.parse(body);
    } catch {
      return errorResponse("Invalid JSON.", 400);
    }
  }

  try {
    const upstream = await projectFetch(
      path.join("/"),
      {
        method,
        body,
      },
    );

    if (upstream.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const contentType = upstream.headers.get("content-type");

    if (!contentType?.includes("application/json")) {
      return errorResponse("Invalid project response.", 502);
    }

    const response = new NextResponse(
      await upstream.text(),
      {
        status: upstream.status,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );

    if (upstream.status === 401) {
      response.cookies.delete(SESSION_COOKIE);
      response.cookies.delete("temora_active_workspace");
    }

    return response;
  } catch {
    return errorResponse(
      "Project service unavailable.",
      503,
    );
  }
}

export async function GET(
  request: NextRequest,
  context: Context,
) {
  return forward(request, context, "GET");
}

export async function POST(
  request: NextRequest,
  context: Context,
) {
  return forward(request, context, "POST");
}

export async function PATCH(
  request: NextRequest,
  context: Context,
) {
  return forward(request, context, "PATCH");
}