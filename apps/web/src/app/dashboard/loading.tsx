export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-8 w-56 rounded-full bg-muted" />
        <div className="h-4 w-80 max-w-full rounded-full bg-muted" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-2xl border bg-muted/40" />
        ))}
      </div>
      <div className="h-64 rounded-2xl border bg-muted/40" />
    </div>
  );
}
