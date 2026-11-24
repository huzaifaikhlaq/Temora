import type { Metadata } from "next";
import { MarketingHome } from "@/features/marketing/components/marketing-home";

export const metadata: Metadata = {
  title: "Project intelligence engineered for precision",
  description:
    "Temora brings project planning, sprint delivery, dependencies, and enterprise governance into one focused workspace.",
};

export default function HomePage() {
  return <MarketingHome />;
}
