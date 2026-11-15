import { IssueDetailPage } from "@/features/issues/components/issues-pages";

export default async function IssueRoute({ params }: { params: Promise<{ projectId: string; issueId: string }> }) {
  const { projectId, issueId } = await params;
  return <IssueDetailPage projectId={projectId} issueId={issueId} />;
}
