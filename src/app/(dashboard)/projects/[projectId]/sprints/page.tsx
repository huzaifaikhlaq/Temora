import { SprintPlanning } from "@/features/sprints/components/sprint-planning";

export default async function ProjectSprintsRoute({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <SprintPlanning projectId={projectId} />;
}
