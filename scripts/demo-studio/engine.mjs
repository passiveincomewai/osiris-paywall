// Demo Studio recording engine — executes a scene plan against the REAL
// WorldEye site in a headless Chromium (Playwright) and records video.
//
// Design rules (from production recon, 2026-11-01):
// - Playwright actionability checks hang over the always-animating globe
//   UI → all clicks are evaluate() DOM clicks; typing uses focus +
//   keyboard events; visibility is judged by DOM state, not offsetParent.
// - Every step verifies its own outcome and throws with a concrete
//   reason; the worker turns that into a job failure — footage is never
//   substituted and a broken demo is never presented as complete.
// - Step boundary timestamps are returned so the render stage can trim
//   precisely.

import { chromium } from "playwright-core";
import { startRelay } from "./relay.mjs";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export function findChromium() {
  const base = join(process.env.HOME, ".cache", "ms-playwright");
  const dirs = readdirSync(base)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  for (const d of dirs) {
    const p = join(base, d, "chrome-linux64", "chrome");
    if (existsSync(p)) return p;
  }
  throw new Error("no playwright chromium found under " + base);
}

const VIEWPORTS = {
  landscape: { width: 1440, height: 810 },
  portrait: { width: 810, height: 1440 },
  square: { width: 1080, height: 1080 },
};

