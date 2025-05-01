
import type {Metadata, Viewport} from 'next';
import { Inter } from 'next/font/google'; // Use Inter for a modern feel
import './globals.css';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { VideoPlayer } from '@/components/player/video-player';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/auth-context'; // Import AuthProvider


const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'VibeVerse - Your Music Universe',
  description: 'Stream YouTube Music with style.',
  manifest: '/manifest.json', // Link to the manifest file
};

// Add viewport configuration for PWA
export const viewport: Viewport = {
  themeColor: '#008080', // Match theme-color in manifest.json
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // No extra whitespace before <html> tag
    <html lang="en" className="dark">
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased flex flex-col overflow-hidden', // Prevent body scroll
          inter.variable
        )}
      >
        <AuthProvider> {/* Wrap content with AuthProvider */}
          <Header />
          <div className="flex flex-1 overflow-hidden"> {/* Main content area */}
            <Sidebar />
            <main className="flex-1 overflow-y-auto scrollbar scrollbar-thumb-accent scrollbar-track-transparent pb-24 md:pb-28"> {/* Add more padding-bottom for player */}
              {children}
            </main>
          </div>
          {/* Video Player fixed at the bottom */}
          <VideoPlayer />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}

