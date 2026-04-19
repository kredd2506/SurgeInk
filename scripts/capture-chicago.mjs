// Playwright capture script — Chicago across themes × layer combos
// Run: node scripts/capture-chicago.mjs

import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, "../test-captures/chicago");
const APP_URL = "http://localhost:5173";

const THEMES = [
  "Midnight Blue",
  "Terracotta",
  "Neon",
  "Coral",
  "Heatwave",
  "Blueprint",
  "Sage",
];

const COMBOS = [
  { name: "base", flood: false, disaster: false },
  { name: "flood", flood: true, disaster: false },
  { name: "disaster", flood: false, disaster: true },
  { name: "all", flood: true, disaster: true },
];

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pickLocationInStartupModal(page, query) {
  const input = page.locator(".startup-location-input");
  await input.waitFor({ state: "visible", timeout: 5000 });
  await input.click();
  await input.fill("");
  await input.type(query, { delay: 60 });
  await wait(1500);

  // Click the first suggestion
  const firstSuggestion = page.locator(".startup-location-suggestion").first();
  await firstSuggestion.waitFor({ state: "visible", timeout: 5000 });
  await firstSuggestion.click();
  await wait(500);

  // Click OK
  const okBtn = page.locator('.startup-location-modal button:has-text("OK")').first();
  await okBtn.click();
  await wait(3000);
}

async function selectTab(page, label) {
  const tab = page.locator(`button[aria-label="${label}"]`).first();
  await tab.click();
  await wait(500);
}

async function selectTheme(page, themeName) {
  await selectTab(page, "Theme");
  await wait(300);
  const card = page.locator(`button.theme-card[aria-label="${themeName}"]`).first();
  await card.click();
  await wait(2000);
}

async function setToggle(page, toggleLabelText, desiredState) {
  const label = page.locator(`label.toggle-field:has-text("${toggleLabelText}")`).first();
  const checkbox = label.locator('input[type="checkbox"]');
  const isChecked = await checkbox.isChecked();
  if (isChecked !== desiredState) {
    await label.click();
    await wait(500);
  }
}

async function setFloodZones(page, on) {
  await selectTab(page, "Flood");
  await wait(300);
  await setToggle(page, "FEMA flood zones", on);
  if (on) await wait(5000); // wait for FEMA fetch
}

async function setDisasters(page, on) {
  await selectTab(page, "Disaster");
  await wait(300);
  await setToggle(page, "Show disaster events", on);
  if (on) await wait(4000); // wait for EONET fetch
}

async function zoomOut(page, steps = 6) {
  // Click on the map first to focus it
  const map = page.locator(".maplibregl-canvas").first();
  const box = await map.boundingBox();
  if (!box) return;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  for (let i = 0; i < steps; i++) {
    await page.mouse.move(cx, cy);
    await page.keyboard.press("-");
    await wait(400);
  }
  await wait(1500);
}

async function zoomIn(page, steps = 6) {
  const map = page.locator(".maplibregl-canvas").first();
  const box = await map.boundingBox();
  if (!box) return;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  for (let i = 0; i < steps; i++) {
    await page.mouse.move(cx, cy);
    await page.keyboard.press("+");
    await wait(400);
  }
  await wait(1500);
}

async function capturePoster(page, outPath) {
  const frame = page.locator(".poster-frame").first();
  await frame.screenshot({ path: outPath });
  console.log(`  ✓ ${path.relative(process.cwd(), outPath)}`);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1200 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log(`Opening ${APP_URL}...`);
  await page.goto(APP_URL, { waitUntil: "networkidle" });
  await wait(2000);

  // Pick Chicago in startup modal
  console.log("Selecting Chicago...");
  await pickLocationInStartupModal(page, "Chicago");
  await wait(2000);

  for (const themeName of THEMES) {
    console.log(`Theme: ${themeName}`);
    await selectTheme(page, themeName);

    const themeSlug = themeName.toLowerCase().replace(/\s+/g, "-");

    for (const combo of COMBOS) {
      await setFloodZones(page, combo.flood);
      await setDisasters(page, combo.disaster);
      await wait(1500);

      const filename = `${themeSlug}_${combo.name}.png`;
      const outPath = path.join(OUTPUT_DIR, filename);
      await capturePoster(page, outPath);
    }
    console.log("");
  }

  await browser.close();
  console.log(`\nDone. ${THEMES.length * COMBOS.length} captures saved to:`);
  console.log(`  ${OUTPUT_DIR}`);
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
