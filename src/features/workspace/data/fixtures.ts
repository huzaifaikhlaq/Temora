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
const taskRows: Task[] = snapshot.tasks.map((task) => ({
  key: task.key,
  title: task.title,
  project: snapshot.projects.find((project) => project.id === task.projectId)?.name ?? "Unknown",
  status: task.status,
  priority: task.priority,
  due: task.dueDate ?? "No due date",
  points: task.storyPoints,
  assignee: snapshot.members.find((member) => member.id === task.assigneeId)?.name ?? "Unassigned",
}));

export const tasks = taskRows;

export const projects = snapshot.projects.map((project) => ({
  name: project.name,
  category: project.category,
  percent: project.progress,
  lead: snapshot.members.find((member) => member.id === project.leadId)?.name ?? "Unassigned",
  open: snapshot.tasks.filter((task) => task.projectId === project.id && task.status !== "Done")
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
