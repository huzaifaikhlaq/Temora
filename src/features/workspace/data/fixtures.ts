import { createInitialDemoState } from "@/features/workspace/data/seed";
import type { Priority, WorkStatus } from "@/features/workspace/data/model";

export type { Priority, WorkStatus } from "@/features/workspace/data/model";

export interface Task {
  key: string;
  title: string;
  project: string;
  status: WorkStatus;
  priority: Priority;
  due: string;
  points: number;
  assignee: string;
}

const snapshot = createInitialDemoState();
const taskRows: Task[] = snapshot.issues.map((issue) => ({
  key: issue.key,
  title: issue.title,
  project: snapshot.projects.find((project) => project.id === issue.projectId)?.name ?? "Unknown",
  status: issue.status,
  priority: issue.priority,
  due: issue.dueDate ?? "No due date",
  points: issue.storyPoints,
  assignee: snapshot.members.find((member) => member.id === issue.assigneeId)?.name ?? "Unassigned",
}));

export const tasks = taskRows;

export const projects = snapshot.projects.map((project) => ({
  name: project.name,
  category: project.category,
  percent: project.progress,
  lead: snapshot.members.find((member) => member.id === project.leadId)?.name ?? "Unassigned",
  open: snapshot.issues.filter((issue) => issue.projectId === project.id && issue.status !== "Done")
    .length,
  due: project.dueDate,
  color: project.color,
}));

export const boardColumns: { name: WorkStatus; cards: Task[] }[] = (
  ["Backlog", "To Do", "In Progress", "In Review", "Done"] as const
).map((status) => ({
  name: status,
  cards: taskRows.filter((task) => task.status === status),
}));
