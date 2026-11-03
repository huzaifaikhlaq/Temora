import { BurndownReport } from "@/features/sprints/components/burndown-report";

export default async function SprintBurndownRoute({
  params,
}: {
  params: Promise<{ sprintId: string }>;
}) {
  const { sprintId } = await params;
  return <BurndownReport sprintId={sprintId} />;
}
