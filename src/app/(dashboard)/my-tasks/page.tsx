import { redirect } from "next/navigation";

export default async function MyTasksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") params.set(key, value);
    else value?.forEach((item) => params.append(key, item));
  }
  redirect(`/my-work${params.size ? `?${params}` : ""}`);
}
