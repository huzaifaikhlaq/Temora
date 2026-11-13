
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  authClient,
} from "@/features/authentication/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;

    setLoading(true);

    try {
      await authClient.logout();
    } catch (error) {
      console.error(
        "Server-side logout could not be confirmed:",
        error
      );
    } finally {
      // The current BFF clears the browser cookie
      // even if server-side revocation fails.
      router.replace("/sign-in");
      router.refresh();

      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      role="menuitem"
      onClick={handleLogout}
      disabled={loading}
      className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
