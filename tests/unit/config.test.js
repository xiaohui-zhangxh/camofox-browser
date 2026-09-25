import { describe, expect, test, afterEach } from '@jest/globals';
import { loadConfig } from '../../lib/config.js';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('loadConfig', () => {
  test('prefers CAMOUFOX_EXECUTABLE for external Camoufox executable', () => {
    process.env.CAMOUFOX_EXECUTABLE = '/nix/store/camoufox/bin/camoufox';
    process.env.CAMOUFOX_EXECUTABLE_PATH = '/ignored/camoufox';
    process.env.CAMOFOX_EXECUTABLE_PATH = '/also-ignored/camoufox';

    const config = loadConfig();

    expect(config.camoufoxExecutablePath).toBe('/nix/store/camoufox/bin/camoufox');
    expect(config.serverEnv.CAMOUFOX_EXECUTABLE).toBe('/nix/store/camoufox/bin/camoufox');
    expect(config.serverEnv.CAMOUFOX_EXECUTABLE_PATH).toBe('/ignored/camoufox');
    expect(config.serverEnv.CAMOFOX_EXECUTABLE_PATH).toBe('/also-ignored/camoufox');
  });

  test('accepts compatibility executable env vars', () => {
    process.env.CAMOUFOX_EXECUTABLE_PATH = '/compat/camoufox';
    expect(loadConfig().camoufoxExecutablePath).toBe('/compat/camoufox');

    delete process.env.CAMOUFOX_EXECUTABLE_PATH;
    process.env.CAMOFOX_EXECUTABLE_PATH = '/legacy/camoufox';
    expect(loadConfig().camoufoxExecutablePath).toBe('/legacy/camoufox');
  });

  test('configures browser RSS restart threshold', () => {
    delete process.env.BROWSER_RSS_RESTART_THRESHOLD_MB;
    expect(loadConfig().browserRssRestartThresholdMb).toBe(1500);

    process.env.BROWSER_RSS_RESTART_THRESHOLD_MB = '2048';
    expect(loadConfig().browserRssRestartThresholdMb).toBe(2048);
  });

  test('parses and forwards visible-browser launch settings', () => {
    process.env.CAMOFOX_HEADLESS = 'false';
    process.env.CAMOFOX_WINDOW_SIZE = '1440,900';
    process.env.CAMOFOX_DEVICE_SCALE_FACTOR = '2';
    process.env.CAMOFOX_HUMANIZE = '0.5';
    process.env.CAMOFOX_SHOWCURSOR = '1';

    const config = loadConfig();

    expect(config.camoufoxVisible).toBe(true);
    expect(config.windowSize).toEqual({ width: 1440, height: 900 });
    expect(config.deviceScaleFactor).toBe(2);
    expect(config.humanize).toBe(0.5);
    expect(config.showCursor).toBe(true);
    expect(config.serverEnv).toMatchObject({
      CAMOFOX_HEADLESS: 'false',
      CAMOFOX_WINDOW_SIZE: '1440,900',
      CAMOFOX_DEVICE_SCALE_FACTOR: '2',
      CAMOFOX_HUMANIZE: '0.5',
      CAMOFOX_SHOWCURSOR: '1',
    });
  });

  test('falls back to the default launch window for invalid dimensions', () => {
    process.env.CAMOFOX_WINDOW_SIZE = '80,900';
    expect(loadConfig().windowSize).toEqual({ width: 1280, height: 720 });
  });

  test('supports up to 4x screenshot rasterization', () => {
    process.env.CAMOFOX_DEVICE_SCALE_FACTOR = '4';
    expect(loadConfig().deviceScaleFactor).toBe(4);

    process.env.CAMOFOX_DEVICE_SCALE_FACTOR = '8';
    expect(loadConfig().deviceScaleFactor).toBe(4);
  });

  test('supports disabling input humanization', () => {
    process.env.CAMOFOX_HUMANIZE = 'false';
    expect(loadConfig().humanize).toBe(false);
  });

  test('preserves zero browser idle timeout and falls back for invalid values', () => {
    delete process.env.BROWSER_IDLE_TIMEOUT_MS;
    expect(loadConfig().browserIdleTimeoutMs).toBe(300000);

    process.env.BROWSER_IDLE_TIMEOUT_MS = 'not-a-number';
    expect(loadConfig().browserIdleTimeoutMs).toBe(300000);

    process.env.BROWSER_IDLE_TIMEOUT_MS = '0';
    expect(loadConfig().browserIdleTimeoutMs).toBe(0);
  });

  test('forwards VNC env vars to server subprocess whitelist', () => {
    process.env.ENABLE_VNC = '1';
    process.env.VNC_RESOLUTION = '1280x720';
    process.env.VNC_PASSWORD = 'secret';
    process.env.VIEW_ONLY = '1';
    process.env.VNC_PORT = '5901';
    process.env.NOVNC_PORT = '6081';
    process.env.VNC_BIND = '0.0.0.0';

    const config = loadConfig();

    expect(config.pluginEnv).toEqual({ ENABLE_VNC: '1' });
    expect(config.serverEnv).toMatchObject({
      ENABLE_VNC: '1',
      VNC_RESOLUTION: '1280x720',
      VNC_PASSWORD: 'secret',
      VIEW_ONLY: '1',
      VNC_PORT: '5901',
      NOVNC_PORT: '6081',
      VNC_BIND: '0.0.0.0',
    });
  });
});
