import Link from "next/link";
const groups = [
  {
    title: "Product",
    links: [
      { label: "Issue Tracking", href: "/work-items" },
      { label: "Sprint Boards", href: "/projects" },
      { label: "Automations", href: "/settings/automation" },
      { label: "Roadmaps", href: "/projects" },
      { label: "Releases", href: "#changelog" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "Architecture", href: "#features" },
      { label: "REST APIs", href: "#documentation" },
      { label: "CLI Tooling", href: "#solutions" },
      { label: "Integrations", href: "/integrations" },
      { label: "Webhooks", href: "/integrations" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Engineering", href: "#solutions" },
      { label: "Product Teams", href: "#solutions" },
      { label: "Enterprise Agile", href: "#enterprise" },
      { label: "DevOps Sync", href: "#solutions" },
      { label: "Startups", href: "#solutions" },
    ],
  },
  {
    title: "Resources",
    id: "documentation",
    links: [
      { label: "Documentation", href: "#documentation" },
      { label: "Guides & Tutorials", href: "#documentation" },
      { label: "Pricing Calculator", href: "#pricing" },
      { label: "Public Roadmap", href: "#changelog" },
      { label: "API Reference", href: "#documentation" },
    ],
  },
  {
    title: "Security",
    links: [
      { label: "Trust Center", href: "/security/audit-logs" },
      { label: "SOC-2 Type II", href: "#enterprise" },
      { label: "ISO/IEC 27001", href: "#enterprise" },
      { label: "GDPR & HIPAA", href: "#enterprise" },
      { label: "Bug Bounty", href: "#enterprise" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Temora", href: "#main-content" },
      { label: "Careers", href: "#contact" },
      { label: "Press Kit", href: "#contact" },
      { label: "Contact Sales", href: "#contact" },
      { label: "System Status", href: "#enterprise" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-[#f2f3ff]">
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-12 sm:px-8 sm:pt-16 lg:px-12">
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-6">
          {groups.map((group) => (
            <div key={group.title}>
              <h2 id={group.id} className="mb-3 text-xs font-bold uppercase tracking-wide text-[#181b24]">{group.title}</h2>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("/") ? (
                      <Link href={link.href} className="text-sm text-[#464555] transition-colors hover:text-[#181b24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                        {link.label}
                      </Link>
                    ) : (
                      <a href={link.href} className="text-sm text-[#464555] transition-colors hover:text-[#181b24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mt-10 flex flex-col items-start justify-between gap-5 border-t border-[#c7c4d8]/70 pt-6 md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#ecedfa] px-3 py-1.5 font-mono text-[10px] text-[#464555]">
              <span className="size-2 animate-pulse rounded-full bg-[#00845c]" /> All systems normal · 99.99% uptime
            </span>
            <span className="rounded bg-[#ecedfa] px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-wide text-[#464555]">SOC-2 Type II Certified</span>
            <span className="rounded bg-[#ecedfa] px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-wide text-[#464555]">ISO 27001</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#464555]">
            <span>© 2025 Temora Technologies Inc. All rights reserved.</span>
            <a href="#enterprise" className="hover:text-[#181b24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Privacy</a>
            <a href="#enterprise" className="hover:text-[#181b24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
