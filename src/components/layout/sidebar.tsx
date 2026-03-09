
// src/components/layout/sidebar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ListMusic, Plus, Trash2, Loader2, Music2, Search, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePlayerStore } from '@/store/player-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from '@/context/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isMobileLibraryOpen?: boolean;
  onMobileLibraryOpenChange?: (open: boolean) => void;
}

export function Sidebar({ isMobileLibraryOpen = false, onMobileLibraryOpenChange }: SidebarProps) {
  const {
    playlists,
    addPlaylist,
    removePlaylist,
    setActivePlaylist,
    activePlaylistId,
    playlistLoading,
    fetchUserPlaylists,
    userId,
  } = usePlayerStore();
  const { user, loading: authLoading } = useAuth();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  const isAddingPlaylist = playlistLoading['add'] ?? false;
  const isFetchingPlaylists = playlistLoading['fetch'] ?? false;

  useEffect(() => {
    if (user && userId && playlists.length === 0 && !isFetchingPlaylists) {
      fetchUserPlaylists(userId);
    }
  }, [user, userId, fetchUserPlaylists, playlists.length, isFetchingPlaylists]);

  const handleAddPlaylist = async () => {
    if (newPlaylistName.trim() && !isAddingPlaylist) {
      await addPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreatingPlaylist(false);
      onMobileLibraryOpenChange?.(false);
    }
  };

  const handleSelectPlaylist = (playlistId: string | null) => {
    setActivePlaylist(playlistId);
    onMobileLibraryOpenChange?.(false);
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    await removePlaylist(playlistId);
  };

  const renderPlaylistSkeletons = (count: number) => (
    <div className="space-y-1 px-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={`skel-${index}`} className="flex items-center space-x-3 h-12 px-2">
          <Skeleton className="h-10 w-10 rounded bg-white/10 flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-3/4 bg-white/10 rounded" />
            <Skeleton className="h-3 w-1/2 bg-white/10 rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  const renderLibraryContent = () => (
    <div className="flex flex-col h-full">
      {/* Library header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-[#b3b3b3] hover:text-white transition-colors cursor-default">
          <ListMusic className="w-5 h-5" />
          <span className="font-bold text-sm">Your Library</span>
        </div>
        {user && (
          <Dialog open={isCreatingPlaylist} onOpenChange={setIsCreatingPlaylist}>
            <DialogTrigger asChild>
              <button
                disabled={isFetchingPlaylists || isAddingPlaylist}
                className="w-8 h-8 flex items-center justify-center rounded-full text-[#b3b3b3] hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Create playlist"
              >
                <Plus className="w-5 h-5" />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] bg-[#282828] border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">Create Playlist</DialogTitle>
                <DialogDescription className="text-[#b3b3b3]">
                  Give your playlist a name.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="playlist-name" className="text-sm text-[#b3b3b3] mb-2 block">Name</Label>
                <Input
                  id="playlist-name"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="bg-[#3e3e3e] border-none text-white placeholder:text-[#727272] focus-visible:ring-white/30"
                  placeholder="My playlist..."
                  autoFocus
                  disabled={isAddingPlaylist}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddPlaylist(); }}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost" className="text-white hover:bg-white/10" disabled={isAddingPlaylist}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleAddPlaylist}
                  disabled={!newPlaylistName.trim() || isAddingPlaylist}
                  className="rounded-full bg-[#1DB954] text-black font-bold hover:bg-[#1ed760] border-none"
                >
                  {isAddingPlaylist ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search results item */}
      <div className="px-2">
        <button
          onClick={() => handleSelectPlaylist(null)}
          className={cn(
            'w-full flex items-center gap-3 px-2 py-2 rounded-md transition-colors text-left',
            !activePlaylistId
              ? 'bg-[#282828] text-white'
              : 'text-[#b3b3b3] hover:text-white hover:bg-white/5'
          )}
        >
          <div className="w-10 h-10 rounded bg-gradient-to-br from-[#450af5] to-[#c4efd9] flex items-center justify-center flex-shrink-0">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">Search Results</p>
            <p className="text-xs text-[#b3b3b3]">YouTube</p>
          </div>
        </button>
      </div>

      {/* Playlist list */}
      <ScrollArea className="flex-1 mt-1 scrollbar">
        <div className="px-2 pb-4 space-y-0.5">
          {authLoading || isFetchingPlaylists && playlists.length === 0 ? (
            renderPlaylistSkeletons(4)
          ) : !user ? (
            <div className="px-4 py-6 text-center">
              <ListMusic className="w-8 h-8 text-[#b3b3b3] mx-auto mb-2" />
              <p className="text-sm text-[#b3b3b3]">Log in to see your library</p>
            </div>
          ) : playlists.length === 0 && !isFetchingPlaylists ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-[#b3b3b3]">No playlists yet.</p>
            </div>
          ) : (
            playlists.map((playlist) => {
              if (!playlist?.id) return null;
              const isActive = activePlaylistId === playlist.id;
              const isLoading = playlistLoading[playlist.id] ?? false;
              return (
                <div key={playlist.id} className="group flex items-center gap-3 px-2 py-2 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => !isLoading && handleSelectPlaylist(playlist.id!)}>
                  <div className={cn(
                    'w-10 h-10 rounded flex items-center justify-center flex-shrink-0 transition-colors',
                    isActive ? 'bg-[#1DB954]/20' : 'bg-[#282828]'
                  )}>
                    <Music2 className={cn('w-5 h-5', isActive ? 'text-[#1DB954]' : 'text-[#b3b3b3]')} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-semibold truncate', isActive ? 'text-[#1DB954]' : 'text-white')}>
                      {isLoading ? <Loader2 className="w-3 h-3 inline mr-1 animate-spin" /> : null}
                      {playlist.name}
                    </p>
                    <p className="text-xs text-[#b3b3b3]">Playlist</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <button
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded text-[#b3b3b3] hover:text-red-400 transition-all"
                        disabled={isLoading}
                        aria-label="Delete playlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#282828] border-white/10">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Delete playlist?</AlertDialogTitle>
                        <AlertDialogDescription className="text-[#b3b3b3]">
                          This will permanently delete "{playlist.name}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-white/20 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeletePlaylist(playlist.id!)}
                          className="bg-[#1DB954] text-black font-bold hover:bg-[#1ed760] border-none"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-[#0f0f0f] text-white shrink-0">
        {/* Nav items */}
        <nav className="p-3 space-y-1 border-b border-white/5">
          <button
            onClick={() => handleSelectPlaylist(null)}
            className={cn(
              'w-full flex items-center gap-4 px-3 py-2.5 rounded-md text-sm font-bold transition-colors',
              !activePlaylistId ? 'text-white' : 'text-[#b3b3b3] hover:text-white'
            )}
          >
            <Home className={cn('w-5 h-5 shrink-0', !activePlaylistId ? 'text-white' : '')} fill={!activePlaylistId ? 'currentColor' : 'none'} />
            Home
          </button>
        </nav>

        {/* Library */}
        <div className="flex-1 overflow-hidden flex flex-col mt-2">
          {renderLibraryContent()}
        </div>
      </aside>

      {/* Mobile sheet — bottom sheet */}
      <Sheet open={isMobileLibraryOpen} onOpenChange={onMobileLibraryOpenChange}>
        <SheetContent
          side="bottom"
          className="p-0 bg-[#121212] border-t border-white/10 text-white flex flex-col rounded-t-2xl max-h-[82vh]"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <SheetHeader className="px-5 pt-1 pb-3 border-b border-white/5 shrink-0">
            <SheetTitle className="flex items-center justify-between text-white text-lg font-bold">
              <div className="flex items-center gap-2">
                <ListMusic className="w-5 h-5 text-[#1DB954]" />
                Your Library
              </div>
              {user && (
                <Dialog open={isCreatingPlaylist} onOpenChange={setIsCreatingPlaylist}>
                  <DialogTrigger asChild>
                    <button
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-[#282828] text-[#b3b3b3] hover:text-white hover:bg-[#3e3e3e] transition-colors"
                      aria-label="Create playlist"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[400px] bg-[#282828] border-white/10 mx-4">
                    <DialogHeader>
                      <DialogTitle className="text-white">Create Playlist</DialogTitle>
                      <DialogDescription className="text-[#b3b3b3]">Give your playlist a name.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Label htmlFor="mob-playlist-name" className="text-sm text-[#b3b3b3] mb-2 block">Name</Label>
                      <Input
                        id="mob-playlist-name"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        className="bg-[#3e3e3e] border-none text-white placeholder:text-[#727272] focus-visible:ring-white/30"
                        placeholder="My playlist..."
                        autoFocus
                        disabled={isAddingPlaylist}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddPlaylist(); }}
                      />
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="ghost" className="text-white hover:bg-white/10" disabled={isAddingPlaylist}>Cancel</Button>
                      </DialogClose>
                      <Button
                        onClick={handleAddPlaylist}
                        disabled={!newPlaylistName.trim() || isAddingPlaylist}
                        className="rounded-full bg-[#1DB954] text-black font-bold hover:bg-[#1ed760] border-none"
                      >
                        {isAddingPlaylist ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Create
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </SheetTitle>
          </SheetHeader>

          {/* Search Results shortcut */}
          <div className="px-4 pt-3 pb-1 shrink-0">
            <button
              onClick={() => handleSelectPlaylist(null)}
              className={cn(
                'w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-colors text-left',
                !activePlaylistId ? 'bg-[#1DB954]/15 border border-[#1DB954]/30' : 'bg-[#282828] hover:bg-[#333]'
              )}
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#450af5] to-[#c4efd9] flex items-center justify-center shrink-0">
                <Search className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className={cn('text-sm font-bold', !activePlaylistId ? 'text-[#1DB954]' : 'text-white')}>Search Results</p>
                <p className="text-xs text-[#b3b3b3]">YouTube Videos</p>
              </div>
              {!activePlaylistId && <div className="ml-auto w-2 h-2 rounded-full bg-[#1DB954] shrink-0" />}
            </button>
          </div>

          {/* Playlists label */}
          {user && playlists.length > 0 && (
            <p className="px-5 pt-3 pb-1 text-xs font-bold tracking-widest uppercase text-[#b3b3b3] shrink-0">
              Playlists
            </p>
          )}

          {/* Scrollable list */}
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="px-4 pb-10 space-y-1">
              {authLoading || (isFetchingPlaylists && playlists.length === 0) ? (
                renderPlaylistSkeletons(4)
              ) : !user ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <ListMusic className="w-10 h-10 text-[#b3b3b3] mb-3 opacity-40" />
                  <p className="text-sm font-semibold text-white">Log in to see your library</p>
                  <p className="text-xs text-[#b3b3b3] mt-1">Save your favourite playlists here</p>
                </div>
              ) : playlists.length === 0 && !isFetchingPlaylists ? (
                <div className="flex flex-col items-center text-center py-8">
                  <p className="text-sm text-[#b3b3b3]">No playlists yet.</p>
                  <p className="text-xs text-[#b3b3b3]/60 mt-1">Tap + to create one!</p>
                </div>
              ) : (
                playlists.map((playlist) => {
                  if (!playlist?.id) return null;
                  const isActive = activePlaylistId === playlist.id;
                  const isLoading = playlistLoading[playlist.id] ?? false;
                  return (
                    <div
                      key={playlist.id}
                      className={cn(
                        'group flex items-center gap-4 px-3 py-3 rounded-xl transition-colors cursor-pointer',
                        isActive ? 'bg-[#1DB954]/15 border border-[#1DB954]/30' : 'hover:bg-white/5'
                      )}
                      onClick={() => !isLoading && handleSelectPlaylist(playlist.id!)}
                    >
                      <div className={cn(
                        'w-12 h-12 rounded-lg flex items-center justify-center shrink-0',
                        isActive ? 'bg-[#1DB954]/20' : 'bg-[#282828]'
                      )}>
                        <Music2 className={cn('w-5 h-5', isActive ? 'text-[#1DB954]' : 'text-[#b3b3b3]')} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-sm font-semibold truncate', isActive ? 'text-[#1DB954]' : 'text-white')}>
                          {isLoading ? <Loader2 className="w-3 h-3 inline mr-1 animate-spin" /> : null}
                          {playlist.name}
                        </p>
                        <p className="text-xs text-[#b3b3b3]">Playlist</p>
                      </div>
                      {isActive && <div className="w-2 h-2 rounded-full bg-[#1DB954] shrink-0" />}
                      <AlertDialog>
                        <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button
                            className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center rounded-full text-[#b3b3b3] hover:text-red-400 hover:bg-white/10 transition-all shrink-0"
                            disabled={isLoading}
                            aria-label="Delete playlist"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-[#282828] border-white/10 mx-4">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">Delete playlist?</AlertDialogTitle>
                            <AlertDialogDescription className="text-[#b3b3b3]">
                              This will permanently delete "{playlist.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-transparent border-white/20 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeletePlaylist(playlist.id!)}
                              className="bg-[#1DB954] text-black font-bold hover:bg-[#1ed760] border-none"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
