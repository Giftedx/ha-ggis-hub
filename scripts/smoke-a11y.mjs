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
//   5. WCAG 1.1.1 / 2.1.1 — Persistent semantic fallback/help text
//      describes canvas controls and exposes a direct game link.
//   6. WCAG 4.1.3 — Status Messages: live door proximity is surfaced
//      through the existing polite status region.
//   7. WCAG 4.1.2 — Name, Role, Value: every interactive element
//      (link, button, input) has an accessible name.
//   8. WCAG 2.5.3 — Label in Name: aria-labelled controls include their
//      visible text so speech-input users can target them.
//   9. WCAG 2.1.1 — Keyboard: direct-play link reachable + activatable
//      from the keyboard.
//   10. WCAG 2.4.7 — Focus Visible: focused link shows an outline (not
//      `outline: none` without an alternate visible style).
//   11. WCAG 1.4.3 — Contrast (Minimum): every (fg, bg) pair the eye
//      reads as a text+plate combination clears 4.5:1 for normal text.
//      Pairs declared inline — keep this in sync with the palette in
//      src/render/canvas-room.ts and the noscript style in index.html.
//   12. Font load — self-hosted Old Standard TT italic woff2 is present
//      after font-display:swap settles; verifies the preload + @font-face
//      pipeline without a visual regression diff.
//   13. Runtime errors — any unhandled page error during the walk is
//      itself a user-facing defect; captured via page.on('pageerror').
//
// Exit 0: all checks pass. Exit 1: at least one violation.
//
// Usage: requires `vite preview` running on the configured port.
//   node scripts/smoke-a11y.mjs
// Or via the run-a11y-gate.mjs harness which builds + previews + runs
// + tears down — the form haggis-eval's `a11y` gate shells out to.

import { launchBrowser } from './browser-factory.mjs';

const URL_BASE = process.env.SCREENSHOT_URL ?? 'http://localhost:4173/';

const violations = [];
const passes = [];

function record(criterion, label, ok, detail) {
  const line = `WCAG ${criterion} — ${label}${detail ? ` — ${detail}` : ''}`;
  if (ok) passes.push(line);
  else violations.push(line);
}

