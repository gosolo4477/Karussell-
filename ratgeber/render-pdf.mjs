// Rendert ratgeber-de.html zu einem A4-PDF (+ Vorschaubilder mit --preview).
//   node render-pdf.mjs   (Playwright aus ../reel/node_modules)
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../reel/package.json"))("playwright");
const name = process.argv[2] || "ratgeber-de";
mkdirSync(path.join(here, "out"), { recursive: true });
const executablePath = existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage();
await page.goto(pathToFileURL(path.join(here, name + ".html")).href);
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all(Array.from(document.images).map((i) => i.decode().catch(() => {})));
});
const out = path.join(here, "out", name + ".pdf");
await page.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log(out);
