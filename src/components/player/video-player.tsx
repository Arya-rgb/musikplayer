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
  ListMusic,
  Repeat,
  Shuffle,
  Heart // Assuming Heart is for "Add to Playlist"
} from 'lucide-react';
import { formatTime, cn } from '@/lib/utils'; // Import cn
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';


export function VideoPlayer() {
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
    currentPlaylistVideos,
    playTrack,
    isRepeating,
    toggleRepeat,
    isShuffling,
    toggleShuffle,
    playlists,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    searchResults, // Get search results from store
    activePlaylistId, // To know if we're showing search or a playlist
    loading // Loading state
  } = usePlayerStore();

  const playerRef = useRef<ReactPlayer>(null);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
      setIsClient(true); // Component has mounted on the client
  }, []);


  const handleProgress = (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => {
    if (!seeking) {
      setPlayed(state.played);
    }
  };

  const handleDuration = (duration: number) => {
    setDuration(duration);
  };

  const handleSeekMouseDown = () => {
    setSeeking(true);
  };

  const handleSeekChange = (value: number[]) => {
     if (playerRef.current) {
       const newPlayed = value[0] / 100;
       setPlayed(newPlayed); // Update visual slider immediately
       playerRef.current.seekTo(newPlayed);
     }
   };


  const handleSeekMouseUp = () => {
    setSeeking(false);
    // No need to seek again here, handleSeekChange already does it
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100);
    if (isMuted && value[0] > 0) {
        toggleMute();
    }
     if (!isMuted && value[0] === 0) {
        toggleMute();
    }
  };


   const handlePlaylistCheckboxChange = (playlistId: string, checked: boolean | 'indeterminate') => {
      if (!currentTrack) return;
      if (checked === true) {
          addVideoToPlaylist(currentTrack, playlistId);
      } else {
          removeVideoFromPlaylist(currentTrack.id.videoId, playlistId);
      }
  };


   const isVideoInPlaylist = (videoId: string, playlistId: string): boolean => {
    const playlist = playlists.find(p => p.id === playlistId);
    return !!playlist?.videoIds.includes(videoId);
  };


   // Determine which list of videos to display
   const displayVideos = activePlaylistId ? currentPlaylistVideos : searchResults;


  if (!isClient) {
      // Render placeholder or nothing on the server
      return <div className="fixed bottom-0 left-0 right-0 h-24 bg-card border-t z-50 flex items-center justify-center p-4"> <p className="text-muted-foreground">Loading player...</p></div>;
  }


  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-card border-t z-50 flex items-center justify-between p-4 gap-4">
       {/* Hidden ReactPlayer */}
       {currentTrack && (
         <div className="absolute -top-full opacity-0 pointer-events-none">
            <ReactPlayer
              ref={playerRef}
              url={`https://www.youtube.com/watch?v=${currentTrack.id.videoId}`}
              playing={isPlaying}
              volume={isMuted ? 0 : volume}
              loop={isRepeating} // ReactPlayer handles single track loop
              onProgress={handleProgress}
              onDuration={handleDuration}
              onEnded={playNext} // Let store handle logic for repeat/shuffle/next
              width="100%"
              height="100%"
              config={{
                  youtube: {
                      playerVars: {
                          // controls: 0, // Hide native controls if desired
                          // disablekb: 1,
                      }
                  }
              }}
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
          <p className="text-sm text-muted-foreground">No track selected</p>
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
              className={isShuffling ? 'text-accent' : 'text-muted-foreground'}
              disabled={!currentTrack}
            >
              <Shuffle className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={playPrevious} disabled={!currentTrack}>
            <SkipBack className="w-5 h-5" />
          </Button>
          <Button
            variant="default" // Use default for primary action
            size="icon"
            className="w-10 h-10 rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={togglePlayPause}
            disabled={!currentTrack}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={playNext} disabled={!currentTrack}>
            <SkipForward className="w-5 h-5" />
          </Button>
           <Button
              variant="ghost"
              size="icon"
              onClick={toggleRepeat}
              className={isRepeating ? 'text-accent' : 'text-muted-foreground'}
              disabled={!currentTrack}
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
            onValueChange={handleSeekChange} // Use this for immediate visual update + seeking
            onPointerDown={handleSeekMouseDown} // Use pointer events for seeking start/end
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
        {/* Add to Playlist Popover */}
         {currentTrack && (
             <Popover>
                <PopoverTrigger asChild>
                     <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <Heart className="w-5 h-5" />
                        <span className="sr-only">Add to Playlist</span>
                     </Button>
                </PopoverTrigger>
                <PopoverContent className="w-60 p-0">
                     <div className="p-4 border-b">
                         <p className="text-sm font-medium">Add to playlist</p>
                     </div>
                     <ScrollArea className="h-[150px]">
                         <div className="p-4 space-y-2">
                            {playlists.length > 0 ? playlists.map((playlist) => (
                                <div key={playlist.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`playlist-${playlist.id}`}
                                      checked={isVideoInPlaylist(currentTrack.id.videoId, playlist.id)}
                                      onCheckedChange={(checked) => handlePlaylistCheckboxChange(playlist.id, checked)}
                                      aria-labelledby={`label-playlist-${playlist.id}`}
                                    />
                                    <Label
                                        htmlFor={`playlist-${playlist.id}`}
                                        id={`label-playlist-${playlist.id}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 truncate"
                                    >
                                        {playlist.name}
                                    </Label>
                                </div>
                            )) : (
                                <p className="text-sm text-muted-foreground text-center">No playlists yet.</p>
                            )}
                         </div>
                    </ScrollArea>
                </PopoverContent>
            </Popover>
        )}


        {/* Volume Control */}
         <div className="flex items-center gap-1" onMouseEnter={() => setShowVolumeSlider(true)} onMouseLeave={() => setShowVolumeSlider(false)}>
            <Button variant="ghost" size="icon" onClick={toggleMute} className="text-muted-foreground">
              {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
               <span className="sr-only">{isMuted ? 'Unmute' : 'Mute'}</span>
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

        {/* Playlist Toggle (Example - replace with actual implementation if needed) */}
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
