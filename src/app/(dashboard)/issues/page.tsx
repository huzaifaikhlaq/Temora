import { redirect } from "next/navigation";

export default async function IssuesRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") params.set(key, value);
    else value?.forEach((item) => params.append(key, item));
  }
  redirect(`/work-items${params.size ? `?${params}` : ""}`);
}
