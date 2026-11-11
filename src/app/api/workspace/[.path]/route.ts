
import { NextRequest, NextResponse } from "next/server";

import { sameOrigin } from "@/lib/identity";
import { workspaceFetch } from "@/lib/workspace";

type Context = {
  params: Promise<{ path: string[] }>;
};

const ACTIVE_COOKIE = "temora_active_workspace";

function json(detail: string, status: number) {
  return NextResponse.json(
    { detail },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function validPath(parts: string[]) {
  return (
    parts.length > 0 &&
    parts.length <= 5 &&
    parts.every((part) =>
      /^[a-zA-Z0-9_-]{1,100}$/.test(part),
    )
  );
}

async function forward(
  request: NextRequest,
  context: Context,
  method: "GET" | "POST" | "PATCH" | "DELETE",
) {
  const { path } = await context.params;

  if (!validPath(path)) {
    return json("Invalid path", 400);
  }

  if (method !== "GET") {
    if (!sameOrigin(request)) {
      return json("Forbidden origin", 403);
    }
  }

  // Workspace selection is BFF-only.
  if (path.join("/") === "selection") {
    if (method === "GET") {
      return NextResponse.json({
        workspace_id:
          request.cookies.get(ACTIVE_COOKIE)?.value ?? null,
      });
    }

    if (method === "DELETE") {
      const result = new NextResponse(null, { status: 204 });
      result.cookies.delete(ACTIVE_COOKIE);
      return result;
    }

    if (method !== "POST") {
      return json("Method not allowed", 405);
    }

    let payload: { workspace_id?: unknown };

    try {
      payload = await request.json();
    } catch {
      return json("Invalid JSON", 400);
    }

    if (
      !payload ||
      typeof payload.workspace_id !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(payload.workspace_id)
    ) {
      return json("Invalid workspace ID", 400);
    }

    // Never trust the workspace ID supplied by the browser.
    const membershipCheck = await workspaceFetch(
      `workspaces/${payload.workspace_id}`,
      { method: "GET" },
    );

    if (!membershipCheck.ok) {
      return json(
        membershipCheck.status === 404
          ? "Workspace not found"
          : "Unable to select workspace",
        membershipCheck.status === 404 ? 404 : 403,
      );
    }

    const response = NextResponse.json({
      workspace_id: payload.workspace_id,
    });

    response.cookies.set(
      ACTIVE_COOKIE,
      payload.workspace_id,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      },
    );

    return response;
  }

  // Keep the browser request small and JSON-only.
  let body: string | undefined;

  if (method === "POST" || method === "PATCH") {
    const contentType = request.headers
      .get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();

    if (contentType !== "application/json") {
      return json("Expected JSON", 415);
    }

    try {
      body = await request.text();

      if (body.length > 65536) {
        return json("Request too large", 413);
      }

      JSON.parse(body);
    } catch {
      return json("Invalid JSON", 400);
    }
  }

  try {
    const upstream = await workspaceFetch(
      path.join("/"),
      {
        method,
        body,
      },
    );

    if (upstream.status === 204) {
      return new NextResponse(null, {
        status: 204,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const contentType = upstream.headers.get(
      "content-type",
    );

    if (!contentType?.includes("application/json")) {
      return json("Invalid workspace response", 502);
    }

    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return json("Workspace service unavailable", 503);
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

export async function DELETE(
  request: NextRequest,
  context: Context,
) {
  return forward(request, context, "DELETE");
}
