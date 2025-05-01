
// src/components/layout/sidebar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ListMusic, Plus, Trash2, Loader2, Wand2 } from 'lucide-react'; // Added Loader2, Wand2
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
import { useAuth } from '@/context/auth-context';
import { Skeleton } from '@/components/ui/skeleton';

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
    setActivePlaylist(playlistId);
    if (playlistId) {
      // loadPlaylist is called by setActivePlaylist effect if id is not null
    } else {
      // Optionally clear current playlist videos if switching to search
      // usePlayerStore.setState({ currentPlaylistVideos: [] });
    }
  };

  const handlePrepopulatePlaylistName = () => {
    setNewPlaylistName("My Awesome Playlist");
  };

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
    <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4 p-2">
           <ListMusic className="w-5 h-5" />
           <Skeleton className="h-6 w-24" />
        </div>
        <Button variant="secondary" className="justify-start w-full mb-2" disabled>
          Search Results
        </Button>
        <ScrollArea className="flex-1 -mx-4">
           <div className="px-4">
             {renderPlaylistSkeletons(3)}
           </div>
        </ScrollArea>
         <Button variant="outline" className="w-full mt-auto" disabled>
             <Loader2 className="w-4 h-4 mr-2 animate-spin"/>
             Loading Playlists...
         </Button>
    </div>
  );

   const renderNoAuth = () => (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <ListMusic className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Please log in</p>
        <p className="text-xs text-muted-foreground/70">to create and manage your playlists.</p>
         {/* Keep the button visible but potentially styled differently or disabled */}
         <Dialog open={isCreatingPlaylist} onOpenChange={setIsCreatingPlaylist}>
             <DialogTrigger asChild>
                 <Button variant="outline" className="w-full mt-6" disabled>
                     <Plus className="w-4 h-4 mr-2" />
                     New Playlist
                 </Button>
             </DialogTrigger>
             {/* Content won't be reachable if disabled, but kept for structure */}
             <DialogContent className="sm:max-w-[425px]">
                 <DialogHeader>
                     <DialogTitle>Log in required</DialogTitle>
                     <DialogDescription>
                         You need to be logged in to create playlists.
                     </DialogDescription>
                 </DialogHeader>
             </DialogContent>
         </Dialog>
      </div>
    );

   const renderAuthenticated = () => (
     <>
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
         className="justify-start w-full"
         onClick={() => handleSelectPlaylist(null)} // Use null for search
       >
         Search Results
       </Button>

       <ScrollArea className="flex-1 -mx-4">
         <div className="px-4 space-y-1">
           {isFetchingPlaylists && playlists.length === 0 ? (
             renderPlaylistSkeletons(3)
           ) : playlists.length === 0 ? (
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
                         onClick={() => removePlaylist(playlist.id!)} // Ensure id exists
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

       {/* "New Playlist" Dialog and Trigger */}
       <Dialog open={isCreatingPlaylist} onOpenChange={setIsCreatingPlaylist}>
         <DialogTrigger asChild>
           <Button variant="outline" className="w-full mt-auto">
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
     </>
   );


  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-card text-card-foreground p-4 space-y-2">
       {authLoading ? renderAuthLoading() : !user ? renderNoAuth() : renderAuthenticated()}
    </aside>
  );
}

