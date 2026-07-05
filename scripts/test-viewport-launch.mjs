/**
 * Smoke test: viewport + Camoufox window fingerprint on Playwright 1.59.1.
 * Usage:
 *   node scripts/test-viewport-launch.mjs headless
 *   CAMOFOX_WINDOW_SIZE=375,667 node scripts/test-viewport-launch.mjs headful
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

async function run() {
  const windowSize = parseWindowSize();
  console.log(`\n=== ${mode.toUpperCase()} window=${windowSize.width}x${windowSize.height} ===`);
  const options = await launchOptions({
    headless,
    os: process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux',
    humanize: true,
    enable_cache: true,
    window: [windowSize.width, windowSize.height],
  });
  console.log('launching...', { headless });

  const browser = await firefox.launch(options);
  try {
    const context = await browser.newContext({ viewport: { ...windowSize } });
    const page = await context.newPage();
    await page.goto('about:blank');
    await page.waitForTimeout(400);
    const size = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
    }));
    console.log('page size:', size);

    const ok =
      Math.abs(size.innerWidth - windowSize.width) < 80 &&
      Math.abs(size.outerHeight - windowSize.height) < 80;
    console.log(ok ? 'PASS' : 'FAIL');
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
