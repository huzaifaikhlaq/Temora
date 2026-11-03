import { RoadmapView } from "@/features/projects/components/roadmap-view";

export default async function ProjectRoadmapRoute({ params }: { params: Promise<{ projectId: string }> }) {
  await params;
  return <RoadmapView />;
}
