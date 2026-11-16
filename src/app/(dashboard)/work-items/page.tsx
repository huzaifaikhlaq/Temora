import { Suspense } from "react";
import { WorkItemsDirectory } from "@/features/issues/components/work-items-directory";

export default function WorkItemsPage() {
  return <Suspense fallback={<div className="mx-auto max-w-[1500px] animate-pulse p-8" aria-busy="true"><div className="h-8 w-48 rounded bg-surface-high" /><div className="mt-6 h-64 rounded-xl bg-white" /></div>}><WorkItemsDirectory /></Suspense>;
}
