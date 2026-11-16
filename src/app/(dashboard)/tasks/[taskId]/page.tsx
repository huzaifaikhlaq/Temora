import { LegacyTaskResolver } from "@/features/issues/components/legacy-task-resolver";

export default async function TaskRoute({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  return <LegacyTaskResolver taskId={taskId} />;
}
