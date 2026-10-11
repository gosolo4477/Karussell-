// Rendert reel/index.html Bild für Bild zu einem MP4 (1080x1920, 30 fps).
//
//   node render.mjs [--lang es|de]                 -> out/reel-<lang>-beat.mp4 + out/reel-<lang>-stumm.mp4
//   node render.mjs [--lang es|de] --stills 1,5,9  -> out/still-<lang>-<sek>.png (Vorschaubilder)
//
// Benötigt: Playwright (npm i) und ffmpeg im PATH.
import { chromium } from "playwright";
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "out");
mkdirSync(out, { recursive: true });

const FPS = 30;
const args = process.argv.slice(2);
const stillsArg = args.includes("--stills") ? args[args.indexOf("--stills") + 1] : null;
const lang = args.includes("--lang") ? args[args.indexOf("--lang") + 1] : "es";

const executablePath = process.env.CHROMIUM_PATH || (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on("pageerror", (e) => console.error("Seitenfehler:", e.message));

await page.goto(pathToFileURL(path.join(here, "index.html")).href + "?render=1&lang=" + lang);
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => {})));
  await window.reel.ready();
});
const { duration, slideStarts } = await page.evaluate(() => ({ duration: window.reel.duration, slideStarts: window.reel.slideStarts }));
const stage = page.locator("#stage");

const seek = async (time) => {
  await page.evaluate((tm) => window.reel.seek(tm), time);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
};

if (stillsArg) {
  for (const s of stillsArg.split(",").map(Number)) {
    await seek(s);
    await stage.screenshot({ path: path.join(out, `still-${lang}-${s}.png`) });
  }
  console.log("Standbilder in", out);
} else {
  const silent = path.join(out, `reel-${lang}-stumm.mp4`);
  const ff = spawn("ffmpeg", [
    "-loglevel", "error", "-y",
    "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", silent,
  ], { stdio: ["pipe", "inherit", "inherit"] });

  const frames = Math.round(duration * FPS);
  for (let f = 0; f < frames; f++) {
    await seek(f / FPS);
    const buf = await stage.screenshot({ type: "jpeg", quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % 60 === 0) console.log(`Bild ${f}/${frames}`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));

  // Beat-Spur erzeugen und dazumischen
  const beat = path.join(out, `beat-${lang}.wav`);
  execFileSync("python3", [path.join(here, "beat.py"), beat, String(duration), slideStarts.join(",")]);
  execFileSync("ffmpeg", [
    "-loglevel", "error", "-y", "-i", silent, "-i", beat,
    "-c:v", "copy", "-af", "loudnorm=I=-11:TP=-1:LRA=7", "-ar", "44100",
    "-c:a", "aac", "-b:a", "192k", "-shortest",
    path.join(out, `reel-${lang}-beat.mp4`),
  ]);
  console.log("Fertig:", out);
}

await browser.close();
