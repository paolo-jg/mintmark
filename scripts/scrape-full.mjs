/**
 * Comprehensive USA Coin Book scraper.
 * Captures for every series: designer, composition, diameter, weight, description, image URL
 * Captures for every coin date/variety: mintage, description, image URL, price table
 *
 * Run: node scripts/scrape-full.mjs
 * Output: scripts/full-coin-data.json
 */

import { writeFileSync, readFileSync, existsSync } from 'fs'

const BASE = 'https://www.usacoinbook.com'
const DELAY_MS = 600
const CHECKPOINT_FILE = 'scripts/scrape-checkpoint.json'
const OUTPUT_FILE = 'scripts/full-coin-data.json'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchPage(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS })
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      return res.text()
    } catch (e) {
      if (i === retries - 1) throw e
      console.warn(`  Retry ${i + 1} for ${url}: ${e.message}`)
      await sleep(1500)
    }
  }
}

function extractText(html, pattern) {
  const m = html.match(pattern)
  return m ? m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim() : null
}

// ── Catalog sidebar ───────────────────────────────────────────────────────────
async function getAllSeries() {
  console.log('Fetching catalog sidebar...')
  const html = await fetchPage(`${BASE}/catalog-coins.php`)

  const allLinks = []
  const linkRe = /href='([^']+)'[^>]*class='[^']*sidebar-coin(dem|type)-link'[^>]*>([^<]+)/g
  let m
  while ((m = linkRe.exec(html)) !== null) {
    allLinks.push({ type: m[2], url: m[1], name: m[3].trim() })
  }

  const catalog = []
  let currentCategory = null
  for (const link of allLinks) {
    if (link.type === 'dem') {
      const slug = link.url.replace(`${BASE}/coins/`, '').replace(/\/$/, '')
      currentCategory = { name: link.name, slug, url: link.url, series: [] }
      catalog.push(currentCategory)
    } else if (link.type === 'type' && currentCategory) {
      const slug = link.url.replace(`${BASE}/coins/`, '').replace(/\/$/, '')
      currentCategory.series.push({ name: link.name, slug, url: link.url })
    }
  }

  const total = catalog.reduce((s, c) => s + c.series.length, 0)
  console.log(`Found ${catalog.length} categories, ${total} series`)
  return catalog
}

