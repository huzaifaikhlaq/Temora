import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import { Panel } from "@/components/shared/dashboard-ui";

export function InboxPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-outline">Workspace / Notifications</p>
        <h1 className="mt-1 text-2xl font-bold">Inbox</h1>
        <p className="mt-1 text-sm text-muted">Workspace updates and mentions will appear here.</p>
      </header>
      <Panel>
        <div className="grid min-h-64 place-items-center p-8 text-center">
          <div>
            <span className="mx-auto grid size-12 place-items-center rounded-xl bg-surface-low text-muted"><Icon name="notifications_none" size={25} /></span>
            <h2 className="mt-4 font-semibold">Notifications are not connected yet</h2>
            <p className="mt-1 max-w-md text-sm text-muted">The notification service is planned for a later release. This inbox will show real assignments and updates when it is available.</p>
            <Link href="/work-items" className="mt-4 inline-flex text-sm font-semibold text-accent">View Work Items <Icon name="arrow_forward" size={16} className="ml-1" /></Link>
          </div>
        </div>
      </Panel>
    </main>
  );
}
