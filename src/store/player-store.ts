// src/store/player-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  searchYouTubeVideos,
  getPopularMusicVideos,
  getYouTubeVideoDetailsByIds,
  YouTubeVideoSearchResultItem,
  YouTubeVideoDetailsItem,
} from '@/services/youtube';
import { produce } from 'immer'; // Optional: for easier state updates


export interface Playlist {
  id: string;
  name: string;
  videoIds: string[];
}

// Extend the search result item for internal use to potentially hold more details later
export type PlayerTrackInfo = YouTubeVideoSearchResultItem & { details?: YouTubeVideoDetailsItem };

interface PlayerState {
  searchResults: PlayerTrackInfo[];
  playlists: Playlist[];
  currentTrack: PlayerTrackInfo | null;
  currentPlaylist: PlayerTrackInfo[]; // The list of tracks currently being played (could be search results or a playlist)
  currentTrackIndex: number; // Index within currentPlaylist
  activePlaylistId: string | null; // ID of the playlist being viewed/edited, null for search results view
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  isRepeating: boolean;
  isShuffling: boolean;
  loading: boolean; // General loading state, e.g., for search
  playlistDetails: Record<string, PlayerTrackInfo>; // Cache for video details by ID
  playlistLoading: Record<string, boolean>; // Loading state per playlist ID
  currentPlaylistVideos: PlayerTrackInfo[]; // Videos currently loaded for the active playlist view

  // Actions
  searchVideos: (query: string) => Promise<void>;
  fetchPopularVideos: () => Promise<void>;
  addPlaylist: (name: string) => void;
  removePlaylist: (id: string) => void;
  addVideoToPlaylist: (video: PlayerTrackInfo, playlistId: string) => void;
  removeVideoFromPlaylist: (videoId: string, playlistId: string) => void;
  removeVideoFromCurrentPlaylist: (videoId: string, playlistId: string) => void;
  playTrack: (track: PlayerTrackInfo, playlist: PlayerTrackInfo[], index: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  togglePlayPause: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  setActivePlaylist: (id: string | null) => void;
  loadPlaylist: (id: string) => Promise<void>;
  _hydratePlaylistVideos: (playlistId: string, videos: PlayerTrackInfo[]) => void; // Internal hydration helper
}

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper to shuffle an array
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};


