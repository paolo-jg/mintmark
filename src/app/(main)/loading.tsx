export default function HomeLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
      {/* Welcome */}
      <div className="h-8 w-56 bg-muted rounded-lg mb-8" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card px-4 py-4">
            <div className="h-3 w-16 bg-muted rounded mb-3" />
            <div className="h-8 w-12 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <div className="h-4 w-32 bg-muted rounded mb-6" />
        <div className="h-40 w-full bg-muted rounded-lg" />
      </div>
    </div>
  )
}
