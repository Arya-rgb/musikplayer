
// src/components/layout/header.tsx
'use client';

import React, { useState } from 'react';
import { Music, Search, LogOut, LogIn } from 'lucide-react'; // Keep needed icons
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
// Removed useIsMobile and related Sheet imports/logic

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const { searchVideos } = usePlayerStore();
  const { user, loading, signOut } = useAuth();
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false); // State for dialog
  // Removed isMobile and sheet state/logic

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

  const handleLoginSuccess = () => {
    setIsLoginDialogOpen(false);
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6 lg:px-8 h-16"> {/* Fixed height */}
      {/* Mobile Sidebar Trigger (now handled within Sidebar component) - Removed button here */}

      {/* Logo and Title - Add padding for mobile menu button space */}
      <div className="flex items-center gap-2 pl-10 md:pl-0"> {/* Add pl-10 for mobile, md:pl-0 for desktop */}
        <Music className="w-6 h-6 text-accent" />
        <h1 className="text-xl font-bold tracking-tight text-foreground hidden sm:block">VibeVerse</h1> {/* Hide title on very small screens */}
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex items-center gap-2 w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto px-2"> {/* Centered search, adjusted width */}
        <Input
          type="search"
          placeholder="Search..." // Shorter placeholder
          className="flex-1 h-9" // Smaller height
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button type="submit" size="icon" variant="ghost" className="h-9 w-9"> {/* Smaller button */}
          <Search className="w-5 h-5" />
          <span className="sr-only">Search</span>
        </Button>
      </form>

      {/* Auth Section */}
      <div className="flex items-center gap-2 sm:gap-4"> {/* Reduced gap */}
        {loading ? (
          <div className="text-xs sm:text-sm text-muted-foreground">Loading...</div>
        ) : user ? (
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
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                 <LogIn className="mr-1.5 h-4 w-4" /> {/* Adjusted margin */}
                 <span className="hidden sm:inline">Login</span> {/* Hide text on small screens */}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Welcome Back</DialogTitle>
                <DialogDescription>
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
