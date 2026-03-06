# WebScrape Toolkit — 5 Node.js Scripts

> **5 production-ready web scraping & automation scripts. One-time purchase. No subscriptions.**

## What's included

| Script | What it does |
|---|---|
| `scraper.js` | Extract title, headings, links, images from any page → JSON/CSV |
| `lead-extractor.js` | Crawl a site, pull all emails & phones → `leads.csv` |
| `price-monitor.js` | Watch product prices, alert on drop → `price-log.csv` |
| `sitemap-crawler.js` | Discover every URL on a site → `sitemap-urls.csv` |
| `contact-finder.js` | Find emails, phones, addresses, social links → JSON |

---

## Quick Start

```bash
# 1. Install (once)
npm install

# 2. Run
node scripts/scraper.js https://example.com --json
node scripts/lead-extractor.js https://company.com --depth=2
node scripts/contact-finder.js https://company.com
node scripts/sitemap-crawler.js https://site.com --limit=200
node scripts/price-monitor.js   # edit WATCHLIST inside the file first
```

**Requires Node.js 16+** — [nodejs.org](https://nodejs.org)

---

## Script Details

### 1. `scraper.js`
```
node scripts/scraper.js <url> [--json | --csv]
```
Outputs: title, meta description, h1/h2/h3, paragraphs, links, images.
- `--json` → `scrape-result.json`
- `--csv`  → `scrape-links.csv` (all links)

---

### 2. `lead-extractor.js`
```
node scripts/lead-extractor.js <url> [--depth=2]
```
Crawls the entire domain up to N levels deep.
Extracts emails + phone numbers from every page.
Output: `leads.csv` with `company, email, phones, sourceUrl`.

---

### 3. `price-monitor.js`
```
node scripts/price-monitor.js
```
Edit the `WATCHLIST` array at the top of the file.  
For each product, set: `url`, `selector` (CSS), `targetPrice`.  
Run via **cron** (Linux/Mac) or **Task Scheduler** (Windows) every 15–60 min.
Output: `price-log.csv` with all check history.

---

### 4. `sitemap-crawler.js`
```
node scripts/sitemap-crawler.js <url> [--limit=200]
```
1. Tries `sitemap.xml` / `sitemap_index.xml` first.
2. Falls back to BFS link crawl if no sitemap found.
Output: `sitemap-urls.csv` with `url, status, contentType, wordCount, crawledAt`.

---

### 5. `contact-finder.js`
```
node scripts/contact-finder.js <url>
```
Scans root page + all detected contact/about sub-pages.
Extracts: emails, phones, addresses, social profiles (LinkedIn, Twitter, GitHub, etc.).
Output: console summary + `contact-report.json`.

---

## License

MIT — use freely in personal and commercial projects.
