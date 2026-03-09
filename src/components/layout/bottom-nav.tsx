// src/components/layout/bottom-nav.tsx
'use client';

import React from 'react';
import { Home, Search, Library } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/store/player-store';

interface BottomNavProps {
  onLibraryClick: () => void;
  activeTab: 'home' | 'search' | 'library';
  onTabChange: (tab: 'home' | 'search' | 'library') => void;
}

export function BottomNav({ onLibraryClick, activeTab, onTabChange }: BottomNavProps) {
  const { setActivePlaylist } = usePlayerStore();

  const handleHomeClick = () => {
    onTabChange('home');
    setActivePlaylist(null);
  };

  const handleSearchClick = () => {
    onTabChange('search');
    // Focus the search input
    const searchInput = document.getElementById('mobile-search-input');
    if (searchInput) {
      searchInput.focus();
    }
  };

  const handleLibraryClick = () => {
    onTabChange('library');
    onLibraryClick();
  };

  const tabs = [
    {
      id: 'home' as const,
      label: 'Home',
      icon: Home,
      onClick: handleHomeClick,
    },
    {
      id: 'search' as const,
      label: 'Search',
      icon: Search,
      onClick: handleSearchClick,
    },
    {
      id: 'library' as const,
      label: 'Library',
      icon: Library,
      onClick: handleLibraryClick,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#0f0f0f] border-t border-white/10 pb-safe">
      {/* Player offset - bottom nav sits at the very bottom, player floats above */}
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={tab.onClick}
              className={cn(
                'flex flex-col items-center gap-1 px-5 py-1.5 rounded-lg transition-colors duration-150',
                isActive ? 'text-white' : 'text-[#b3b3b3]'
              )}
            >
              <Icon
                className={cn(
                  'w-6 h-6 transition-colors',
                  isActive ? 'text-[#1DB954]' : 'text-[#b3b3b3]'
                )}
                fill={isActive && tab.id !== 'search' ? 'currentColor' : 'none'}
              />
              <span
                className={cn(
                  'text-[10px] font-semibold tracking-wide',
                  isActive ? 'text-white' : 'text-[#b3b3b3]'
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
