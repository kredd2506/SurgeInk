// Showcase: side-by-side comparison of flood ink-bleed vs disaster scorch effects
// Flood: zoomed to a flood-heavy coast (New Orleans + Gulf Coast state-level zoom)
// Disaster: continental US zoom to show scattered wildfires/storms
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, "../test-captures/showcase");
const APP_URL = "http://localhost:5173";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function pickLocation(page, query) {
  const input = page.locator(".startup-location-input");
  await input.waitFor({ state: "visible", timeout: 5000 });
  await input.click();
  await input.fill("");
  await input.type(query, { delay: 60 });
  await wait(1500);
  await page.locator(".startup-location-suggestion").first().click();
  await wait(500);
  await page.locator('.startup-location-modal button:has-text("OK")').first().click();
  await wait(3000);
}

async function selectTab(page, label) {
  await page.locator(`button[aria-label="${label}"]`).first().click();
  await wait(800);
}

async function selectTheme(page, name) {
  await selectTab(page, "Theme");
  const card = page.locator(`button.theme-card[aria-label="${name}"]`).first();
  await card.scrollIntoViewIfNeeded();
  await wait(300);
  await card.click({ force: true });
  await wait(2000);
}

async function enterEditMode(page) {
  const editBtn = page.locator('button:has-text("Edit Map")').first();
  if (await editBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await editBtn.click();
    await wait(600);
  }
}

async function exitEditMode(page) {
  // "Edit Map" button flips to "Finish" when in edit mode
  const finishBtn = page.locator('button:has-text("Finish")').first();
  if (await finishBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await finishBtn.click();
    await wait(600);
  }
}

async function zoomMap(page, steps) {
  await enterEditMode(page);
  const title = steps < 0 ? "Zoom out" : "Zoom in";
  const btn = page.locator(`button[title="${title}"]`).first();
  await btn.waitFor({ state: "visible", timeout: 3000 });
  for (let i = 0; i < Math.abs(steps); i++) {
    await btn.click();
    await wait(400);
  }
  await wait(1500);
  await exitEditMode(page);
  await wait(1000);
}

async function toggleByText(page, sectionClass, text, desired) {
  const checkbox = page
    .locator(`.${sectionClass} label.toggle-field`)
    .filter({ hasText: text })
    .locator('input[type="checkbox"]')
    .first();
  const current = await checkbox.evaluate((el) => el.checked);
  if (current !== desired) {
    await checkbox.evaluate((el) => el.click());
    await wait(500);
  }
}

async function setFlood(page, on) {
  await selectTab(page, "Flood");
  await toggleByText(page, "mobile-section--flood", "FEMA flood zones", on);
  if (on) await wait(6000);
}

async function setDisaster(page, on) {
  await selectTab(page, "Disaster");
  await toggleByText(page, "mobile-section--disaster", "Show disaster events", on);
  if (on) await wait(5000);
}

async function capture(page, outName) {
  const out = path.join(OUTPUT_DIR, outName);
  await page.locator(".poster-frame").first().screenshot({ path: out });
  console.log(`  ✓ ${path.relative(process.cwd(), out)}`);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1200 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await page.goto(APP_URL, { waitUntil: "networkidle" });
  await wait(2000);

  // ────────────────────────────────────────────────
  // FLOOD showcase — Gulf Coast regional zoom
  // ────────────────────────────────────────────────
  console.log("\n=== FLOOD SHOWCASE (New Orleans + Gulf Coast) ===");
  await pickLocation(page, "New Orleans");
  await wait(2000);

  // Zoom out to state-level view
  await zoomMap(page, -4);

  // Midnight Blue — watery feel
  await selectTheme(page, "Midnight Blue");
  await setFlood(page, false);
  await capture(page, "flood_midnight-blue_base.png");
  await setFlood(page, true);
  await capture(page, "flood_midnight-blue_inkbleed.png");

  // Heatwave — contrast (fiery colors reacting to flood water)
  await selectTheme(page, "Heatwave");
  await capture(page, "flood_heatwave_inkbleed.png");

  await setFlood(page, false);

  // ────────────────────────────────────────────────
  // DISASTER showcase — continental US zoom
  // ────────────────────────────────────────────────
  console.log("\n=== DISASTER SHOWCASE (Continental US — scorch marks) ===");
  // Zoom out much more for continental US view
  await zoomMap(page, -8);

  // Heatwave — fiery burn aesthetic
  await selectTheme(page, "Heatwave");
  await setDisaster(page, false);
  await capture(page, "disaster_heatwave_base.png");
  await setDisaster(page, true);
  await capture(page, "disaster_heatwave_scorch.png");

  // Midnight Blue — dark night sky with fires
  await selectTheme(page, "Midnight Blue");
  await capture(page, "disaster_midnight-blue_scorch.png");

  // ────────────────────────────────────────────────
  // COMBINED — both effects at intermediate zoom
  // ────────────────────────────────────────────────
  console.log("\n=== COMBINED (both effects, state-level) ===");
  await zoomMap(page, 2);
  await setFlood(page, true);
  await capture(page, "combined_midnight-blue_all.png");

  await selectTheme(page, "Heatwave");
  await capture(page, "combined_heatwave_all.png");

  await browser.close();
  console.log(`\nDone. Saved to ${OUTPUT_DIR}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
