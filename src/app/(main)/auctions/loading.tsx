export default function AuctionsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="h-8 w-36 bg-muted rounded-lg mb-2" />
          <div className="h-4 w-52 bg-muted rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-44 bg-muted rounded-lg" />
          <div className="h-9 w-28 bg-muted rounded-lg" />
        </div>
      </div>

      {/* Auction grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="aspect-square bg-muted" />
            <div className="p-3">
              <div className="h-3.5 w-full bg-muted rounded mb-2" />
              <div className="h-3 w-2/3 bg-muted rounded mb-3" />
              <div className="h-5 w-24 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
