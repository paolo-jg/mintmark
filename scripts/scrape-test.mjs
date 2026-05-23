// Quick test: parse 3 series and print results
const BASE = 'https://www.usacoinbook.com'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
}

async function fetchPage(url) {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

// URLs are: /coins/{id}/{category}/{series}/{year}-{mint}/{variety}/
async function parseSeries(seriesSlug) {
  const url = `${BASE}/coins/${seriesSlug}/`
  const html = await fetchPage(url)

  // Match: /coins/{digits}/{seriesSlug}/{year}-{mint}/
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

const tests = [
  { name: 'Morgan Dollar',       slug: 'dollars/morgan' },
  { name: 'Lincoln Wheat Cent',  slug: 'small-cents/lincoln-wheat-cent' },
  { name: 'Washington Quarter',  slug: 'quarters/washington' },
]

for (const t of tests) {
  const dates = await parseSeries(t.slug)
  console.log(`\n${t.name}: ${dates.length} dates`)
  dates.slice(0, 5).forEach(d => console.log(`  ${d.year}: [${d.mintMarks.join(', ')}]`))
  if (dates.length > 5) console.log(`  ... and ${dates.length - 5} more`)
}
