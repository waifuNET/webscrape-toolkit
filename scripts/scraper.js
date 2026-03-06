/**
 * Script 1: Universal Web Scraper
 * Usage: node scraper.js <url> [--json | --csv]
 *
 * Extracts: title, meta description, all headings, links, images, paragraphs
 * Output: console (default), JSON file, or CSV file
 */

const axios  = require('axios');
const cheerio = require('cheerio');
const fs     = require('fs');
const path   = require('path');

const [,, url, flag] = process.argv;

if (!url) {
  console.error('Usage: node scraper.js <url> [--json | --csv]');
  process.exit(1);
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function scrape(targetUrl) {
  console.log(`\nFetching: ${targetUrl} ...`);

  const { data, status } = await axios.get(targetUrl, {
    headers: HEADERS,
    timeout: 10_000,
    maxRedirects: 5,
  });

  if (status !== 200) throw new Error(`HTTP ${status}`);

  const $ = cheerio.load(data);

  // ── Extract ──────────────────────────────────────────────────────────────
  const result = {
    url: targetUrl,
    scrapedAt: new Date().toISOString(),
    title: $('title').text().trim(),
    metaDescription: $('meta[name="description"]').attr('content') || '',
    headings: {
      h1: $('h1').map((_, el) => $(el).text().trim()).get(),
      h2: $('h2').map((_, el) => $(el).text().trim()).get(),
      h3: $('h3').map((_, el) => $(el).text().trim()).get(),
    },
    paragraphs: $('p')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(t => t.length > 40),
    links: $('a[href]')
      .map((_, el) => ({
        text: $(el).text().trim().substring(0, 80),
        href: $(el).attr('href'),
      }))
      .get()
      .filter(l => l.href && !l.href.startsWith('#')),
    images: $('img[src]')
      .map((_, el) => ({
        alt: $(el).attr('alt') || '',
        src: $(el).attr('src'),
      }))
      .get(),
  };

  // ── Output ───────────────────────────────────────────────────────────────
  if (flag === '--json') {
    const outFile = path.join(process.cwd(), 'scrape-result.json');
    fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
    console.log(`\nSaved → ${outFile}`);

  } else if (flag === '--csv') {
    const rows = result.links.map(l => `"${l.text.replace(/"/g, '""')}","${l.href}"`);
    const csv  = ['text,href', ...rows].join('\n');
    const outFile = path.join(process.cwd(), 'scrape-links.csv');
    fs.writeFileSync(outFile, csv);
    console.log(`\nSaved ${rows.length} links → ${outFile}`);

  } else {
    console.log('\n──── RESULT ────────────────────────────────────');
    console.log(`Title:       ${result.title}`);
    console.log(`Description: ${result.metaDescription}`);
    console.log(`H1:          ${result.headings.h1.slice(0, 3).join(' | ')}`);
    console.log(`Links found: ${result.links.length}`);
    console.log(`Images:      ${result.images.length}`);
    console.log(`Paragraphs:  ${result.paragraphs.length}`);
    console.log('────────────────────────────────────────────────\n');
    console.log('Tip: add --json or --csv to save results to a file');
  }

  return result;
}

scrape(url).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
