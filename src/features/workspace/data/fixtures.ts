export type WorkStatus =
  | "In Progress"
  | "In Review"
  | "To Do"
  | "Backlog"
  | "Done"
  | "Planned";
export type Priority = "Urgent" | "High" | "Medium" | "Low";

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

export const tasks: Task[] = [
  {
    key: "TEM-101",
    title: "Design the homepage responsive grid & hero layout",
    project: "Website Redesign",
    status: "In Progress",
    priority: "Urgent",
    due: "Tomorrow",
    points: 5,
    assignee: "Alex Morgan",
  },
  {
    key: "TEM-103",
    title: "Fix mobile navigation drawer animation",
    project: "Website Redesign",
    status: "In Review",
    priority: "High",
    due: "Oct 27",
    points: 3,
    assignee: "Emily Carter",
  },
  {
    key: "TEM-104",
    title: "Create the dashboard REST and GraphQL API",
    project: "Customer Portal",
    status: "In Review",
    priority: "Urgent",
    due: "Friday",
    points: 5,
    assignee: "Daniel Kim",
  },
  {
    key: "TEM-105",
    title: "Review customer onboarding flow copy",
    project: "Mobile Application",
    status: "To Do",
    priority: "Medium",
    due: "Oct 28",
    points: 2,
    assignee: "Alex Morgan",
  },
  {
    key: "TEM-106",
    title: "Prepare asset exports for retina screens",
    project: "Website Redesign",
    status: "Backlog",
    priority: "Low",
    due: "Oct 31",
    points: 2,
    assignee: "Emily Carter",
  },
  {
    key: "TEM-108",
    title: "Integrate Stripe billing checkout webhook",
    project: "Customer Portal",
    status: "In Progress",
    priority: "High",
    due: "Friday",
    points: 8,
    assignee: "Daniel Kim",
  },
  {
    key: "TEM-112",
    title: "Implement SSO Google login hook",
    project: "Mobile Application",
    status: "To Do",
    priority: "High",
    due: "Oct 29",
    points: 5,
    assignee: "Daniel Kim",
  },
];

export const projects = [
  {
    name: "Website Redesign",
    category: "Web / Marketing",
    percent: 74,
    lead: "Alex Morgan",
    open: 18,
    due: "Nov 15",
    color: "bg-accent",
  },
  {
    name: "Mobile Application",
    category: "iOS / Android",
    percent: 45,
    lead: "Sarah Chen",
    open: 24,
    due: "Dec 01",
    color: "bg-green",
  },
  {
    name: "Customer Portal",
    category: "B2B SaaS",
    percent: 88,
    lead: "Daniel Kim",
    open: 6,
    due: "Oct 30",
    color: "bg-accent",
  },
];

export const boardColumns: { name: WorkStatus; cards: Task[] }[] = [
  {
    name: "Backlog",
    cards: [
      tasks[4],
      {
        key: "TEM-107",
        title: "Audit color contrast in dark mode",
        project: "Website Redesign",
        status: "Backlog",
        priority: "Medium",
        due: "Nov 02",
        points: 3,
        assignee: "Sarah Chen",
      },
      {
        key: "TEM-110",
        title: "Configure analytics tracking events",
        project: "Website Redesign",
        status: "Backlog",
        priority: "Medium",
        due: "Nov 05",
        points: 2,
        assignee: "Daniel Kim",
      },
    ],
  },
  { name: "To Do", cards: [tasks[1], tasks[3], tasks[6]] },
  {
    name: "In Progress",
    cards: [
      tasks[0],
      tasks[5],
      {
        key: "TEM-109",
        title: "Build component library documentation",
        project: "Website Redesign",
        status: "In Progress",
        priority: "Medium",
        due: "Nov 01",
        points: 3,
        assignee: "Sarah Chen",
      },
    ],
  },
  {
    name: "In Review",
    cards: [
      tasks[2],
      {
        key: "TEM-102",
        title: "Implement OAuth2 multi-tenant tokens",
        project: "Website Redesign",
        status: "In Review",
        priority: "High",
        due: "Oct 26",
        points: 5,
        assignee: "Sarah Chen",
      },
    ],
  },
  {
    name: "Done",
    cards: ["TEM-98", "TEM-99", "TEM-100"].map((key, i) => ({
      key,
      title: [
        "Set up project repo and CI/CD",
        "Design token export system",
        "Initial wireframes sign-off",
      ][i],
      project: "Website Redesign",
      status: "Done" as const,
      priority: "Low" as const,
      due: `Oct ${20 + i}`,
      points: 2,
      assignee: "Alex Morgan",
    })),
  },
];

export const initiatives = [
  {
    name: "Design System & Tokens Overhaul",
    owner: "Alex Morgan",
    initials: "AM",
    progress: 92,
    health: "On Track",
    start: 80,
    width: 420,
    color: "bg-accent",
  },
  {
    name: "Marketing Rebrand & Landing Page",
    owner: "Sarah Chen",
    initials: "SC",
    progress: 74,
    health: "On Track",
    start: 240,
    width: 470,
    color: "bg-indigo-500",
  },
  {
    name: "Customer Portal & Billing Engine",
    owner: "Daniel Kim",
    initials: "DK",
    progress: 45,
    health: "At Risk",
    start: 480,
    width: 380,
    color: "bg-amber-500",
  },
  {
    name: "Mobile App Responsive Parity",
    owner: "Emily Carter",
    initials: "EC",
    progress: 30,
    health: "On Track",
    start: 550,
    width: 470,
    color: "bg-green",
  },
  {
    name: "Enterprise Security & SSO",
    owner: "Daniel Kim",
    initials: "DK",
    progress: 15,
    health: "Planned",
    start: 840,
    width: 460,
    color: "bg-slate-400",
  },
];
