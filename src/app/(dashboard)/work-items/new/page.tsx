import { Suspense } from "react";
import { TaskCreateForm } from "@/features/tasks/components/task-create-form";

export default function NewWorkItemPage() {
  return <Suspense fallback={<div className="mx-auto max-w-6xl animate-pulse p-8" aria-busy="true"><div className="h-8 w-64 rounded bg-surface-high" /><div className="mt-6 h-[600px] rounded-xl bg-white" /></div>}><TaskCreateForm /></Suspense>;
}
