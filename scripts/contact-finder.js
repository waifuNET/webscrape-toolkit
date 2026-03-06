/**
 * Script 5: Contact Finder
 * Usage: node contact-finder.js <url>
 *
 * Finds on a website:
 *   - Contact / About pages
 *   - Social media profile links (LinkedIn, Twitter/X, Facebook, Instagram, GitHub)
 *   - Emails and phone numbers
 *   - Physical address (best-effort)
 * Output: console + contact-report.json
 */

const axios   = require('axios');
const cheerio = require('cheerio');
const fs      = require('fs');
const path    = require('path');

const [,, rootUrl] = process.argv;
if (!rootUrl) {
  console.error('Usage: node contact-finder.js <url>');
  process.exit(1);
}

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };

const SOCIAL_PATTERNS = {
  linkedin:  /linkedin\.com\/(company|in)\//i,
  twitter:   /twitter\.com\/|x\.com\//i,
  facebook:  /facebook\.com\//i,
  instagram: /instagram\.com\//i,
  github:    /github\.com\//i,
  youtube:   /youtube\.com\/(channel|@)/i,
};

const EMAIL_RE   = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE   = /(\+?1[\s.-]?)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g;
const ADDRESS_RE = /\d{1,5}\s[\w\s]{3,40},\s[\w\s]{2,30},?\s[A-Z]{2}\s\d{5}/g;

const CONTACT_KEYWORDS = ['contact', 'about', 'about-us', 'team', 'reach', 'connect', 'support'];

async function fetch(url) {
  const res = await axios.get(url, {
    headers: HEADERS, timeout: 10_000, maxRedirects: 5,
    validateStatus: s => s < 400,
  });
  return res.data;
}

function extractFromHtml(html, sourceUrl) {
  const $ = cheerio.load(html);
  const text = $.text();
  return {
    emails:    [...new Set(text.match(EMAIL_RE)   || [])].filter(e => !e.endsWith('.png') && !e.includes('example')),
    phones:    [...new Set(text.match(PHONE_RE)   || [])],
    addresses: [...new Set(text.match(ADDRESS_RE) || [])],
    socials:   (() => {
      const found = {};
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        for (const [platform, re] of Object.entries(SOCIAL_PATTERNS)) {
          if (!found[platform] && re.test(href)) found[platform] = href;
        }
      });
      return found;
    })(),
    contactPageLinks: $('a[href]')
      .map((_, el) => $(el).attr('href'))
      .get()
      .filter(h => h && CONTACT_KEYWORDS.some(k => h.toLowerCase().includes(k)))
      .map(h => {
        try { return new URL(h, sourceUrl).href; } catch { return null; }
      })
      .filter(Boolean),
  };
}

(async () => {
  console.log(`\nContact Finder — ${rootUrl}\n`);

  const report = {
    url: rootUrl,
    scannedAt: new Date().toISOString(),
    emails: [], phones: [], addresses: [], socials: {}, contactPages: [],
  };

  // 1. Scan root page
  let rootHtml;
  try {
    rootHtml = await fetch(rootUrl);
  } catch (err) {
    console.error('Failed to fetch root:', err.message);
    process.exit(1);
  }

  const rootData = extractFromHtml(rootHtml, rootUrl);
  report.emails    = rootData.emails;
  report.phones    = rootData.phones;
  report.addresses = rootData.addresses;
  report.socials   = rootData.socials;
  report.contactPages = [...new Set(rootData.contactPageLinks)];

  // 2. Also scan each contact sub-page
  for (const cpUrl of report.contactPages.slice(0, 5)) {
    console.log(`  Scanning contact page: ${cpUrl}`);
    try {
      const html = await fetch(cpUrl);
      const d    = extractFromHtml(html, cpUrl);
      report.emails    = [...new Set([...report.emails,    ...d.emails])];
      report.phones    = [...new Set([...report.phones,    ...d.phones])];
      report.addresses = [...new Set([...report.addresses, ...d.addresses])];
      Object.assign(report.socials, d.socials);
    } catch { /* skip */ }
  }

  // ── Print results ──────────────────────────────────────────────────────
  console.log('\n══════ CONTACT REPORT ══════════════════════════');
  console.log(`Emails (${report.emails.length}):     `, report.emails.join(', ') || 'none');
  console.log(`Phones (${report.phones.length}):     `, report.phones.join(', ')  || 'none');
  console.log(`Addresses (${report.addresses.length}):`, report.addresses.join(' | ') || 'none');
  console.log(`Social profiles:`);
  for (const [p, u] of Object.entries(report.socials)) console.log(`  ${p}: ${u}`);
  console.log(`Contact pages found: ${report.contactPages.length}`);
  report.contactPages.forEach(u => console.log('  -', u));
  console.log('════════════════════════════════════════════════\n');

  const outFile = path.join(process.cwd(), 'contact-report.json');
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(`Full report → ${outFile}\n`);
})().catch(err => { console.error(err.message); process.exit(1); });
