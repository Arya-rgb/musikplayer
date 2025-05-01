import type {Metadata} from 'next';
import { Inter } from 'next/font/google'; // Use Inter for a modern feel
import './globals.css';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { VideoPlayer } from '@/components/player/video-player';
import { Toaster } from "@/components/ui/toaster"


const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'VibeVerse - Your Music Universe',
  description: 'Stream YouTube Music with style.',
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
          'min-h-screen bg-background font-sans antialiased flex flex-col',
          inter.variable
        )}
      >
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto scrollbar scrollbar-thumb-accent scrollbar-track-transparent pb-24"> {/* Add padding-bottom for player */}
             {children}
          </main>
        </div>
         {/* Video Player fixed at the bottom */}
         {/* Wrap VideoPlayer in a client component boundary if it uses hooks heavily */}
        <VideoPlayer />
         <Toaster />
      </body>
    </html>
  );
}
