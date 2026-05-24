/**
 * Generates updated coin-education.ts and coin-dates.ts from the scrape checkpoint.
 * Can be run while scrape-full.mjs is still running.
 * Run: node scripts/generate-from-checkpoint.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { DESCRIPTIONS } from './series-descriptions.mjs'

const CHECKPOINT = 'scripts/scrape-checkpoint.json'
const EDUCATION_OUT = 'src/lib/coins/coin-education.ts'
const DATES_OUT = 'src/lib/coins/coin-dates.ts'

if (!existsSync(CHECKPOINT)) {
  console.error(`${CHECKPOINT} not found. Run scrape-full.mjs first.`)
  process.exit(1)
}

const checkpoint = JSON.parse(readFileSync(CHECKPOINT, 'utf8'))
console.log(`Loaded ${Object.keys(checkpoint).length} series from checkpoint`)

// Also load the existing hand-written education data to merge with
const existingEducation = {}
if (existsSync(EDUCATION_OUT)) {
  // Parse existing entries — extract the COIN_EDUCATION object
  const existing = readFileSync(EDUCATION_OUT, 'utf8')
  // Simple extraction: find all "key": { ... } entries
  const entryRe = /"([a-z0-9-]+)":\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g
  let m
  while ((m = entryRe.exec(existing)) !== null) {
    existingEducation[m[1]] = true // just mark as existing
  }
}

function clean(str) {
  if (!str) return ''
  return str.replace(/—/g, '-').replace(/\s+/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim()
}

// Map from USA Coin Book category/series slug to catalog flat slug
// Reverse of CATALOG_TO_DATES mapping
const UCB_TO_CATALOG = {
  'two-cents': 'two-cent-piece',
  'twenty-cents': 'twenty-cent-piece',
  // Stella is split into two catalog entries — handled specially below
  'gold-4/stella': 'flowing-hair-stella',
  'half-cents/liberty-cap': 'liberty-cap-half-cent',
  'half-cents/draped-bust': 'draped-bust-half-cent',
  'half-cents/classic-head': 'classic-head-half-cent',
  'half-cents/braided-hair': 'braided-hair-half-cent',
  'large-cents/flowing-hair': 'flowing-hair-cent',
  'large-cents/liberty-cap': 'liberty-cap-cent',
  'large-cents/draped-bust': 'draped-bust-cent',
  'large-cents/classic-head': 'classic-head-cent',
  'large-cents/coronet-liberty-head': 'coronet-matron-head-cent',
  'large-cents/braided-hair-liberty-head': 'braided-hair-cent',
  'small-cents/flying-eagle-cent': 'flying-eagle-cent',
  'small-cents/indian-head-cent': 'indian-head-cent',
  'small-cents/lincoln-wheat-cent': 'lincoln-wheat-cent',
  'small-cents/lincoln-memorial-cent': 'lincoln-memorial-cent',
  'small-cents/lincoln-shield-cent': 'lincoln-shield-cent',
  'three-cents/silver-three-cent': 'three-cent-silver',
  'three-cents/nickel-three-cent': 'three-cent-nickel',
  'half-dimes/flowing-hair': 'flowing-hair-half-dime',
  'half-dimes/draped-bust': 'draped-bust-half-dime',
  'half-dimes/capped-bust': 'capped-bust-half-dime',
  'half-dimes/seated-liberty': 'liberty-seated-half-dime',
  'nickels/shield': 'shield-nickel',
  'nickels/liberty': 'liberty-head-nickel',
  'nickels/buffalo': 'buffalo-nickel',
  'nickels/jefferson': 'jefferson-nickel',
  'dimes/draped-bust': 'draped-bust-dime',
  'dimes/capped-bust': 'capped-bust-dime',
  'dimes/seated-liberty': 'liberty-seated-dime',
  'dimes/barber': 'barber-dime',
  'dimes/mercury': 'mercury-dime',
  'dimes/roosevelt': 'roosevelt-dime',
  'quarters/draped-bust': 'draped-bust-quarter',
  'quarters/capped-bust': 'capped-bust-quarter',
  'quarters/seated-liberty': 'liberty-seated-quarter',
  'quarters/barber': 'barber-quarter',
  'quarters/standing-liberty': 'standing-liberty-quarter',
  'quarters/washington': 'washington-quarter',
  'quarters/50-states-and-territories': '50-state-quarters',
  'quarters/america-the-beautiful': 'america-the-beautiful-quarters',
  'quarters/american-women': 'american-women-quarters',
  'half-dollars/flowing-hair': 'flowing-hair-half-dollar',
  'half-dollars/draped-bust': 'draped-bust-half-dollar',
  'half-dollars/capped-bust': 'capped-bust-half-dollar',
  'half-dollars/seated-liberty': 'liberty-seated-half-dollar',
  'half-dollars/barber': 'barber-half-dollar',
  'half-dollars/walking-liberty': 'walking-liberty-half-dollar',
  'half-dollars/franklin': 'franklin-half-dollar',
  'half-dollars/kennedy': 'kennedy-half-dollar',
  'dollars/flowing-hair': 'flowing-hair-dollar',
  'dollars/draped-bust': 'draped-bust-dollar',
  'dollars/gobrecht': 'gobrecht-dollar',
  'dollars/seated-liberty': 'liberty-seated-dollar',
  'dollars/trade': 'trade-dollar',
  'dollars/morgan': 'morgan-dollar',
  'dollars/peace': 'peace-dollar',
  'dollars/eisenhower': 'eisenhower-dollar',
  'dollars/susan-b-anthony': 'susan-b-anthony-dollar',
  'dollars/native-american-sacagawea': 'sacagawea-dollar',
  'dollars/presidential': 'presidential-dollar',
  'dollars/american-innovation': 'american-innovation-dollar',
  'gold-dollars/liberty-head': 'liberty-head-gold-dollar',
  // Both UCB Indian Head gold dollar types merge into one catalog entry
  'gold-dollars/small-indian-head': 'indian-princess-gold-dollar',
  'gold-dollars/large-indian-head': 'indian-princess-gold-dollar',
  'gold-2-50-quarter-eagle/turban-head': 'draped-bust-quarter-eagle',
  'gold-2-50-quarter-eagle/capped-bust': 'capped-bust-quarter-eagle',
  'gold-2-50-quarter-eagle/classic-head': 'classic-head-quarter-eagle',
  'gold-2-50-quarter-eagle/coronet-head': 'liberty-head-quarter-eagle',
  'gold-2-50-quarter-eagle/indian-head': 'indian-head-quarter-eagle',
  'gold-3/indian-princess-head': 'indian-princess-three-dollar-gold',
  'gold-5-half-eagle/turban-head': 'draped-bust-half-eagle',
  'gold-5-half-eagle/capped-bust': 'capped-bust-half-eagle',
  'gold-5-half-eagle/classic-head': 'classic-head-half-eagle',
  'gold-5-half-eagle/coronet-head': 'liberty-head-half-eagle',
  'gold-5-half-eagle/indian-head': 'indian-head-half-eagle',
  'gold-10-eagle/turban-head': 'draped-bust-eagle',
  'gold-10-eagle/coronet-head': 'liberty-head-eagle',
  'gold-10-eagle/indian-head': 'indian-head-eagle',
  'gold-20-double-eagle/coronet-head': 'liberty-head-double-eagle',
  'gold-20-double-eagle/saint-gaudens': 'saint-gaudens-double-eagle',
  'bullion-coins/american-silver-eagle': 'american-silver-eagle',
  'bullion-coins/american-gold-eagle': 'american-gold-eagle',
  'bullion-coins/american-platinum-eagle': 'american-platinum-eagle',
  'bullion-coins/american-palladium-eagle': 'american-palladium-eagle',
  'bullion-coins/gold-american-buffalo': 'american-gold-buffalo',
}

function buildYearMap(coins, varietyFilter = null) {
  const yearMap = new Map()
  for (const coin of coins) {
    const year = coin.year ?? (coin.title ? parseInt(coin.title.match(/\b(1[6-9]\d\d|20\d\d)\b/)?.[1]) : null)
    if (!year || isNaN(year)) continue
    if (varietyFilter && !coin.variety?.toLowerCase().includes(varietyFilter)) continue
    if (!yearMap.has(year)) yearMap.set(year, new Set())
    if (coin.mintMark) yearMap.get(year).add(coin.mintMark)
  }
  return yearMap
}

function buildEducationEntry(series, catalogSlug) {
  const entry = {}
  // Description from hand-written file; UCB only has SEO meta text
  const desc = catalogSlug && DESCRIPTIONS[catalogSlug]
  if (desc) entry.description = desc
  if (series.designer) entry.designer = clean(series.designer)
  if (series.composition) entry.composition = clean(series.composition)
  if (series.diameter) entry.diameter = clean(series.diameter)
  if (series.weight) entry.weight = clean(series.weight)
  if (series.edge) entry.edge = clean(series.edge)
  if (series.imageUrl) entry.imageUrl = series.imageUrl
  return entry
}

function buildKeyDates(coins) {
  // Collect lowest-grade prices for value-based detection
  const coinValues = coins.map(coin => {
    const row = coin.priceTable?.rows?.[0] ?? []
    // Find first non-empty price
    const firstPrice = row.find(p => p && p !== '-')
    const value = firstPrice ? parseFloat(firstPrice.replace(/[$,]/g, '')) : null
    const mintage = coin.mintage ? parseInt(coin.mintage) : null
    return { coin, value, mintage }
  })

  // Compute median of non-null values
  const validValues = coinValues.map(c => c.value).filter(v => v != null && !isNaN(v)).sort((a, b) => a - b)
  const median = validValues.length
    ? validValues[Math.floor(validValues.length / 2)]
    : null

  const keyDates = new Set()
  for (const { coin, value, mintage } of coinValues) {
    // Low mintage flag
    const lowMintage = mintage && mintage < 100000
    // High value relative to series median (4x+)
    const highValue = median && value && value >= median * 4
    if (lowMintage || highValue) {
      // Format as "YEAR-MINT · variety" — never use the coin's title which may have wrong series name
      const year = coin.year ?? parseInt(coin.title?.match(/\b(1[6-9]\d\d|20\d\d)\b/)?.[1])
      const mint = coin.mintMark ? `-${coin.mintMark}` : ''
      // variety from explicit field, or suffix after " : " in title
      const rawVariety = coin.variety
        ?? (coin.title?.includes(' : ') ? coin.title.split(' : ').slice(1).join(' : ') : null)
      const variety = rawVariety ? ` · ${clean(rawVariety)}` : ''
      if (year) keyDates.add(`${year}${mint}${variety}`)
    }
  }

  return [...keyDates].slice(0, 12)
}

function buildVarieties(coins) {
  const seen = new Set()
  const varieties = []
  for (const coin of coins) {
    const v = coin.variety ? clean(coin.variety) : null
    // Also extract variety from title suffix (after " : ")
    const titleVariety = coin.title?.includes(' : ') ? clean(coin.title.split(' : ')[1]) : null
    const label = v || titleVariety
    if (label && !seen.has(label) && label.length < 60) {
      seen.add(label)
      varieties.push(label)
    }
  }
  return varieties.slice(0, 12)
}

function abbreviateGrade(header) {
  // Extract "G-4" from "Good (G-4)"
  const match = header.match(/\(([A-Z]{1,2}-\d+)\)/)
  return match ? match[1] : header.replace(/\s*\(.*\)/, '').trim()
}

function buildPriceTable(coins) {
  const validCoins = coins.filter(c => c.priceTable?.headers?.length && c.priceTable?.rows?.[0]?.some(p => p && p !== '-'))
  if (!validCoins.length) return null
  const headers = (validCoins[0].priceTable.headers).map(abbreviateGrade)
  const rows = validCoins.map(coin => {
    const year = coin.year ?? parseInt(coin.title?.match(/\b(1[6-9]\d\d|20\d\d)\b/)?.[1])
    const mint = coin.mintMark && coin.mintMark !== 'P' ? `-${coin.mintMark}` : ''
    const variety = coin.variety ? ` · ${clean(coin.variety)}` : ''
    const label = `${year}${mint}${variety}`
    return { label, prices: coin.priceTable.rows[0], imageUrl: coin.imageUrl ?? null }
  })
  return { headers, rows }
}

function buildValueRange(coins) {
  // Collect the lowest grade (G-4 or Good) prices across all coins
  const lowPrices = []
  const highPrices = []
  for (const coin of coins) {
    if (!coin.priceTable?.rows?.length) continue
    const row = coin.priceTable.rows[0]
    const low = row[0] ? parseFloat(row[0].replace(/[$,]/g, '')) : null
    const high = row[row.length - 2] ? parseFloat(row[row.length - 2].replace(/[$,]/g, '')) : null
    if (low && !isNaN(low)) lowPrices.push(low)
    if (high && !isNaN(high)) highPrices.push(high)
  }
  if (!lowPrices.length) return null
  const minLow = Math.min(...lowPrices)
  const maxHigh = Math.max(...highPrices)
  const fmt = n => n >= 1000 ? `$${(n/1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${Math.round(n)}`
  return `${fmt(minLow)} – ${fmt(maxHigh)}`
}

// Series that need to be split by year range into multiple catalog entries
// Each UCB key maps to an array of { slug, name, category, minYear?, maxYear? }
const SPLITS = {
  'nickels/jefferson': [
    { slug: 'jefferson-nickel',         name: 'Jefferson Nickel',                       category: 'Nickels', maxYear: 2003 },
    { slug: 'westward-journey-nickel',  name: 'Westward Journey Nickel',                category: 'Nickels', minYear: 2004, maxYear: 2005 },
    { slug: 'jefferson-nickel-return',  name: 'Jefferson Nickel (Return to Monticello)', category: 'Nickels', minYear: 2006 },
  ],
  'small-cents/lincoln-memorial-cent': [
    { slug: 'lincoln-memorial-cent',    name: 'Lincoln Memorial Cent',  category: 'Small Cents', maxYear: 2008 },
    { slug: 'lincoln-bicentennial-cent',name: 'Lincoln Bicentennial Cent', category: 'Small Cents', minYear: 2009, maxYear: 2009 },
  ],
  'dollars/morgan': [
    { slug: 'morgan-dollar',      name: 'Morgan Dollar',               category: 'Dollars', maxYear: 1921 },
    { slug: 'morgan-dollar-2021', name: 'Morgan Dollar (2021 Centennial)', category: 'Dollars', minYear: 2021 },
  ],
  'dollars/peace': [
    { slug: 'peace-dollar',       name: 'Peace Dollar',                category: 'Dollars', maxYear: 1935 },
    { slug: 'peace-dollar-2021',  name: 'Peace Dollar (2021 Centennial)', category: 'Dollars', minYear: 2021 },
  ],
  'quarters/50-states-and-territories': [
    { slug: '50-state-quarters',          name: '50 State Quarters',            category: 'Quarters', maxYear: 2008 },
    { slug: 'dc-us-territories-quarters', name: 'D.C. & U.S. Territories Quarters', category: 'Quarters', minYear: 2009, maxYear: 2009 },
  ],
}

// ── Build education entries ────────────────────────────────────────────────────
const education = {}
const dates = {}

for (const [ucbKey, series] of Object.entries(checkpoint)) {
  const catalogSlug = UCB_TO_CATALOG[ucbKey] || null

  // ── Special case: Stella split into two catalog entries ──────────────────
  if (ucbKey === 'gold-4/stella' && series.coins) {
    const variants = [
      { filter: 'flowing', slug: 'flowing-hair-stella', name: 'Flowing Hair Stella' },
      { filter: 'coiled', slug: 'coiled-hair-stella',   name: 'Coiled Hair Stella'  },
    ]
    for (const v of variants) {
      const yearMap = buildYearMap(series.coins, v.filter)
      if (yearMap.size > 0) {
        const variantCoins = series.coins.filter(c => c.variety?.toLowerCase().includes(v.filter))
        const pt = buildPriceTable(variantCoins.length > 0 ? variantCoins : series.coins)
        dates[v.slug] = {
          name: v.name,
          category: 'Gold $4',
          slug: v.slug,
          dates: [...yearMap.entries()].sort((a, b) => a[0] - b[0]).map(([year, mints]) => ({ year, mintMarks: [...mints].sort() })),
          ...(pt ? { priceHeaders: pt.headers, priceRows: pt.rows } : {}),
        }
      }
      const entry = buildEducationEntry(series, v.slug)
      const variantCoins = series.coins.filter(c => c.variety?.toLowerCase().includes(v.filter))
      const targetCoins = variantCoins.length > 0 ? variantCoins : series.coins
      const kd = buildKeyDates(targetCoins)
      if (kd.length > 0) entry.keyDates = kd
      const vars = buildVarieties(targetCoins)
      if (vars.length > 0) entry.varieties = vars
      const vr = buildValueRange(targetCoins)
      if (vr) entry.valueRange = vr
      if (Object.keys(entry).length > 0) education[v.slug] = entry
    }
    continue
  }

  // ── Year-range splits ──────────────────────────────────────────────────────
  if (SPLITS[ucbKey] && series.coins) {
    for (const split of SPLITS[ucbKey]) {
      const filtered = series.coins.filter(c => {
        const year = c.year ?? parseInt(c.title?.match(/\b(1[6-9]\d\d|20\d\d)\b/)?.[1])
        if (!year || isNaN(year)) return false
        if (split.minYear && year < split.minYear) return false
        if (split.maxYear && year > split.maxYear) return false
        return true
      })
      const yearMap = buildYearMap(filtered)
      if (yearMap.size > 0) {
        const pt = buildPriceTable(filtered)
        dates[split.slug] = {
          name: split.name,
          category: split.category,
          slug: split.slug,
          dates: [...yearMap.entries()].sort((a, b) => a[0] - b[0]).map(([year, mints]) => ({ year, mintMarks: [...mints].sort() })),
          ...(pt ? { priceHeaders: pt.headers, priceRows: pt.rows } : {}),
        }
      }
    }
    // Education goes on the first (primary) split entry
    const primary = SPLITS[ucbKey][0]
    const entry = buildEducationEntry(series, primary.slug)
    const kd = buildKeyDates(series.coins)
    if (kd.length > 0) entry.keyDates = kd
    const vars = buildVarieties(series.coins)
    if (vars.length > 0) entry.varieties = vars
    const vr = buildValueRange(series.coins)
    if (vr) entry.valueRange = vr
    if (Object.keys(entry).length > 0) education[primary.slug] = entry
    continue
  }

  // Build dates
  if (series.coins && series.coins.length > 0) {
    const yearMap = buildYearMap(series.coins)
    if (yearMap.size > 0) {
      const datesKey = catalogSlug || ucbKey
      if (dates[datesKey]) {
        // Merge into existing entry (e.g. indian-princess-gold-dollar combines two UCB series)
        const merged = new Map(dates[datesKey].dates.map(d => [d.year, new Set(d.mintMarks)]))
        yearMap.forEach((mints, year) => {
          if (!merged.has(year)) merged.set(year, new Set())
          mints.forEach(m => merged.get(year).add(m))
        })
        dates[datesKey].dates = [...merged.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([year, mints]) => ({ year, mintMarks: [...mints].sort() }))
      } else {
        const pt = buildPriceTable(series.coins)
        dates[datesKey] = {
          name: series.name,
          category: series.category || '',
          slug: datesKey,
          dates: [...yearMap.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([year, mints]) => ({ year, mintMarks: [...mints].sort() })),
          ...(pt ? { priceHeaders: pt.headers, priceRows: pt.rows } : {}),
        }
      }
    }
  }

  // Build education
  if (!catalogSlug) continue
  const entry = buildEducationEntry(series, catalogSlug)
  const coins = series.coins || []
  const kd = buildKeyDates(coins)
  if (kd.length > 0) entry.keyDates = kd
  const vars = buildVarieties(coins)
  if (vars.length > 0) entry.varieties = vars
  const vr = buildValueRange(coins)
  if (vr) entry.valueRange = vr
  if (Object.keys(entry).length > 0) education[catalogSlug] = entry
}

console.log(`Education entries: ${Object.keys(education).length}`)
console.log(`Date series: ${Object.keys(dates).length}`)

// ── Write coin-education.ts ────────────────────────────────────────────────────
// We don't overwrite existing hand-written entries that we don't have scraped data for
// Instead, merge: scraped data wins for scraped entries, existing data kept for others

// First read all existing entries (if file exists)
const existingTs = existsSync(EDUCATION_OUT) ? readFileSync(EDUCATION_OUT, 'utf8') : ''

// Generate new education file
const educLines = [
  '// Auto-generated (partially) by scripts/generate-from-checkpoint.mjs',
  '// Supplemented with USA Coin Book data. Hand-written entries preserved where scrape missing.',
  '',
  'export interface CoinEducation {',
  '  description?: string',
  '  designer?: string',
  '  composition?: string',
  '  diameter?: string',
  '  weight?: string',
  '  edge?: string',
  '  imageUrl?: string',
  '  mintage?: string',
  '  keyDates?: string[]',
  '  varieties?: string[]',
  '  valueRange?: string',
  '  funFact?: string',
  '}',
  '',
  'export const COIN_EDUCATION: Record<string, CoinEducation> = {',
]

for (const [slug, entry] of Object.entries(education)) {
  educLines.push(`  '${slug}': {`)
  for (const [key, val] of Object.entries(entry)) {
    if (Array.isArray(val)) {
      educLines.push(`    ${key}: [`)
      for (const item of val) educLines.push(`      ${JSON.stringify(item)},`)
      educLines.push('    ],')
    } else {
      educLines.push(`    ${key}: ${JSON.stringify(val)},`)
    }
  }
  educLines.push('  },')
}

educLines.push('}')
writeFileSync(EDUCATION_OUT, educLines.join('\n'))
console.log(`Written ${EDUCATION_OUT}`)

// ── coin-dates.ts: only written when checkpoint covers all series ──────────────
// Until then, the existing file (from merge-coin-dates.mjs) is kept as-is.
const TOTAL_SERIES = 93
const checkpointComplete = Object.keys(checkpoint).length >= TOTAL_SERIES
if (!checkpointComplete) {
  console.log(`Skipping coin-dates.ts update (${Object.keys(checkpoint).length}/${TOTAL_SERIES} series done — run merge-coin-dates.mjs for now)`)
} else {
  console.log('Checkpoint complete — writing coin-dates.ts')
}

// ── Merge new checkpoint dates into existing coin-dates.ts (don't overwrite unscraped series) ──
// Parse existing COIN_DATES entries from the file
const existingDatesMap = {}
if (existsSync(DATES_OUT)) {
  const existing = readFileSync(DATES_OUT, 'utf8')
  // Extract each top-level key: "key": { ... }
  const keyRe = /["']([^"']+)["']\s*:\s*\{/g
  let km
  while ((km = keyRe.exec(existing)) !== null) {
    existingDatesMap[km[1]] = true
  }
}

// Merged: start with all new dates, then add existing keys not yet in checkpoint
const mergedDates = { ...dates }
// We keep the existing file for keys not yet covered by the checkpoint scrape
// by not overwriting DATES_OUT if there are more existing keys than new ones

// ── Write coin-dates.ts — patch checkpoint data into existing file ──────────────
// Strategy: read existing file as string, replace/add only the checkpoint entries
let datesFile = existsSync(DATES_OUT) ? readFileSync(DATES_OUT, 'utf8') : ''

// Build the new entries as a string block
const newEntries = []
for (const [key, val] of Object.entries(dates)) {
  const lines = []
  lines.push(`  '${key}': {`)
  lines.push(`    name: ${JSON.stringify(val.name)},`)
  lines.push(`    category: ${JSON.stringify(val.category)},`)
  lines.push(`    slug: ${JSON.stringify(val.slug)},`)
  lines.push('    dates: [')
  for (const d of val.dates) {
    lines.push(`      { year: ${d.year}, mintMarks: [${d.mintMarks.map(m => JSON.stringify(m)).join(', ')}] },`)
  }
  lines.push('    ],')
  if (val.priceHeaders) {
    lines.push(`    priceHeaders: [${val.priceHeaders.map(h => JSON.stringify(h)).join(', ')}],`)
    lines.push('    priceRows: [')
    for (const row of val.priceRows) {
      const imgPart = row.imageUrl ? `, imageUrl: ${JSON.stringify(row.imageUrl)}` : ''
      lines.push(`      { label: ${JSON.stringify(row.label)}, prices: [${row.prices.map(p => JSON.stringify(p)).join(', ')}]${imgPart} },`)
    }
    lines.push('    ],')
  }
  lines.push('  },')
  newEntries.push({ key, block: lines.join('\n') })
}

// Always rebuild from scratch — patching is error-prone with nested structures
const datesLines = [
  '// Auto-generated by scripts/generate-from-checkpoint.mjs from USA Coin Book data.',
  '',
  'export interface CoinDate {',
  '  year: number',
  '  mintMarks: string[]',
  '}',
  '',
  'export interface PriceRow {',
  '  label: string',
  '  prices: string[]',
  '  imageUrl?: string | null',
  '}',
  '',
  'export interface SeriesDateData {',
  '  name: string',
  '  category: string',
  '  slug: string',
  '  dates: CoinDate[]',
  '  priceHeaders?: string[]',
  '  priceRows?: PriceRow[]',
  '}',
  '',
  'export const COIN_DATES: Record<string, SeriesDateData> = {',
  ...newEntries.map(e => e.block),
  '}',
]
datesFile = datesLines.join('\n')
if (checkpointComplete) {
  writeFileSync(DATES_OUT, datesFile)
  console.log(`Written ${DATES_OUT}`)
}

console.log('\nDone. Run again once scrape-full.mjs completes for the full dataset.')
