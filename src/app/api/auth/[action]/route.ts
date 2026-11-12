import { NextRequest, NextResponse } from "next/server";

import { identityFetch, sameOrigin, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/identity";

type RouteContext = { params: Promise<{ action: string }> };

const POST_ACTIONS = new Set([
  "register",
  "login",
  "logout",
  "forgot-password",
  "verify-email",
  "reset-password",
]);
const ACTIVE_WORKSPACE_COOKIE = "temora_active_workspace";

function jsonResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function errorResponse(detail: string, status: number): NextResponse {
  return jsonResponse({ detail }, status);
}

// Read Django's JSON response.

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid upstream JSON");
  }
}

// Ensure credentials never reach frontend JavaScript.

function safePayload(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(safePayload);
  }

  if (data !== null && typeof data === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (["token", "access_token", "refresh_token", "id_token"].includes(key.toLowerCase())) {
        continue;
      }

      result[key] = safePayload(value);
    }

    return result;
  }

  return data;
}

// GET /api/auth/me

export async function GET(request: NextRequest, context: RouteContext) {
  const { action } = await context.params;

  if (action !== "me") {
    return errorResponse("Not found", 404);
  }

  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    return errorResponse("Not authenticated", 401);
  }

  try {
    const upstream = await identityFetch("me", { method: "GET" }, true);

    const body = await readPayload(upstream);

    const response = jsonResponse(safePayload(body), upstream.status);

    if (upstream.status === 401 || upstream.status === 403) {
      response.cookies.delete(SESSION_COOKIE);
      response.cookies.delete(ACTIVE_WORKSPACE_COOKIE);
    }

    return response;
  } catch {
    return errorResponse("Identity service unavailable", 503);
  }
}

// POST /api/auth/[action]

export async function POST(request: NextRequest, context: RouteContext) {
  const { action } = await context.params;

  if (!POST_ACTIONS.has(action)) {
    return errorResponse("Not found", 404);
  }

  // Protect cookie-authenticated endpoints
  // against cross-origin requests.

  if (!sameOrigin(request)) {
    return errorResponse("Forbidden origin", 403);
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.split(";")[0].trim().toLowerCase() !== "application/json") {
    return errorResponse("Expected JSON", 415);
  }

  let data: unknown;

  try {
    data = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return errorResponse("Expected JSON object", 400);
  }

  // Logout is idempotent from the browser's
  // perspective: always remove the local cookie.

  if (action === "logout") {
    try {
      const upstream = await identityFetch(
        "logout",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
        true,
      );

      const successful = upstream.ok || upstream.status === 401 || upstream.status === 403;

      const response = successful
        ? new NextResponse(null, {
            status: 204,
            headers: {
              "Cache-Control": "no-store",
            },
          })
        : errorResponse("Unable to revoke remote session", 502);

      response.cookies.delete(SESSION_COOKIE);
      response.cookies.delete(ACTIVE_WORKSPACE_COOKIE);

      return response;
    } catch {
      const response = errorResponse("Identity service unavailable", 503);

      response.cookies.delete(SESSION_COOKIE);

      return response;
    }
  }

  try {
    const upstream = await identityFetch(action, {
      method: "POST",
      body: JSON.stringify(data),
    });

    const body = await readPayload(upstream);

    // Handle successful login.

    if ((action === "login" || action === "verify-email") && upstream.ok) {
      if (body === null || typeof body !== "object" || Array.isArray(body)) {
        return errorResponse("Invalid identity response", 502);
      }

      const parsed = body as {
        token?: unknown;
        user?: unknown;
        expires_in?: unknown;
      };

      if (typeof parsed.token !== "string" || parsed.token.length < 20) {
        return errorResponse("Invalid identity session token", 502);
      }

      const expiresIn =
        typeof parsed.expires_in === "number" &&
        Number.isFinite(parsed.expires_in) &&
        parsed.expires_in > 0
          ? Math.floor(parsed.expires_in)
          : SESSION_MAX_AGE;

      const maxAge = Math.min(expiresIn, SESSION_MAX_AGE);

      const response = jsonResponse(
        {
          user: parsed.user,
          expires_in: maxAge,
        },
        upstream.status,
      );

      response.cookies.set(SESSION_COOKIE, parsed.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge,
      });

      return response;
    }

    // Handle all other actions safely.

    if (upstream.status === 204) {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    const response = jsonResponse(safePayload(body), upstream.status);

    // Django revokes all sessions after a
    // successful password reset.

    if (action === "reset-password" && upstream.ok) {
      response.cookies.delete(SESSION_COOKIE);
      response.cookies.delete(ACTIVE_WORKSPACE_COOKIE);
    }

    return response;
  } catch {
    return errorResponse("Identity service unavailable", 503);
  }
}