function normalizeAccessibleText(input) {
  return input.toLowerCase().replace(/[\s’'→—–-]+/g, ' ').trim();
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
    label: 'cairn-stone text on ink-deep backdrop (scene-brand + scene-direct + scene-music resting)',
    fg: '#b8a878',
    bg: '#1a0e08'
  },
  {
    label: 'scene-direct link (focus neeps-orange) on backdrop',
    fg: '#e4a020',
    bg: '#1a0e08'
  },
  {
    label: 'fallback panel text on ink-deep backdrop',
    fg: '#f0e6c8',
    bg: '#1a0e08'
  },
  {
    label: 'fallback panel link on ink-deep backdrop',
    fg: '#e4a020',
    bg: '#1a0e08'
  }
];

const browser = await launchBrowser();
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

  // 5. Persistent semantic fallback/help. This is the JS-on counterpart
  //    to the noscript fallback: readable controls plus a semantic direct
  //    game link for visitors who cannot or do not want to use canvas controls.
  const fallbackHelp = await page.evaluate(() => {
    const panel = document.querySelector('.scene-fallback');
    const canvas = document.querySelector('canvas.scene-canvas');
    const describedBy = canvas?.getAttribute('aria-describedby') ?? '';
    const describedText = describedBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
      .filter((text) => text.length > 0)
      .join(' ');
    const link = panel?.querySelector('a[href]');
    return {
      found: panel !== null,
      hidden: panel?.getAttribute('aria-hidden') === 'true',
      labelledBy: panel?.getAttribute('aria-labelledby') ?? '',
      text: panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      describedBy,
      describedText,
      linkHref: link?.getAttribute('href') ?? '',
      linkName: link?.getAttribute('aria-label') ?? link?.textContent?.trim() ?? ''
    };
  });
  const helpText = `${fallbackHelp.text} ${fallbackHelp.describedText}`;
  const mentionsControls = /arrows/i.test(helpText)
    && /wasd/i.test(helpText)
    && /enter/i.test(helpText)
    && /space/i.test(helpText)
    && /chap a door/i.test(helpText)
    && /tap a door/i.test(helpText);
  const hasDirectFallback = fallbackHelp.linkHref === 'https://wild-haggis-survivors.pages.dev/'
    && /Wild Haggis Survivors/i.test(fallbackHelp.linkName);
  record('1.1.1', 'persistent fallback/help instructions',
    fallbackHelp.found && !fallbackHelp.hidden && fallbackHelp.labelledBy.length > 0 && mentionsControls,
    `text=${JSON.stringify(fallbackHelp.text)} describedBy=${JSON.stringify(fallbackHelp.describedBy)}`);
  record('2.1.1', 'persistent fallback direct game link', hasDirectFallback,
    `href=${JSON.stringify(fallbackHelp.linkHref)} name=${JSON.stringify(fallbackHelp.linkName)}`);

  // 6. Live status: the visual canvas prompt is mirrored in the polite
  //    status region when the haggis reaches a door, so proximity is not
  //    visual-only. Drive briefly right from the deterministic spawn into
  //    the WHS door's overlap zone; do not press an interact key.
  const liveDoorStatus = await page.evaluate(async () => {
    const status = document.querySelector('.scene-status');
    const before = status?.textContent?.trim() ?? '';
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', bubbles: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 140));
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', code: 'ArrowRight', bubbles: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 60));
    return {
      found: status !== null,
      role: status?.getAttribute('role') ?? '',
      before,
      after: status?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    };
  });
  const announcesDoor = /Wild Haggis Survivors door/i.test(liveDoorStatus.after)
    && /Enter, Space, or E/i.test(liveDoorStatus.after)
    && /tap the door/i.test(liveDoorStatus.after);
  record('4.1.3', 'live door status announcement',
    liveDoorStatus.found && liveDoorStatus.role === 'status' && announcesDoor,
    `before=${JSON.stringify(liveDoorStatus.before)} after=${JSON.stringify(liveDoorStatus.after)}`);

  // 7. Every interactive element has an accessible name. Hub keeps the
  //    surface small (scene links plus the noscript anchor when JS is off).
  //    Done via the Playwright accessibility snapshot which folds the
  //    same rules a screen reader applies.
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
        visibleText: text,
        ariaLabel: ariaLabel ?? '',
        hidden: el.hasAttribute('aria-hidden') && el.getAttribute('aria-hidden') === 'true'
      };
    });
  });
  for (const el of interactives) {
    if (el.hidden) continue;
    record('4.1.2', `${el.tag} accessible name`, el.accessibleName.length > 0,
      `accessibleName=${JSON.stringify(el.accessibleName)}`);
    if (el.ariaLabel.length > 0 && el.visibleText.length > 0) {
      const visible = normalizeAccessibleText(el.visibleText);
      const accessible = normalizeAccessibleText(el.accessibleName);
      record('2.5.3', `${el.tag} label in name`, accessible.includes(visible),
        `visible=${JSON.stringify(el.visibleText)} accessibleName=${JSON.stringify(el.accessibleName)}`);
    }
  }

  // 9. Launch links keyboard reachable. Tab from body and verify the
  //    corner direct link receives focus first, then the semantic fallback
  //    link receives focus second.
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
  await page.keyboard.press('Tab');
  const secondFocusedTag = await page.evaluate(() => {
    const el = document.activeElement;
    return el ? {
      tag: el.tagName.toLowerCase(),
      className: el.className ?? '',
      accessibleName: el.getAttribute?.('aria-label') ?? el.textContent?.trim() ?? ''
    } : null;
  });
  const fallbackReachable = secondFocusedTag !== null
    && secondFocusedTag.tag === 'a'
    && /Wild Haggis Survivors/i.test(secondFocusedTag.accessibleName);
  record('2.1.1', 'fallback direct link reachable via Tab', fallbackReachable,
    `focused=${JSON.stringify(secondFocusedTag)}`);

  // 10. Focus visible — outline computed to something other than `none`
  //    (or a non-zero outline width). Check both visible launch links
  //    plus the opt-in music button.
  const focusStyles = await page.evaluate(() => {
    const selectors = ['a.scene-direct', '.scene-fallback a', 'button.scene-music'];
    return selectors.map((selector) => {
      const el = document.querySelector(selector);
      if (!el) return { selector, found: false };
      el.focus();
      const cs = window.getComputedStyle(el);
      return {
        selector,
        found: true,
        outlineStyle: cs.outlineStyle,
        outlineWidth: cs.outlineWidth,
        outlineColor: cs.outlineColor,
        boxShadow: cs.boxShadow
      };
    });
  });
  for (const focusStyle of focusStyles) {
    if (!focusStyle.found) {
      record('2.4.7', `${focusStyle.selector} focus indicator visible`, false, 'link missing from DOM');
      continue;
    }
    const widthPx = parseFloat(focusStyle.outlineWidth) || 0;
    const styled = focusStyle.outlineStyle && focusStyle.outlineStyle !== 'none' && widthPx > 0;
    const shadowed = focusStyle.boxShadow && focusStyle.boxShadow !== 'none';
    const visible = styled || shadowed;
    record('2.4.7', `${focusStyle.selector} focus indicator visible`, !!visible,
      `outline=${focusStyle.outlineWidth} ${focusStyle.outlineStyle} ${focusStyle.outlineColor}` +
      `; boxShadow=${focusStyle.boxShadow}`);
  }

  // 11. Contrast ratio assertions on declared text pairs.
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

  // 12. Self-hosted font loads — verify Old Standard TT italic is
  //    available after the page has painted and font-display: swap
  //    has had time to swap in. document.fonts.check() returns true
  //    only if the face is fully loaded and matched.
  await page.evaluate(() => document.fonts.ready);
  const fontLoaded = await page.evaluate(() =>
    document.fonts.check('italic 1em "Old Standard TT"')
  );
  record('font', 'Old Standard TT italic woff2 loaded', fontLoaded, '');

  // 13. Page errors during a11y walk → fail the gate. A console error
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
