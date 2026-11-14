import { Suspense } from "react";
import { ProjectWorkspacePage } from "@/features/projects/components/project-workspace-page";

async function ProjectMembersContent({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectWorkspacePage projectId={projectId} mode="members" />;
}

export default function ProjectMembersRoute({ params }: { params: Promise<{ projectId: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted">Loading project...</div>}>
      <ProjectMembersContent params={params} />
    </Suspense>
  );
}
