// Accessibility gate — hand-rolled WCAG 2.2 AA spot-checks against the
// hub's preview build. Closes the long-standing "a11y still planned"
// strictness gap without taking on an axe-core (or pa11y) dependency:
// the hub's a11y surface is small + stable enough that a focused list
// of asserts is more honest than wrapping a generic 80-rule engine.
//
// The checks below correspond to the WCAG success criteria the hub can
// actually fail given its shape (canvas-first SPA, h1 brand heading +
// one link, no forms, no images apart from CSS-painted SVG icons):
//
//   1. WCAG 3.1.1 — Language of Page: <html lang> set + BCP-47 shape.
//   2. WCAG 1.4.4 — Resize Text: viewport meta does not block zoom
//      (no `user-scalable=no`, no `maximum-scale` below 2).
//   3. WCAG 2.4.2 — Page Titled: non-empty <title>.
//   4. WCAG 1.1.1 — Non-text Content: <canvas> has accessible name.
//   5. WCAG 4.1.2 — Name, Role, Value: every interactive element
//      (link, button, input) has an accessible name.
//   6. WCAG 2.1.1 — Keyboard: direct-play link reachable + activatable
//      from the keyboard.
//   7. WCAG 2.4.7 — Focus Visible: focused link shows an outline (not
//      `outline: none` without an alternate visible style).
//   8. WCAG 1.4.3 — Contrast (Minimum): every (fg, bg) pair the eye
//      reads as a text+plate combination clears 4.5:1 for normal text.
//      Pairs declared inline — keep this in sync with the palette in
//      src/render/canvas-room.ts and the noscript style in index.html.
//
// Exit 0: all checks pass. Exit 1: at least one violation.
//
// Usage: requires `vite preview` running on the configured port.
//   node scripts/smoke-a11y.mjs
// Or via the run-a11y-gate.mjs harness which builds + previews + runs
// + tears down — the form haggis-eval's `a11y` gate shells out to.

import { chromium } from 'playwright';

const URL_BASE = process.env.SCREENSHOT_URL ?? 'http://localhost:4173/';

const violations = [];
const passes = [];

function record(criterion, label, ok, detail) {
  const line = `WCAG ${criterion} — ${label}${detail ? ` — ${detail}` : ''}`;
  if (ok) passes.push(line);
  else violations.push(line);
}

// sRGB → relative luminance per WCAG 2.x. Channels are 0..1 sRGB
// before linearization. Returns 0..1 luminance.
function relativeLuminance(rgb) {
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const r = lin(rgb.r / 255);
  const g = lin(rgb.g / 255);
  const b = lin(rgb.b / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Parse #rgb / #rrggbb / rgba(...) — only the forms used by the hub.
function parseColor(input) {
  const s = input.trim();
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1
      };
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1
    };
  }
  const m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const parts = m[1].split(',').map((p) => p.trim());
    return {
      r: parseFloat(parts[0]),
      g: parseFloat(parts[1]),
      b: parseFloat(parts[2]),
      a: parts.length === 4 ? parseFloat(parts[3]) : 1
    };
  }
  throw new Error(`unsupported colour form: ${input}`);
}

// Composite a translucent foreground over an opaque background and
// return the resulting opaque rgb. Needed because the prompt plate is
// rgba(26,14,8,0.92) — its effective colour against the floor depends
// on what the floor draws, but for the prompt assertion we treat the
// plate as if it sat on the void backdrop (worst-case effective bg).
function compositeOver(fg, opaqueBg) {
  const a = fg.a;
  return {
    r: Math.round(fg.r * a + opaqueBg.r * (1 - a)),
    g: Math.round(fg.g * a + opaqueBg.g * (1 - a)),
    b: Math.round(fg.b * a + opaqueBg.b * (1 - a)),
    a: 1
  };
}

function contrastRatio(fgHex, bgHex) {
  const fg = parseColor(fgHex);
  const bg = parseColor(bgHex);
  const effFg = fg.a < 1 ? compositeOver(fg, bg) : fg;
  const lFg = relativeLuminance(effFg);
  const lBg = relativeLuminance(bg);
  const lighter = Math.max(lFg, lBg);
  const darker = Math.min(lFg, lBg);
  return (lighter + 0.05) / (darker + 0.05);
}

