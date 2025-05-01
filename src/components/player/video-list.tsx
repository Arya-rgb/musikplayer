
// src/components/player/video-list.tsx
'use client';

import React from 'react';
import { usePlayerStore } from '@/store/player-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Play, Pause, Plus, Trash2, ListMusic, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { YouTubeVideoSearchResultItem } from '@/services/youtube';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';
import type { PlayerTrackInfo } from '@/store/player-store';
import { cn } from '@/lib/utils'; // Import cn

export function VideoList() {
   const { user, loading: authLoading } = useAuth();
  const {
    searchResults,
    currentPlaylistVideos,
    playTrack,
    currentTrack,
    playlists,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    activePlaylistId,
    removeVideoFromCurrentPlaylist,
    loading,
    playlistDetails,
    playlistLoading,
    isPlaying,
  } = usePlayerStore();

   const isPlaylistViewLoading = activePlaylistId ? (playlistLoading[activePlaylistId] ?? false) : false;
   const isGeneralLoading = activePlaylistId ? isPlaylistViewLoading : loading;

    const isUpdatingAnyPlaylist = (videoId: string) => {
      return Object.entries(playlistLoading).some(([key, value]) =>
        value && (key === 'add' || key.startsWith(`add_`) || key.startsWith(`remove_`))
      );
    };

  const handlePlayVideo = (video: PlayerTrackInfo) => {
    const listToUse = activePlaylistId ? currentPlaylistVideos : searchResults;
    const playbackList = usePlayerStore.getState().isShuffling ? usePlayerStore.getState().currentPlaylist : listToUse;
    const index = playbackList.findIndex(item => item.id.videoId === video.id.videoId);

    if (index !== -1) {
       console.log(`Playing video "${video.snippet.title}" from ${activePlaylistId ? 'playlist view' : 'search results'} at index ${index}`);
       playTrack(video, playbackList, index);
    } else {
       console.log(`Playing video "${video.snippet.title}" as single track or starting new queue.`);
       const searchIndex = searchResults.findIndex(item => item.id.videoId === video.id.videoId);
       if (searchIndex !== -1) {
           playTrack(video, searchResults, searchIndex);
       } else {
            playTrack(video, [video], 0);
       }
    }
  };


  const handlePlaylistCheckboxChange = async (video: PlayerTrackInfo, playlistId: string, checked: boolean | 'indeterminate') => {
     if (!user) return;
     console.log(`Checkbox change for video ${video.id.videoId} in playlist ${playlistId}. Checked: ${checked}`);
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
    return !!playlist?.videoIds.includes(videoId);
  };

  const handleRemoveFromCurrentPlaylist = async (videoId: string) => {
    if (!user || !activePlaylistId) return;
    console.log(`Removing video ${videoId} from currently active playlist ${activePlaylistId}`);
     const removeKey = `remove_${activePlaylistId}_${videoId}`;
     if (playlistLoading[removeKey] || playlistLoading[activePlaylistId]) {
         console.log("Removal operation already in progress.");
         return;
     }
    await removeVideoFromCurrentPlaylist(videoId, activePlaylistId);
  };

  const displayVideos = activePlaylistId ? currentPlaylistVideos : searchResults;
  const playlistName = activePlaylistId ? playlists.find(p => p.id === activePlaylistId)?.name : "Search Results";


  const renderSkeleton = (count: number) => (
    Array.from({ length: count }).map((_, index) => (
      <Card key={`skeleton-${index}`} className="flex items-center p-2 md:p-3 gap-2 md:gap-3 bg-card/50">
        <Skeleton className="w-16 h-12 md:w-20 md:h-14 rounded" />
        <div className="flex-1 space-y-1 md:space-y-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="w-7 h-7 md:w-8 md:h-8 rounded-full" />
        {user && <Skeleton className="w-7 h-7 md:w-8 md:h-8 rounded-full" />}
         {user && activePlaylistId && <Skeleton className="w-7 h-7 md:w-8 md:h-8 rounded-full" />}
      </Card>
    ))
  );

  return (
    <div className="flex-1 p-2 sm:p-4 md:p-6 lg:p-8 space-y-3 md:space-y-4">
      <h2 className="text-lg md:text-xl font-semibold tracking-tight flex items-center gap-2 px-2">
        <ListMusic className="w-5 h-5 text-accent"/>
         {playlistName || 'Vibes'}
         {isGeneralLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
      </h2>
       {/* Adjust height considering header and player height, more reduction on mobile */}
      <ScrollArea className="h-[calc(100vh-144px-4rem)] md:h-[calc(100vh-160px)] pr-2 md:pr-4 scrollbar scrollbar-thumb-accent scrollbar-track-transparent">
        <div className="space-y-2 md:space-y-3">
          {authLoading ? renderSkeleton(8) :
           isGeneralLoading ? renderSkeleton(8) : (
            displayVideos.length > 0 ? displayVideos.map((video) => {
                if (!video?.id?.videoId) {
                    console.warn("Skipping rendering video with missing ID:", video);
                    return null;
                }
                const videoId = video.id.videoId;
                const isRemoveLoading = activePlaylistId ? (playlistLoading[activePlaylistId] || playlistLoading[`remove_${activePlaylistId}_${videoId}`]) : false;
                const isAddPopoverLoading = playlists.some(p => playlistLoading[`add_${p.id}_${videoId}`] || playlistLoading[`remove_${p.id}_${videoId}`]);
                 const isCurrentPlaying = currentTrack?.id.videoId === videoId;


                return (
                <Card
                  key={videoId}
                  className={cn(
                    'flex items-center p-2 md:p-3 gap-2 md:gap-3 transition-colors hover:bg-accent/10',
                    isCurrentPlaying ? 'border-accent bg-accent/5' : 'bg-card/50'
                  )}
                >
                  <Image
                    src={video.snippet.thumbnails.default.url}
                    alt={video.snippet.title}
                    width={64} // Smaller on mobile
                    height={48} // Smaller on mobile
                    className="rounded object-cover aspect-video"
                    data-ai-hint="music video thumbnail small"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate text-foreground">{video.snippet.title}</p>
                    <p className="text-xs text-muted-foreground truncate hidden sm:block">{video.snippet.channelTitle}</p> {/* Hide channel on very small screens */}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handlePlayVideo(video)} className="h-7 w-7 md:h-8 md:w-8">
                     {isCurrentPlaying && isPlaying ? (
                        <Pause className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                      ) : (
                         <Play className="w-4 h-4 md:w-5 md:h-5 text-accent fill-current" />
                      )}
                    <span className="sr-only">Play</span>
                  </Button>

                 {/* Add to Playlist Popover */}
                 {user && (
                     <Popover>
                        <PopoverTrigger asChild>
                             <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground hover:text-accent" disabled={isAddPopoverLoading} aria-label="Add to Playlist">
                                {isAddPopoverLoading ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Plus className="w-4 h-4 md:w-5 md:h-5" /> }
                                <span className="sr-only">Add to Playlist</span>
                             </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-52 p-0 mb-2"> {/* Added margin bottom */}
                             <div className="p-2 md:p-3 border-b">
                                 <p className="text-sm font-medium">Add to playlist</p>
                             </div>
                             <ScrollArea className="h-[100px] md:h-[120px]">
                                 <div className="p-2 md:p-3 space-y-1 md:space-y-1.5">
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
                                              disabled={isItemDisabled}
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
                                        <p className="text-xs text-muted-foreground text-center px-2 py-1">No playlists yet.</p>
                                    )}
                                 </div>
                            </ScrollArea>
                        </PopoverContent>
                    </Popover>
                 )}


                  {/* Remove from current playlist button */}
                   {user && activePlaylistId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveFromCurrentPlaylist(videoId)}
                        title="Remove from this playlist"
                        disabled={isRemoveLoading}
                      >
                         {isRemoveLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4" />}
                        <span className="sr-only">Remove from playlist</span>
                      </Button>
                    )}

                </Card>
                );
            }) : (
             // Empty state message
            <div className="flex flex-col items-center justify-center h-48 md:h-60 text-center p-4">
                 <ListMusic className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground mb-3 md:mb-4"/>
                <p className="text-sm md:text-base text-muted-foreground">
                 {activePlaylistId
                    ? (playlists.find(p => p.id === activePlaylistId) ? "This playlist is empty." : "Playlist not found.")
                    : "No search results."
                 }
                </p>
                 {!user && !activePlaylistId && (
                     <p className="text-xs md:text-sm text-muted-foreground/70 mt-1">Log in to save videos to playlists.</p>
                 )}
                <p className="text-xs md:text-sm text-muted-foreground/70 mt-1">
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
