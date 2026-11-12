export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  email_verified: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  expires_in: number;
}

export interface MessageResponse {
  message: string;
}

type AuthAction =
  "register" | "login" | "logout" | "forgot-password" | "verify-email" | "reset-password";

type ApiError = {
  detail?: string;
  message?: string;
  [key: string]: unknown;
};

export class AuthApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

function errorMessage(data: ApiError): string {
  if (typeof data.detail === "string") {
    return data.detail;
  }

  const first = Object.entries(data)[0];

  if (first) {
    const [field, value] = first;

    if (Array.isArray(value)) {
      return `${field}: ${value.join(", ")}`;
    }

    if (typeof value === "string") {
      return `${field}: ${value}`;
    }
  }

  return "Request failed. Please try again.";
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    throw new AuthApiError("Invalid response from server.", 502);
  }
}

async function request<T>(action: AuthAction | "me", options: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`/api/auth/${action}`, {
      ...options,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new AuthApiError("Unable to connect to the server.", 503);
  }

  const data = await parseJson(response);

  if (!response.ok) {
    const error = (data && typeof data === "object" ? data : {}) as ApiError;

    throw new AuthApiError(errorMessage(error), response.status);
  }

  return data as T;
}

function post<T>(action: AuthAction, data: Record<string, unknown> = {}) {
  return request<T>(action, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export const authClient = {
  register(data: { full_name: string; email: string; password: string }) {
    return post<MessageResponse>("register", data);
  },

  login(data: { email: string; password: string }) {
    return post<AuthResponse>("login", data);
  },

  logout() {
    return post<void>("logout");
  },

  me() {
    return request<{ user: AuthUser }>("me", {
      method: "GET",
    });
  },

  forgotPassword(email: string) {
    return post<MessageResponse>("forgot-password", { email });
  },

  verifyEmail(token: string) {
  return post<AuthResponse>("verify-email", { token });
},

  resetPassword(token: string, password: string) {
    return post<MessageResponse>("reset-password", { token, password });
  },
};
