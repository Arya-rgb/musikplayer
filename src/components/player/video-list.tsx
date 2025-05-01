// src/components/player/video-list.tsx
'use client';

import React from 'react';
import { usePlayerStore } from '@/store/player-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Play, Pause, Plus, Trash2, ListMusic } from 'lucide-react'; // Import Pause
import { ScrollArea } from '@/components/ui/scroll-area';
import { YouTubeVideoSearchResultItem } from '@/services/youtube';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';


export function VideoList() {
  const {
    searchResults,
    currentPlaylistVideos,
    playTrack,
    currentTrack,
    playlists,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    activePlaylistId,
    setActivePlaylist,
    removeVideoFromCurrentPlaylist,
    loading, // Get loading state
    playlistDetails, // Get playlist details map
    playlistLoading, // Get playlist loading state
  } = usePlayerStore();

  const handlePlayVideo = (video: YouTubeVideoSearchResultItem) => {
    const listToUse = activePlaylistId ? currentPlaylistVideos : searchResults;
    const index = listToUse.findIndex(item => item.id.videoId === video.id.videoId);
    if (index !== -1) {
      playTrack(video, listToUse, index);
    } else {
       // If playing from a context where the video isn't in the current list (e.g., search result clicked while playlist active)
       // Play it as a single track or decide on behavior
       playTrack(video, [video], 0);
    }
  };

   const handlePlaylistCheckboxChange = (video: YouTubeVideoSearchResultItem, playlistId: string, checked: boolean | 'indeterminate') => {
      if (checked === true) {
          addVideoToPlaylist(video, playlistId);
      } else {
          removeVideoFromPlaylist(video.id.videoId, playlistId);
      }
  };

  const isVideoInPlaylist = (videoId: string, playlistId: string): boolean => {
    const playlist = playlists.find(p => p.id === playlistId);
    return !!playlist?.videoIds.includes(videoId);
  };


  const handleRemoveFromCurrentPlaylist = (videoId: string) => {
    if (activePlaylistId) {
      removeVideoFromCurrentPlaylist(videoId, activePlaylistId);
    }
  };

  // Determine which list of videos to display
  const displayVideos = activePlaylistId ? currentPlaylistVideos : searchResults;
  const isLoading = activePlaylistId ? playlistLoading[activePlaylistId] ?? false : loading;
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
        <Skeleton className="w-8 h-8 rounded-full" />
         {activePlaylistId && <Skeleton className="w-8 h-8 rounded-full" />}
      </Card>
    ))
  );

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
        <ListMusic className="w-5 h-5 text-accent"/>
         {playlistName || 'Vibes'}
      </h2>
      <ScrollArea className="h-[calc(100vh-200px)] pr-4 scrollbar scrollbar-thumb-accent scrollbar-track-transparent"> {/* Adjust height as needed */}
        <div className="space-y-3">
          {isLoading ? renderSkeleton(8) : (
            displayVideos.length > 0 ? displayVideos.map((video) => (
            <Card
              key={video.id.videoId}
              className={`flex items-center p-3 gap-3 transition-colors hover:bg-accent/10 ${
                currentTrack?.id.videoId === video.id.videoId ? 'border-accent bg-accent/5' : 'bg-card/50'
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
              <Button variant="ghost" size="icon" onClick={() => handlePlayVideo(video)}>
                 {currentTrack?.id.videoId === video.id.videoId && usePlayerStore.getState().isPlaying ? (
                    <Pause className="w-5 h-5 text-accent" />
                  ) : (
                     <Play className="w-5 h-5 text-accent fill-current" />
                  )}

                <span className="sr-only">Play</span>
              </Button>

             {/* Add to Playlist Popover */}
             <Popover>
                <PopoverTrigger asChild>
                     <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-accent">
                        <Plus className="w-5 h-5" />
                        <span className="sr-only">Add to Playlist</span>
                     </Button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-0">
                     <div className="p-3 border-b">
                         <p className="text-sm font-medium">Add to playlist</p>
                     </div>
                     <ScrollArea className="h-[120px]">
                         <div className="p-3 space-y-1.5">
                            {playlists.length > 0 ? playlists.map((playlist) => (
                                <div key={playlist.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`pop-${video.id.videoId}-${playlist.id}`}
                                      checked={isVideoInPlaylist(video.id.videoId, playlist.id)}
                                      onCheckedChange={(checked) => handlePlaylistCheckboxChange(video, playlist.id, checked)}
                                      aria-labelledby={`label-pop-${video.id.videoId}-${playlist.id}`}
                                    />
                                    <Label
                                        htmlFor={`pop-${video.id.videoId}-${playlist.id}`}
                                        id={`label-pop-${video.id.videoId}-${playlist.id}`}
                                        className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 truncate"
                                    >
                                        {playlist.name}
                                    </Label>
                                </div>
                            )) : (
                                <p className="text-xs text-muted-foreground text-center px-2 py-1">No playlists yet.</p>
                            )}
                         </div>
                    </ScrollArea>
                </PopoverContent>
            </Popover>

              {/* Remove from current playlist button (only shows if a playlist is active) */}
               {activePlaylistId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveFromCurrentPlaylist(video.id.videoId)}
                    title="Remove from this playlist"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="sr-only">Remove from playlist</span>
                  </Button>
                )}

            </Card>
          )) : (
            <div className="flex flex-col items-center justify-center h-60 text-center">
                 <ListMusic className="w-12 h-12 text-muted-foreground mb-4"/>
                <p className="text-muted-foreground">
                 {activePlaylistId ? "This playlist is empty." : "No search results."}
                </p>
                <p className="text-sm text-muted-foreground/70">
                   {activePlaylistId ? "Add some vibes!" : "Try searching for a song or artist."}
                </p>
            </div>

          )
        )}
        </div>
      </ScrollArea>
    </div>
  );
}
