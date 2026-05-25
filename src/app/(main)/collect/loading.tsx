export default function CollectLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-40 bg-muted rounded-lg" />
        <div className="h-11 w-32 bg-muted rounded-lg" />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-24 bg-muted rounded-lg" />
        ))}
      </div>

      {/* Coin grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="aspect-square bg-muted" />
            <div className="p-3">
              <div className="h-3.5 w-full bg-muted rounded mb-2" />
              <div className="h-3 w-2/3 bg-muted rounded mb-3" />
              <div className="h-5 w-16 bg-muted rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
