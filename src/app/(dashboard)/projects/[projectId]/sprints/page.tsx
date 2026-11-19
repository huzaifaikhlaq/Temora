import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SprintPlanning } from
  "@/features/sprints/components/sprint-planning";

async function SprintContent({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const workspaceId = (await cookies())
    .get("temora_active_workspace")?.value;

  if (!workspaceId) {
    redirect("/workspace/select");
  }

  return (
    <SprintPlanning
      workspaceId={workspaceId}
      projectId={projectId}
    />
  );
}

export default function ProjectSprintsRoute({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <SprintContent params={params} />
    </Suspense>
  );
}