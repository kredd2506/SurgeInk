// Capture New Orleans — heavy FEMA flood zones showcase the ink-bleed effect
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, "../test-captures/new-orleans");
const APP_URL = "http://localhost:5173";

const THEMES = ["Midnight Blue", "Heatwave", "Blueprint", "Coral", "Sage"];
const COMBOS = [
  { name: "base", flood: false, disaster: false },
  { name: "flood", flood: true, disaster: false },
];

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
  await wait(500);
}

async function selectTheme(page, name) {
  await selectTab(page, "Theme");
  await wait(300);
  await page.locator(`button.theme-card[aria-label="${name}"]`).first().click();
  await wait(2000);
}

async function setFlood(page, on) {
  await selectTab(page, "Flood");
  await wait(1200);
  // Directly click the input checkbox using JS — bypasses visibility checks
  const checkbox = page
    .locator('.mobile-section--flood label.toggle-field')
    .filter({ hasText: "FEMA flood zones" })
    .locator('input[type="checkbox"]')
    .first();

  const currentlyChecked = await checkbox.evaluate((el) => el.checked);
  if (currentlyChecked !== on) {
    await checkbox.evaluate((el) => el.click());
    await wait(500);
  }
  if (on) await wait(5000);
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

  console.log("Selecting New Orleans...");
  await pickLocation(page, "New Orleans");
  await wait(2000);

  for (const themeName of THEMES) {
    console.log(`Theme: ${themeName}`);
    await selectTheme(page, themeName);
    const slug = themeName.toLowerCase().replace(/\s+/g, "-");

    for (const combo of COMBOS) {
      await setFlood(page, combo.flood);
      await wait(1500);
      const out = path.join(OUTPUT_DIR, `${slug}_${combo.name}.png`);
      await page.locator(".poster-frame").first().screenshot({ path: out });
      console.log(`  ✓ ${path.relative(process.cwd(), out)}`);
    }
  }

  await browser.close();
  console.log(`\nDone. ${THEMES.length * COMBOS.length} captures saved to ${OUTPUT_DIR}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
