import { TaskDependenciesPage } from "@/features/tasks/components/task-dependencies-page";

export default async function TaskDependenciesRoute({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  return <TaskDependenciesPage taskId={taskId} />;
}
