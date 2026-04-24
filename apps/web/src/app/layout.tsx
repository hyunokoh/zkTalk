import type { Metadata } from 'next';
import { Providers } from '@/lib/providers';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'zkTalk',
  description: 'Community messenger for everyone',
};

// Runs before React hydrates so we avoid a light→dark flash on first paint.
// Reads the persisted zustand theme ({ "state": { "theme": "dark" } }) and
// falls back to prefers-color-scheme if the user hasn't picked yet. Must be
// inlined and guarded against JSON/localStorage throwing.
const THEME_BOOT_SCRIPT = `
  (function () {
    try {
      var root = document.documentElement;
      var raw = localStorage.getItem('zktalk-theme');
      var parsed = raw ? JSON.parse(raw) : null;
      var theme = parsed && parsed.state && parsed.state.theme;
      if (theme !== 'dark' && theme !== 'light') {
        theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      }
      if (theme === 'dark') root.classList.add('dark');
      root.setAttribute('data-theme', theme);
      root.style.colorScheme = theme;
    } catch (_) {
      /* ignore — ThemeApplier will re-apply after hydration */
    }
  })();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Tokenized surface from `globals.css` — light is primary; `dark` class
    // or `prefers-color-scheme: dark` swap the CSS variables.
    <html lang="en">
      <head>
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
        />
      </head>
      <body className="bg-bg text-fg antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
