import { RetrospectivePage } from "@/features/sprints/components/retrospective-page";

export default async function SprintRetrospectiveRoute({
  params,
}: {
  params: Promise<{ sprintId: string }>;
}) {
  const { sprintId } = await params;
  return <RetrospectivePage sprintId={sprintId} />;
}
