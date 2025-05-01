
// src/components/layout/header.tsx
'use client';

import React, { useState } from 'react';
import { Music, Search, LogOut, LogIn } from 'lucide-react'; // Added LogIn
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
} from '@/components/ui/dialog'; // Import Dialog components
import { LoginForm } from '@/components/auth/login-form'; // Import LoginForm

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const { searchVideos } = usePlayerStore();
  const { user, loading, signOut } = useAuth();
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false); // State for dialog

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
    setIsLoginDialogOpen(false); // Close the dialog on successful login
    // Optional: Add a small delay before reload if needed
    // setTimeout(() => window.location.reload(), 100);
    window.location.reload(); // Reload the page to reflect login state
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6 lg:px-8">
      {/* Logo and Title */}
      <div className="flex items-center gap-2">
        <Music className="w-6 h-6 text-accent" />
        <h1 className="text-xl font-bold tracking-tight text-foreground">VibeVerse</h1>
      </div>

      {/* Search Form */}
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
        {loading ? (
          // Optional: Show a loading indicator while checking auth state
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : user ? (
          // User is logged in - Show User Dropdown
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
          // User is not logged in - Show Login Button triggering a Dialog
          <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                 <LogIn className="mr-2 h-4 w-4" />
                 Login
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Welcome Back</DialogTitle>
                <DialogDescription>
                  Sign in to access your VibeVerse.
                </DialogDescription>
              </DialogHeader>
              {/* Render the LoginForm inside the Dialog */}
              <LoginForm onLoginSuccess={handleLoginSuccess} />
              {/* Footer can be added inside LoginForm or here */}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </header>
  );
}
