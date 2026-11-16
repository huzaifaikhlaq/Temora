import { LegacyTaskDependencies } from "@/features/issues/components/legacy-task-dependencies";

export default async function TaskDependenciesRoute({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  return <LegacyTaskDependencies taskId={taskId} />;
}
