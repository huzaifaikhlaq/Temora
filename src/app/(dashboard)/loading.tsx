export default function DashboardLoading() {
  return (
    <div
      aria-label="Loading workspace"
      aria-busy="true"
      className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8"
    >
      <div className="space-y-2">
        <div className="h-3 w-40 animate-pulse rounded bg-surface-high" />
        <div className="h-8 w-64 animate-pulse rounded bg-surface-high" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-surface-high" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="h-80 animate-pulse rounded-2xl bg-white shadow-sm" />
        <div className="h-80 animate-pulse rounded-2xl bg-white shadow-sm" />
      </div>
    </div>
  );
}
