/**
 * Visual design audit — takes full-page screenshots of every user-facing
 * route in both light and dark themes, then writes out an HTML index that
 * lets you scroll mockups.html and the real app side-by-side.
 *
 * Run:
 *   pnpm --filter=e2e exec playwright test visual-design-audit.spec.ts
 *
 * Output:
 *   e2e/visual-audit/
 *     screenshots/<route>.<theme>.png
 *     index.html   — open this in a browser to scan all routes
 *
 * This is NOT a regression test — there's no baseline comparison. It's a
 * tool for humans (or an AI with vision) to audit design-token alignment.
 */

import { test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootstrapAuthenticatedPage } from '../utils/auth';
import { getSeedData } from '../utils/seed';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(currentDir, '..', 'visual-audit');
const screenshotsDir = path.join(outputDir, 'screenshots');

type Theme = 'light' | 'dark';

interface RouteCapture {
  id: string; // stable slug for filenames
  label: string; // human-friendly label for the report
  mockupSection: string; // which mockups.html section to show beside it
  buildUrl: (seed: Awaited<ReturnType<typeof getSeedData>>) => string;
  // Optional: wait for a selector to prove the page is hydrated before snap.
  waitForTestId?: string;
}

const ROUTES: RouteCapture[] = [
  {
    id: 'home',
    label: 'Home — community list (mockups §2 IA)',
    mockupSection: '2',
    buildUrl: () => '/home',
    waitForTestId: 'community-rail-profile-link',
  },
  {
    id: 'discover',
    label: 'Discover — find public communities',
    mockupSection: '2',
    buildUrl: () => '/discover',
    waitForTestId: 'discover-page',
  },
  {
    id: 'community-channel',
    label: 'Community channel (mockups §3)',
    mockupSection: '3',
    buildUrl: (seed) =>
      `/communities/${seed.communitySlug}/channels/${seed.channelId}`,
  },
  {
    id: 'dm-list',
    label: 'DM list (mockups §4)',
    mockupSection: '4',
    buildUrl: () => '/dm',
    waitForTestId: 'community-rail-profile-link',
  },
  {
    id: 'dm-conversation',
    label: 'DM conversation (mockups §4)',
    mockupSection: '4',
    buildUrl: (seed) => `/dm/${seed.directConversationId}`,
  },
  {
    id: 'agents-dashboard',
    label: 'Agents — device dashboard (mockups §7)',
    mockupSection: '7',
    buildUrl: () => '/agents',
    waitForTestId: 'community-rail-profile-link',
  },
  {
    id: 'inbox',
    label: 'Inbox — mentions and threads',
    mockupSection: '2',
    buildUrl: () => '/inbox',
    waitForTestId: 'community-rail-profile-link',
  },
  {
    id: 'friends',
    label: 'Friends list',
    mockupSection: '2',
    buildUrl: () => '/friends',
    waitForTestId: 'community-rail-profile-link',
  },
  {
    id: 'settings',
    label: 'Settings — root',
    mockupSection: '2',
    buildUrl: () => '/settings',
    waitForTestId: 'community-rail-profile-link',
  },
  {
    id: 'settings-ai',
    label: 'Settings — AI assistant',
    mockupSection: '2',
    buildUrl: () => '/settings/ai',
    waitForTestId: 'community-rail-profile-link',
  },
  {
    id: 'settings-privacy',
    label: 'Settings — privacy',
    mockupSection: '2',
    buildUrl: () => '/settings/privacy',
    waitForTestId: 'community-rail-profile-link',
  },
  {
    id: 'community-settings',
    label: 'Community settings',
    mockupSection: '3',
    buildUrl: (seed) => `/communities/${seed.communitySlug}/settings`,
  },
];

const THEMES: Theme[] = ['light', 'dark'];

