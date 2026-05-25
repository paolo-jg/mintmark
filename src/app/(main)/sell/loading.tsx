export default function SellLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="h-8 w-36 bg-muted rounded-lg" />
        <div className="h-11 w-36 bg-muted rounded-lg" />
      </div>

      {/* Quota bar */}
      <div className="rounded-xl border border-border bg-card px-5 py-4 mb-6">
        <div className="flex justify-between mb-3">
          <div className="h-4 w-40 bg-muted rounded" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
        <div className="h-2 w-full bg-muted rounded-full" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card px-4 py-4">
            <div className="h-3 w-16 bg-muted rounded mb-3" />
            <div className="h-8 w-12 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-16 bg-muted rounded mx-1" />
        ))}
      </div>

      {/* Listings */}
      <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5 bg-card">
            <div className="h-12 w-12 bg-muted rounded-lg flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-4 w-48 bg-muted rounded mb-2" />
              <div className="h-3 w-32 bg-muted rounded" />
            </div>
            <div className="h-4 w-20 bg-muted rounded hidden sm:block" />
            <div className="h-4 w-16 bg-muted rounded" />
            <div className="h-5 w-14 bg-muted rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
