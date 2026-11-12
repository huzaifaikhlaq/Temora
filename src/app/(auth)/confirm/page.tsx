
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { authClient } from
    "@/features/authentication/lib/auth-client";

export default function ConfirmEmailCallback() {
    const started = useRef(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (started.current) return;
        started.current = true;

        const params = new URLSearchParams(
            window.location.hash.slice(1)
        );

        const token = params.get("token");

        // Remove the secret from the visible URL.
        window.history.replaceState(
            window.history.state,
            "",
            window.location.pathname
        );

        if (!token) {
            setError("Verification link is missing.");
            return;
        }

        async function confirm() {
            try {
                await authClient.verifyEmail(token!);

                // The BFF has now set the HttpOnly
                // session cookie.
                window.location.replace("/workspace/select");
            } catch (cause) {
                setError(
                    cause instanceof Error
                        ? cause.message
                        : "Unable to verify your email."
                );
            }
        }

        void confirm();
    }, []);

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc] px-4">
            {error ? (
                <div className="max-w-md rounded-xl bg-white p-8 text-center shadow">
                    <h1 className="text-xl font-bold">
                        Unable to complete verification
                    </h1>

                    <p className="mt-3 text-sm text-red-600">
                        {error}
                    </p>

                    <Link
                        href="/sign-in"
                        className="mt-5 inline-block text-violet-700"
                    >
                        Return to sign in
                    </Link>
                </div>
            ) : (
                <p className="text-sm text-slate-600">
                    Completing your Temora sign up...
                </p>
            )}
        </main>
    );
}
