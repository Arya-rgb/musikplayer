
// src/components/layout/sidebar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ListMusic, Plus, Trash2, Loader2, Menu, X, LoaderCircle } from 'lucide-react'; // Removed Wand2
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
         {/* Add Playlist Skeleton Card - Moved to top */}
         <Card className="flex items-center justify-start px-3 h-10 gap-2 mb-1 text-muted-foreground border-dashed border-muted-foreground/50 cursor-wait opacity-50">
             <Plus className="w-4 h-4" />
             <span>New Playlist</span>
         </Card>
        <ScrollArea className="flex-1 -mx-4">
           <div className="px-4">
             {renderPlaylistSkeletons(3)}
           </div>
        </ScrollArea>
    </div>
  );


   const renderNoAuth = () => (
      <div className="flex flex-col h-full p-4 space-y-2">
         <div className="flex items-center gap-2 mb-4 p-2">
           <ListMusic className="w-5 h-5" />
           <span className="text-lg font-semibold">Playlists</span>
         </div>
         {/* Keep structure but disabled */}
         <Button variant="ghost" className="justify-start w-full mb-1 cursor-not-allowed opacity-50">
            Search Results
         </Button>
          <Dialog open={false}>
             <DialogTrigger asChild>
                 <Button variant="outline" className="justify-start w-full gap-2 text-muted-foreground border-dashed border-muted-foreground/50 cursor-not-allowed mb-2">
                    <Plus className="w-4 h-4" />
                    <span>New Playlist</span>
                </Button>
             </DialogTrigger>
         </Dialog>
          <div className="flex flex-col items-center justify-center h-full text-center p-4 border-t mt-2">
            <ListMusic className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Please log in</p>
            <p className="text-xs text-muted-foreground/70">to manage playlists.</p>
          </div>
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

           {/* Special Button to Add Playlist - Moved to top */}
            <Dialog open={isCreatingPlaylist} onOpenChange={setIsCreatingPlaylist}>
              <DialogTrigger asChild>
                  <Button variant="outline" className={cn(
                     "justify-start w-full gap-2 text-muted-foreground border-dashed border-muted-foreground/50 hover:border-accent hover:text-accent cursor-pointer transition-colors mb-2", // Added margin bottom
                     (isFetchingPlaylists || isAddingPlaylist) && "opacity-50 cursor-wait" // Dim if playlists are loading initially or adding
                   )}
                   disabled={isFetchingPlaylists || isAddingPlaylist} // Disable trigger when loading/adding
                   >
                      {isAddingPlaylist ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4" />}
                      <span>New Playlist</span>
                  </Button>
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
                     <div className="col-span-3"> {/* Removed flex items-center gap-2 */}
                        <Input
                          id="playlist-name"
                          value={newPlaylistName}
                          onChange={(e) => setNewPlaylistName(e.target.value)}
                          className="w-full" // Ensure input takes full width
                          autoFocus
                          disabled={isAddingPlaylist}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddPlaylist(); }} // Add playlist on Enter key
                        />
                        {/* Removed pre-fill button */}
                     </div>
                  </div>
                   {/* Removed pre-fill hint paragraph */}
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

         <ScrollArea className="flex-1 -mx-4 border-t pt-2"> {/* Added border-t and pt-2 */}
           <div className="px-4 space-y-1">
             {isFetchingPlaylists && playlists.length === 0 ? (
               renderPlaylistSkeletons(3)
             ) : playlists.length === 0 && !isFetchingPlaylists ? (
               <p className="text-xs text-muted-foreground px-2 py-4 text-center">No playlists created yet.</p>
             ) : (
               playlists.map((playlist) => {
                 if (!playlist?.id) return null; // Handle potential missing ID or playlist object
                 return (
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
               )}
              )
             )}
           </div>
         </ScrollArea>

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
          <SheetContent side="left" className="w-72 p-0 bg-card text-card-foreground flex flex-col"> {/* Use flex col */}
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                  <ListMusic className="w-5 h-5"/> Playlists
              </SheetTitle>
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