// ── Series page ───────────────────────────────────────────────────────────────
function parseSeriesPage(html, seriesSlug) {
  const result = {}

  // Specs in coin-table-specs divs
  const specRe = /<div[^>]*class='coin-table-specs'[^>]*><b>([^<]+)<\/b>([^<]*(?:<[^/][^>]*>[^<]*<\/[^>]+>[^<]*)*)<\/div>/g
  let sm
  while ((sm = specRe.exec(html)) !== null) {
    const key = sm[1].replace(/:\s*$/, '').trim().toLowerCase()
    const val = sm[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim()
    if (!val) continue
    if (key.includes('designer') || key.includes('engraver')) result.designer = val
    else if (key.includes('metal') || key.includes('composition')) result.composition = val
    else if (key.includes('diameter')) result.diameter = val
    else if (key.includes('mass') || key.includes('weight')) result.weight = val
    else if (key.includes('edge')) result.edge = val
    else if (key.includes('total mintage') || key.includes('total coins')) result.totalMintage = val
  }

  // Series description — paragraph after main heading
  const descRe = /<article[^>]*>([\s\S]*?)<\/article>/i
  const articleM = html.match(descRe)
  if (articleM) {
    // Get first meaningful paragraph
    const paraRe = /<p[^>]*>([\s\S]+?)<\/p>/g
    let pm
    while ((pm = paraRe.exec(articleM[1])) !== null) {
      const text = pm[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim()
      if (text.length > 80) {
        result.description = text
        break
      }
    }
  }

  // Fallback description from meta description
  if (!result.description) {
    const metaM = html.match(/<meta\s+name=['"]description['"]\s+content=['"]([^'"]{50,})['"]/i)
    if (metaM) result.description = metaM[1].trim()
  }

  // Series image from og:image or i.usacoinbook.com
  const ogImgM = html.match(/<meta\s+property=['"]og:image['"]\s+content=['"]([^'"]+)['"]/i)
  if (ogImgM) result.imageUrl = ogImgM[1]
  else {
    const imgM = html.match(/src=['"]https:\/\/i\.usacoinbook\.com\/us-coins\/600\/([^'"]+)['"]/i)
    if (imgM) result.imageUrl = `https://i.usacoinbook.com/us-coins/600/${imgM[1]}`
  }

  // All coin links on this series page (absolute URLs)
  // Format: https://www.usacoinbook.com/coins/3185/dollars/morgan/1878-P/8-tail-feathers/
  const coinLinkRe = /href='(https:\/\/www\.usacoinbook\.com\/coins\/(\d+)\/[^']+)'[^>]*>/g
  const coinLinks = new Set()
  let clm
  while ((clm = coinLinkRe.exec(html)) !== null) {
    const href = clm[1]
    // Must have at least: /coins/ID/category/series/year/
    const parts = href.replace(`${BASE}/coins/`, '').replace(/\/$/, '').split('/')
    if (parts.length >= 4) {
      coinLinks.add(href)
    }
  }

  // Series image from i.usacoinbook.com
  const imgM = html.match(/https:\/\/i\.usacoinbook\.com\/us-coins\/600\/([^'">\s]+)/)
  if (imgM) result.imageUrl = imgM[0]

  result.coinLinks = [...coinLinks]
  return result
}

// ── Individual coin page ──────────────────────────────────────────────────────
function parseCoinPage(html, url) {
  const result = { url }

  // Mintage — inside coin-table-specs: <b>Mintage: </b>750,000
  const mintM = html.match(/<b>Mintage:\s*<\/b>\s*([\d,]+(?:\s*\+?)?)/i)
    || html.match(/Mintage:\s*<\/b>\s*([\d,]+)/i)
    || html.match(/<b>Mintage:\s*<\/b>([^<]+)/i)
  if (mintM) result.mintage = mintM[1].replace(/,/g, '').replace(/\s/g, '').trim()

  // Coin name/title
  const titleM = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  if (titleM) result.title = titleM[1].replace(/<[^>]+>/g, '').trim()

  // Description — extract text after "What This Coin Looks Like"
  const descIdx = html.indexOf('What This Coin Looks Like')
  if (descIdx > -1) {
    // After the heading and image, get the first text block
    const afterHeading = html.slice(descIdx + 100, descIdx + 3000)
    // Find text after <br /> following the image
    const textBlocks = afterHeading.split(/<br\s*\/?>/i)
    for (const block of textBlocks) {
      const text = block.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim()
      if (text.length > 40 && !text.includes('Coin Value Price') && !text.startsWith('USA Coin Book')) {
        result.description = text.slice(0, 500)
        break
      }
    }
  }
  // Fallback: coin-profile text blocks
  if (!result.description) {
    const profileM = html.match(/<div[^>]*class='coin-profile'[^>]*>([\s\S]*?)<\/div>\s*<div/i)
    if (profileM) {
      const text = profileM[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      const useful = text.replace(/Mintage:[^.]+\./g, '').replace(/Minted at:[^.]+\./g, '').trim()
      if (useful.length > 60) result.description = useful.slice(0, 400)
    }
  }

  // Coin image
  const ogImgM = html.match(/<meta\s+property=['"]og:image['"]\s+content=['"]([^'"]+)['"]/i)
  if (ogImgM) result.imageUrl = ogImgM[1]
  else {
    const imgM = html.match(/src=['"]https:\/\/i\.usacoinbook\.com\/us-coins\/600\/([^'"]+)['"]/i)
    if (imgM) result.imageUrl = `https://i.usacoinbook.com/us-coins/600/${imgM[1]}`
  }

  // Value summary text
  const valSumM = html.match(/USA Coin Book Estimated Value[^<]{20,500}/i)
  if (valSumM) result.valueSummary = valSumM[0].replace(/<[^>]+>/g, '').trim()

  // Price table — coin-value-table (class may be "coin-value-table mobile-optimized")
  const tableElM = /<table[^>]*class="coin-value-table[^"]*"[^>]*>/i.exec(html)
  if (tableElM) {
    const tableStart = tableElM.index
    const tableEnd = html.indexOf('</table>', tableStart) + 8
    const tableHtml = html.slice(tableStart, tableEnd)

    // Headers — strip <br/> tags and get text
    const thRe = /<th[^>]*>([\s\S]*?)<\/th>/gi
    const headers = []
    let thm
    while ((thm = thRe.exec(tableHtml)) !== null) {
      headers.push(thm[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    }

    // Rows (tbody rows)
    const rows = []
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    let rm
    while ((rm = rowRe.exec(tableHtml)) !== null) {
      const cells = []
      const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi
      let tdm
      while ((tdm = tdRe.exec(rm[1])) !== null) {
        cells.push(tdm[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
      }
      if (cells.length > 0) rows.push(cells)
    }

    if (headers.length && rows.length) {
      result.priceTable = { headers, rows }
    }
  }

  // Extract year and mintmark from URL
  // URL format: https://www.usacoinbook.com/coins/ID/category/series/year-MINT/variety/
  const urlParts = url.replace(`${BASE}/coins/`, '').replace(/\/$/, '').split('/')
  // urlParts: [ID, category, series, year-MINT, variety?]
  if (urlParts.length >= 4) {
    const yearMint = urlParts[3] // e.g. "1878-P" or "1878"
    const ym = yearMint.match(/^(\d{4})(?:-([A-Z]+))?/)
    if (ym) {
      result.year = parseInt(ym[1])
      result.mintMark = ym[2] || 'P'
    }
    if (urlParts.length >= 5) {
      result.variety = urlParts[4].replace(/-/g, ' ')
    }
  }

  return result
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // Load checkpoint if exists
  let checkpoint = {}
  if (existsSync(CHECKPOINT_FILE)) {
    checkpoint = JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf8'))
    console.log(`Resuming from checkpoint: ${Object.keys(checkpoint).length} series done`)
  }

  const catalog = await getAllSeries()
  await sleep(DELAY_MS)

  const result = { categories: [] }
  let totalCoins = 0
  let seriesDone = 0
  const totalSeries = catalog.reduce((s, c) => s + c.series.length, 0)

  for (const category of catalog) {
    const catResult = { name: category.name, slug: category.slug, series: [] }
    result.categories.push(catResult)

    for (const series of category.series) {
      seriesDone++
      const checkKey = series.slug

      // Use checkpoint if available
      if (checkpoint[checkKey]) {
        console.log(`[${seriesDone}/${totalSeries}] SKIP ${series.name} (checkpointed)`)
        catResult.series.push(checkpoint[checkKey])
        totalCoins += (checkpoint[checkKey].coins || []).length
        continue
      }

      console.log(`[${seriesDone}/${totalSeries}] ${series.name} — ${series.url}`)

      const seriesData = {
        name: series.name,
        slug: series.slug,
        url: series.url,
        coins: [],
      }

      try {
        const seriesHtml = await fetchPage(series.url)
        await sleep(DELAY_MS)

        const parsed = parseSeriesPage(seriesHtml, series.slug)
        Object.assign(seriesData, parsed)

        const { coinLinks, ...seriesSpecs } = parsed
        Object.assign(seriesData, seriesSpecs)

        console.log(`  Specs: designer=${seriesData.designer?.slice(0, 30)}, links=${coinLinks.length}`)

        // Scrape each individual coin page
        let coinsDone = 0
        for (const coinUrl of coinLinks) {
          coinsDone++
          if (coinsDone % 10 === 0) {
            console.log(`  Coins: ${coinsDone}/${coinLinks.length}`)
          }

          try {
            const coinHtml = await fetchPage(coinUrl)
            const coinData = parseCoinPage(coinHtml, coinUrl)
            seriesData.coins.push(coinData)
            totalCoins++
            await sleep(DELAY_MS)
          } catch (e) {
            console.warn(`  Failed coin ${coinUrl}: ${e.message}`)
          }
        }

        console.log(`  Done: ${seriesData.coins.length} coins`)
      } catch (e) {
        console.error(`  Failed series ${series.name}: ${e.message}`)
      }

      // Save checkpoint
      checkpoint[checkKey] = seriesData
      writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2))

      catResult.series.push(seriesData)
      await sleep(DELAY_MS)
    }
  }

  console.log(`\nTotal: ${seriesDone} series, ${totalCoins} coins`)
  writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2))
  console.log(`Written to ${OUTPUT_FILE}`)
}

main().catch(console.error)
