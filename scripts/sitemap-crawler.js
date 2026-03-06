/**
 * Script 4: Sitemap Crawler
 * Usage: node sitemap-crawler.js <url> [--limit=500]
 *
 * Tries sitemap.xml first; falls back to crawling <a href> links.
 * Exports every discovered URL to sitemap-urls.csv with:
 *   url, status, contentType, wordCount, crawledAt
 */

const axios   = require('axios');
const cheerio = require('cheerio');
const fs      = require('fs');
const path    = require('path');
const pLimit  = require('p-limit');

const [,, rootUrl, limitArg] = process.argv;
if (!rootUrl) {
  console.error('Usage: node sitemap-crawler.js <url> [--limit=200]');
  process.exit(1);
}

const MAX_PAGES   = parseInt((limitArg || '--limit=200').replace('--limit=', ''), 10);
const CONCURRENCY = 5;
const HEADERS     = { 'User-Agent': 'Mozilla/5.0 (compatible; SitemapBot/1.0)' };

const visited = new Set();
const results = [];

function normalise(base, href) {
  try {
    const u = new URL(href, base);
    u.hash = '';
    return u.origin === new URL(base).origin ? u.href : null;
  } catch { return null; }
}

async function fetchSitemap(base) {
  const candidates = [
    new URL('/sitemap.xml', base).href,
    new URL('/sitemap_index.xml', base).href,
    new URL('/sitemap.txt', base).href,
  ];
  for (const url of candidates) {
    try {
      const { data } = await axios.get(url, { headers: HEADERS, timeout: 8_000 });
      const urls = [...data.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1].trim());
      if (urls.length > 0) {
        console.log(`Found sitemap at ${url} with ${urls.length} URLs`);
        return urls;
      }
    } catch { /* not found */ }
  }
  return [];
}

async function crawlPage(url) {
  if (visited.has(url) || results.length >= MAX_PAGES) return [];
  visited.add(url);

  let status = 0, contentType = '', wordCount = 0, links = [];
  try {
    const res = await axios.get(url, {
      headers: HEADERS, timeout: 8_000, maxRedirects: 3,
      validateStatus: () => true,
    });
    status      = res.status;
    contentType = (res.headers['content-type'] || '').split(';')[0];
    if (contentType.includes('html')) {
      const $ = cheerio.load(res.data);
      wordCount = $.text().split(/\s+/).filter(Boolean).length;
      links = $('a[href]').map((_, el) => $(el).attr('href')).get()
        .map(h => normalise(url, h)).filter(Boolean)
        .filter(u => !visited.has(u));
    }
  } catch (err) {
    status = -1;
  }

  results.push({ url, status, contentType, wordCount, crawledAt: new Date().toISOString() });
  process.stdout.write(`\r  Crawled: ${results.length} / ${MAX_PAGES} pages`);
  return links;
}

(async () => {
  console.log(`\nSitemap Crawler — ${rootUrl}  (max ${MAX_PAGES} pages)\n`);

  // 1. Try sitemap.xml
  const sitemapUrls = await fetchSitemap(rootUrl);

  if (sitemapUrls.length > 0) {
    const limit = pLimit(CONCURRENCY);
    const batch = sitemapUrls.slice(0, MAX_PAGES);
    await Promise.all(batch.map(u => limit(() => crawlPage(u))));
  } else {
    // 2. Fallback: BFS crawl
    console.log('No sitemap found — BFS crawling...');
    let queue = [rootUrl];
    while (queue.length > 0 && results.length < MAX_PAGES) {
      const limit = pLimit(CONCURRENCY);
      const batch = queue.splice(0, CONCURRENCY);
      const childArrays = await Promise.all(batch.map(u => limit(() => crawlPage(u))));
      childArrays.flat().forEach(u => { if (!visited.has(u)) queue.push(u); });
    }
  }

  console.log(`\n\nDiscovered ${results.length} pages.`);

  const header = '"url","status","contentType","wordCount","crawledAt"\n';
  const csv = header + results.map(r =>
    [r.url, r.status, r.contentType, r.wordCount, r.crawledAt]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  ).join('\n');

  const outFile = path.join(process.cwd(), 'sitemap-urls.csv');
  fs.writeFileSync(outFile, csv);
  console.log(`Saved → ${outFile}\n`);
})().catch(err => { console.error(err.message); process.exit(1); });
