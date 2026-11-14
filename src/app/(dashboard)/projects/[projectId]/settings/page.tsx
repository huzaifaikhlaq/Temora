import { Suspense } from "react";
import { ProjectWorkspacePage } from "@/features/projects/components/project-workspace-page";

async function ProjectSettingsContent({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectWorkspacePage projectId={projectId} mode="settings" />;
}

export default function ProjectSettingsRoute({ params }: { params: Promise<{ projectId: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted">Loading project...</div>}>
      <ProjectSettingsContent params={params} />
    </Suspense>
  );
}
