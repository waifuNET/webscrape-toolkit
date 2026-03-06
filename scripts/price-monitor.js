/**
 * Script 3: Price Monitor
 * Usage: node price-monitor.js
 *
 * Edit the WATCHLIST below, then run.
 * Re-run manually or via cron every N minutes.
 * When a price drops below your target, logs an alert + saves to price-log.csv.
 *
 * Works with Amazon, eBay, and most e-commerce sites that render prices in HTML.
 */

const axios   = require('axios');
const cheerio = require('cheerio');
const fs      = require('fs');
const path    = require('path');

// ── CONFIGURATION ── Edit this to match your products ──────────────────────
const WATCHLIST = [
  {
    name:      'Example Product 1',
    url:       'https://www.amazon.com/dp/B08N5WRWNW',
    selector:  '.a-price-whole',            // CSS selector for the price element
    targetPrice: 29.99,                     // Alert when price drops below this
  },
  // Add more products here:
  // {
  //   name: 'My Product',
  //   url: 'https://shop.example.com/product',
  //   selector: '.price',
  //   targetPrice: 49.99,
  // },
];
// ───────────────────────────────────────────────────────────────────────────

const LOG_FILE = path.join(process.cwd(), 'price-log.csv');
const HEADERS  = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Accept-Language': 'en-US,en;q=0.9',
};

function parsePrice(raw) {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

async function checkPrice(item) {
  try {
    const { data } = await axios.get(item.url, { headers: HEADERS, timeout: 10_000 });
    const $       = cheerio.load(data);
    const raw     = $(item.selector).first().text().trim();
    const price   = parsePrice(raw);
    return { ...item, price, raw, checkedAt: new Date().toISOString() };
  } catch (err) {
    return { ...item, price: null, error: err.message, checkedAt: new Date().toISOString() };
  }
}

function appendLog(row) {
  const line = [row.checkedAt, row.name, row.price ?? 'ERR', row.targetPrice, row.url]
    .map(v => `"${String(v).replace(/"/g, '""')}"`)
    .join(',') + '\n';

  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '"checkedAt","name","price","target","url"\n');
  }
  fs.appendFileSync(LOG_FILE, line);
}

(async () => {
  console.log(`\nPrice Monitor — checking ${WATCHLIST.length} product(s)...\n`);

  for (const item of WATCHLIST) {
    const result = await checkPrice(item);

    if (result.error) {
      console.log(`  ✗ ${result.name}: ERROR — ${result.error}`);
    } else {
      const symbol = result.price <= result.targetPrice ? '🔔 ALERT' : '     OK';
      console.log(`  ${symbol}  ${result.name}: $${result.price} (target $${result.targetPrice})`);

      if (result.price <= result.targetPrice) {
        console.log(`         → BUY NOW: ${result.url}`);
      }
    }

    appendLog(result);
  }

  console.log(`\nLog saved → ${LOG_FILE}`);
  console.log('Tip: run this script via a cron job or Windows Task Scheduler to check periodically.\n');
})();
