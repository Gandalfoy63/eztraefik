// Docs: docs/05 - UI-UX/Logo.md
// Measures where each letter of the wordmark sits when Chromium lays it out in Fira Sans 600 (kerning on,
// ligatures off), so the outlined wordmark matches the browser exactly. Writes build/out/layout.json.
// Runs inside the Playwright image: node measure.js  (fonts/ mounted at /logo/fonts)
const fs = require("fs");
const { chromium } = require("playwright-core");

const FONT = fs.readFileSync("/logo/fonts/FiraSans-600-latin.woff2").toString("base64");
const TEXT = "eztraefik";
const SIZE = 132, SPACING = -2, X = 270, BASELINE = 170;

(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage();
  await pg.setContent(`<style>@font-face{font-family:"Fira Sans";font-weight:600;src:url(data:font/woff2;base64,${FONT}) format("woff2")}</style>
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="256"><text id="t" x="${X}" y="${BASELINE}" font-family="Fira Sans"
    font-weight="600" font-size="${SIZE}" letter-spacing="${SPACING}" style="font-variant-ligatures:none;font-kerning:normal">${TEXT}</text></svg>`);
  await pg.evaluate(() => document.fonts.ready);
  const out = await pg.evaluate(text => {
    const t = document.getElementById("t");
    const chars = [...text].map((c, i) => ({ char: c, x: t.getStartPositionOfChar(i).x, end: t.getEndPositionOfChar(i).x }));
    return { chars, font: document.fonts.check('600 132px "Fira Sans"') };
  }, TEXT);
  if (!out.font) throw new Error("Fira Sans did not load");
  fs.mkdirSync("/build/out", { recursive: true });
  fs.writeFileSync("/build/out/layout.json", JSON.stringify({ size: SIZE, baseline: BASELINE, ...out }, null, 2));
  console.log(out.chars.map(c => `${c.char}@${c.x.toFixed(2)}`).join(" "));
  await b.close();
})();
