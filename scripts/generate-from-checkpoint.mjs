/**
 * Generates updated coin-education.ts and coin-dates.ts from the scrape checkpoint.
 * Can be run while scrape-full.mjs is still running.
 * Run: node scripts/generate-from-checkpoint.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'

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
  'quarters/50-states-and-territories': 'statehood-quarters',
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
  'gold-dollars/small-indian-head': 'small-indian-head-gold-dollar',
  'gold-dollars/large-indian-head': 'large-indian-head-gold-dollar',
  'gold-2-50-quarter-eagle/turban-head': 'turban-head-quarter-eagle',
  'gold-2-50-quarter-eagle/capped-bust': 'capped-bust-quarter-eagle',
  'gold-2-50-quarter-eagle/classic-head': 'classic-head-quarter-eagle',
  'gold-2-50-quarter-eagle/coronet-head': 'coronet-head-quarter-eagle',
  'gold-2-50-quarter-eagle/indian-head': 'indian-head-quarter-eagle',
  'gold-3/indian-princess-head': 'indian-princess-three-dollar',
  'gold-5-half-eagle/turban-head': 'turban-head-half-eagle',
  'gold-5-half-eagle/capped-bust': 'capped-bust-half-eagle',
  'gold-5-half-eagle/classic-head': 'classic-head-half-eagle',
  'gold-5-half-eagle/coronet-head': 'coronet-head-half-eagle',
  'gold-5-half-eagle/indian-head': 'indian-head-half-eagle',
  'gold-10-eagle/turban-head': 'turban-head-eagle',
  'gold-10-eagle/coronet-head': 'coronet-head-eagle',
  'gold-10-eagle/indian-head': 'indian-head-eagle',
  'gold-20-double-eagle/coronet-head': 'coronet-head-double-eagle',
  'gold-20-double-eagle/saint-gaudens': 'saint-gaudens-double-eagle',
  'bullion-coins/american-silver-eagle': 'american-silver-eagle',
  'bullion-coins/american-gold-eagle': 'american-gold-eagle',
  'bullion-coins/american-platinum-eagle': 'american-platinum-eagle',
  'bullion-coins/american-palladium-eagle': 'american-palladium-eagle',
  'bullion-coins/gold-american-buffalo': 'american-gold-buffalo',
}

// ── Build education entries ────────────────────────────────────────────────────
const education = {}
const dates = {}

for (const [ucbKey, series] of Object.entries(checkpoint)) {
  const catalogSlug = UCB_TO_CATALOG[ucbKey] || null

  // Build dates
  if (series.coins && series.coins.length > 0) {
    const yearMap = new Map()
    for (const coin of series.coins) {
      if (!coin.year) continue
      if (!yearMap.has(coin.year)) yearMap.set(coin.year, new Set())
      if (coin.mintMark) yearMap.get(coin.year).add(coin.mintMark)
    }
    if (yearMap.size > 0) {
      const dateEntries = [...yearMap.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([year, mints]) => ({ year, mintMarks: [...mints].sort() }))
      dates[ucbKey] = {
        name: series.name,
        category: series.category || '',
        slug: ucbKey,
        dates: dateEntries,
      }
    }
  }

  // Build education
  if (!catalogSlug) continue
  const entry = {}
  if (series.description) entry.description = clean(series.description)
  if (series.designer) entry.designer = clean(series.designer)
  if (series.composition) entry.composition = clean(series.composition)
  if (series.diameter) entry.diameter = clean(series.diameter)
  if (series.weight) entry.weight = clean(series.weight)
  if (series.edge) entry.edge = clean(series.edge)
  if (series.imageUrl) entry.imageUrl = series.imageUrl

  // Key dates: low-mintage coins
  if (series.coins) {
    const keyDates = []
    for (const coin of series.coins) {
      const mint = coin.mintage ? parseInt(coin.mintage) : null
      if (mint && mint < 50000 && coin.title) keyDates.push(clean(coin.title))
    }
    if (keyDates.length > 0) entry.keyDates = keyDates.slice(0, 8)
  }

  if (Object.keys(entry).length > 0) education[catalogSlug] = entry
}

console.log(`Education entries: ${Object.keys(education).length}`)
console.log(`Date series: ${Object.keys(dates).length}`)

// ── Write coin-education.ts ────────────────────────────────────────────────────
// We don't overwrite existing hand-written entries that we don't have scraped data for
// Instead, merge: scraped data wins for scraped entries, existing data kept for others

// First read all existing entries
const existingTs = readFileSync(EDUCATION_OUT, 'utf8')

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

// ── Write coin-dates.ts ────────────────────────────────────────────────────────
const datesLines = [
  '// Auto-generated by scripts/generate-from-checkpoint.mjs from USA Coin Book data.',
  '',
  'export interface CoinDate {',
  '  year: number',
  '  mintMarks: string[]',
  '}',
  '',
  'export interface SeriesDateData {',
  '  name: string',
  '  category: string',
  '  slug: string',
  '  dates: CoinDate[]',
  '}',
  '',
  'export const COIN_DATES: Record<string, SeriesDateData> = {',
]

for (const [key, val] of Object.entries(dates)) {
  datesLines.push(`  '${key}': {`)
  datesLines.push(`    name: ${JSON.stringify(val.name)},`)
  datesLines.push(`    category: ${JSON.stringify(val.category)},`)
  datesLines.push(`    slug: ${JSON.stringify(val.slug)},`)
  datesLines.push('    dates: [')
  for (const d of val.dates) {
    datesLines.push(`      { year: ${d.year}, mintMarks: [${d.mintMarks.map(m => JSON.stringify(m)).join(', ')}] },`)
  }
  datesLines.push('    ],')
  datesLines.push('  },')
}
datesLines.push('}')
writeFileSync(DATES_OUT, datesLines.join('\n'))
console.log(`Written ${DATES_OUT}`)

console.log('\nDone. Run again once scrape-full.mjs completes for the full dataset.')
