import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/lib/ThemeContext';
import { UserProvider } from '@/lib/UserContext';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Gravity - Renju Game Service',
  description: 'Online multiplayer Renju game service',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <UserProvider>
            {children}
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
