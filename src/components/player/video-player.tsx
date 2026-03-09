
// src/components/player/video-player.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player/youtube';
import { usePlayerStore } from '@/store/player-store';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  Plus,
  Loader2,
  Music,
  Heart,
} from 'lucide-react';
import { formatTime, cn } from '@/lib/utils';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-context';
import type { PlayerTrackInfo } from '@/store/player-store';

export function VideoPlayer() {
  const { user } = useAuth();
  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    playNext,
    playPrevious,
    togglePlayPause,
    setVolume,
    toggleMute,
    isRepeating,
    toggleRepeat,
    isShuffling,
    toggleShuffle,
    playlists,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    playlistLoading,
    activePlaylistId,
  } = usePlayerStore();

  const playerRef = useRef<ReactPlayer>(null);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const isUpdatingCurrentTrackPlaylists = currentTrack
    ? Object.entries(playlistLoading).some(([key, value]) =>
      value && (key.includes(`_${currentTrack.id.videoId}`) || key === 'add')
    )
    : false;

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (!isClient || !('mediaSession' in navigator)) return;

    if (!currentTrack) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      return;
    }

    const playlistName = activePlaylistId
      ? playlists.find(p => p.id === activePlaylistId)?.name
      : 'VibeVerse';

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.snippet.title,
      artist: currentTrack.snippet.channelTitle,
      album: playlistName,
      artwork: [
        { src: currentTrack.snippet.thumbnails.default.url, sizes: '96x96', type: 'image/jpeg' },
        { src: currentTrack.snippet.thumbnails.medium.url, sizes: '256x256', type: 'image/jpeg' },
        { src: currentTrack.snippet.thumbnails.high.url, sizes: '512x512', type: 'image/jpeg' },
      ],
    });

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    if (togglePlayPause) {
      navigator.mediaSession.setActionHandler('play', () => togglePlayPause());
      navigator.mediaSession.setActionHandler('pause', () => togglePlayPause());
    }
    if (playPrevious) navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious());
    if (playNext) navigator.mediaSession.setActionHandler('nexttrack', () => playNext());

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }
    };
  }, [isClient, currentTrack, isPlaying, playNext, playPrevious, togglePlayPause, playlists, activePlaylistId]);

  const handleProgress = (state: { played: number }) => {
    if (!seeking) setPlayed(state.played);
  };
  const handleDuration = (d: number) => setDuration(d);
  const handleSeekMouseDown = () => setSeeking(true);
  const handleSeekChange = (value: number[]) => {
    if (playerRef.current) {
      const newPlayed = value[0] / 100;
      setPlayed(newPlayed);
      playerRef.current.seekTo(newPlayed);
    }
  };
  const handleSeekMouseUp = () => setSeeking(false);

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setVolume(newVolume);
    if (isMuted && newVolume > 0) toggleMute();
    if (!isMuted && newVolume === 0) toggleMute();
  };

  const handlePlaylistCheckboxChange = async (playlistId: string, checked: boolean | 'indeterminate') => {
    if (!currentTrack || !user) return;
    const videoId = currentTrack.id.videoId;
    const isCurrentlyLoading = playlistLoading[`add_${playlistId}_${videoId}`] || playlistLoading[`remove_${playlistId}_${videoId}`];
    if (isCurrentlyLoading) return;
    if (checked === true) {
      await addVideoToPlaylist(currentTrack as PlayerTrackInfo, playlistId);
    } else {
      await removeVideoFromPlaylist(videoId, playlistId);
    }
  };

  const isVideoInPlaylist = (videoId: string, playlistId: string): boolean => {
    if (!videoId) return false;
    const playlist = playlists.find(p => p.id === playlistId);
    return !!playlist?.videoIds.includes(videoId);
  };

  if (!isClient) {
    return (
      <div className="fixed bottom-0 left-0 right-0 h-[72px] md:h-[90px] bg-[#181818] border-t border-white/10 z-50 flex items-center justify-center">
        <p className="text-xs text-[#b3b3b3]">Loading player...</p>
      </div>
    );
  }

  return (
    /* On mobile: sit above bottom nav (64px), so bottom = 64px */
    <div className={cn(
      'fixed left-0 right-0 z-50',
      'bottom-14 md:bottom-0',
      'h-[72px] md:h-[90px]',
      'bg-[#181818] border-t border-white/10',
      'flex items-center px-3 md:px-4 gap-2 md:gap-0',
      'relative' // for the progress bar positioning
    )}>
      {/* Mobile progress bar — thin line at the very top, tappable */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 md:hidden cursor-pointer group/prog"
        onClick={(e) => {
          if (!currentTrack || duration === 0) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const newPlayed = clickX / rect.width;
          setPlayed(newPlayed);
          playerRef.current?.seekTo(newPlayed);
        }}
      >
        {/* Filled portion */}
        <div
          className="h-full bg-[#1DB954] transition-none relative"
          style={{ width: `${played * 100}%` }}
        >
          {/* Thumb dot — appears on hover */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white opacity-0 group-hover/prog:opacity-100 transition-opacity shadow-md" />
        </div>
      </div>
      {/* Hidden ReactPlayer */}
      {currentTrack && (
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '1px', height: '1px', pointerEvents: 'none', opacity: 0 }}>
          <ReactPlayer
            ref={playerRef}
            url={`https://www.youtube.com/watch?v=${currentTrack.id.videoId}`}
            playing={isPlaying}
            volume={isMuted ? 0 : volume}
            onProgress={handleProgress}
            onDuration={handleDuration}
            onEnded={playNext}
            width="1px"
            height="1px"
            onError={(e) => console.error('Player error:', e)}
            config={{
              youtube: {
                playerVars: {
                  controls: 0,
                  disablekb: 1,
                  origin: typeof window !== 'undefined' ? window.location.origin : undefined,
                },
              },
            }}
          />
        </div>
      )}

      {/* === LEFT: Track info === */}
      <div className="flex items-center gap-3 w-[30%] min-w-0 shrink-0">
        {currentTrack ? (
          <>
            <div className="relative shrink-0">
              <Image
                src={currentTrack.snippet.thumbnails.default.url}
                alt={currentTrack.snippet.title}
                width={56}
                height={56}
                className="rounded object-cover w-12 h-12 md:w-14 md:h-14"
                data-ai-hint="music video thumbnail"
              />
            </div>
            <div className="hidden md:flex flex-col min-w-0">
              <p className="text-sm font-medium text-white truncate hover:underline cursor-pointer">
                {currentTrack.snippet.title}
              </p>
              <p className="text-xs text-[#b3b3b3] truncate hover:text-white hover:underline cursor-pointer">
                {currentTrack.snippet.channelTitle}
              </p>
            </div>
            {/* Add to playlist button */}
            {user && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden md:flex h-8 w-8 text-[#b3b3b3] hover:text-white shrink-0"
                    disabled={isUpdatingCurrentTrackPlaylists}
                    aria-label="Add to playlist"
                  >
                    {isUpdatingCurrentTrackPlaylists
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Heart className="w-4 h-4" />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-0 bg-[#282828] border-white/10 mb-2" align="start" side="top">
                  <div className="p-3 border-b border-white/10">
                    <p className="text-sm font-semibold text-white">Add to playlist</p>
                  </div>
                  <ScrollArea className="h-[130px]">
                    <div className="p-2 space-y-1">
                      {playlists.length > 0 ? playlists.map((playlist) => {
                        const playlistId = playlist.id!;
                        const videoId = currentTrack.id.videoId;
                        const isLoading = !!(playlistLoading[`add_${playlistId}_${videoId}`] || playlistLoading[`remove_${playlistId}_${videoId}`]);
                        return (
                          <div key={playlistId} className="flex items-center space-x-2 px-1 py-1 rounded hover:bg-white/5">
                            <Checkbox
                              id={`player-playlist-${playlistId}`}
                              checked={isVideoInPlaylist(videoId, playlistId)}
                              onCheckedChange={(checked) => handlePlaylistCheckboxChange(playlistId, checked)}
                              disabled={isLoading}
                              className="border-[#b3b3b3] data-[state=checked]:bg-[#1DB954] data-[state=checked]:border-[#1DB954]"
                            />
                            <Label
                              htmlFor={`player-playlist-${playlistId}`}
                              className="text-xs text-white cursor-pointer flex-1 truncate"
                            >
                              {isLoading && <Loader2 className="w-3 h-3 mr-1 inline-block animate-spin" />}
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
          </>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#282828] rounded flex items-center justify-center shrink-0">
              <Music className="w-5 h-5 text-[#b3b3b3]" />
            </div>
          </div>
        )}
      </div>

      {/* === CENTER: Controls + Seek bar === */}
      <div className="flex flex-col items-center justify-center flex-1 gap-1 md:gap-2 max-w-[45%] md:max-w-lg mx-auto">
        {/* Control buttons */}
        <div className="flex items-center gap-1 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleShuffle}
            className={cn(
              'h-7 w-7 md:h-8 md:w-8 transition-colors',
              isShuffling ? 'text-[#1DB954]' : 'text-[#b3b3b3] hover:text-white',
              !currentTrack && 'opacity-40 cursor-not-allowed'
            )}
            disabled={!currentTrack}
            aria-label="Toggle shuffle"
          >
            <Shuffle className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={playPrevious}
            disabled={!currentTrack}
            className="h-7 w-7 md:h-8 md:w-8 text-[#b3b3b3] hover:text-white"
            aria-label="Previous"
          >
            <SkipBack className="w-4 h-4 md:w-5 md:h-5" />
          </Button>

          {/* Play/Pause - main button */}
          <button
            onClick={togglePlayPause}
            disabled={!currentTrack}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className={cn(
              'w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center transition-all',
              'bg-white text-black hover:scale-105 active:scale-95',
              !currentTrack && 'opacity-40 cursor-not-allowed'
            )}
          >
            {isPlaying
              ? <Pause className="w-4 h-4 md:w-5 md:h-5 fill-black" />
              : <Play className="w-4 h-4 md:w-5 md:h-5 fill-black ml-0.5" />
            }
          </button>

          <Button
            variant="ghost"
            size="icon"
            onClick={playNext}
            disabled={!currentTrack}
            className="h-7 w-7 md:h-8 md:w-8 text-[#b3b3b3] hover:text-white"
            aria-label="Next"
          >
            <SkipForward className="w-4 h-4 md:w-5 md:h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleRepeat}
            className={cn(
              'h-7 w-7 md:h-8 md:w-8 transition-colors',
              isRepeating ? 'text-[#1DB954]' : 'text-[#b3b3b3] hover:text-white',
              !currentTrack && 'opacity-40 cursor-not-allowed'
            )}
            disabled={!currentTrack}
            aria-label="Toggle repeat"
          >
            <Repeat className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </Button>
        </div>

        {/* Seek bar */}
        <div className="hidden sm:flex items-center gap-2 w-full">
          <span className="text-[10px] text-[#b3b3b3] w-8 text-right tabular-nums shrink-0">
            {formatTime(played * duration)}
          </span>
          <div className="flex-1 group/seek">
            <Slider
              value={[played * 100]}
              max={100}
              step={0.1}
              onValueChange={handleSeekChange}
              onPointerDown={handleSeekMouseDown}
              onPointerUp={handleSeekMouseUp}
              className="cursor-pointer [&_[role=slider]]:hidden group-hover/seek:[&_[role=slider]]:block [&_[data-orientation=horizontal]]:h-1 [&_.bg-primary]:bg-[#1DB954] [&_[data-orientation=horizontal]>span]:bg-[#1DB954]"
              disabled={!currentTrack || duration === 0}
              aria-label="Seek"
            />
          </div>
          <span className="text-[10px] text-[#b3b3b3] w-8 text-left tabular-nums shrink-0">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* === RIGHT: Volume + extras === */}
      <div className="hidden md:flex items-center gap-2 w-[30%] justify-end">
        {/* Add to playlist (mobile) */}
        {currentTrack && user && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#b3b3b3] hover:text-white md:hidden"
                disabled={isUpdatingCurrentTrackPlaylists}
                aria-label="Add to playlist"
              >
                {isUpdatingCurrentTrackPlaylists ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-0 bg-[#282828] border-white/10 mb-2" align="end" side="top">
              <div className="p-3 border-b border-white/10">
                <p className="text-sm font-semibold text-white">Add to playlist</p>
              </div>
              <ScrollArea className="h-[120px]">
                <div className="p-2 space-y-1">
                  {playlists.length > 0 ? playlists.map((playlist) => {
                    const playlistId = playlist.id!;
                    const videoId = currentTrack.id.videoId;
                    const isLoading = !!(playlistLoading[`add_${playlistId}_${videoId}`] || playlistLoading[`remove_${playlistId}_${videoId}`]);
                    return (
                      <div key={playlistId} className="flex items-center space-x-2 px-1 py-1 rounded hover:bg-white/5">
                        <Checkbox
                          id={`mob-player-playlist-${playlistId}`}
                          checked={isVideoInPlaylist(videoId, playlistId)}
                          onCheckedChange={(checked) => handlePlaylistCheckboxChange(playlistId, checked)}
                          disabled={isLoading}
                          className="border-[#b3b3b3] data-[state=checked]:bg-[#1DB954] data-[state=checked]:border-[#1DB954]"
                        />
                        <Label htmlFor={`mob-player-playlist-${playlistId}`} className="text-xs text-white cursor-pointer flex-1 truncate">
                          {isLoading && <Loader2 className="w-3 h-3 mr-1 inline-block animate-spin" />}
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

        {/* Volume */}
        <div
          className="flex items-center gap-2"
          onMouseEnter={() => setShowVolumeSlider(true)}
          onMouseLeave={() => setShowVolumeSlider(false)}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="h-8 w-8 text-[#b3b3b3] hover:text-white"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0
              ? <VolumeX className="w-4 h-4" />
              : <Volume2 className="w-4 h-4" />}
          </Button>
          <div className={cn(
            'transition-all duration-200 overflow-hidden',
            showVolumeSlider ? 'w-24 opacity-100' : 'w-0 opacity-0'
          )}>
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className="cursor-pointer [&_.bg-primary]:bg-white [&_[data-orientation=horizontal]>span]:bg-white [&_[data-orientation=horizontal]]:h-1"
              aria-label="Volume"
            />
          </div>
        </div>
      </div>

      {/* Mobile: mute toggle only */}
      <div className="flex md:hidden items-center gap-1 ml-auto shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className="h-8 w-8 text-[#b3b3b3] hover:text-white"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
        {currentTrack && user && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#b3b3b3] hover:text-white"
                disabled={isUpdatingCurrentTrackPlaylists}
              >
                {isUpdatingCurrentTrackPlaylists ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-0 bg-[#282828] border-white/10 mb-2" align="end" side="top">
              <div className="p-3 border-b border-white/10">
                <p className="text-sm font-semibold text-white">Add to playlist</p>
              </div>
              <ScrollArea className="h-[120px]">
                <div className="p-2 space-y-1">
                  {playlists.length > 0 ? playlists.map((playlist) => {
                    const playlistId = playlist.id!;
                    const videoId = currentTrack.id.videoId;
                    const isLoading = !!(playlistLoading[`add_${playlistId}_${videoId}`] || playlistLoading[`remove_${playlistId}_${videoId}`]);
                    return (
                      <div key={playlistId} className="flex items-center space-x-2 px-1 py-1 rounded hover:bg-white/5">
                        <Checkbox
                          id={`mob2-player-playlist-${playlistId}`}
                          checked={isVideoInPlaylist(videoId, playlistId)}
                          onCheckedChange={(checked) => handlePlaylistCheckboxChange(playlistId, checked)}
                          disabled={isLoading}
                          className="border-[#b3b3b3] data-[state=checked]:bg-[#1DB954] data-[state=checked]:border-[#1DB954]"
                        />
                        <Label htmlFor={`mob2-player-playlist-${playlistId}`} className="text-xs text-white cursor-pointer flex-1 truncate">
                          {isLoading && <Loader2 className="w-3 h-3 mr-1 inline-block animate-spin" />}
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
      </div>
    </div>
  );
}
