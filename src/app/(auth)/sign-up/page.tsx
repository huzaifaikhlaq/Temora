import { Suspense } from "react";

import { AuthPage } from "@/features/workspace/components/auth-pages";

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7f8fc]" />}>
      <AuthPage mode="sign-up" />
    </Suspense>
  );
}