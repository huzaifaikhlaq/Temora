
"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

import { workspaceApi } from "@/features/workspace/api/client";

function AcceptContent() {
    const params = useSearchParams();
    const router = useRouter();

    const token = params.get("token");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    async function accept() {
        if (!token) {
            setError("Invitation token is missing.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const membership =
                await workspaceApi.acceptInvitation(token);

            await workspaceApi.select(membership.workspace);

            setSuccess(true);
            router.replace("/workspaces");
            router.refresh();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to accept invitation.",
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center p-6">
            <div className="w-full max-w-md rounded-xl border border-border p-6">
                <h1 className="text-xl font-bold">
                    Join a Temora Workspace
                </h1>

                <p className="mt-3 text-sm text-muted">
                    Sign in using the invited email address before accepting.
                </p>

                {error && (
                    <p role="alert" className="mt-4 text-red-600">
                        {error}
                    </p>
                )}

                {success ? (
                    <p className="mt-4 text-green-600">
                        Invitation accepted.
                    </p>
                ) : (
                    <button
                        disabled={loading || !token}
                        onClick={accept}
                        className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 text-white disabled:opacity-50"
                    >
                        {loading ? "Joining..." : "Accept Invitation"}
                    </button>
                )}

                <Link
                    href="/sign-in"
                    className="mt-5 block text-center text-sm text-blue-600"
                >
                    Sign in
                </Link>
            </div>
        </main>
    );
}

export default function AcceptInvitationPage() {
    return (
        <Suspense fallback={<p>Loading invitation...</p>}>
            <AcceptContent />
        </Suspense>
    );
}
