import { SprintCompletionPanel } from "@/features/sprints/components/sprint-completion-panel";

export default async function CompleteSprintRoute({
  params,
}: {
  params: Promise<{ sprintId: string }>;
}) {
  const { sprintId } = await params;
  return <SprintCompletionPanel sprintId={sprintId} />;
}
