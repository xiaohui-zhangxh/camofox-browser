/**
 * Smoke test: page viewport + physical Camoufox outer window on Playwright 1.59.1.
 * Usage:
 *   node scripts/test-viewport-launch.mjs headless
 *   CAMOFOX_WINDOW_SIZE=375,667 CAMOFOX_DEVICE_SCALE_FACTOR=2 node scripts/test-viewport-launch.mjs headful
 */
import { launchOptions } from 'camoufox-js';
import { firefox } from 'playwright-core';

const mode = process.argv[2] || 'headless';
const headless = mode !== 'headful';

function parseWindowSize() {
  const raw = (process.env.CAMOFOX_WINDOW_SIZE || '1280,720').trim();
  const [w, h] = raw.split(',').map((s) => parseInt(s.trim(), 10));
  return { width: w, height: h };
}

function parseDeviceScaleFactor() {
  const raw = parseFloat(process.env.CAMOFOX_DEVICE_SCALE_FACTOR);
  if (!Number.isFinite(raw) || raw <= 1) return 1;
  return Math.min(4, raw);
}

async function run() {
  const windowSize = parseWindowSize();
  const deviceScaleFactor = parseDeviceScaleFactor();
  console.log(`\n=== ${mode.toUpperCase()} window=${windowSize.width}x${windowSize.height} dpr=${deviceScaleFactor} ===`);
  const options = await launchOptions({
    headless,
    os: process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux',
    humanize: true,
    enable_cache: true,
    window: [windowSize.width, windowSize.height],
    firefox_user_prefs: {
      'layout.css.devPixelsPerPx': String(deviceScaleFactor),
    },
  });
  console.log('launching...', { headless });

  const browser = await firefox.launch(options);
  try {
    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();
    await page.goto('about:blank');
    await page.waitForTimeout(400);
    const size = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      dpr: window.devicePixelRatio,
    }));
    console.log('page size:', size);

    const outerWindowMatches =
      Math.abs(size.outerWidth - windowSize.width) <= 2 &&
      Math.abs(size.outerHeight - windowSize.height) <= 2;
    const viewportFitsInside =
      size.innerWidth > 0 &&
      size.innerHeight > 0 &&
      size.innerWidth <= size.outerWidth &&
      size.innerHeight < size.outerHeight;
    const dprMatches = Math.abs(size.dpr - deviceScaleFactor) < 0.01;
    const ok = outerWindowMatches && viewportFitsInside && dprMatches;
    console.log(ok ? 'PASS' : 'FAIL', { outerWindowMatches, viewportFitsInside, dprMatches });
    if (!ok) process.exitCode = 1;

    if (!headless) {
      console.log('visible window open 2s...');
      await page.waitForTimeout(2000);
    }

    await context.close();
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
