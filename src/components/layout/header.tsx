// src/components/layout/header.tsx
'use client';

import React, { useState } from 'react';
import { Music, Search, LogOut, LogIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePlayerStore } from '@/store/player-store';
import { useAuth } from '@/context/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LoginForm } from '@/components/auth/login-form';
import { cn } from '@/lib/utils';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const { searchVideos } = usePlayerStore();
  const { user, loading, signOut } = useAuth();
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchVideos(searchQuery.trim());
    }
  };

  const getInitials = (email?: string | null) => {
    if (!email) return '?';
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  const handleLoginSuccess = () => {
    setIsLoginDialogOpen(false);
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#121212]/90 backdrop-blur-md border-b border-white/[0.06] h-16 md:px-6">
      {/* Left: Logo (desktop) or spacer (mobile) */}
      <div className="flex items-center gap-3">
        {/* Nav arrows - desktop only */}
        <div className="hidden md:flex items-center gap-1">
          <button
            onClick={() => window.history.back()}
            className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.history.forward()}
            className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            aria-label="Go forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile logo */}
        <div className="flex items-center gap-2 md:hidden">
          <Music className="w-5 h-5 text-[#1DB954]" />
          <span className="text-base font-bold text-white tracking-tight">VibeVerse</span>
        </div>
      </div>

      {/* Center: search bar (desktop) */}
      <form
        onSubmit={handleSearch}
        className="hidden md:flex items-center gap-2 w-full max-w-sm mx-auto"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b3b3b3]" />
          <Input
            type="search"
            placeholder="What do you want to listen to?"
            className={cn(
              'pl-9 h-10 rounded-full border-none bg-white text-black placeholder:text-gray-500',
              'focus-visible:ring-1 focus-visible:ring-white/50 focus:bg-white',
              'text-sm'
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button type="submit" className="sr-only">Search</button>
      </form>

      {/* Right: Auth */}
      <div className="flex items-center gap-2">
        {loading ? (
          <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full p-0 hover:opacity-80 transition-opacity"
              >
                <Avatar className="h-9 w-9 border-2 border-white/20">
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || 'User'} />
                  <AvatarFallback className="bg-[#282828] text-white text-xs font-bold">
                    {getInitials(user.email)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52 bg-[#282828] border-white/10 text-white" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-semibold">{user.displayName || 'User'}</p>
                  <p className="text-xs text-[#b3b3b3]">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={signOut}
                className="text-[#b3b3b3] hover:text-white focus:text-white focus:bg-white/10 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="rounded-full px-5 h-9 text-sm font-bold bg-white text-black hover:bg-white/90 transition-colors"
              >
                <LogIn className="mr-1.5 h-4 w-4" />
                <span>Log in</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-[#121212] border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">Welcome Back</DialogTitle>
                <DialogDescription className="text-[#b3b3b3]">
                  Sign in to access your VibeVerse.
                </DialogDescription>
              </DialogHeader>
              <LoginForm onLoginSuccess={handleLoginSuccess} />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </header>
  );
}