function ensureDirs() {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function setTheme(page: Page, theme: Theme) {
  // The app reads its theme from the prefers-color-scheme media query and a
  // localStorage key. Emulate both so whichever path the theme-provider uses
  // lands on the requested theme.
  await page.emulateMedia({ colorScheme: theme });
  await page.evaluate((nextTheme) => {
    try {
      window.localStorage.setItem('zktalk_theme', nextTheme);
      const root = document.documentElement;
      root.classList.toggle('dark', nextTheme === 'dark');
      root.dataset.theme = nextTheme;
      root.style.colorScheme = nextTheme;
    } catch {
      // Ignore — test environment may not allow storage writes.
    }
  }, theme);
}

async function captureRoute(
  page: Page,
  route: RouteCapture,
  theme: Theme,
  token: string,
) {
  await setTheme(page, theme);
  const seed = await getSeedData();
  await bootstrapAuthenticatedPage(page, token, route.buildUrl(seed));
  if (route.waitForTestId) {
    await page
      .getByTestId(route.waitForTestId)
      .waitFor({ state: 'visible', timeout: 15_000 })
      .catch(() => {
        // If the expected testid isn't there, still snap — we want to know.
      });
  }
  // Give any client-side hydration + layout animations a tick to settle.
  await page.waitForTimeout(800);
  const filename = `${route.id}.${theme}.png`;
  await page.screenshot({
    path: path.join(screenshotsDir, filename),
    fullPage: true,
    animations: 'disabled',
  });
  return filename;
}

function renderIndexHtml(captures: Record<string, Record<Theme, string>>) {
  const rows = ROUTES.map((route) => {
    const light = captures[route.id]?.light;
    const dark = captures[route.id]?.dark;
    const mockupFragmentId = `section-${route.mockupSection}`;
    return `
      <section class="route" id="${route.id}">
        <header>
          <h2>${route.label}</h2>
          <p class="hint">
            Reference:
            <a href="../../docs/ui-design/mockups.html#${mockupFragmentId}" target="_blank">
              mockups.html §${route.mockupSection}
            </a>
          </p>
        </header>
        <div class="grid">
          <figure>
            <figcaption>Light</figcaption>
            ${light ? `<a href="screenshots/${light}" target="_blank"><img src="screenshots/${light}" alt="${route.id} light" /></a>` : '<p class="missing">not captured</p>'}
          </figure>
          <figure>
            <figcaption>Dark</figcaption>
            ${dark ? `<a href="screenshots/${dark}" target="_blank"><img src="screenshots/${dark}" alt="${route.id} dark" /></a>` : '<p class="missing">not captured</p>'}
          </figure>
        </div>
      </section>
    `;
  }).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>zkTalk visual audit</title>
  <style>
    :root { color-scheme: light dark; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
      margin: 0;
      padding: 32px;
      background: #f4f6fa;
      color: #17212b;
    }
    @media (prefers-color-scheme: dark) {
      body { background: #0e1621; color: #e7eef5; }
    }
    h1 { margin: 0 0 24px; font-size: 24px; }
    .toc {
      position: sticky;
      top: 16px;
      background: var(--toc-bg, rgba(255,255,255,0.85));
      backdrop-filter: blur(12px);
      padding: 12px 16px;
      border-radius: 12px;
      margin-bottom: 24px;
      box-shadow: 0 6px 24px rgba(0,0,0,0.06);
    }
    .toc a {
      display: inline-block;
      margin: 4px 12px 4px 0;
      color: #2a7fff;
      text-decoration: none;
      font-size: 13px;
    }
    .toc a:hover { text-decoration: underline; }
    section.route {
      margin-bottom: 48px;
      background: var(--card, #ffffff);
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    @media (prefers-color-scheme: dark) {
      .toc { background: rgba(30,42,58,0.85); }
      section.route { background: #17212b; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
    }
    section.route header { margin-bottom: 16px; }
    section.route h2 { margin: 0; font-size: 18px; }
    .hint { margin: 4px 0 0; font-size: 13px; opacity: 0.7; }
    .hint a { color: #2a7fff; text-decoration: none; }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    figure { margin: 0; }
    figcaption {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.6;
      margin-bottom: 6px;
    }
    figure img {
      width: 100%;
      border: 1px solid #e5e9f0;
      border-radius: 8px;
      display: block;
    }
    @media (prefers-color-scheme: dark) {
      figure img { border-color: #232f3e; }
    }
    .missing { opacity: 0.4; font-style: italic; }
  </style>
</head>
<body>
  <h1>zkTalk visual audit — ${new Date().toISOString().slice(0, 19).replace('T', ' ')}</h1>
  <nav class="toc">
    ${ROUTES.map((r) => `<a href="#${r.id}">${r.label.split(' — ')[0]}</a>`).join('')}
  </nav>
  ${rows}
</body>
</html>
`;
}

test.describe('Visual design audit', () => {
  test.describe.configure({ mode: 'serial' });

  // Share the context across routes so we don't re-auth per route; seed once.
  test('capture every user-facing route in both themes', async ({ browser }) => {
    test.setTimeout(10 * 60 * 1000); // 10 min total budget

    ensureDirs();

    const seed = await getSeedData();
    const token = seed.userA.sessionToken;

    const captures: Record<string, Record<Theme, string>> = {};

    for (const theme of THEMES) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
        colorScheme: theme,
      });
      const page = await context.newPage();
      for (const route of ROUTES) {
        try {
          const filename = await captureRoute(page, route, theme, token);
          captures[route.id] = captures[route.id] ?? ({} as Record<Theme, string>);
          captures[route.id][theme] = filename;
          console.log(`  captured ${route.id} [${theme}] → ${filename}`);
        } catch (err) {
          console.warn(
            `  failed ${route.id} [${theme}]:`,
            err instanceof Error ? err.message : String(err),
          );
        }
      }
      await context.close();
    }

    const indexPath = path.join(outputDir, 'index.html');
    fs.writeFileSync(indexPath, renderIndexHtml(captures));
    console.log(`\nVisual audit ready: file://${indexPath}`);
  });
});
