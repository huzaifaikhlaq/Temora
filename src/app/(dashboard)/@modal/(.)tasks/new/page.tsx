import { redirect } from "next/navigation";

export default function InterceptedNewTaskRoute() {
  redirect("/work-items/new?type=task");
}
