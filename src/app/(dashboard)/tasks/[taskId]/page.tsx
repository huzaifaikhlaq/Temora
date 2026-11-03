import { TaskDetailPage } from "@/features/tasks/components/task-detail-page";

export default async function TaskRoute({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  return <TaskDetailPage key={taskId} taskId={taskId} />;
}
