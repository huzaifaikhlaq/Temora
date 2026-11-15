import { IssueCreateForm } from "@/features/issues/components/issues-pages";

export default async function NewIssueRoute({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const params = await searchParams;
  return <IssueCreateForm initialProjectId={params.projectId ?? ""} />;
}
