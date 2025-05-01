
// src/components/layout/sidebar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ListMusic, Plus, Trash2, Loader2, Wand2, Menu, X } from 'lucide-react'; // Added Menu, X
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
  SheetTrigger,
} from "@/components/ui/sheet"; // Import Sheet components
import { useAuth } from '@/context/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile'; // Import useIsMobile hook
import { cn } from '@/lib/utils'; // Import cn for conditional classes

export function Sidebar() {
  const {
    playlists,
    addPlaylist,
    removePlaylist,
    setActivePlaylist,
    activePlaylistId,
    loadPlaylist,
    playlistLoading,
    fetchUserPlaylists,
    userId,
  } = usePlayerStore();
  const { user, loading: authLoading } = useAuth();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false); // State for mobile sheet
  const isMobile = useIsMobile(); // Check if mobile view

  // Loading state specifically for playlist creation
  const isAddingPlaylist = playlistLoading['add'] ?? false;
  // Loading state for initial playlist fetch
  const isFetchingPlaylists = playlistLoading['fetch'] ?? false;

  // Fetch playlists when user is authenticated
  useEffect(() => {
    if (user && userId) {
      // Check if playlists are already loaded or being loaded to avoid redundant fetches
      if (playlists.length === 0 && !isFetchingPlaylists) {
        fetchUserPlaylists(userId);
      }
    }
  }, [user, userId, fetchUserPlaylists, playlists.length, isFetchingPlaylists]);

  const handleAddPlaylist = async () => {
    if (newPlaylistName.trim() && !isAddingPlaylist) {
      await addPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreatingPlaylist(false); // Close dialog on success
      if (isMobile) setIsMobileSheetOpen(false); // Close sheet on mobile
    }
  };

  const handleSelectPlaylist = (playlistId: string | null) => {
    setActivePlaylist(playlistId);
    if (playlistId) {
      // loadPlaylist is called by setActivePlaylist effect if id is not null
    } else {
      // Optionally clear current playlist videos if switching to search
      // usePlayerStore.setState({ currentPlaylistVideos: [] });
    }
     if (isMobile) setIsMobileSheetOpen(false); // Close sheet on mobile after selection
  };

  const handlePrepopulatePlaylistName = () => {
    setNewPlaylistName("My Awesome Playlist");
  };

   const handleDeletePlaylist = async (playlistId: string) => {
       await removePlaylist(playlistId);
       // No need to close sheet here, AlertDialog handles it
   }

  const renderPlaylistSkeletons = (count: number) => (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, index) => (
        <div key={`skel-${index}`} className="flex items-center space-x-2 h-10 px-2">
          <Skeleton className="h-4 flex-1 rounded" />
          <Skeleton className="w-6 h-6 rounded" />
        </div>
      ))}
    </div>
  );

  const renderAuthLoading = () => (
    <div className="flex flex-col h-full p-4 space-y-2">
        <div className="flex items-center gap-2 mb-4 p-2">
           <ListMusic className="w-5 h-5" />
           <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-10 w-full mb-2" /> {/* Skeleton for Search Results */}
        <ScrollArea className="flex-1 -mx-4">
           <div className="px-4">
             {renderPlaylistSkeletons(3)}
              <Card className="flex items-center justify-center p-3 gap-2 mt-2 text-muted-foreground border-dashed border-muted-foreground/50 hover:border-accent hover:text-accent cursor-wait opacity-50">
                <Plus className="w-4 h-4" />
                <span>New Playlist</span>
              </Card>
           </div>
        </ScrollArea>
    </div>
  );

   const renderNoAuth = () => (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <ListMusic className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Please log in</p>
        <p className="text-xs text-muted-foreground/70">to manage playlists.</p>
         {/* Keep structure but disabled */}
         <Dialog open={false}>
             <DialogTrigger asChild>
                 <Card className="flex items-center justify-center p-3 gap-2 mt-6 text-muted-foreground border-dashed border-muted-foreground/50 cursor-not-allowed w-full">
                    <Plus className="w-4 h-4" />
                    <span>New Playlist</span>
                </Card>
             </DialogTrigger>
         </Dialog>
      </div>
    );

   // Extracted content for reuse in desktop and mobile sheet
   const renderSidebarContent = () => (
       <div className="flex flex-col h-full p-4 space-y-2">
         <div className="flex items-center justify-between p-2">
           <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
             <ListMusic className="w-5 h-5" />
             Playlists
           </h2>
           {isFetchingPlaylists && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
         </div>

         {/* Search Results "Playlist" */}
         <Button
           variant={!activePlaylistId ? 'secondary' : 'ghost'}
           className="justify-start w-full mb-1" // Added margin bottom
           onClick={() => handleSelectPlaylist(null)} // Use null for search
         >
           Search Results
         </Button>

         <ScrollArea className="flex-1 -mx-4">
           <div className="px-4 space-y-1">
             {isFetchingPlaylists && playlists.length === 0 ? (
               renderPlaylistSkeletons(3)
             ) : playlists.length === 0 && !isFetchingPlaylists ? (
               <p className="text-xs text-muted-foreground px-2 py-4 text-center">No playlists created yet.</p>
             ) : (
               playlists.map((playlist) => playlist?.id ? ( // Check if playlist.id exists
                 <div key={playlist.id} className="flex items-center group">
                   <Button
                     variant={activePlaylistId === playlist.id ? 'secondary' : 'ghost'}
                     className="justify-start flex-1 text-left truncate pr-1" // Added pr-1
                     onClick={() => handleSelectPlaylist(playlist.id!)} // Ensure id exists
                     disabled={playlistLoading[playlist.id!] ?? false} // Disable during delete
                   >
                     {playlistLoading[playlist.id!] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                     {playlist.name}
                   </Button>
                   <AlertDialog>
                     <AlertDialogTrigger asChild>
                       <Button
                         variant="ghost"
                         size="icon"
                         className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive w-8 h-8 flex-shrink-0" // Ensure size
                         disabled={playlistLoading[playlist.id!] ?? false} // Disable during delete
                       >
                         <Trash2 className="w-4 h-4" />
                       </Button>
                     </AlertDialogTrigger>
                     <AlertDialogContent>
                       <AlertDialogHeader>
                         <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                         <AlertDialogDescription>
                           This action cannot be undone. This will permanently delete the playlist "{playlist.name}".
                         </AlertDialogDescription>
                       </AlertDialogHeader>
                       <AlertDialogFooter>
                         <AlertDialogCancel>Cancel</AlertDialogCancel>
                         <AlertDialogAction
                           onClick={() => handleDeletePlaylist(playlist.id!)} // Ensure id exists
                           className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                         >
                           Delete
                         </AlertDialogAction>
                       </AlertDialogFooter>
                     </AlertDialogContent>
                   </AlertDialog>
                 </div>
               ) : null // Render nothing if playlist.id is missing
              )
             )}
           </div>
         </ScrollArea>

           {/* Special Card to Add Playlist - Always visible */}
            <Dialog open={isCreatingPlaylist} onOpenChange={setIsCreatingPlaylist}>
              <DialogTrigger asChild>
                  <Card className={cn(
                     "flex items-center justify-center p-3 gap-2 mt-2 text-muted-foreground border-dashed border-muted-foreground/50 hover:border-accent hover:text-accent cursor-pointer transition-colors",
                     isFetchingPlaylists && "opacity-50 cursor-wait" // Dim if playlists are still loading initially
                   )}>
                      {isAddingPlaylist ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4" />}
                      <span>New Playlist</span>
                  </Card>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Playlist</DialogTitle>
                  <DialogDescription>
                    Enter a name for your new playlist.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="playlist-name" className="text-right">
                      Name
                    </Label>
                     <div className="col-span-3 flex items-center gap-2">
                        <Input
                          id="playlist-name"
                          value={newPlaylistName}
                          onChange={(e) => setNewPlaylistName(e.target.value)}
                          className="flex-1"
                          autoFocus
                          disabled={isAddingPlaylist}
                          aria-describedby="prepopulate-hint"
                        />
                        <Button
                         variant="ghost"
                         size="icon"
                         onClick={handlePrepopulatePlaylistName}
                         disabled={isAddingPlaylist}
                         title="Pre-fill name"
                         aria-label="Pre-fill name"
                        >
                          <Wand2 className="w-4 h-4"/>
                        </Button>
                     </div>
                  </div>
                   <p id="prepopulate-hint" className="text-xs text-muted-foreground col-start-2 col-span-3 pl-1">
                      Click the magic wand to pre-fill a name.
                    </p>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary" disabled={isAddingPlaylist}>Cancel</Button>
                  </DialogClose>
                  <Button type="submit" onClick={handleAddPlaylist} disabled={!newPlaylistName.trim() || isAddingPlaylist}>
                     {isAddingPlaylist ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : null}
                    Create Playlist
                  </Button>
                </DialogFooter>
              </DialogContent>
          </Dialog>

       </div>
   );

   if (isMobile) {
      return (
        <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
          <SheetTrigger asChild>
            {/* Button in the header will trigger this */}
             <Button variant="ghost" size="icon" className="md:hidden fixed top-4 left-4 z-50 bg-background/80 backdrop-blur">
                 <Menu className="h-6 w-6" />
                 <span className="sr-only">Open Menu</span>
             </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-card text-card-foreground">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                  <ListMusic className="w-5 h-5"/> Playlists
              </SheetTitle>
               <Button variant="ghost" size="icon" onClick={() => setIsMobileSheetOpen(false)} className="absolute top-3 right-3">
                   <X className="h-5 w-5"/>
                   <span className="sr-only">Close Menu</span>
               </Button>
            </SheetHeader>
             {authLoading ? renderAuthLoading() : !user ? renderNoAuth() : renderSidebarContent()}
          </SheetContent>
        </Sheet>
      );
   }


  // --- Desktop Sidebar ---
  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-card text-card-foreground">
       {authLoading ? renderAuthLoading() : !user ? renderNoAuth() : renderSidebarContent()}
    </aside>
  );
}

