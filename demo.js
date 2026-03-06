/**
 * WebScrape Toolkit — Demo Runner
 * Run: node demo.js
 */

const chalk = require('chalk');

console.log(chalk.bold.cyan('\n╔══════════════════════════════════════╗'));
console.log(chalk.bold.cyan('║      WebScrape Toolkit  v1.0         ║'));
console.log(chalk.bold.cyan('╚══════════════════════════════════════╝\n'));

console.log(chalk.yellow('Available scripts:\n'));
const scripts = [
  { cmd: 'node scripts/scraper.js <url>',          desc: 'Extract all text, links, images from any page' },
  { cmd: 'node scripts/lead-extractor.js <url>',   desc: 'Pull emails + phone numbers from a website' },
  { cmd: 'node scripts/price-monitor.js',          desc: 'Monitor product prices and alert on drop' },
  { cmd: 'node scripts/sitemap-crawler.js <url>',  desc: 'Crawl entire site, export URLs to CSV' },
  { cmd: 'node scripts/contact-finder.js <url>',   desc: 'Find contact pages + social media links' },
];

scripts.forEach(({ cmd, desc }) => {
  console.log(`  ${chalk.green(cmd)}`);
  console.log(`  ${chalk.gray('→ ' + desc)}\n`);
});

console.log(chalk.bold.white('Quick start:'));
console.log(chalk.white('  npm install'));
console.log(chalk.white('  node scripts/scraper.js https://example.com\n'));
