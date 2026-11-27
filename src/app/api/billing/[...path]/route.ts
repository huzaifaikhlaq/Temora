import { NextRequest, NextResponse } from "next/server";

import { sameOrigin } from "@/lib/identity";
import { billingFetch } from "@/lib/billing";

type Context = {
  params: Promise<{ path: string[] }>;
};

function json(detail: string, status: number) {
  return NextResponse.json(
    { detail },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

async function forward(
  request: NextRequest,
  context: Context,
  method: "GET" | "POST",
) {
  const { path } = await context.params;

  if (
    path.length === 0 ||
    path.length > 5 ||
    !path.every((part) => /^[a-zA-Z0-9_-]{1,100}$/.test(part))
  ) {
    return json("Invalid billing path", 400);
  }

  if (method === "POST" && !sameOrigin(request)) {
    return json("Forbidden origin", 403);
  }

  let body: string | undefined;

  if (method === "POST") {
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
      if (body.length > 65536) return json("Request too large", 413);
      JSON.parse(body);
    } catch {
      return json("Invalid JSON", 400);
    }
  }

  try {
    const upstream = await billingFetch(path.join("/"), { method, body });
    const contentType = upstream.headers.get("content-type");

    if (!contentType?.includes("application/json")) {
      return json("Invalid billing response", 502);
    }

    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return json("Billing service unavailable", 503);
  }
}

export async function GET(request: NextRequest, context: Context) {
  return forward(request, context, "GET");
}

export async function POST(request: NextRequest, context: Context) {
  return forward(request, context, "POST");
}
