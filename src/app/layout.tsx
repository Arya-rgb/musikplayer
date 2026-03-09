
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { VideoPlayer } from '@/components/player/video-player';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/auth-context';
import { AppShell } from '@/components/layout/app-shell';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'VibeVerse - Your Music Universe',
  description: 'Stream YouTube Music with style.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#1DB954',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased flex flex-col overflow-hidden',
          inter.variable
        )}
      >
        <AuthProvider>
          <Header />
          <AppShell>
            {children}
          </AppShell>
          {/* Video Player fixed at the bottom — above bottom nav on mobile */}
          <VideoPlayer />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
