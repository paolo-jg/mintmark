export default function CollectLoading() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">My Collection</h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-6 border-b border-border">
        <div className="flex gap-1">
          {['Owned', 'Wish List', 'Sold'].map(label => (
            <div key={label} className="px-4 py-2.5 text-sm font-medium text-muted-foreground">
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Skeleton grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border overflow-hidden animate-pulse">
            <div className="aspect-square bg-muted/60" />
            <div className="p-4 space-y-2">
              <div className="h-2.5 bg-muted rounded w-2/3" />
              <div className="h-3.5 bg-muted rounded w-full" />
              <div className="h-3.5 bg-muted rounded w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
