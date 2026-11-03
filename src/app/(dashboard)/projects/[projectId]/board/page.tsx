import { ProjectBoardPage } from "@/features/projects/components/project-board-page";

export default async function ProjectBoardRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectBoardPage projectId={projectId} />;
}
