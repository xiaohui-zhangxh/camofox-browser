---
name: Camofox Browser Launch
description: Configure and launch Camofox Browser with headed or headless mode, outer-window size, HiDPI screenshot density, humanized input, and a visible synthetic cursor. Use when starting the server, choosing browser display settings, or diagnosing launch and screenshot quality.
---

# Camofox Browser launch configuration

Use this skill when a user wants to start Camoufox Browser or tune how the browser window, input, cursor, and screenshots behave. Prefer the environment variables below over changing source code. The canonical user-facing table is in `README.md` under **Environment Variables**.

## Choose a launch profile

### Local headed browser on macOS

```bash
CAMOFOX_INTERACTIVE=desktop \
CAMOFOX_WINDOW_SIZE=1280,800 \
CAMOFOX_DEVICE_SCALE_FACTOR=2 \
CAMOFOX_SHOWCURSOR=1 \
CAMOFOX_HUMANIZE=0.5 \
npm start
```

This opens a visible browser with an outer window of `1280x800`, captures screenshots at 2x pixel density, shows the synthetic cursor, and caps each humanized mouse move at `0.5` seconds.

### Mobile-sized profile

```bash
CAMOFOX_INTERACTIVE=desktop \
CAMOFOX_WINDOW_SIZE=390,844 \
CAMOFOX_DEVICE_SCALE_FACTOR=3 \
CAMOFOX_SHOWCURSOR=1 \
CAMOFOX_HUMANIZE=0.5 \
npm start
```

The requested outer window is `390x844`. Browser chrome reduces the page's inner height (often by about 60px), so measure `window.innerWidth` and `window.innerHeight` rather than assuming the page viewport is exactly the outer size.

### High-resolution export

```bash
CAMOFOX_DEVICE_SCALE_FACTOR=4 npm start
```

DPR `4` produces four physical pixels per CSS pixel in each direction. It does not change the CSS layout, but it makes PNG files much larger (about 16 times as many pixels as DPR `1`). Use `2` for Retina/HiDPI, `3` for a sharper exported image, and `4` for supersampling or heavy zoom. The supported range is `1..4`; values above `4` are clamped to `4`, and invalid or values at/below `1` fall back to `1`.

## Parameters

| Variable | Values | Default | Effect |
|---|---|---:|---|
| `CAMOFOX_INTERACTIVE` | `off` / `desktop` | `off` | `desktop` opens a real local browser window. |
| `CAMOFOX_WINDOW_SIZE` | `width,height` | `1280,720` | Outer browser window size. Each dimension must be `100..4000`; invalid input falls back to `1280,720`. |
| `CAMOFOX_DEVICE_SCALE_FACTOR` | `1`–`4` (decimals allowed) | `1` | Screenshot rasterization density. CSS layout remains in CSS pixels. |
| `CAMOFOX_HUMANIZE` | `true`, positive seconds such as `0.5`, or `false` | `true` | `true` is uncapped and can make interactions slow; a number caps each move; `false` disables humanization. |
| `CAMOFOX_SHOWCURSOR` | `1` / `true` | unset/off | Draws the synthetic Camoufox cursor in a visible browser. |
| `CAMOFOX_PORT` | Port number | `9377` | Server port. |
| `CAMOUFOX_EXECUTABLE` | Path | bundled cache | Optional external Camoufox executable. Keep the bundle's sibling resources intact. |
| `CAMOFOX_API_KEY` | Secret | unset | Enables protected cookie-import functionality. Never print or commit its value. |

## Important distinctions

- `CAMOFOX_WINDOW_SIZE` controls the **outer native window**. Browser toolbars consume part of that height.
- Upstream contexts keep `viewport: null`, so the native window controls layout. `CAMOFOX_DEVICE_SCALE_FACTOR` is applied through Firefox's `layout.css.devPixelsPerPx` launch preference, avoiding Playwright/Firefox protocol conflicts while preserving DPR 1–4 screenshot rasterization.
- `deviceScaleFactor` changes screenshot pixels, not CSS layout. A CSS `390x784` page at DPR `3` produces approximately `1170x2352` PNG pixels.
- Screenshot APIs capture page content, not the operating system's browser title bar or toolbar.
- For custom screenshots, clipping to the measured `window.innerWidth`/`window.innerHeight` avoids transparent padding caused by an outer-window/content-height mismatch.
- Changing launch variables requires restarting the server and browser. It does not resize an already-running window.

## OpenClaw and other managed clients

When the server is auto-started as a child process, pass these through the client's environment configuration. This project forwards `CAMOFOX_INTERACTIVE`, `CAMOFOX_WINDOW_SIZE`, `CAMOFOX_DEVICE_SCALE_FACTOR`, `CAMOFOX_HUMANIZE`, and `CAMOFOX_SHOWCURSOR` to the server subprocess. If a value seems ignored:

1. Confirm the variable is present in the **parent/client** environment.
2. Restart the managed server after changing it.
3. Check `GET /health` for the configured `viewport` and `deviceScaleFactor`.
4. In a page, compare `window.innerWidth/innerHeight` with `window.outerWidth/outerHeight`.

## Demonstration smoke test

The repository includes a headed smoke test:

```bash
CAMOFOX_WINDOW_SIZE=390,844 \
CAMOFOX_DEVICE_SCALE_FACTOR=3 \
node scripts/test-viewport-launch.mjs headful
```

It verifies the requested outer size and the page's inner geometry. Use a similar short Playwright/Camoufox script when the user asks to demonstrate a particular URL.

## Safe operating rules

- Never expose API keys, proxy credentials, or cookies in commands, logs, screenshots, or skill output.
- Validate user-supplied URLs before navigating; use the repository's URL validation route/helper rather than inventing schemes.
- Do not silently change the default DPR. Ask or explain the memory/file-size tradeoff before choosing `3` or `4` for a general deployment.
- If the user requests a different visual profile, state the exact environment variables and whether a restart is required.
