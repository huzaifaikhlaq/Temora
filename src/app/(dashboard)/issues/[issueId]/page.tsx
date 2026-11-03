import { IssueDetailPage } from "@/features/issues/components/issue-detail-page";

export default async function IssueRoute({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params;
  return <IssueDetailPage key={issueId} issueId={issueId} />;
}
