// Docs: docs/05 - UI-UX/Logo.md
// Renders the final PNGs (transparent, every size) and the frames for the GIFs, with Chromium.
// Runs in the Playwright image with /logo = marketing/logo. Frames go to build/out/frames/<name>/NNN.png.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const L = "/logo";
const geo = JSON.parse(fs.readFileSync(`${L}/build/out/geometry.json`));
const SQUARE = [16, 32, 48, 64, 128, 180, 192, 256, 512, 1024, 2048];
const LOCKUP_H = [32, 64, 128, 256, 512, 1024];
const WORD_H = [32, 64, 128, 256, 512];
const ratio = { lockup: geo.lockup_width / 256, wordmark: geo.word_box[2] / geo.word_box[3] };

// GIFs: [svg in final/svg/loop, background, width, height]
const GIFS = [];
for (const t of ["light", "dark"]) {
  const bg = t === "light" ? "#FFFFFF" : "#0D1219";
  for (const s of [256, 512]) {
    GIFS.push([`symbol-${t}-loop`, bg, s, s]);
    GIFS.push([`icon-${t}-loop`, bg, s, s]);
  }
  for (const w of [600, 1200]) GIFS.push([`lockup-${t}-loop`, bg, w, Math.round(w / ratio.lockup)]);
  GIFS.push([`wordmark-${t}-loop`, bg, 800, Math.round(800 / ratio.wordmark)]);
}
const FPS = 25;

(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage();
  let n = 0;
  const shot = async (svgFile, w, h, out) => {
    await pg.setViewportSize({ width: w, height: h });
    await pg.setContent(`<style>html,body{margin:0;background:transparent}img{display:block;width:${w}px;height:${h}px}</style><img src="data:image/svg+xml;base64,${fs.readFileSync(svgFile).toString("base64")}">`);
    await pg.waitForFunction(() => document.images[0].complete && document.images[0].naturalWidth > 0);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await pg.screenshot({ path: out, omitBackground: true });
    n++;
  };

  // ---------- PNGs ----------
  for (const f of fs.readdirSync(`${L}/final/svg/static`)) {
    const name = f.replace(".svg", "");
    const src = `${L}/final/svg/static/${f}`;
    const kind = name.split("-")[0];
    if (kind === "symbol" || kind === "icon") {
      for (const s of SQUARE) await shot(src, s, s, `${L}/final/png/${kind}/${name}-${s}.png`);
    } else {
      for (const h of kind === "lockup" ? LOCKUP_H : WORD_H) {
        const w = Math.round(h * ratio[kind]);
        await shot(src, w, h, `${L}/final/png/${kind}/${name}-${h}h.png`);
      }
    }
  }
  console.log(`png: ${n} files`);

  if (process.env.PNG_ONLY) { await b.close(); return; }
  // ---------- GIF frames: inline SVG, every animation paused at the frame time ----------
  for (const [name, bg, w, h] of GIFS) {
    const svg = fs.readFileSync(`${L}/final/svg/loop/${name}.svg`, "utf8");
    await pg.setViewportSize({ width: w, height: h });
    await pg.setContent(`<style>html,body{margin:0;background:${bg}}svg{display:block;width:${w}px;height:${h}px}</style>${svg}`);
    const dir = `${L}/build/out/frames/${name}-${w}`;
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const total = Math.round((geo.loop_ms / 1000) * FPS);
    for (let i = 0; i < total; i++) {
      await pg.evaluate(t => document.getAnimations().forEach(a => { a.pause(); a.currentTime = t; }), (i * 1000) / FPS);
      await pg.screenshot({ path: `${dir}/${String(i).padStart(3, "0")}.png` });
    }
  }
  console.log(`gif frames: ${GIFS.length} animations x ${Math.round((geo.loop_ms / 1000) * FPS)} frames`);
  fs.writeFileSync(`${L}/build/out/gifs.json`, JSON.stringify(GIFS.map(([n, , w]) => `${n}-${w}`)));
  await b.close();
})();
