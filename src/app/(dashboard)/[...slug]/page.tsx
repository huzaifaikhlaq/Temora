import { notFound } from "next/navigation";
import { AdditionalPage } from "@/features/workspace/components/additional-pages";

const routes: Record<
  string,
  | "projects"
  | "billing"
  | "members"
  | "inbox"
  | "integrations"
  | "reports"
  | "calendar"
  | "settings"
  | "empty"
  | "not-found"
  | "forbidden"
  | "burndown"
  | "complete-sprint"
  | "roles"
  | "retrospective"
  | "automation"
  | "audit"
> = {
  projects: "projects",
  billing: "billing",
  "reports/sprints/24": "burndown",
  "sprints/24/complete": "complete-sprint",
  "sprints/24/retrospective": "retrospective",
  roles: "roles",
  "settings/automation": "automation",
  "security/audit-logs": "audit",
  members: "members",
  inbox: "inbox",
  integrations: "integrations",
  reports: "reports",
  calendar: "calendar",
  settings: "settings",
  "projects/new": "empty",
  "not-found": "not-found",
  forbidden: "forbidden",
};

export default async function WorkspacePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const kind = routes[slug.join("/")];
  if (!kind) notFound();
  return <AdditionalPage kind={kind} />;
}
