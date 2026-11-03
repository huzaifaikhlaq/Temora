"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TaskCreateForm } from "@/features/tasks/components/task-create-form";

export function TaskCreateModal() {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") router.back();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) router.back();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-create-title"
        className="max-h-[calc(100vh-1.5rem)] w-full max-w-6xl overflow-y-auto rounded-2xl border border-border bg-surface-low shadow-2xl sm:max-h-[calc(100vh-3rem)]"
      >
        <TaskCreateForm modal />
      </section>
    </div>
  );
}