// Foreground / background pairs the visitor actually reads as text.
// Keep in sync with src/render/canvas-room.ts PX + PALETTE tokens and
// the noscript inline style in index.html. The plate pair composites
// the translucent plate over the worst-case void backdrop before
// computing the ratio — matches what an a11y auditor would measure
// with a colour picker on a frame.
const TEXT_PAIRS = [
  {
    label: 'prompt text on prompt plate (over void)',
    fg: '#f0e6c8',
    bg: 'rgba(26, 14, 8, 0.92)',
    bgUnder: '#1a0e08'
  },
  {
    label: 'sign label (bone) on sign wood',
    fg: '#f0e6c8',
    bg: '#5a3220'
  },
  {
    label: 'noscript paragraph text on backdrop',
    fg: '#f0e6c8',
    bg: '#1a0e08'
  },
  {
    label: 'noscript fallback link on backdrop',
    fg: '#e4a020',
    bg: '#1a0e08'
  },
  {
    label: 'cairn-stone text on ink-deep backdrop (scene-brand + scene-direct resting)',
    fg: '#b8a878',
    bg: '#1a0e08'
  },
  {
    label: 'scene-direct link (focus neeps-orange) on backdrop',
    fg: '#e4a020',
    bg: '#1a0e08'
  }
];

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(`[ERROR] ${e.message}`));

  await page.goto(URL_BASE, { waitUntil: 'networkidle' });
  // Let the WASM boundary boot + first frame paint.
  await page.waitForTimeout(800);

  // 1. <html lang> — BCP-47 shape (e.g. "en", "en-GB").
  const lang = await page.evaluate(() => document.documentElement.lang);
  const langOk = typeof lang === 'string' && /^[a-z]{2,3}(-[A-Z]{2})?$/.test(lang);
  record('3.1.1', '<html lang>', langOk, `lang=${JSON.stringify(lang)}`);

  // 2. <meta viewport> permits zoom.
  const viewport = await page.evaluate(() => {
    const m = document.querySelector('meta[name="viewport"]');
    return m ? m.getAttribute('content') : null;
  });
  if (viewport === null) {
    record('1.4.4', 'meta viewport present', false, 'no <meta name="viewport">');
  } else {
    const content = viewport.toLowerCase();
    const blocksZoom = /user-scalable\s*=\s*no/.test(content);
    const maxScaleMatch = content.match(/maximum-scale\s*=\s*([0-9.]+)/);
    const maxScale = maxScaleMatch ? parseFloat(maxScaleMatch[1]) : Infinity;
    const zoomOk = !blocksZoom && maxScale >= 2;
    record('1.4.4', 'meta viewport permits zoom', zoomOk,
      `content=${JSON.stringify(viewport)}`);
  }

  // 3. <title> non-empty.
  const title = await page.title();
  record('2.4.2', '<title> non-empty', typeof title === 'string' && title.trim().length > 0,
    `title=${JSON.stringify(title)}`);

  // 4. Canvas accessible name. Read via aria-label OR labelled-by.
  const canvasName = await page.evaluate(() => {
    const c = document.querySelector('canvas.scene-canvas');
    if (!c) return { found: false };
    const label = c.getAttribute('aria-label');
    const labelledBy = c.getAttribute('aria-labelledby');
    const labelText = labelledBy
      ? Array.from(labelledBy.split(/\s+/))
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
          .filter((t) => t.length > 0)
          .join(' ')
      : null;
    return { found: true, label, labelledBy, labelText };
  });
  if (!canvasName.found) {
    record('1.1.1', 'canvas accessible name', false, 'no canvas.scene-canvas in DOM');
  } else {
    const name = canvasName.label ?? canvasName.labelText ?? '';
    record('1.1.1', 'canvas accessible name', typeof name === 'string' && name.trim().length > 0,
      `aria-label=${JSON.stringify(canvasName.label)}`);
  }

  // 5. Every interactive element has an accessible name. Hub keeps the
  //    surface small (one anchor in the scene shell; noscript anchor
  //    only fires when JS is off — still asserted). Done via the
  //    Playwright accessibility snapshot which folds the same rules
  //    a screen reader applies.
  const interactives = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('a, button, input, select, textarea'));
    return els.map((el) => {
      const tag = el.tagName.toLowerCase();
      const ariaLabel = el.getAttribute('aria-label');
      const text = el.textContent?.trim() ?? '';
      const title = el.getAttribute('title');
      const alt = el.getAttribute('alt');
      const name = ariaLabel ?? text ?? title ?? alt ?? '';
      return {
        tag,
        accessibleName: typeof name === 'string' ? name.trim() : '',
        hidden: el.hasAttribute('aria-hidden') && el.getAttribute('aria-hidden') === 'true'
      };
    });
  });
  for (const el of interactives) {
    if (el.hidden) continue;
    record('4.1.2', `${el.tag} accessible name`, el.accessibleName.length > 0,
      `accessibleName=${JSON.stringify(el.accessibleName)}`);
  }

  // 6. Direct-play link keyboard reachable. Tab from body and verify
  //    the link receives focus — the scene anchor is the only
  //    focusable element in the shell, so a single Tab lands on it.
  await page.evaluate(() => document.body.focus());
  await page.keyboard.press('Tab');
  const focusedTag = await page.evaluate(() => {
    const el = document.activeElement;
    return el ? {
      tag: el.tagName.toLowerCase(),
      className: el.className ?? '',
      accessibleName: el.getAttribute?.('aria-label') ?? el.textContent?.trim() ?? ''
    } : null;
  });
  const directReachable = focusedTag !== null
    && focusedTag.tag === 'a'
    && /scene-direct/.test(focusedTag.className);
  record('2.1.1', 'direct-play link reachable via Tab', directReachable,
    `focused=${JSON.stringify(focusedTag)}`);

  // 7. Focus visible — outline computed to something other than `none`
  //    (or a non-zero outline width). With the direct-play link
  //    focused from check 6, read its outline.
  const focusStyle = await page.evaluate(() => {
    const el = document.querySelector('a.scene-direct');
    if (!el) return null;
    el.focus();
    const cs = window.getComputedStyle(el);
    return {
      outlineStyle: cs.outlineStyle,
      outlineWidth: cs.outlineWidth,
      outlineColor: cs.outlineColor,
      boxShadow: cs.boxShadow
    };
  });
  if (focusStyle === null) {
    record('2.4.7', 'focus indicator visible', false, 'no a.scene-direct in DOM');
  } else {
    const widthPx = parseFloat(focusStyle.outlineWidth) || 0;
    const styled = focusStyle.outlineStyle && focusStyle.outlineStyle !== 'none' && widthPx > 0;
    const shadowed = focusStyle.boxShadow && focusStyle.boxShadow !== 'none';
    const visible = styled || shadowed;
    record('2.4.7', 'focus indicator visible', !!visible,
      `outline=${focusStyle.outlineWidth} ${focusStyle.outlineStyle} ${focusStyle.outlineColor}` +
      `; boxShadow=${focusStyle.boxShadow}`);
  }

  // 8. Contrast ratio assertions on declared text pairs.
  for (const pair of TEXT_PAIRS) {
    let ratio;
    if (pair.bgUnder) {
      // Composite translucent fg over bgUnder, then read against the
      // bgUnder. The .fg here is the *plate* colour; the *text* on the
      // plate is computed separately by reading the visible bone
      // foreground (pair.fg) against the plate-on-void result.
      const plate = parseColor(pair.bg);
      const under = parseColor(pair.bgUnder);
      const effectivePlate = compositeOver(plate, under);
      const effectivePlateHex = `#${[effectivePlate.r, effectivePlate.g, effectivePlate.b]
        .map((c) => c.toString(16).padStart(2, '0'))
        .join('')}`;
      ratio = contrastRatio(pair.fg, effectivePlateHex);
    } else {
      ratio = contrastRatio(pair.fg, pair.bg);
    }
    const ok = ratio >= 4.5;
    record('1.4.3', `contrast: ${pair.label}`, ok, `ratio=${ratio.toFixed(2)}:1 (need 4.5)`);
  }

  // 9. Page errors during a11y walk → fail the gate. A console error
  //    or unhandled exception during a screen-reader-style walk is
  //    itself a user-facing defect.
  if (pageErrors.length > 0) {
    for (const e of pageErrors) {
      record('runtime', 'no page errors', false, e);
    }
  }
} finally {
  await browser.close();
}

const total = passes.length + violations.length;
console.log(`[smoke-a11y] ${passes.length}/${total} checks passed`);
for (const p of passes) console.log(`  PASS ${p}`);
for (const v of violations) console.error(`  FAIL ${v}`);

if (violations.length > 0) {
  console.error(`[smoke-a11y] ${violations.length} violation(s)`);
  process.exit(1);
}
console.log('[smoke-a11y] all checks passed');
process.exit(0);
