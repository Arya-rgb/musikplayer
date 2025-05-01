// src/components/layout/header.tsx
'use client';

import React, { useState } from 'react';
import { Music, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePlayerStore } from '@/store/player-store';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const { searchVideos } = usePlayerStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchVideos(searchQuery.trim());
    }
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <Music className="w-6 h-6 text-accent" />
        <h1 className="text-xl font-bold tracking-tight text-foreground">VibeVerse</h1>
      </div>
      <form onSubmit={handleSearch} className="flex items-center gap-2 w-full max-w-sm md:max-w-md">
        <Input
          type="search"
          placeholder="Search for music..."
          className="flex-1"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button type="submit" size="icon" variant="ghost">
          <Search className="w-5 h-5" />
          <span className="sr-only">Search</span>
        </Button>
      </form>
    </header>
  );
}