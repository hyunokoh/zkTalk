import type { Metadata } from 'next';
import { Providers } from '@/lib/providers';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'zkTalk',
  description: 'Community messenger for everyone',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Tokenized surface from `globals.css` — light is primary; `dark` class
    // or `prefers-color-scheme: dark` swap the CSS variables.
    <html lang="en">
      <body className="bg-bg text-fg antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
