
import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layouts/dashboard-shell";

import { identityFetch } from "@/lib/identity";


async function requireAuthenticatedUser() {
  let response: Response;

  try {
    response = await identityFetch(
      "me",
      { method: "GET" },
      true
    );
  } catch {
    throw new Error(
      "Identity service is currently unavailable."
    );
  }

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    redirect("/sign-in");
  }

  if (!response.ok) {
    throw new Error(
      "Unable to validate your session."
    );
  }

  return response.json();
}

export default async function WorkspaceLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal?: ReactNode;
}) { await requireAuthenticatedUser();

  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen bg-surface-low"
          aria-busy="true"
        />
      }
    >
      <>
        <DashboardShell>{children}</DashboardShell>
        {modal}
      </>
    </Suspense>
  );
}
