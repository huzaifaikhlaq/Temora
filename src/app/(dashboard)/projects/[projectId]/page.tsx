import { Suspense } from "react";
import { ProjectWorkspacePage } from "@/features/projects/components/project-workspace-page";

async function ProjectOverviewContent({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectWorkspacePage projectId={projectId} mode="overview" />;
}

export default function ProjectOverviewRoute({ params }: { params: Promise<{ projectId: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted">Loading project...</div>}>
      <ProjectOverviewContent params={params} />
    </Suspense>
  );
}
