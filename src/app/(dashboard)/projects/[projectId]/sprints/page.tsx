import { SprintPlanning } from "@/features/sprints/components/sprint-planning";

export default async function ProjectSprintsRoute({ params }: { params: Promise<{ projectId: string }> }) {
  await params;
  return <SprintPlanning />;
}
