import { Suspense } from "react";
import { RoadmapView } from "@/features/projects/components/roadmap-view";

async function ProjectRoadmapContent({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <RoadmapView projectId={projectId} />;
}

export default function ProjectRoadmapRoute({ params }: { params: Promise<{ projectId: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted">Loading project...</div>}>
      <ProjectRoadmapContent params={params} />
    </Suspense>
  );
}
