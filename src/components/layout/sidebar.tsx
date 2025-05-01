// src/components/layout/sidebar.tsx
'use client';

import React, { useState } from 'react';
import { ListMusic, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePlayerStore, Playlist } from '@/store/player-store';
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
} from "@/components/ui/alert-dialog"


export function Sidebar() {
  const { playlists, addPlaylist, removePlaylist, setActivePlaylist, activePlaylistId, loadPlaylist } = usePlayerStore();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);


  const handleAddPlaylist = () => {
    if (newPlaylistName.trim()) {
      addPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreatingPlaylist(false); // Close dialog on success
    }
  };

  const handleSelectPlaylist = (playlistId: string) => {
     if (playlistId === 'search') {
       setActivePlaylist(null); // Indicate search results
     } else {
       setActivePlaylist(playlistId);
       loadPlaylist(playlistId); // Load videos for the selected playlist
     }
   };

  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-card text-card-foreground p-4 space-y-4">
      <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
        <ListMusic className="w-5 h-5" />
        Playlists
      </h2>

      {/* Search Results "Playlist" */}
      <Button
        variant={!activePlaylistId ? "secondary" : "ghost"}
        className="justify-start w-full"
        onClick={() => handleSelectPlaylist('search')}
      >
        Search Results
      </Button>


      <ScrollArea className="flex-1 -mx-4">
        <div className="px-4 space-y-1">
          {playlists.map((playlist) => (
             <div key={playlist.id} className="flex items-center group">
                <Button
                  variant={activePlaylistId === playlist.id ? "secondary" : "ghost"}
                  className="justify-start flex-1 text-left truncate"
                  onClick={() => handleSelectPlaylist(playlist.id)}
                >
                  {playlist.name}
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
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
                         onClick={() => removePlaylist(playlist.id)}
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

      <Dialog open={isCreatingPlaylist} onOpenChange={setIsCreatingPlaylist}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full mt-auto">
            <Plus className="w-4 h-4 mr-2" />
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
              />
            </div>
          </div>
          <DialogFooter>
             <DialogClose asChild>
               <Button type="button" variant="secondary">Cancel</Button>
             </DialogClose>
            <Button type="submit" onClick={handleAddPlaylist} disabled={!newPlaylistName.trim()}>
              Create Playlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}