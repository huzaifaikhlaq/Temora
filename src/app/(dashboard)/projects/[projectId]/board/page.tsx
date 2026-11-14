import { Suspense } from "react";
import { ProjectBoardPage } from "@/features/projects/components/project-board-page";

async function ProjectBoardContent({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectBoardPage projectId={projectId} />;
}

export default function ProjectBoardRoute({ params }: { params: Promise<{ projectId: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted">Loading project...</div>}>
      <ProjectBoardContent params={params} />
    </Suspense>
  );
}
