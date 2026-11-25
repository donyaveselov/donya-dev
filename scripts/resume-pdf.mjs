#!/usr/bin/env node
// The resume as PDF, in Russian and English: the site's own resume sheet (/resume), printed by Chrome. The sheet in
// index.html is the one source of the resume; its print styles (room.css, @media print) make it one A4 page.
//   npm run build && npm run preview &
//   node scripts/resume-pdf.mjs [site url, default http://127.0.0.1:4173] [out dir, default resume-pdf/]
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const [url = 'http://127.0.0.1:4173', out = 'resume-pdf'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const lang of ['ru', 'en']) {
  const page = await browser.newPage({ locale: lang });
  await page.goto(`${url}/resume`);
  await page.waitForFunction(() => !document.body.classList.contains('booting'));
  await page.evaluate(() => document.fonts.ready);
  const file = join(out, `Daniil-Ivanov-CV-${lang}.pdf`);
  await page.pdf({ path: file, preferCSSPageSize: true });
  console.log(file);
  await page.close();
}
await browser.close();
