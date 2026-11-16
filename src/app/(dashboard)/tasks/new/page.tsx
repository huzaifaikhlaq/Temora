import { redirect } from "next/navigation";

export default async function NewTaskRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = new URLSearchParams();
  params.set("type", "task");
  for (const [key, value] of Object.entries(await searchParams)) {
    if (key === "type") continue;
    if (typeof value === "string") params.set(key, value);
    else value?.forEach((item) => params.append(key, item));
  }
  redirect(`/work-items/new?${params}`);
}
