import { issueApi, type Issue } from "@/features/issues/api/client";
import type { Project } from "@/features/projects/api/client";

const MAX_PARALLEL_PROJECT_REQUESTS = 4;

export async function loadWorkspaceIssues(workspaceId: string, projects: Project[]): Promise<Issue[]> {
  const results = new Array<Issue[]>(projects.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex++;
      const project = projects[index];
      if (!project) return;
      const rows = await issueApi.list(workspaceId, project.id);
      results[index] = rows.map((issue) => ({ ...issue, project_id: project.id }));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(MAX_PARALLEL_PROJECT_REQUESTS, projects.length) }, () => worker()),
  );
  return results.flat();
}
