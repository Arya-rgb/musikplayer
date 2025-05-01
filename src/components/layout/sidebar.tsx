
// src/components/layout/sidebar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ListMusic, Plus, Trash2, Loader2 } from 'lucide-react'; // Added Loader2
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePlayerStore } from '@/store/player-store'; // Playlist type removed, using Firestore structure now
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
import { useAuth } from '@/context/auth-context'; // Import useAuth
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton


export function Sidebar() {
  const {
    playlists, // Now Firestore playlists
    addPlaylist,
    removePlaylist,
    setActivePlaylist,
    activePlaylistId,
    loadPlaylist,
    playlistLoading, // Loading states from store
    fetchUserPlaylists, // Action to fetch playlists
    userId // User ID from store
   } = usePlayerStore();
  const { user, loading: authLoading } = useAuth(); // Get user and auth loading state
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

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
    }
  };

  const handleSelectPlaylist = (playlistId: string | null) => {
     setActivePlaylist(playlistId); // Handles both null (search) and playlist IDs
     if (playlistId) {
        // loadPlaylist(playlistId); // loadPlaylist is now called by setActivePlaylist effect if id is not null
     } else {
         // Optionally clear current playlist videos if switching to search
         // usePlayerStore.setState({ currentPlaylistVideos: [] });
     }
   };

   const renderPlaylistSkeletons = (count: number) => (
       Array.from({ length: count }).map((_, index) => (
          <div key={`skel-${index}`} className="flex items-center space-x-2 h-10 px-2">
             <Skeleton className="h-4 flex-1 rounded" />
              <Skeleton className="w-6 h-6 rounded" />
          </div>
       ))
   );


  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-card text-card-foreground p-4 space-y-4">
       {/* Conditional rendering based on auth loading and user state */}
       {authLoading ? (
          // Show loading state while checking auth
          <div className="flex items-center justify-center h-full">
             <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
       ) : !user ? (
           // Show message if user is not logged in
           <div className="flex flex-col items-center justify-center h-full text-center">
              <ListMusic className="w-10 h-10 text-muted-foreground mb-3"/>
              <p className="text-sm text-muted-foreground">Please log in</p>
              <p className="text-xs text-muted-foreground/70">to manage your playlists.</p>
           </div>
       ) : (
           // Show sidebar content when user is logged in
          <>
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <ListMusic className="w-5 h-5" />
              Playlists
            </h2>

            {/* Search Results "Playlist" */}
            <Button
              variant={!activePlaylistId ? "secondary" : "ghost"}
              className="justify-start w-full"
              onClick={() => handleSelectPlaylist(null)} // Use null for search
            >
              Search Results
            </Button>

             {isFetchingPlaylists ? (
                 renderPlaylistSkeletons(3)
             ) : (
                 <ScrollArea className="flex-1 -mx-4">
                  <div className="px-4 space-y-1">
                    {playlists.length === 0 && !isFetchingPlaylists && (
                        <p className="text-xs text-muted-foreground px-2 py-4 text-center">No playlists created yet.</p>
                    )}
                    {playlists.map((playlist) => (
                      <div key={playlist.id} className="flex items-center group">
                         <Button
                           variant={activePlaylistId === playlist.id ? "secondary" : "ghost"}
                           className="justify-start flex-1 text-left truncate pr-1" // Added pr-1
                           onClick={() => handleSelectPlaylist(playlist.id!)} // Ensure id exists
                            disabled={playlistLoading[playlist.id!] ?? false} // Disable during delete
                         >
                            {playlistLoading[playlist.id!] ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : null}
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
                                 onClick={() => removePlaylist(playlist.id!)} // Ensure id exists
                                 className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                               >
                                 Delete
                               </AlertDialogAction>
                             </AlertDialogFooter>
                           </AlertDialogContent>
                         </AlertDialog>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
             )}


            <Dialog open={isCreatingPlaylist} onOpenChange={setIsCreatingPlaylist}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full mt-auto" disabled={isFetchingPlaylists}>
                   {isAddingPlaylist ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Plus className="w-4 h-4 mr-2" />}
                  New Playlist
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
                    <Input
                      id="playlist-name"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      className="col-span-3"
                      autoFocus
                       disabled={isAddingPlaylist}
                    />
                  </div>
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
          </>
       )}
    </aside>
  );
}

