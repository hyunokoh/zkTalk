'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { useThemeStore } from '@/stores/theme';

// Side-effect component: reads the persisted theme from zustand and applies
// it to <html> as `class="dark"` (+ `data-theme`) so the CSS variables in
// globals.css switch surfaces. Without this the store value is purely
// internal — the DOM never reflects it and the page renders in the :root
// (light) palette regardless of what the user picked.
function ThemeApplier() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  }, [theme]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeApplier />
      {children}
    </QueryClientProvider>
  );
}
