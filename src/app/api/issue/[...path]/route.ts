import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { sameOrigin, SESSION_COOKIE } from "@/lib/identity";

type Context = {
  params: Promise<{ path: string[] }>;
};

type Method = "GET" | "POST" | "PATCH" | "DELETE";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validPath(p: string[]) {
  if (
    ![5, 6, 7, 8].includes(p.length) ||
    p[0] !== "workspaces" ||
    p[2] !== "projects" ||
    p[4] !== "issues" ||
    !uuid.test(p[1]) ||
    !uuid.test(p[3])
  ) {
    return false;
  }

  if (p.length > 5 && !uuid.test(p[5])) {
    return false;
  }

  if (p.length > 6 && !["attachments", "comments"].includes(p[6])) {
    return false;
  }

  if (p.length > 7 && !uuid.test(p[7])) {
    return false;
  }

  return true;
}

function failure(detail: string, status: number) {
  return NextResponse.json(
    { detail },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

async function forward(request: NextRequest, context: Context, method: Method) {
  const { path } = await context.params;

  if (!validPath(path)) {
    return failure("Invalid issue route", 400);
  }

  const list = path.length === 5;
  const detail = path.length === 6;

  const upload = path.length === 7 && path[6] === "attachments";

  const download = path.length === 8 && path[6] === "attachments";

  const commentList = path.length === 7 && path[6] === "comments";

  const commentDetail = path.length === 8 && path[6] === "comments";

  const allowed =
    (method === "GET" && (list || detail || download || commentList)) ||
    (method === "POST" && (list || upload || commentList)) ||
    (method === "PATCH" && (detail || commentDetail)) ||
    (method === "DELETE" && (detail || download || commentDetail));

  if (!allowed) {
    return failure("Method not allowed", 405);
  }

  if (method !== "GET" && !sameOrigin(request)) {
    return failure("Forbidden origin", 403);
  }

  const session = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!session) {
    return failure("Not authenticated", 401);
  }

  const base = process.env.ISSUE_API_URL;

  if (!base) {
    return failure("ISSUE_API_URL is missing", 503);
  }

  const headers = new Headers({
    Authorization: `Bearer ${session}`,
    Accept: "application/json",
  });

  let body: BodyInit | undefined;

  if (method === "POST" || method === "PATCH") {
    if (upload) {
      const length = Number(request.headers.get("content-length") ?? "0");

      if (length > 26 * 1024 * 1024) {
        return failure("File too large", 413);
      }

      const multipart = await request.formData().catch(() => null);

      const file = multipart?.get("file");

      if (!(file instanceof File) || file.size === 0 || file.size > 25 * 1024 * 1024) {
        return failure("A file up to 25 MB is required", 400);
      }

      const form = new FormData();

      form.set("file", file);

      body = form;
    } else {
      if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
        return failure("Expected JSON", 415);
      }

      const content = await request.text();

      if (content.length > 100_000) {
        return failure("Request too large", 413);
      }

      try {
        JSON.parse(content);
      } catch {
        return failure("Invalid JSON", 400);
      }

      body = content;

      headers.set("Content-Type", "application/json");
    }
  }

  const params = new URL(request.url).searchParams;

  const query = method === "GET" && (list || commentList) ? `?${params.toString()}` : "";

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

    if (download && upstream.ok) {
      return new Response(upstream.body, {
        status: upstream.status,

        headers: {
          "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",

          "Content-Disposition": upstream.headers.get("content-disposition") ?? "attachment",

          "Cache-Control": "private, no-store",

          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    if (!upstream.headers.get("content-type")?.includes("application/json")) {
      return failure("Invalid issue service response", 502);
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
    return failure("Issue service unavailable", 503);
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