export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      searchResults: [],
      playlists: [],
      currentTrack: null,
      currentPlaylist: [],
      currentTrackIndex: -1,
      activePlaylistId: null, // Start with no active playlist (showing search/popular)
      isPlaying: false,
      volume: 0.8,
      isMuted: false,
      isRepeating: false,
      isShuffling: false,
      loading: false,
      playlistDetails: {},
      playlistLoading: {},
      currentPlaylistVideos: [],


      searchVideos: async (query) => {
        set({ loading: true, activePlaylistId: null, currentPlaylistVideos: [] }); // Clear active playlist view on new search
        try {
          const results = await searchYouTubeVideos(query, 20); // Fetch more for better shuffling
          set({ searchResults: results.items || [], loading: false });
        } catch (error) {
          console.error("Failed to search videos:", error);
          set({ searchResults: [], loading: false });
        }
      },

      fetchPopularVideos: async () => {
         set({ loading: true, activePlaylistId: null, currentPlaylistVideos: [] }); // Ensure search/popular view
         try {
           const results = await getPopularMusicVideos(20); // Fetch more
            // Filter out potential non-video items if any sneak through API adaptation
           const videos = (results.items || []).filter(item => item.id?.kind === 'youtube#video' && item.id?.videoId);
           set({ searchResults: videos, loading: false });
         } catch (error) {
           console.error("Failed to fetch popular videos:", error);
           set({ searchResults: [], loading: false });
         }
       },

      addPlaylist: (name) =>
        set(
          produce((state: PlayerState) => {
            const newPlaylist: Playlist = { id: generateId(), name, videoIds: [] };
            state.playlists.push(newPlaylist);
          })
        ),

      removePlaylist: (id) =>
        set(
          produce((state: PlayerState) => {
            state.playlists = state.playlists.filter((p) => p.id !== id);
            // If the removed playlist was active, reset view
            if (state.activePlaylistId === id) {
              state.activePlaylistId = null;
              state.currentPlaylistVideos = [];
            }
             // If the removed playlist was the *current* playing list, stop playback or move to next sensible state
             if (state.currentPlaylist.length > 0 && state.playlists.find(p => p.id === id)?.videoIds.includes(state.currentTrack?.id.videoId ?? '')) {
                // Basic reset - could be smarter (e.g., play popular)
                state.currentTrack = null;
                state.currentPlaylist = [];
                state.currentTrackIndex = -1;
                state.isPlaying = false;
             }
          })
        ),

      addVideoToPlaylist: (video, playlistId) =>
        set(
          produce((state: PlayerState) => {
            const playlist = state.playlists.find((p) => p.id === playlistId);
            if (playlist && !playlist.videoIds.includes(video.id.videoId)) {
              playlist.videoIds.push(video.id.videoId);
               // Add details to cache if not already there
               if (!state.playlistDetails[video.id.videoId]) {
                 state.playlistDetails[video.id.videoId] = video;
               }
               // If adding to the currently viewed playlist, update the view
               if (state.activePlaylistId === playlistId) {
                   state.currentPlaylistVideos.push(video);
               }
            }
          })
        ),

      removeVideoFromPlaylist: (videoId, playlistId) =>
        set(
          produce((state: PlayerState) => {
            const playlist = state.playlists.find((p) => p.id === playlistId);
            if (playlist) {
              playlist.videoIds = playlist.videoIds.filter((id) => id !== videoId);
              // If removing from the currently viewed playlist, update the view
              if (state.activePlaylistId === playlistId) {
                state.currentPlaylistVideos = state.currentPlaylistVideos.filter(v => v.id.videoId !== videoId);
              }
            }
          })
        ),

        // Specific action to remove from the *currently viewed* playlist in the UI
       removeVideoFromCurrentPlaylist: (videoId, playlistId) => {
          // First, update the persistent playlist data
          get().removeVideoFromPlaylist(videoId, playlistId);
          // Then, update the currently playing list *if* it's the same as the active playlist
          set(produce((state: PlayerState) => {
             if (state.currentPlaylist.length > 0 && state.playlists.find(p => p.id === playlistId)?.videoIds.includes(videoId)) {
                 const removedIndex = state.currentPlaylist.findIndex(track => track.id.videoId === videoId);
                 state.currentPlaylist = state.currentPlaylist.filter(track => track.id.videoId !== videoId);

                 // Adjust currentTrackIndex if necessary
                 if (removedIndex !== -1) {
                    if (state.currentTrackIndex === removedIndex) {
                       // If the removed track was the current one
                       if (state.currentPlaylist.length === 0) {
                           // Playlist is now empty
                           state.currentTrack = null;
                           state.currentTrackIndex = -1;
                           state.isPlaying = false;
                       } else {
                           // Move to the next track (or wrap around/stop based on repeat/shuffle)
                           // Simplified: just move to the 'next' index, which might now be out of bounds
                           state.currentTrackIndex = Math.min(removedIndex, state.currentPlaylist.length - 1);
                           state.currentTrack = state.currentPlaylist[state.currentTrackIndex];
                           // Decide whether to keep playing or pause
                           // state.isPlaying = state.isPlaying; // Keep playing if it was
                       }
                    } else if (state.currentTrackIndex > removedIndex) {
                       state.currentTrackIndex--; // Adjust index if removed track was before current
                    }
                 }
             }
          }));
       },


      playTrack: (track, playlist, index) => {
         const { isShuffling } = get();
         const actualPlaylist = isShuffling ? shuffleArray(playlist) : playlist;
         // Find the index of the track in the potentially shuffled playlist
         const actualIndex = actualPlaylist.findIndex(t => t.id.videoId === track.id.videoId);

         set({
           currentTrack: track,
           currentPlaylist: actualPlaylist,
           currentTrackIndex: actualIndex !== -1 ? actualIndex : 0, // Fallback to 0 if somehow not found
           isPlaying: true,
         });
      },

     playNext: () => {
          set(produce((state: PlayerState) => {
              if (!state.currentTrack || state.currentPlaylist.length === 0) return;

              const { currentTrackIndex, currentPlaylist, isRepeating, isShuffling } = state;
              let nextIndex = currentTrackIndex + 1;

              if (isRepeating && nextIndex >= currentPlaylist.length) {
                  nextIndex = 0; // Loop back to the start if repeating whole list
              }

              if (nextIndex >= 0 && nextIndex < currentPlaylist.length) {
                  state.currentTrackIndex = nextIndex;
                  state.currentTrack = state.currentPlaylist[nextIndex];
                  state.isPlaying = true;
              } else {
                   // Reached end of non-repeating list
                  state.isPlaying = false; // Stop playing
                  // Optionally reset to start:
                  // state.currentTrackIndex = 0;
                  // state.currentTrack = state.currentPlaylist[0];
              }

               // If shuffling is on, the playlist is already shuffled. Just move to the next index.
               // If repeat *single* is desired, ReactPlayer's loop prop handles it.
               // If repeat *playlist* is desired, the logic above handles wrapping.
          }));
      },

     playPrevious: () => {
         set(produce((state: PlayerState) => {
             if (!state.currentTrack || state.currentPlaylist.length === 0) return;

             const { currentTrackIndex, currentPlaylist, isRepeating, isShuffling } = state; // isShuffling might be relevant if we want 'true previous' which is complex
             let prevIndex = currentTrackIndex - 1;

             if (prevIndex < 0) {
                 if (isRepeating) {
                     prevIndex = currentPlaylist.length - 1; // Wrap to end if repeating
                 } else {
                      // Reached start of non-repeating list
                     // Option 1: Stop
                     // state.isPlaying = false;
                     // return;
                     // Option 2: Stay on the first track (do nothing or reset time)
                      playerRef.current?.seekTo(0); // Requires playerRef access, tricky in Zustand
                     return; // Or just don't change track
                 }
             }

             state.currentTrackIndex = prevIndex;
             state.currentTrack = state.currentPlaylist[prevIndex];
             state.isPlaying = true;
         }));
     },

      togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),
      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

     toggleRepeat: () => set((state) => ({ isRepeating: !state.isRepeating })),

      toggleShuffle: () => {
         set(produce((state: PlayerState) => {
             state.isShuffling = !state.isShuffling;
             if (state.currentPlaylist.length > 0) {
                 if (state.isShuffling) {
                     // Shuffle the current playlist, keeping the current track at index 0 (or its new position)
                     const currentId = state.currentTrack?.id.videoId;
                     state.currentPlaylist = shuffleArray(state.currentPlaylist);
                     // Find the new index of the current track after shuffling
                     const newIndex = state.currentPlaylist.findIndex(track => track.id.videoId === currentId);
                     state.currentTrackIndex = newIndex !== -1 ? newIndex : 0;
                 } else {
                     // Unshuffle: Revert to original order (requires storing original or fetching again)
                     // Simple approach: Use search results or fetch playlist again if needed.
                     // This example assumes the source (searchResults or fetched playlist) is the "original".
                     const sourcePlaylist = state.activePlaylistId
                         ? state.playlists.find(p => p.id === state.activePlaylistId)?.videoIds.map(id => state.playlistDetails[id]).filter(Boolean) ?? []
                         : state.searchResults;

                      // Filter sourcePlaylist to only include items currently in the shuffled list if necessary
                      const currentIds = new Set(state.currentPlaylist.map(t => t.id.videoId));
                      state.currentPlaylist = sourcePlaylist.filter(t => currentIds.has(t.id.videoId));

                      // Find the new index of the current track
                     const currentId = state.currentTrack?.id.videoId;
                     const newIndex = state.currentPlaylist.findIndex(track => track.id.videoId === currentId);
                     state.currentTrackIndex = newIndex !== -1 ? newIndex : 0;
                 }
             }
         }));
      },


      setActivePlaylist: (id) => set({ activePlaylistId: id }),

       // Internal helper to update cached details and trigger UI update
       _hydratePlaylistVideos: (playlistId, videos) => {
          set(produce((state: PlayerState) => {
             videos.forEach(video => {
                 // Use the structure from search/details directly
                 state.playlistDetails[video.id.videoId] = video;
             });
             // If this is the currently active playlist, update the view
             if (state.activePlaylistId === playlistId) {
                 state.currentPlaylistVideos = videos;
             }
              state.playlistLoading[playlistId] = false; // Mark loading as complete
          }));
       },

      // Load video details for a specific playlist
       loadPlaylist: async (id) => {
          const playlist = get().playlists.find(p => p.id === id);
          if (!playlist) return;

           set(produce((state: PlayerState) => {
               state.playlistLoading[id] = true;
           }));


          const videoIdsToFetch = playlist.videoIds.filter(videoId => !get().playlistDetails[videoId]);

          try {
              let fetchedVideos: PlayerTrackInfo[] = [];
              if (videoIdsToFetch.length > 0) {
                 // Fetch details for missing videos
                 const detailsResult = await getYouTubeVideoDetailsByIds(videoIdsToFetch);
                 fetchedVideos = detailsResult.items.map(item => ({
                    // Adapt details item to search result item structure
                    kind: 'youtube#searchResult',
                    etag: item.etag,
                    id: { kind: 'youtube#video', videoId: item.id },
                    snippet: item.snippet,
                    details: item, // Store full details if needed later
                 }));
              }

               // Combine cached and newly fetched videos, maintaining original playlist order
               const allPlaylistVideos = playlist.videoIds.map(videoId => {
                    return get().playlistDetails[videoId] || fetchedVideos.find(v => v.id.videoId === videoId);
                }).filter((video): video is PlayerTrackInfo => Boolean(video)); // Filter out any potential nulls/undefined


               get()._hydratePlaylistVideos(id, allPlaylistVideos); // Use helper to update state

          } catch (error) {
              console.error(`Failed to load playlist ${id}:`, error);
              set(produce((state: PlayerState) => {
                   state.playlistLoading[id] = false;
               }));
          }
       },


    }),
    {
      name: 'vibeverse-player-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
        partialize: (state) => ({
            // Persist only specific parts of the state
            playlists: state.playlists,
            volume: state.volume,
            isMuted: state.isMuted,
            isRepeating: state.isRepeating,
            isShuffling: state.isShuffling,
            playlistDetails: state.playlistDetails, // Cache video details
        }),
       // Optional: Custom hydration logic if needed after rehydration
       // onRehydrateStorage: (state) => {
       //   console.log("Hydration finished.")
       //   return (state, error) => {
       //     if (error) {
       //       console.log('An error happened during hydration', error)
       //     } else {
       //       // state. // Perform actions after hydration
       //     }
       //   }
       // }
    }
  )
);

// Fetch popular videos on initial load (outside the component lifecycle)
// Ensure this runs only once, maybe using a flag or checking if searchResults are empty initially
if (typeof window !== 'undefined') { // Make sure it runs only on the client
    const initialState = usePlayerStore.getState();
    if (initialState.searchResults.length === 0 && initialState.playlists.length === 0 && !initialState.activePlaylistId) {
       usePlayerStore.getState().fetchPopularVideos();
    }
}