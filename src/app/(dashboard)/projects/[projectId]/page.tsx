import { ProjectWorkspacePage } from "@/features/projects/components/project-workspace-page";

export default async function ProjectOverviewRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectWorkspacePage projectId={projectId} mode="overview" />;
}
