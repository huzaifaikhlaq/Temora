import type { WorkspaceMember } from "./types";

export function workspaceMemberLabel(member: WorkspaceMember) {
  const displayName =
    member.display_name?.trim() ||
    member.full_name?.trim() ||
    member.name?.trim() ||
    member.email?.trim();

  return displayName || "Member " + member.user_id.slice(0, 8);
}
