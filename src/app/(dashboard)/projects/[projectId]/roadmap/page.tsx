import { RoadmapView } from "@/features/projects/components/roadmap-view";

export default async function ProjectRoadmapRoute({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <RoadmapView projectId={projectId} />;
}
