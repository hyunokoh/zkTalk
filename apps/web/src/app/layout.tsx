import type { Metadata } from 'next';
import { Providers } from '@/lib/providers';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'zkTalk',
  description: 'Community messenger for everyone',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-gray-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
