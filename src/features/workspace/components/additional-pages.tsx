import { ApplicationStatePage } from "@/features/application-state/components/application-state-page";
import { BillingPage } from "@/features/billing/components/billing-page";
import { CalendarPage } from "@/features/calendar/components/calendar-page";
import { IntegrationsPage } from "@/features/integrations/components/integrations-page";
import { ReportsPage } from "@/features/analytics/components/reports-page";
import { ProjectsDirectory } from "@/features/projects/components/projects-directory";
import { MembersDirectory } from "@/features/members/components/members-directory";
import { InboxPage } from "@/features/notifications/components/inbox-page";
import { AdvancedPage } from "@/features/workspace/components/advanced-pages";
import { WorkspaceSettingsPage } from "@/features/settings/components/workspace-settings-page";

export type AdditionalPageKind =
  | "projects"
  | "billing"
  | "members"
  | "inbox"
  | "integrations"
  | "reports"
  | "calendar"
  | "settings"
  | "not-found"
  | "forbidden"
  | "roles"
  | "automation"
  | "audit";

export function AdditionalPage({ kind }: { kind: AdditionalPageKind }) {
  switch (kind) {
    case "projects":
      return <ProjectsDirectory />;
    case "billing":
      return <BillingPage />;
    case "members":
      return <MembersDirectory />;
    case "inbox":
      return <InboxPage />;
    case "integrations":
      return <IntegrationsPage />;
    case "reports":
      return <ReportsPage />;
    case "calendar":
      return <CalendarPage />;
    case "settings":
      return <WorkspaceSettingsPage />;
    case "roles":
    case "automation":
    case "audit":
      return <AdvancedPage kind={kind} />;
    case "not-found":
    case "forbidden":
      return <ApplicationStatePage stateKind={kind} />;
  }
}
