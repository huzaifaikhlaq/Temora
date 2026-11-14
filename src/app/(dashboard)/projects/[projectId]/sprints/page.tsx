import { Suspense } from "react";
import { SprintPlanning } from "@/features/sprints/components/sprint-planning";

async function ProjectSprintsContent({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <SprintPlanning projectId={projectId} />;
}

export default function ProjectSprintsRoute({ params }: { params: Promise<{ projectId: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted">Loading project...</div>}>
      <ProjectSprintsContent params={params} />
    </Suspense>
  );
}
