import { IssueDependenciesPage } from "@/features/issues/components/issue-dependencies-page";

export default async function IssueDependenciesRoute({
  params,
}: {
  params: Promise<{ issueId: string }>;
}) {
  const { issueId } = await params;
  return <IssueDependenciesPage issueId={issueId} />;
}
