
// src/components/layout/header.tsx
'use client';

import React, { useState } from 'react';
import { Music, Search, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePlayerStore } from '@/store/player-store';
import { useAuth } from '@/context/auth-context'; // Import useAuth
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const { searchVideos } = usePlayerStore();
  const { user, loading, signOut } = useAuth(); // Get user and signOut from context

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchVideos(searchQuery.trim());
    }
  };

   const getInitials = (email?: string | null) => {
     if (!email) return "?";
     const parts = email.split('@')[0];
     return parts.substring(0, 2).toUpperCase();
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

       {/* Auth Section */}
       <div className="flex items-center gap-4">
        {!loading && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || "User"} />
                  <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.displayName || "User"}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* Add other menu items here if needed */}
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
         )}
         {/* Optionally show a loading indicator or login button if needed */}
         {loading && <div>Loading...</div>}
         {/* {!loading && !user && <Button variant="outline" size="sm">Login</Button>} */}
       </div>
    </header>
  );
}