export async function recordPlan({ appUrl, plan, orientation = "landscape", videoDir, log = () => {} }) {
  const viewport = VIEWPORTS[orientation] ?? VIEWPORTS.landscape;
  const relay = await startRelay();
  const browser = await chromium.launch({
    executablePath: findChromium(),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    proxy: { server: `http://127.0.0.1:${relay.port}` },
  });
  const context = await browser.newContext({
    viewport,
    recordVideo: { dir: videoDir, size: viewport },
  });
  const page = await context.newPage();
  const marks = []; // {action, t} seconds since recording start
  const t0 = Date.now();
  const mark = (action) => {
    const t = (Date.now() - t0) / 1000;
    marks.push({ action, t });
    log(`mark ${action} @ ${t.toFixed(1)}s`);
  };
  const state = { cameraTitle: null, cameraSource: null, feedVerified: false };
  // page.evaluate has no default timeout: under software-WebGL load the
  // renderer main thread can starve for many minutes, and an unbounded
  // evaluate hangs the whole job (and the worker's close path). Bound
  // the evaluates that must return a value: on timeout the step fails
  // honestly instead of wedging the run.
  const ev = (fn, arg, ms = 120000) => Promise.race([
    page.evaluate(fn, arg),
    new Promise((_, reject) => setTimeout(
      () => reject(new Error(`evaluate did not return within ${ms / 1000}s (renderer saturated)`)), ms)),
  ]);

  const dismissOverlays = async () => {
    await page.evaluate(() => {
      const clickBtnWithText = (root, text) => {
        const b = [...root.querySelectorAll("button")].find((x) => (x.textContent || "").trim() === text);
        b?.click(); return !!b;
      };
      // bookmark toast
      const toast = [...document.querySelectorAll("div")].find((d) => d.textContent.includes("Keep WorldEye one click away") && d.querySelector("button"));
      toast?.querySelectorAll("button").forEach((b) => b.click());
      // onboarding card → explore on my own
      clickBtnWithText(document, "Explore On My Own");
      // trial upsell popup (appears during idle dwell) and kin
      clickBtnWithText(document, "Not now");
      clickBtnWithText(document, "Maybe later");
      clickBtnWithText(document, "No thanks");
      // featured-camera suggestions strip close (aria-labelled)
      document.querySelector('button[aria-label="Dismiss camera suggestions"]')?.click();
      // newsletter popup close, if it has one
      const nl = [...document.querySelectorAll("div")].find((d) => /One email.*big|no spam/i.test(d.textContent) && d.querySelector('button[aria-label="Close"], button'));
      if (nl && nl.textContent.length < 600) nl.querySelector("button")?.click();
    }).catch(() => {});
    await page.waitForTimeout(400);
  };

  const waitGlobe = async () => {
    // The loading overlay fades (opacity → 0) before it leaves the DOM,
    // and body.innerText keeps reporting its text while it lingers — so
    // readiness is judged on the overlay element's own visibility, with
    // a HUD-presence fallback for very slow tile loads.
    const cleared = await page.waitForFunction(
      () => {
        const el = [...document.querySelectorAll("div, span, p")].find(
          (e) => e.children.length === 0 && (e.textContent || "").includes("ESTABLISHING SECURE CONNECTION"),
        );
        if (!el) return true;
        if (!el.getClientRects().length) return true;
        return parseFloat(getComputedStyle(el).opacity || "1") < 0.05;
      },
      { timeout: 120000 },
    ).then(() => true).catch(() => false);
    if (!cleared) {
      const hudReady = await page.evaluate(() =>
        [...document.querySelectorAll("button")].some((b) => /LAYERS & STATS/i.test(b.textContent)) &&
        document.querySelectorAll("canvas").length > 0);
      if (!hudReady) throw new Error("globe loading screen never cleared and HUD never appeared");
      log("waitGlobe: overlay still fading but HUD is live — proceeding");
    }
    await page.waitForFunction(() => document.querySelectorAll("canvas").length > 0, { timeout: 30000 });
    // let the intro flight settle and tiles stream in
    await page.waitForTimeout(5000);
  };

  const steps = {
    async goto(step) {
      await page.goto(appUrl.replace(/\/$/, "") + step.path, { waitUntil: "domcontentloaded", timeout: 90000 });
    },
    async waitGlobe() { await waitGlobe(); },
    async dismissOverlays() { await dismissOverlays(); },
    async hold(step) { await page.waitForTimeout((step.seconds ?? 2) * 1000); },

    async searchPlace(step) {
      await dismissOverlays();
      const pick = step.pick ?? step.query;
      // Poll-click the toggle until the panel REALLY opens. On this VM
      // the app hydrates very slowly under software-WebGL load
      // (evaluate round-trips alone can take tens of seconds), so a
      // single early click lands before React is listening and is
      // silently lost — the v5 run died on exactly that. Only click
      // while the panel reads closed, and give each click time to land.
      const panelDeadline = Date.now() + 240000;
      let inputReady = false;
      while (Date.now() < panelDeadline && !inputReady) {
        const st = await page.evaluate(() => ({
          expanded: document.querySelector('[data-search-toggle="true"]')?.getAttribute("aria-expanded"),
          input: !!document.querySelector('input[placeholder*="Search places"]'),
        })).catch(() => ({ expanded: null, input: false }));
        if (st.input) { inputReady = true; break; }
        if (st.expanded !== "true") {
          await page.evaluate(() => document.querySelector('[data-search-toggle="true"]')?.click()).catch(() => {});
        }
        inputReady = await page.waitForFunction(
          () => !!document.querySelector('input[placeholder*="Search places"]'),
          { timeout: 20000 },
        ).then(() => true).catch(() => false);
      }
      if (!inputReady) throw new Error("search panel never opened (toggle unresponsive after 240s of poll-clicks)");
      // Focus via evaluate — locator calls wait for element "stability",
      // which this always-animating UI never reaches (30s timeouts).
      // Type, then VERIFY the value stuck; retype if a stalled main
      // thread dropped keystrokes.
      let valueOk = false;
      for (let attempt = 0; attempt < 3 && !valueOk; attempt++) {
        await ev(() => document.querySelector('input[placeholder*="Search places"]')?.focus());
        await page.waitForTimeout(300);
        await page.keyboard.type(step.query, { delay: 80 });
        await page.waitForTimeout(600);
        valueOk = await page.evaluate((q) => document.querySelector('input[placeholder*="Search places"]')?.value === q, step.query).catch(() => false);
        if (!valueOk) {
          await page.evaluate(() => {
            const i = document.querySelector('input[placeholder*="Search places"]');
            if (i) { i.focus(); i.select?.(); }
          }).catch(() => {});
          await page.keyboard.press("Backspace").catch(() => {});
        }
      }
      if (!valueOk) throw new Error("search input never held the query text after 3 typing attempts");
      // Results render only after the camera/place indexes answer —
      // through the worker's proxied connection that has taken minutes.
      const haveResults = await page.waitForFunction(
        (p) => [...document.querySelectorAll('button, [role="option"], [role="listbox"] *')].some((b) => (b.textContent || "").trim().startsWith(p)),
        pick,
        { timeout: 180000 },
      ).then(() => true).catch(() => false);
      if (!haveResults) throw new Error(`no search results appeared for "${pick}" within 180s`);
      const picked = await ev((p) => {
        const btns = [...document.querySelectorAll('button, [role="option"]')].filter((b) => (b.textContent || "").trim().startsWith(p) && (b.textContent || "").trim().length < 160);
        // Camera results carry an "At source" suffix and read
        // "<Place> - <Area>"; a PLACE result does neither. Prefer the
        // place (the demo flies there first, then opens a camera);
        // fall back to the first camera result if no place is listed.
        const place = btns.find((b) => !/At source/i.test(b.textContent) && !b.textContent.includes(" - "));
        const target = place ?? btns[0];
        if (!target) return null;
        const label = (target.textContent || "").trim();
        target.click();
        return { label, wasCamera: /At source/i.test(label) };
      }, pick);
      if (!picked) throw new Error(`no search result matched "${pick}"`);
      log(`search picked: ${picked.label} (camera=${picked.wasCamera})`);
      if (picked.wasCamera) state.searchOpenedCamera = true;
      // Close the panel if it stayed open, for a clean frame.
      await page.waitForTimeout(600);
      await page.evaluate(() => {
        const t = document.querySelector('[data-search-toggle="true"]');
        if (t?.getAttribute("aria-expanded") === "true") t.click();
      });
      // Flight + tile load on this connection is slow; settle long.
      await page.waitForTimeout(10000);
    },

    async openCameraNearCenter(step) {
      await dismissOverlays();
      const maxTries = step.maxTries ?? 5;
      let lastError = "no camera opened";
      // The search step may already have opened a camera (when the
      // result list offered cameras only). If a viewer is open, verify
      // its feed instead of clicking again.
      const viewerAlreadyOpen = await page.evaluate(() => {
        const t = document.body.innerText;
        return /CAM-\d{3,}/.test(t) && /SECURE UPLINK|ACQUIRING UPLINK/.test(t);
      }).catch(() => false);
      if (viewerAlreadyOpen) {
        const feedOk = await page.waitForFunction(() => {
          const vids = [...document.querySelectorAll("video")].filter((v) => v.clientWidth > 100);
          for (const v of vids) { if (v.readyState >= 2 && v.videoWidth > 0) return "video"; }
          const imgs = [...document.querySelectorAll("img")].filter((i) => i.clientWidth > 200 && i.naturalWidth > 0);
          if (imgs.length) return "image";
          return false;
        }, { timeout: 45000 }).then(async () => {
          return ev(async () => {
            const v = [...document.querySelectorAll("video")].find((x) => x.videoWidth > 0);
            if (!v) return true;
            const t = v.currentTime;
            await new Promise((r) => setTimeout(r, 1500));
            return v.currentTime > t;
          });
        }).catch(() => false);
        if (feedOk) {
          state.cameraTitle = await ev(() => document.body.innerText.match(/CAM-\d{3,}/)?.[0] ?? "camera");
          state.feedVerified = true;
          log(`camera already open from search; feed verified: ${state.cameraTitle}`);
          return;
        }
        log("viewer from search had no feed — closing and trying map cameras");
        await steps.closeCamera();
        await page.waitForTimeout(1500);
      }
      for (let attempt = 1; attempt <= maxTries; attempt++) {
        log(`openCameraNearCenter: attempt ${attempt}/${maxTries}`);
        // Strategy A: a visible camera card (featured / nearby strip).
        const clickedCard = await ev(() => {
          const cards = [...document.querySelectorAll("button")].filter((b) => /WATCH|▶/i.test(b.textContent) && b.querySelector("img"));
          if (cards.length) { cards[0].click(); return true; }
          return false;
        });
        if (!clickedCard) {
          // A lingering full-screen loading video (pointer-events:auto)
          // would swallow canvas mouse clicks — wait for it to leave
          // the DOM before using the mouse strategy.
          await page.waitForFunction(
            () => ![...document.querySelectorAll("video")].some((v) => {
              const r = v.getBoundingClientRect();
              return r.width >= window.innerWidth * 0.9 && r.height >= window.innerHeight * 0.9;
            }),
            { timeout: 60000 },
          ).catch(() => {});
          // Strategy B: click the map near centre — camera markers/clusters
          // live on the canvas; a cluster zooms, a marker opens.
          const { width, height } = viewport;
          const dx = (attempt - 1) * 60 - 60;
          const dy = (attempt - 1) * 40 - 40;
          await page.mouse.click(width / 2 + dx, height / 2 + dy);
        }
        // Did the camera viewer open?
        const opened = await page.waitForFunction(() => {
          const t = document.body.innerText;
          return /CAM-\d{3,}/.test(t) && /SECURE UPLINK|ACQUIRING UPLINK|LIVE/i.test(t);
        }, { timeout: 12000 }).then(() => true).catch(() => false);
        log(`openCameraNearCenter: attempt ${attempt} clickedCard=${clickedCard} viewerOpened=${opened}`);
        if (!opened) { lastError = `attempt ${attempt}: viewer did not open`; await page.waitForTimeout(2500); continue; }
        // Verify a real feed renders (video advancing or a still image loaded).
        const feed = await page.waitForFunction(() => {
          const vids = [...document.querySelectorAll("video")].filter((v) => v.offsetParent !== null || v.clientWidth > 100);
          for (const v of vids) { if (v.readyState >= 2 && v.videoWidth > 0) return "video"; }
          const imgs = [...document.querySelectorAll("img")].filter((i) => i.clientWidth > 200 && i.naturalWidth > 0);
          if (imgs.length) return "image";
          return false;
        }, { timeout: 30000 }).then(async () => {
          // For video, confirm playback actually advances.
          const advancing = await ev(async () => {
            const v = [...document.querySelectorAll("video")].find((x) => x.videoWidth > 0);
            if (!v) return true; // image feed — loaded is enough
            const t = v.currentTime;
            await new Promise((r) => setTimeout(r, 1500));
            return v.currentTime > t;
          });
          return advancing;
        }).catch(() => false);
        if (feed) {
          const meta = await ev(() => {
            const m = document.body.innerText.match(/CAM-\d{3,}[\s\S]{0,200}/)?.[0] ?? "";
            return { snippet: m.slice(0, 200) };
          });
          state.cameraTitle = meta.snippet.split("\n")[0] ?? "camera";
          state.feedVerified = true;
          log(`camera feed verified (try ${attempt}): ${state.cameraTitle}`);
          return;
        }
        log(`openCameraNearCenter: attempt ${attempt} feed=${feed}`);
        lastError = `attempt ${attempt}: viewer opened but no feed rendered`;
        await steps.closeCamera();
        await page.waitForTimeout(1500);
      }
      throw new Error("openCameraNearCenter failed: " + lastError);
    },

    async closeCamera() {
      const closed = await page.evaluate(() => {
        // The viewer's close control is the red X in its header; find a
        // button near the CAM- header block.
        const all = [...document.querySelectorAll("button")];
        const camHeader = all.find((b) => /SHARE|MAP TARGET/i.test(b.textContent));
        const scope = camHeader?.closest("div")?.parentElement?.parentElement ?? document;
        const x = [...scope.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") || "").toLowerCase().includes("close"));
        if (x) { x.click(); return true; }
        return false;
      });
      if (!closed) {
        // Fallback: Escape closes the viewer.
        await page.keyboard.press("Escape");
      }
      await page.waitForTimeout(1200);
    },

    async enableLayer(step) {
      await dismissOverlays();
      if (step.layer !== "flights") throw new Error(`enableLayer: unsupported layer "${step.layer}" in Phase 1 engine`);
      // Same hydration lag as searchPlace: poll-click until the panel
      // actually renders its AVIATION section.
      let panelOpen = false;
      for (let i = 0; i < 20 && !panelOpen; i++) {
        await page.evaluate(() => {
          const b = [...document.querySelectorAll("button")].find((x) => /LAYERS & STATS/i.test(x.textContent));
          b?.click();
        }).catch(() => {});
        panelOpen = await page.waitForFunction(
          () => /AVIATION/.test(document.body.innerText),
          { timeout: 8000 },
        ).then(() => true).catch(() => false);
      }
      if (!panelOpen) throw new Error("Layers & Stats panel never opened after 20 poll-clicks");
      await page.waitForTimeout(1000);
      // AIR tab
      await page.evaluate(() => {
        const tab = [...document.querySelectorAll("button")].find((x) => (x.textContent || "").trim() === "AIR");
        tab?.click();
      });
      await page.waitForTimeout(800);
      // Expand AVIATION and switch its main toggle on.
      const result = await page.evaluate(() => {
        const section = [...document.querySelectorAll("div, button")].find((x) => /AVIATION/.test(x.textContent) && x.textContent.length < 60);
        section?.click();
        return !!section;
      });
      await page.waitForTimeout(1000);
      let toggled = "none-found";
      for (let i = 0; i < 10 && toggled === "none-found"; i++) {
        toggled = await page.evaluate(() => {
          const switches = [...document.querySelectorAll('[role="switch"], button[aria-checked], input[type="checkbox"]')];
          const off = switches.find((s) => s.getAttribute("aria-checked") === "false" || (s.type === "checkbox" && !s.checked));
          if (off) { off.click(); return "switched"; }
          if (switches.length) return "already-on";
          return "none-found";
        }).catch(() => "none-found");
        if (toggled === "none-found") await page.waitForTimeout(3000);
      }
      log(`flights layer: section=${result} toggle=${toggled}`);
      if (toggled === "none-found") throw new Error("aviation toggle not found in Layers panel");
      await page.waitForTimeout(2500); // let aircraft render
      // Close the panel for the zoom-out shot.
      await page.evaluate(() => {
        const panel = [...document.querySelectorAll("div")].find((d) => d.textContent.startsWith("LAYERS & STATS") && d.querySelector("button"));
        const x = panel?.querySelectorAll("button")[0];
        x?.click();
      });
      await page.waitForTimeout(600);
    },

    async zoomOut() {
      const { width, height } = viewport;
      await page.mouse.move(width / 2, height / 2);
      for (let i = 0; i < 14; i++) {
        await page.mouse.wheel(0, -500);
        await page.waitForTimeout(220);
      }
      await page.waitForTimeout(1500);
      const zoom = await page.evaluate(() => document.body.innerText.match(/ZOOM\s*[\d.]+/)?.[0] ?? "unknown");
      log("after zoomOut: " + zoom);
    },
  };

  try {
    for (const step of plan.steps) {
      mark(step.action);
      const fn = steps[step.action];
      if (!fn) throw new Error(`unknown step action "${step.action}"`);
      await fn(step);
    }
    mark("done");
  } finally {
    const withTimeout = (p, ms) => Promise.race([p.catch(() => {}), new Promise((r) => setTimeout(r, ms))]);
    await withTimeout(context.close(), 30000); // finalizes the video file
    await withTimeout(browser.close(), 15000);
    relay.close();
  }
  return { marks, state };
}
