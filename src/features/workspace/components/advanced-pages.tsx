import { AuditPreview } from "@/features/settings/components/audit-preview";
import { AutomationRulesPage } from "@/features/settings/components/automation-rules-page";
import { PermissionsMatrix } from "@/features/members/components/permissions-matrix";

export type AdvancedPageKind = "roles" | "automation" | "audit";

export function AdvancedPage({ kind }: { kind: AdvancedPageKind }) {
  if (kind === "roles") return <PermissionsMatrix />;
  if (kind === "automation") return <AutomationRulesPage />;
  return <AuditPreview />;
}
