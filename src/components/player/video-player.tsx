
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
  // ListMusic, // Example, uncomment if queue feature is added
  Repeat,
  Shuffle,
  Heart,
  Loader2, // Added Loader2
  Music, // Import Music icon
} from 'lucide-react';
import { formatTime, cn } from '@/lib/utils';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-context'; // Import useAuth
import { YouTubeVideoSearchResultItem } from '@/services/youtube'; // Ensure this type is imported

export function VideoPlayer() {
   const { user } = useAuth(); // Get user state
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
    // currentPlaylistVideos, // Not directly needed here, handled by playTrack/Next/Prev
    // playTrack, // Not directly needed here
    isRepeating,
    toggleRepeat,
    isShuffling,
    toggleShuffle,
    playlists, // Firestore playlists
    addVideoToPlaylist, // Async Firestore action
    removeVideoFromPlaylist, // Async Firestore action
    // searchResults, // Not needed here
    // activePlaylistId, // Not needed here
    playlistLoading // Loading states for playlist operations
  } = usePlayerStore();

  const playerRef = useRef<ReactPlayer>(null);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isClient, setIsClient] = useState(false);

   // General loading state for any playlist update from this component
   const isUpdatingPlaylist = Object.entries(playlistLoading)
       .filter(([key]) => key !== 'fetch' && key !== 'add') // Exclude general fetch/add from sidebar
       .some(([, value]) => value);


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

  // Playlist add/remove logic (using Firestore actions)
   const handlePlaylistCheckboxChange = async (playlistId: string, checked: boolean | 'indeterminate') => {
      if (!currentTrack || !user) return; // Need track and user
      const isCurrentlyLoading = playlistLoading[playlistId];
      if (isCurrentlyLoading) return; // Prevent action if already loading for this playlist

      // Type guard to ensure currentTrack is PlayerTrackInfo (which includes YouTubeVideoSearchResultItem)
      const trackToAdd = currentTrack as YouTubeVideoSearchResultItem;

      if (checked === true) {
          await addVideoToPlaylist(trackToAdd, playlistId);
      } else {
          await removeVideoFromPlaylist(trackToAdd.id.videoId, playlistId);
      }
  };

   const isVideoInPlaylist = (videoId: string, playlistId: string): boolean => {
    const playlist = playlists.find(p => p.id === playlistId);
    return !!playlist?.videoIds.includes(videoId);
  };

  // --- Conditional Rendering ---
  if (!isClient) {
      // Server-side placeholder or null
      return <div className="fixed bottom-0 left-0 right-0 h-24 bg-card border-t z-50 flex items-center justify-center p-4"> <p className="text-muted-foreground">Loading player...</p></div>;
  }

  // --- Main Player Render ---
  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-card border-t z-50 flex items-center justify-between p-4 gap-4">
       {/* Hidden ReactPlayer */}
       {currentTrack && (
         <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '1px', height: '1px', pointerEvents: 'none', opacity: 0 }}>
            <ReactPlayer
              ref={playerRef}
              url={`https://www.youtube.com/watch?v=${currentTrack.id.videoId}`}
              playing={isPlaying}
              volume={isMuted ? 0 : volume}
              // loop={isRepeating} // Let playNext handle repeat playlist logic. ReactPlayer loop is for single track.
              onProgress={handleProgress}
              onDuration={handleDuration}
              onEnded={playNext}
              width="1px"
              height="1px"
              onError={(e, data) => console.error('Player error:', e, data)}
              config={{ youtube: { playerVars: { controls: 0, disablekb: 1 } } }}
            />
         </div>
       )}

      {/* Track Info */}
      <div className="flex items-center gap-3 w-1/4 min-w-0">
        {currentTrack ? (
          <>
            <Image
              src={currentTrack.snippet.thumbnails.default.url}
              alt={currentTrack.snippet.title}
              width={56}
              height={56}
              className="rounded aspect-square object-cover"
              data-ai-hint="music video thumbnail"
            />
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-medium truncate text-foreground">{currentTrack.snippet.title}</p>
              <p className="text-xs text-muted-foreground truncate">{currentTrack.snippet.channelTitle}</p>
            </div>
          </>
        ) : (
           <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-muted rounded flex items-center justify-center">
                 <Music className="w-6 h-6 text-muted-foreground"/>
              </div>
             <p className="text-sm text-muted-foreground">No track selected</p>
            </div>
        )}
      </div>

      {/* Player Controls & Seek Bar */}
      <div className="flex flex-col items-center justify-center flex-1 max-w-xl gap-2">
        {/* Controls */}
        <div className="flex items-center gap-3">
          <Button
              variant="ghost"
              size="icon"
              onClick={toggleShuffle}
              className={cn(isShuffling ? 'text-accent' : 'text-muted-foreground', !currentTrack && 'opacity-50 cursor-not-allowed')}
              disabled={!currentTrack}
              aria-label="Toggle shuffle"
            >
              <Shuffle className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={playPrevious} disabled={!currentTrack} aria-label="Previous track">
            <SkipBack className="w-5 h-5" />
          </Button>
          <Button
            variant="default"
            size="icon"
            className="w-10 h-10 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 disabled:bg-accent/50"
            onClick={togglePlayPause}
            disabled={!currentTrack}
             aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={playNext} disabled={!currentTrack} aria-label="Next track">
            <SkipForward className="w-5 h-5" />
          </Button>
           <Button
              variant="ghost"
              size="icon"
              onClick={toggleRepeat}
              className={cn(isRepeating ? 'text-accent' : 'text-muted-foreground', !currentTrack && 'opacity-50 cursor-not-allowed')}
              disabled={!currentTrack}
              aria-label="Toggle repeat"
            >
              <Repeat className="w-5 h-5" />
            </Button>
        </div>
        {/* Seek Bar */}
        <div className="flex items-center gap-2 w-full">
          <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
            {formatTime(played * duration)}
          </span>
          <Slider
            value={[played * 100]}
            max={100}
            step={0.1}
            onValueChange={handleSeekChange}
            onPointerDown={handleSeekMouseDown}
            onPointerUp={handleSeekMouseUp}
            className="flex-1 cursor-pointer"
            disabled={!currentTrack}
             aria-label="Seek slider"
          />
          <span className="text-xs text-muted-foreground w-10 text-left tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume & Other Controls */}
      <div className="flex items-center gap-3 w-1/4 justify-end">
        {/* Add to Playlist Popover - Only show if track is playing AND user is logged in */}
         {currentTrack && user && (
             <Popover>
                <PopoverTrigger asChild>
                     <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label="Add to playlist" disabled={isUpdatingPlaylist}>
                         {isUpdatingPlaylist ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className="w-5 h-5" />}
                     </Button>
                </PopoverTrigger>
                <PopoverContent className="w-60 p-0">
                     <div className="p-4 border-b">
                         <p className="text-sm font-medium">Add to playlist</p>
                     </div>
                     <ScrollArea className="h-[150px]">
                         <div className="p-4 space-y-2">
                            {playlists.length > 0 ? playlists.map((playlist) => {
                                const isLoading = playlistLoading[playlist.id!];
                                return (
                                    <div key={playlist.id} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`player-playlist-${playlist.id}`}
                                          checked={isVideoInPlaylist(currentTrack.id.videoId, playlist.id!)}
                                          onCheckedChange={(checked) => handlePlaylistCheckboxChange(playlist.id!, checked)}
                                          aria-labelledby={`label-player-playlist-${playlist.id}`}
                                          disabled={isLoading || isUpdatingPlaylist} // Disable if this specific playlist is loading
                                        />
                                        <Label
                                            htmlFor={`player-playlist-${playlist.id}`}
                                            id={`label-player-playlist-${playlist.id}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 truncate"
                                        >
                                             {isLoading && <Loader2 className="w-3 h-3 mr-1 inline-block animate-spin"/>}
                                            {playlist.name}
                                        </Label>
                                    </div>
                                );
                             }) : (
                                <p className="text-sm text-muted-foreground text-center">No playlists yet.</p>
                            )}
                         </div>
                    </ScrollArea>
                </PopoverContent>
            </Popover>
        )}


        {/* Volume Control */}
         <div className="flex items-center gap-1" onMouseEnter={() => setShowVolumeSlider(true)} onMouseLeave={() => setShowVolumeSlider(false)}>
            <Button variant="ghost" size="icon" onClick={toggleMute} className="text-muted-foreground" aria-label={isMuted ? 'Unmute' : 'Mute'}>
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

        {/* Playlist Queue Toggle Example (uncomment and implement if needed) */}
         {/*
         <Button variant="ghost" size="icon" className="text-muted-foreground">
            <ListMusic className="w-5 h-5" />
             <span className="sr-only">Show Queue</span>
         </Button>
         */}

      </div>
    </div>
  );
}
