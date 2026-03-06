/**
 * Script 2: Lead Extractor
 * Usage: node lead-extractor.js <url> [--depth=2]
 *
 * Crawls a website up to N levels deep and extracts:
 *   - Email addresses
 *   - Phone numbers
 *   - Company name (best-guess from title/meta)
 * Output: leads.csv
 */

const axios   = require('axios');
const cheerio = require('cheerio');
const fs      = require('fs');
const path    = require('path');
const pLimit  = require('p-limit');

const [,, startUrl, depthArg] = process.argv;
if (!startUrl) {
  console.error('Usage: node lead-extractor.js <url> [--depth=2]');
  process.exit(1);
}

const MAX_DEPTH   = parseInt((depthArg || '--depth=2').replace('--depth=', ''), 10);
const CONCURRENCY = 3;
const HEADERS     = { 'User-Agent': 'Mozilla/5.0 (compatible; LeadBot/1.0)' };

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\+?1[\s.-]?)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g;

const visited = new Set();
const leads   = new Map(); // email → lead object

function normaliseUrl(base, href) {
  try {
    const u = new URL(href, base);
    u.hash = '';
    return u.origin === new URL(base).origin ? u.href : null;
  } catch { return null; }
}

async function crawl(url, depth) {
  if (depth < 0 || visited.has(url)) return;
  visited.add(url);

  let html;
  try {
    const res = await axios.get(url, { headers: HEADERS, timeout: 8_000, maxRedirects: 3 });
    html = res.data;
  } catch { return; }

  const $ = cheerio.load(html);
  const text = $.text();

  // Extract emails
  const emails = [...new Set(text.match(EMAIL_RE) || [])].filter(e =>
    !e.endsWith('.png') && !e.endsWith('.jpg') && !e.includes('example')
  );

  const phones = [...new Set(text.match(PHONE_RE) || [])];
  const company = $('title').text().trim().split(/[|\-–]/)[0].trim();

  emails.forEach(email => {
    if (!leads.has(email)) {
      leads.set(email, { company, email, phones: phones.join('; '), sourceUrl: url });
    }
  });

  // Queue child links
  if (depth > 0) {
    const limit   = pLimit(CONCURRENCY);
    const hrefs   = $('a[href]').map((_, el) => $(el).attr('href')).get();
    const children = [...new Set(
      hrefs.map(h => normaliseUrl(url, h)).filter(Boolean)
    )].filter(u => !visited.has(u));

    await Promise.all(children.map(child => limit(() => crawl(child, depth - 1))));
  }
}

(async () => {
  console.log(`\nLeadExtractor — crawling ${startUrl} (depth=${MAX_DEPTH}) ...\n`);
  await crawl(startUrl, MAX_DEPTH);

  const rows = [...leads.values()];
  console.log(`Found ${rows.length} leads across ${visited.size} pages.`);

  if (rows.length === 0) {
    console.log('No emails found on this site.');
    return;
  }

  const header = 'company,email,phones,sourceUrl\n';
  const csv = header + rows.map(r =>
    [r.company, r.email, r.phones, r.sourceUrl]
      .map(v => `"${(v || '').replace(/"/g, '""')}"`)
      .join(',')
  ).join('\n');

  const outFile = path.join(process.cwd(), 'leads.csv');
  fs.writeFileSync(outFile, csv);
  console.log(`Saved → ${outFile}`);
})().catch(err => { console.error(err.message); process.exit(1); });
