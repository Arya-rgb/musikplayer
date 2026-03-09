// src/components/layout/app-shell.tsx
'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'library'>('home');
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  const handleLibraryOpen = () => {
    setIsLibraryOpen(true);
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Desktop sidebar */}
      <Sidebar
        isMobileLibraryOpen={isLibraryOpen}
        onMobileLibraryOpenChange={setIsLibraryOpen}
      />

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto scrollbar scrollbar-thumb-accent scrollbar-track-transparent">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <BottomNav
        onLibraryClick={handleLibraryOpen}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}
