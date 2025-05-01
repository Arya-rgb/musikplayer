
// src/components/player/video-list.tsx
'use client';

import React from 'react';
import { usePlayerStore } from '@/store/player-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Play, Pause, Plus, Trash2, ListMusic, Loader2 } from 'lucide-react'; // Replaced Heart with Plus
import { ScrollArea } from '@/components/ui/scroll-area';
import { YouTubeVideoSearchResultItem } from '@/services/youtube';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context'; // Import useAuth

export function VideoList() {
   const { user, loading: authLoading } = useAuth(); // Get user and auth loading state
  const {
    searchResults,
    currentPlaylistVideos,
    playTrack,
    currentTrack,
    playlists, // Firestore playlists
    addVideoToPlaylist,
    removeVideoFromPlaylist, // Keep this, used by checkbox logic
    activePlaylistId,
    removeVideoFromCurrentPlaylist, // Action specific to removing from the *view*
    loading, // Search/popular loading
    playlistDetails,
    playlistLoading, // Playlist fetch/update loading
    isPlaying, // Get isPlaying state
  } = usePlayerStore();

   // Determine the specific loading state for the current view
   const isPlaylistViewLoading = activePlaylistId ? (playlistLoading[activePlaylistId] ?? false) : false;
   const isGeneralLoading = activePlaylistId ? isPlaylistViewLoading : loading; // Use search loading if not in playlist view

   // Check if any playlist ADD/REMOVE operation is in progress for this specific video or general playlist actions
    const isUpdatingAnyPlaylist = (videoId: string) => {
      // Check generic add/remove locks or specific video locks
      return Object.entries(playlistLoading).some(([key, value]) =>
        value && (key === 'add' || key.startsWith(`add_`) || key.startsWith(`remove_`)) // Check general or specific locks
      );
    };


  const handlePlayVideo = (video: YouTubeVideoSearchResultItem) => {
    // Determine the correct list (search results or currently viewed playlist videos)
    const listToUse = activePlaylistId ? currentPlaylistVideos : searchResults;

    // If shuffling is active, use the currently playing (shuffled) list, otherwise use the determined list
    const playbackList = usePlayerStore.getState().isShuffling ? usePlayerStore.getState().currentPlaylist : listToUse;

    const index = playbackList.findIndex(item => item.id.videoId === video.id.videoId);

    if (index !== -1) {
       console.log(`Playing video "${video.snippet.title}" from ${activePlaylistId ? 'playlist view' : 'search results'} at index ${index}`);
       playTrack(video, playbackList, index); // Pass the correct list (potentially shuffled)
    } else {
       // Fallback: if not found in the expected list (e.g., clicking a search result while viewing a playlist)
       // Play as a single track or start a new queue from search results
       console.log(`Playing video "${video.snippet.title}" as single track or starting new queue.`);
       const searchIndex = searchResults.findIndex(item => item.id.videoId === video.id.videoId);
       if (searchIndex !== -1) {
           playTrack(video, searchResults, searchIndex); // Play from search results context
       } else {
            playTrack(video, [video], 0); // Play as single track if not in search either
       }
    }
  };


  // Handles adding/removing from ANY playlist via the popover checkbox
  const handlePlaylistCheckboxChange = async (video: YouTubeVideoSearchResultItem, playlistId: string, checked: boolean | 'indeterminate') => {
     if (!user) return; // Must be logged in
     console.log(`Checkbox change for video ${video.id.videoId} in playlist ${playlistId}. Checked: ${checked}`);
     // Prevent action if already loading for this specific operation
      const addKey = `add_${playlistId}_${video.id.videoId}`;
      const removeKey = `remove_${playlistId}_${video.id.videoId}`;
      if (playlistLoading[addKey] || playlistLoading[removeKey]) {
          console.log("Operation already in progress for this video/playlist.");
          return;
      }

     if (checked === true) {
         await addVideoToPlaylist(video, playlistId);
     } else {
         await removeVideoFromPlaylist(video.id.videoId, playlistId);
     }
  };

  const isVideoInPlaylist = (videoId: string, playlistId: string): boolean => {
    const playlist = playlists.find(p => p.id === playlistId);
    // Check the videoIds array from the Firestore playlist structure
    return !!playlist?.videoIds.includes(videoId);
  };

  // Handles removing from the CURRENTLY ACTIVE playlist (the one being viewed)
  const handleRemoveFromCurrentPlaylist = async (videoId: string) => {
    if (!user || !activePlaylistId) return; // Must be logged in and a playlist must be active
    console.log(`Removing video ${videoId} from currently active playlist ${activePlaylistId}`);
     // Prevent action if already loading
     const removeKey = `remove_${activePlaylistId}_${videoId}`;
     if (playlistLoading[removeKey] || playlistLoading[activePlaylistId]) {
         console.log("Removal operation already in progress.");
         return;
     }
    await removeVideoFromCurrentPlaylist(videoId, activePlaylistId);
  };

  // Determine which list of videos to display and the title
  const displayVideos = activePlaylistId ? currentPlaylistVideos : searchResults;
  const playlistName = activePlaylistId ? playlists.find(p => p.id === activePlaylistId)?.name : "Search Results";


  const renderSkeleton = (count: number) => (
    Array.from({ length: count }).map((_, index) => (
      <Card key={`skeleton-${index}`} className="flex items-center p-3 gap-3 bg-card/50">
        <Skeleton className="w-20 h-14 rounded" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="w-8 h-8 rounded-full" />
        {user && <Skeleton className="w-8 h-8 rounded-full" />} {/* Add to playlist skeleton */}
         {user && activePlaylistId && <Skeleton className="w-8 h-8 rounded-full" />} {/* Remove from playlist skeleton */}
      </Card>
    ))
  );

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
        <ListMusic className="w-5 h-5 text-accent"/>
         {playlistName || 'Vibes'}
         {isGeneralLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
      </h2>
      <ScrollArea className="h-[calc(100vh-200px)] pr-4 scrollbar scrollbar-thumb-accent scrollbar-track-transparent"> {/* Adjust height */}
        <div className="space-y-3">
          {authLoading ? renderSkeleton(8) : // Show skeletons during auth check
           isGeneralLoading ? renderSkeleton(8) : ( // Show skeletons during data fetch
            displayVideos.length > 0 ? displayVideos.map((video) => {
                const videoId = video.id.videoId;
                const isUpdatingThisVideo = isUpdatingAnyPlaylist(videoId); // Check loading state for this video
                const isRemoveLoading = activePlaylistId ? (playlistLoading[activePlaylistId] || playlistLoading[`remove_${activePlaylistId}_${videoId}`]) : false;
                const isAddPopoverLoading = playlists.some(p => playlistLoading[`add_${p.id}_${videoId}`] || playlistLoading[`remove_${p.id}_${videoId}`]);

                return (
                <Card
                  key={videoId}
                  className={`flex items-center p-3 gap-3 transition-colors hover:bg-accent/10 ${
                    currentTrack?.id.videoId === videoId ? 'border-accent bg-accent/5' : 'bg-card/50'
                  }`}
                >
                  <Image
                    src={video.snippet.thumbnails.default.url}
                    alt={video.snippet.title}
                    width={80}
                    height={56}
                    className="rounded object-cover aspect-video"
                    data-ai-hint="music video thumbnail small"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{video.snippet.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{video.snippet.channelTitle}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handlePlayVideo(video)} disabled={!video.id?.videoId}>
                     {currentTrack?.id.videoId === videoId && isPlaying ? (
                        <Pause className="w-5 h-5 text-accent" />
                      ) : (
                         <Play className="w-5 h-5 text-accent fill-current" />
                      )}
                    <span className="sr-only">Play</span>
                  </Button>

                 {/* Add to Playlist Popover - Only show if logged in */}
                 {user && (
                     <Popover>
                        <PopoverTrigger asChild>
                             <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-accent" disabled={isAddPopoverLoading} aria-label="Add to Playlist">
                                {isAddPopoverLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" /> }
                                <span className="sr-only">Add to Playlist</span>
                             </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-52 p-0">
                             <div className="p-3 border-b">
                                 <p className="text-sm font-medium">Add to playlist</p>
                             </div>
                             <ScrollArea className="h-[120px]">
                                 <div className="p-3 space-y-1.5">
                                    {playlists.length > 0 ? playlists.map((playlist) => {
                                        const playlistId = playlist.id!;
                                        const isVideoAddLoading = playlistLoading[`add_${playlistId}_${videoId}`];
                                        const isVideoRemoveLoading = playlistLoading[`remove_${playlistId}_${videoId}`];
                                        const isItemDisabled = !!(isVideoAddLoading || isVideoRemoveLoading);
                                        return (
                                        <div key={playlistId} className="flex items-center space-x-2">
                                            <Checkbox
                                              id={`pop-${videoId}-${playlistId}`}
                                              checked={isVideoInPlaylist(videoId, playlistId)}
                                              onCheckedChange={(checked) => handlePlaylistCheckboxChange(video, playlistId, checked)}
                                              aria-labelledby={`label-pop-${videoId}-${playlistId}`}
                                              disabled={isItemDisabled} // Disable specific item if its operation is loading
                                            />
                                            <Label
                                                htmlFor={`pop-${videoId}-${playlistId}`}
                                                id={`label-pop-${videoId}-${playlistId}`}
                                                className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 truncate"
                                            >
                                                {(isVideoAddLoading || isVideoRemoveLoading) && <Loader2 className="w-3 h-3 mr-1 inline-block animate-spin"/>}
                                                {playlist.name}
                                            </Label>
                                        </div>
                                        );
                                    }) : (
                                        <p className="text-xs text-muted-foreground text-center px-2 py-1">No playlists yet. Create one!</p>
                                    )}
                                 </div>
                            </ScrollArea>
                        </PopoverContent>
                    </Popover>
                 )}


                  {/* Remove from current playlist button - Only show if logged in and a playlist is active */}
                   {user && activePlaylistId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveFromCurrentPlaylist(videoId)}
                        title="Remove from this playlist"
                        disabled={isRemoveLoading} // Disable if current playlist is loading or this specific remove is happening
                      >
                         {isRemoveLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4" />}
                        <span className="sr-only">Remove from playlist</span>
                      </Button>
                    )}

                </Card>
                );
            }) : (
             // Empty state message
            <div className="flex flex-col items-center justify-center h-60 text-center">
                 <ListMusic className="w-12 h-12 text-muted-foreground mb-4"/>
                <p className="text-muted-foreground">
                 {activePlaylistId
                    ? (playlists.find(p => p.id === activePlaylistId) ? "This playlist is empty." : "Playlist not found.")
                    : "No search results."
                 }
                </p>
                 {!user && !activePlaylistId && (
                     <p className="text-sm text-muted-foreground/70 mt-1">Log in to save videos to playlists.</p>
                 )}
                <p className="text-sm text-muted-foreground/70 mt-1">
                   {activePlaylistId ? (user ? "Add some vibes!" : "Log in to add videos.") : "Try searching for a song or artist."}
                </p>
            </div>

          )
        )}
        </div>
      </ScrollArea>
    </div>
  );
}

```