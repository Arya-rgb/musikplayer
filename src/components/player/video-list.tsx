
// src/components/player/video-list.tsx
'use client';

import React, { useState } from 'react';
import { usePlayerStore } from '@/store/player-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import {
  Play, Pause, Plus, Trash2, ListMusic, Loader2, ChevronDown, Search, Clock
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';
import type { PlayerTrackInfo } from '@/store/player-store';
import { cn } from '@/lib/utils';

export function VideoList() {
  const { user, loading: authLoading } = useAuth();
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
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
    removeVideoFromSearchResults,
    loading,
    playlistLoading,
    isPlaying,
    searchNextPageToken,
    popularNextPageToken,
    isFetchingNextPage,
    fetchNextPage,
    searchVideos,
  } = usePlayerStore();

  const isPlaylistViewLoading = activePlaylistId ? (playlistLoading[activePlaylistId] ?? false) : false;
  const isGeneralLoading = activePlaylistId ? isPlaylistViewLoading : loading;

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileSearchQuery.trim()) {
      searchVideos(mobileSearchQuery.trim());
      setMobileSearchQuery('');
    }
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handlePlayVideo = (video: PlayerTrackInfo) => {
    const playbackListSource = activePlaylistId ? currentPlaylistVideos : searchResults;
    const playbackList = usePlayerStore.getState().isShuffling
      ? shuffleArray(playbackListSource)
      : playbackListSource;
    const index = playbackList.findIndex(item => item.id.videoId === video.id.videoId);

    if (index !== -1) {
      playTrack(video, playbackList, index);
    } else {
      const searchIndex = searchResults.findIndex(item => item.id.videoId === video.id.videoId);
      if (searchIndex !== -1) {
        playTrack(video, [video], 0);
      } else {
        playTrack(video, [video], 0);
      }
    }
  };

  const handlePlaylistCheckboxChange = async (
    video: PlayerTrackInfo,
    playlistId: string,
    checked: boolean | 'indeterminate'
  ) => {
    if (!user) return;
    const addKey = `add_${playlistId}_${video.id.videoId}`;
    const removeKey = `remove_${playlistId}_${video.id.videoId}`;
    if (playlistLoading[addKey] || playlistLoading[removeKey]) return;
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
    const removeKey = `remove_${activePlaylistId}_${videoId}`;
    if (playlistLoading[removeKey] || playlistLoading[activePlaylistId]) return;
    await removeVideoFromCurrentPlaylist(videoId, activePlaylistId);
  };

  const handleRemoveFromSearchResults = (videoId: string) => {
    removeVideoFromSearchResults(videoId);
  };

  const displayVideos = activePlaylistId ? currentPlaylistVideos : searchResults;
  const playlistName = activePlaylistId
    ? playlists.find(p => p.id === activePlaylistId)?.name
    : 'Search Results';
  const hasNextPage = activePlaylistId === null && (!!searchNextPageToken || !!popularNextPageToken);

  const renderSkeleton = (count: number) =>
    Array.from({ length: count }).map((_, index) => (
      <div key={`skeleton-${index}`} className="flex items-center gap-4 px-4 py-2 group rounded-md">
        <Skeleton className="w-4 h-4 bg-white/10 shrink-0" />
        <Skeleton className="w-10 h-10 rounded bg-white/10 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-3/4 bg-white/10 rounded" />
          <Skeleton className="h-3 w-1/2 bg-white/10 rounded" />
        </div>
        <Skeleton className="w-8 h-4 bg-white/10 rounded" />
      </div>
    ));

  return (
    <div className="flex flex-col h-full">
      {/* Mobile search bar */}
      <div className="md:hidden px-4 pt-4 pb-2">
        <form onSubmit={handleMobileSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b3b3b3]" />
          <Input
            id="mobile-search-input"
            type="search"
            placeholder="Artists, songs, or podcasts"
            className="pl-9 h-10 rounded-full bg-[#282828] border-none text-white placeholder:text-[#b3b3b3] focus-visible:ring-1 focus-visible:ring-[#1DB954] text-sm"
            value={mobileSearchQuery}
            onChange={(e) => setMobileSearchQuery(e.target.value)}
          />
        </form>
      </div>

      {/* Section header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          {activePlaylistId ? (
            <>
              <ListMusic className="w-5 h-5 text-[#1DB954]" />
              {playlistName}
            </>
          ) : (
            <span>
              {popularNextPageToken || searchNextPageToken ? 'Search Results' : 'Popular Videos'}
            </span>
          )}
          {isGeneralLoading && !isFetchingNextPage && (
            <Loader2 className="w-4 h-4 animate-spin text-[#b3b3b3]" />
          )}
        </h2>
      </div>

      {/* Track list table header */}
      {!isGeneralLoading && displayVideos.length > 0 && (
        <div className="hidden sm:grid px-4 mb-1 text-xs text-[#b3b3b3] font-normal tracking-widest uppercase border-b border-white/10 pb-2 mx-4"
          style={{ gridTemplateColumns: '16px 1fr 1fr auto' }}>
          <span className="text-center">#</span>
          <span className="ml-12">Title</span>
          <span>Channel</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /></span>
        </div>
      )}

      {/* Scrollable track list */}
      <ScrollArea className="flex-1 px-0 scrollbar" style={{
        height: 'calc(100vh - 200px)'
      }}>
        <div className="pb-36 md:pb-28">
          {authLoading || (isGeneralLoading && !isFetchingNextPage) ? (
            <div className="pt-2">{renderSkeleton(10)}</div>
          ) : displayVideos.length > 0 ? (
            displayVideos.map((video, idx) => {
              if (!video?.id?.videoId) return null;
              const videoId = video.id.videoId;
              const isPlaylistRemoveLoading = activePlaylistId
                ? (playlistLoading[activePlaylistId] || playlistLoading[`remove_${activePlaylistId}_${videoId}`])
                : false;
              const isAddPopoverLoading = playlists.some(
                p => playlistLoading[`add_${p.id}_${videoId}`] || playlistLoading[`remove_${p.id}_${videoId}`]
              );
              const isCurrentPlaying = currentTrack?.id.videoId === videoId;

              return (
                <div
                  key={videoId}
                  className={cn(
                    'group grid items-center gap-4 px-4 py-2 mx-2 rounded-md transition-colors cursor-pointer',
                    'hover:bg-white/5',
                    isCurrentPlaying ? 'bg-white/10' : '',
                    'sm:grid-cols-[16px_1fr_1fr_auto] grid-cols-[16px_1fr_auto]'
                  )}
                  onClick={() => handlePlayVideo(video)}
                >
                  {/* Track number / play icon */}
                  <div className="flex items-center justify-center w-4 text-center">
                    {isCurrentPlaying && isPlaying ? (
                      <span className="flex gap-px items-end h-4">
                        <span className="w-0.5 h-3 bg-[#1DB954] animate-[bounce_0.8s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }} />
                        <span className="w-0.5 h-4 bg-[#1DB954] animate-[bounce_0.8s_ease-in-out_infinite]" style={{ animationDelay: '150ms' }} />
                        <span className="w-0.5 h-2 bg-[#1DB954] animate-[bounce_0.8s_ease-in-out_infinite]" style={{ animationDelay: '300ms' }} />
                      </span>
                    ) : (
                      <>
                        <span className="text-sm text-[#b3b3b3] group-hover:hidden">
                          {isCurrentPlaying ? (
                            <span className="text-[#1DB954] font-bold">{idx + 1}</span>
                          ) : idx + 1}
                        </span>
                        <Play className="w-4 h-4 text-white hidden group-hover:block fill-white" />
                      </>
                    )}
                  </div>

                  {/* Thumbnail + title */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <Image
                        src={video.snippet.thumbnails.default.url}
                        alt={video.snippet.title}
                        width={40}
                        height={40}
                        className="rounded object-cover aspect-square w-10 h-10"
                        data-ai-hint="music video thumbnail small"
                      />
                      {isCurrentPlaying && isPlaying && (
                        <div className="absolute inset-0 bg-black/40 rounded flex items-center justify-center">
                          <Pause className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex flex-col">
                      <p className={cn(
                        'text-sm font-medium leading-tight',
                        isCurrentPlaying ? 'text-[#1DB954]' : 'text-white'
                      )}>
                        {video.snippet.title}
                      </p>
                      <p className="text-xs text-[#b3b3b3] sm:hidden">{video.snippet.channelTitle}</p>
                    </div>
                  </div>

                  {/* Channel - desktop only */}
                  <p className="hidden sm:block text-sm text-[#b3b3b3] truncate">
                    {video.snippet.channelTitle}
                  </p>

                  {/* Action buttons */}
                  <div
                    className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {user && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-[#b3b3b3] hover:text-white"
                            disabled={isAddPopoverLoading}
                            aria-label="Add to playlist"
                          >
                            {isAddPopoverLoading
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Plus className="w-4 h-4" />}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-52 p-0 bg-[#282828] border-white/10" align="end">
                          <div className="p-3 border-b border-white/10">
                            <p className="text-sm font-semibold text-white">Add to playlist</p>
                          </div>
                          <ScrollArea className="h-[120px]">
                            <div className="p-2 space-y-1">
                              {playlists.length > 0 ? playlists.map((playlist) => {
                                if (!playlist?.id) return null;
                                const playlistId = playlist.id;
                                const isItemLoading = !!(
                                  playlistLoading[`add_${playlistId}_${videoId}`] ||
                                  playlistLoading[`remove_${playlistId}_${videoId}`]
                                );
                                return (
                                  <div key={playlistId} className="flex items-center space-x-2 px-1 py-1 rounded hover:bg-white/5">
                                    <Checkbox
                                      id={`pop-${videoId}-${playlistId}`}
                                      checked={isVideoInPlaylist(videoId, playlistId)}
                                      onCheckedChange={(checked) => handlePlaylistCheckboxChange(video, playlistId, checked)}
                                      disabled={isItemLoading}
                                      className="border-[#b3b3b3] data-[state=checked]:bg-[#1DB954] data-[state=checked]:border-[#1DB954]"
                                    />
                                    <Label
                                      htmlFor={`pop-${videoId}-${playlistId}`}
                                      className="text-xs text-white truncate flex-1 cursor-pointer"
                                    >
                                      {isItemLoading && <Loader2 className="w-3 h-3 mr-1 inline-block animate-spin" />}
                                      {playlist.name}
                                    </Label>
                                  </div>
                                );
                              }) : (
                                <p className="text-xs text-[#b3b3b3] text-center py-2">No playlists yet.</p>
                              )}
                            </div>
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    )}

                    {user && activePlaylistId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-[#b3b3b3] hover:text-red-400"
                        onClick={() => handleRemoveFromCurrentPlaylist(videoId)}
                        disabled={!!isPlaylistRemoveLoading}
                        aria-label="Remove from playlist"
                      >
                        {isPlaylistRemoveLoading
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </Button>
                    )}

                    {!activePlaylistId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-[#b3b3b3] hover:text-red-400"
                        onClick={() => handleRemoveFromSearchResults(videoId)}
                        aria-label="Remove from list"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            !isFetchingNextPage && (
              <div className="flex flex-col items-center justify-center py-24 text-center px-8">
                <ListMusic className="w-14 h-14 text-[#b3b3b3] mb-4 opacity-40" />
                <p className="text-base font-semibold text-white mb-1">
                  {activePlaylistId
                    ? (playlists.find(p => p.id === activePlaylistId)
                      ? 'This playlist is empty'
                      : 'Playlist not found')
                    : 'No results found'}
                </p>
                <p className="text-sm text-[#b3b3b3]">
                  {activePlaylistId
                    ? (user ? 'Add some tracks to get started!' : 'Log in to add tracks.')
                    : 'Search for artists, songs, or videos above.'}
                </p>
              </div>
            )
          )}

          {isFetchingNextPage && (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-[#b3b3b3]" />
            </div>
          )}

          {hasNextPage && !isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <Button
                variant="outline"
                onClick={fetchNextPage}
                disabled={isFetchingNextPage}
                className="rounded-full border-white/20 text-white hover:border-white bg-transparent"
              >
                <ChevronDown className="mr-2 h-4 w-4" /> Load More
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
