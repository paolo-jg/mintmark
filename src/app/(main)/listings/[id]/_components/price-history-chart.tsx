'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface DataPoint {
  sale_price: number
  sale_date: string
  listing_id: string
}

interface Props {
  coinName: string | null
  year: number | null
  mintMark: string | null
  grade: string
  seriesSlug: string | null
}

function formatPrice(cents: number) {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-foreground">{formatPrice(d.sale_price)}</p>
      <p className="text-muted-foreground">{formatDate(d.sale_date)}</p>
    </div>
  )
}

export default function PriceHistoryChart({ coinName, year, mintMark, grade, seriesSlug }: Props) {
  const [data, setData] = useState<DataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams({
      grade,
      ...(seriesSlug ? { series_slug: seriesSlug } : { coin_name: coinName ?? '' }),
      ...(year != null ? { year: String(year) } : {}),
      ...(mintMark ? { mint_mark: mintMark } : {}),
    })
    fetch(`/api/price-history?${params}`)
      .then(r => r.json())
      .then(({ data }) => setData(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [coinName, year, mintMark, grade, seriesSlug])

  if (loading) {
    return (
      <div className="h-32 flex items-center justify-center">
        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
      </div>
    )
  }

  if (!data.length) {
    // Flat line placeholder when no sales exist yet
    const flatData = [
      { label: '', price: 0 },
      { label: '', price: 0 },
    ]
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground text-center">No sale history yet for this coin.</p>
        <ResponsiveContainer width="100%" height={80}>
          <AreaChart data={flatData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="flatGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.08} />
                <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="price" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 3" fill="url(#flatGradient)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const prices = data.map(d => d.sale_price)
  const latest = prices[prices.length - 1]
  const earliest = prices[0]
  const high = Math.max(...prices)
  const low = Math.min(...prices)
  const change = prices.length > 1 ? latest - prices[prices.length - 2] : 0
  const changePct = prices.length > 1 && prices[prices.length - 2] > 0
    ? ((change / prices[prices.length - 2]) * 100).toFixed(1)
    : null

  const TrendIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus
  const trendColor = change > 0
    ? 'text-green-600 dark:text-green-400'
    : change < 0
      ? 'text-red-600 dark:text-red-400'
      : 'text-muted-foreground'

  const chartData = data.map(d => ({
    ...d,
    price: d.sale_price,
    label: formatDate(d.sale_date),
  }))

  // Y-axis domain with some padding
  const pad = (high - low) * 0.15 || high * 0.1
  const yMin = Math.max(0, Math.floor((low - pad) / 100) * 100)
  const yMax = Math.ceil((high + pad) / 100) * 100

  return (
    <div className="space-y-3">
      {/* Stats row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold">{formatPrice(latest)}</span>
          {changePct && (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
              <TrendIcon className="h-3 w-3" />
              {change > 0 ? '+' : ''}{changePct}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>H: <span className="text-foreground font-medium">{formatPrice(high)}</span></span>
          <span>L: <span className="text-foreground font-medium">{formatPrice(low)}</span></span>
          <span>{data.length} sale{data.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--foreground))" stopOpacity={0.15} />
              <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={(v) => '$' + (v / 100).toLocaleString()}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="price"
            stroke="hsl(var(--foreground))"
            strokeWidth={1.5}
            fill="url(#priceGradient)"
            dot={{ r: 3, fill: 'hsl(var(--foreground))', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: 'hsl(var(--foreground))', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
