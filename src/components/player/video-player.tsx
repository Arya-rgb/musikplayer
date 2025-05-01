
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
} from 'lucide-react';
import { formatTime, cn } from '@/lib/utils'; // Import cn
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
    playlistLoading
  } = usePlayerStore();

  const playerRef = useRef<ReactPlayer>(null);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isClient, setIsClient] = useState(false);

   const isUpdatingCurrentTrackPlaylists = currentTrack ? Object.entries(playlistLoading).some(([key, value]) =>
       value && (key.includes(`_${currentTrack.id.videoId}`) || key === 'add')
   ) : false;


  useEffect(() => {
      setIsClient(true);
  }, []);

  // Seek bar logic
  const handleProgress = (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => {
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

  // Volume logic
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setVolume(newVolume);
    if (isMuted && newVolume > 0) toggleMute();
    if (!isMuted && newVolume === 0) toggleMute();
  };

  // Playlist add/remove logic
   const handlePlaylistCheckboxChange = async (playlistId: string, checked: boolean | 'indeterminate') => {
      if (!currentTrack || !user) return;

      const videoId = currentTrack.id.videoId;
      const addKey = `add_${playlistId}_${videoId}`;
      const removeKey = `remove_${playlistId}_${videoId}`;
      const isCurrentlyLoading = playlistLoading[addKey] || playlistLoading[removeKey];

      if (isCurrentlyLoading) return;

      const trackInfo = currentTrack as PlayerTrackInfo;

      if (checked === true) {
          await addVideoToPlaylist(trackInfo, playlistId);
      } else {
          await removeVideoFromPlaylist(videoId, playlistId);
      }
  };

   const isVideoInPlaylist = (videoId: string, playlistId: string): boolean => {
     if (!videoId) return false;
    const playlist = playlists.find(p => p.id === playlistId);
    return !!playlist?.videoIds.includes(videoId);
  };

  // --- Conditional Rendering ---
  if (!isClient) {
      // Server-side placeholder or null
      return <div className="fixed bottom-0 left-0 right-0 h-20 md:h-24 bg-card border-t z-50 flex items-center justify-center p-4"> <p className="text-muted-foreground">Loading player...</p></div>;
  }

  // --- Main Player Render ---
  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 md:h-24 bg-card border-t z-50 flex items-center justify-between p-2 md:p-4 gap-2 md:gap-4">
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
              config={{ youtube: { playerVars: { controls: 0, disablekb: 1, origin: typeof window !== 'undefined' ? window.location.origin : undefined } } }}
            />
         </div>
       )}

      {/* Track Info - Smaller on mobile */}
      <div className="flex items-center gap-2 md:gap-3 w-1/3 lg:w-1/4 min-w-0">
        {currentTrack ? (
          <>
            <Image
              src={currentTrack.snippet.thumbnails.default.url}
              alt={currentTrack.snippet.title}
              width={48} // Smaller on mobile
              height={48} // Smaller on mobile
              className="rounded aspect-square object-cover"
              data-ai-hint="music video thumbnail"
            />
            <div className="hidden md:flex flex-col min-w-0"> {/* Hide text details on small screens */}
              <p className="text-sm font-medium truncate text-foreground">{currentTrack.snippet.title}</p>
              <p className="text-xs text-muted-foreground truncate">{currentTrack.snippet.channelTitle}</p>
            </div>
          </>
        ) : (
           <div className="flex items-center gap-2 md:gap-3">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-muted rounded flex items-center justify-center">
                 <Music className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground"/>
              </div>
             <p className="hidden md:block text-sm text-muted-foreground">No track</p> {/* Hide text on small screens */}
            </div>
        )}
      </div>

      {/* Player Controls & Seek Bar - Stacked on mobile */}
      <div className="flex flex-col items-center justify-center flex-1 max-w-md lg:max-w-xl gap-1 md:gap-2">
        {/* Controls - Smaller buttons on mobile */}
        <div className="flex items-center gap-1 md:gap-3">
          <Button
              variant="ghost"
              size="icon"
              onClick={toggleShuffle}
              className={cn('h-7 w-7 md:h-8 md:w-8', isShuffling ? 'text-accent' : 'text-muted-foreground', !currentTrack && 'opacity-50 cursor-not-allowed')}
              disabled={!currentTrack}
              aria-label="Toggle shuffle"
            >
              <Shuffle className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={playPrevious} disabled={!currentTrack} aria-label="Previous track" className="h-7 w-7 md:h-8 md:w-8">
            <SkipBack className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <Button
            variant="default"
            size="icon"
            className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
            onClick={togglePlayPause}
            disabled={!currentTrack}
             aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-4 h-4 md:w-5 md:h-5" /> : <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={playNext} disabled={!currentTrack} aria-label="Next track" className="h-7 w-7 md:h-8 md:w-8">
            <SkipForward className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
           <Button
              variant="ghost"
              size="icon"
              onClick={toggleRepeat}
              className={cn('h-7 w-7 md:h-8 md:w-8', isRepeating ? 'text-accent' : 'text-muted-foreground', !currentTrack && 'opacity-50 cursor-not-allowed')}
              disabled={!currentTrack}
              aria-label="Toggle repeat"
            >
              <Repeat className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
        </div>
        {/* Seek Bar - Time hidden on very small screens */}
        <div className="flex items-center gap-2 w-full max-w-xs sm:max-w-sm md:max-w-full">
          <span className="hidden sm:block text-xs text-muted-foreground w-10 text-right tabular-nums">
            {formatTime(played * duration)}
          </span>
          <Slider
            value={[played * 100]}
            max={100}
            step={0.1}
            onValueChange={handleSeekChange}
            onPointerDown={handleSeekMouseDown}
            onPointerUp={handleSeekMouseUp}
            className="flex-1 cursor-pointer h-1 md:h-2" // Thinner slider on mobile
            disabled={!currentTrack || duration === 0}
             aria-label="Seek slider"
          />
          <span className="hidden sm:block text-xs text-muted-foreground w-10 text-left tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume & Other Controls - Simplified on mobile */}
      <div className="flex items-center gap-1 md:gap-3 w-1/3 lg:w-1/4 justify-end">
        {/* Add to Playlist Popover - Smaller button on mobile */}
         {currentTrack && user && (
             <Popover>
                <PopoverTrigger asChild>
                     <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground hover:text-accent" aria-label="Add to playlist" disabled={isUpdatingCurrentTrackPlaylists}>
                         {isUpdatingCurrentTrackPlaylists ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Plus className="w-4 h-4 md:w-5 md:h-5" />}
                         <span className="sr-only">Add to Playlist</span>
                     </Button>
                </PopoverTrigger>
                <PopoverContent className="w-60 p-0 mb-2"> {/* Add margin bottom */}
                     <div className="p-3 md:p-4 border-b">
                         <p className="text-sm font-medium">Add to playlist</p>
                     </div>
                     <ScrollArea className="h-[120px] md:h-[150px]">
                         <div className="p-3 md:p-4 space-y-1.5 md:space-y-2">
                            {playlists.length > 0 ? playlists.map((playlist) => {
                                const playlistId = playlist.id!;
                                const videoId = currentTrack.id.videoId;
                                const addKey = `add_${playlistId}_${videoId}`;
                                const removeKey = `remove_${playlistId}_${videoId}`;
                                const isLoading = !!(playlistLoading[addKey] || playlistLoading[removeKey]);
                                return (
                                    <div key={playlistId} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`player-playlist-${playlistId}`}
                                          checked={isVideoInPlaylist(videoId, playlistId)}
                                          onCheckedChange={(checked) => handlePlaylistCheckboxChange(playlistId, checked)}
                                          aria-labelledby={`label-player-playlist-${playlistId}`}
                                          disabled={isLoading}
                                        />
                                        <Label
                                            htmlFor={`player-playlist-${playlistId}`}
                                            id={`label-player-playlist-${playlistId}`}
                                            className="text-xs md:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 truncate"
                                        >
                                             {isLoading && <Loader2 className="w-3 h-3 mr-1 inline-block animate-spin"/>}
                                            {playlist.name}
                                        </Label>
                                    </div>
                                );
                             }) : (
                                <p className="text-xs md:text-sm text-muted-foreground text-center">No playlists yet.</p>
                            )}
                         </div>
                    </ScrollArea>
                </PopoverContent>
            </Popover>
        )}

        {/* Volume Control - Only show icon on mobile */}
         <div className="hidden md:flex items-center gap-1" onMouseEnter={() => setShowVolumeSlider(true)} onMouseLeave={() => setShowVolumeSlider(false)}>
            <Button variant="ghost" size="icon" onClick={toggleMute} className="h-8 w-8 text-muted-foreground" aria-label={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className={cn(
                "w-20 cursor-pointer transition-all duration-300",
                 showVolumeSlider ? "opacity-100" : "opacity-0 w-0"
              )}
               aria-label="Volume slider"
            />
         </div>
         {/* Mobile Volume Toggle */}
         <Button variant="ghost" size="icon" onClick={toggleMute} className="h-7 w-7 md:hidden text-muted-foreground" aria-label={isMuted ? 'Unmute' : 'Mute'}>
           {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
         </Button>

      </div>
    </div>
  );
}
