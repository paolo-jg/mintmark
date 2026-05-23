/**
 * Scrapes usacoinbook.com for every US coin series with year/mintmark data.
 * Output: scripts/coins-data.json
 *
 * Run: node scripts/scrape-coins.mjs
 */

import { writeFileSync } from 'fs'

const BASE = 'https://www.usacoinbook.com'
const DELAY_MS = 500

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchPage(url) {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

// ── Step 1: Extract all categories + series from the sidebar ─────────────────
async function getAllSeries() {
  console.log('Fetching catalog sidebar...')
  const html = await fetchPage(`${BASE}/catalog-coins.php`)

  const allLinks = []
  // HTML format: <a href='URL' class='... sidebar-coindem-link'>Name
  const linkRe = /href='([^']+)'[^>]*class='[^']*sidebar-coin(dem|type)-link'[^>]*>([^<]+)/g
  let m
  while ((m = linkRe.exec(html)) !== null) {
    allLinks.push({ type: m[2], url: m[1], name: m[3].trim() })
  }

  const catalog = []
  let currentCategory = null
  for (const link of allLinks) {
    if (link.type === 'dem') {
      // Extract slug from URL: https://www.usacoinbook.com/coins/dollars/ → dollars
      const slug = link.url.replace(`${BASE}/coins/`, '').replace(/\/$/, '')
      currentCategory = { name: link.name, slug, series: [] }
      catalog.push(currentCategory)
    } else if (link.type === 'type' && currentCategory) {
      const slug = link.url.replace(`${BASE}/coins/`, '').replace(/\/$/, '')
      currentCategory.series.push({ name: link.name, slug })
    }
  }

  const total = catalog.reduce((n, c) => n + c.series.length, 0)
  console.log(`Found ${catalog.length} categories, ${total} series\n`)
  return catalog
}

// ── Step 2: Parse a series page for year/mintmark coins ──────────────────────
// URLs are: /coins/{id}/{seriesSlug}/{year}-{mint}/{variety}/
async function parseSeriesPage(seriesSlug) {
  const html = await fetchPage(`${BASE}/coins/${seriesSlug}/`)
  const escapedSlug = seriesSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`/coins/\\d+/${escapedSlug}/(\\d{4})-([A-Z]+)/`, 'gi')

  const dateMap = {}
  let m
  while ((m = re.exec(html)) !== null) {
    const year = parseInt(m[1])
    const mint = m[2].toUpperCase()
    if (year < 1600 || year > 2030) continue
    if (!dateMap[year]) dateMap[year] = new Set()
    dateMap[year].add(mint)
  }

  return Object.entries(dateMap)
    .sort(([a], [b]) => +a - +b)
    .map(([year, mints]) => ({ year: +year, mintMarks: [...mints].sort() }))
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const catalog = await getAllSeries()

  const output = []
  let idx = 0
  const total = catalog.reduce((n, c) => n + c.series.length, 0)

  for (const category of catalog) {
    const catOut = { name: category.name, slug: category.slug, series: [] }

    for (const series of category.series) {
      idx++
      process.stdout.write(`[${String(idx).padStart(3)}/${total}] ${series.name.padEnd(40)} `)

      let dates = []
      try {
        dates = await parseSeriesPage(series.slug)
        console.log(`${dates.length} dates`)
      } catch (e) {
        console.log(`ERROR: ${e.message}`)
      }

      catOut.series.push({ name: series.name, slug: series.slug, dates })
      await sleep(DELAY_MS)
    }

    output.push(catOut)
  }

  const json = {
    scraped: new Date().toISOString(),
    source: 'usacoinbook.com',
    totalCategories: output.length,
    totalSeries: output.reduce((n, c) => n + c.series.length, 0),
    catalog: output,
  }

  writeFileSync('scripts/coins-data.json', JSON.stringify(json, null, 2))
  console.log(`\n✓ Done. ${json.totalSeries} series written to scripts/coins-data.json`)
}

main().catch(console.error)
