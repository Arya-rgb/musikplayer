
// src/store/player-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  where,
  Timestamp, // Import Timestamp
  serverTimestamp, // For setting server time
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client'; // Import Firestore instance
import {
  searchYouTubeVideos,
  getPopularMusicVideos,
  getYouTubeVideoDetailsByIds,
  YouTubeVideoSearchResultItem,
  YouTubeVideoDetailsItem,
} from '@/services/youtube';
import { produce } from 'immer';

// Define Firestore Playlist Structure
export interface FirestorePlaylist {
  id?: string; // Firestore document ID, added after creation
  userId: string;
  name: string;
  createdAt: Timestamp | FieldValue; // Use Firestore Timestamp or FieldValue for server time
  videoIds: string[]; // Array of YouTube video IDs
}
// FieldValue type from Firestore for serverTimestamp
import type { FieldValue } from 'firebase/firestore';


// Keep the internal Playlist type for Zustand state if needed, but FirestorePlaylist is the source of truth
export interface Playlist extends FirestorePlaylist {} // Alias or extend if needed

// Extend the search result item for internal use
export type PlayerTrackInfo = YouTubeVideoSearchResultItem & { details?: YouTubeVideoDetailsItem };

interface PlayerState {
  userId: string | null; // Track the current user ID
  searchResults: PlayerTrackInfo[];
  playlists: Playlist[]; // Now mirrors Firestore data for the logged-in user
  currentTrack: PlayerTrackInfo | null;
  currentPlaylist: PlayerTrackInfo[];
  currentTrackIndex: number;
  activePlaylistId: string | null; // Firestore document ID of the active playlist
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  isRepeating: boolean;
  isShuffling: boolean;
  loading: boolean; // General loading state (search, popular)
  playlistLoading: Record<string, boolean>; // Loading state per playlist ID (fetch, update)
  playlistDetails: Record<string, PlayerTrackInfo>; // Cache for video details by ID
  currentPlaylistVideos: PlayerTrackInfo[]; // Videos currently loaded for the active playlist view

  // Actions
  setUserId: (userId: string | null) => void;
  clearUserData: () => void; // Action to clear user-specific data on logout
  fetchUserPlaylists: (userId: string) => Promise<void>;
  searchVideos: (query: string) => Promise<void>;
  fetchPopularVideos: () => Promise<void>;
  addPlaylist: (name: string) => Promise<void>; // Now async for Firestore
  removePlaylist: (id: string) => Promise<void>; // Now async for Firestore
  addVideoToPlaylist: (video: PlayerTrackInfo, playlistId: string) => Promise<void>; // Now async for Firestore
  removeVideoFromPlaylist: (videoId: string, playlistId: string) => Promise<void>; // Now async for Firestore
  removeVideoFromCurrentPlaylist: (videoId: string, playlistId: string) => Promise<void>; // Now async
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
  _hydratePlaylistVideos: (playlistId: string, videos: PlayerTrackInfo[]) => void;
}

// Helper to shuffle an array
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const playlistsCollection = collection(db, 'playlists'); // Firestore collection reference


export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      userId: null, // Initialize userId as null
      searchResults: [],
      playlists: [], // Initialize playlists as empty
      currentTrack: null,
      currentPlaylist: [],
      currentTrackIndex: -1,
      activePlaylistId: null,
      isPlaying: false,
      volume: 0.8,
      isMuted: false,
      isRepeating: false,
      isShuffling: false,
      loading: false,
      playlistLoading: {},
      playlistDetails: {},
      currentPlaylistVideos: [],

      setUserId: (userId) => set({ userId }),

       clearUserData: () => set({
         userId: null,
         playlists: [],
         activePlaylistId: null,
         currentPlaylistVideos: [],
         // Optionally reset other states like currentTrack if desired
         // currentTrack: null,
         // currentPlaylist: [],
         // currentTrackIndex: -1,
         // isPlaying: false,
       }),

      fetchUserPlaylists: async (userId) => {
         if (!userId) {
             set({ playlists: [] }); // Clear playlists if no user ID
             return;
         }
         set(produce((state: PlayerState) => { state.playlistLoading['fetch'] = true; }));
         try {
             const q = query(playlistsCollection, where('userId', '==', userId));
             const querySnapshot = await getDocs(q);
             const userPlaylists: Playlist[] = [];
             querySnapshot.forEach((doc) => {
                 userPlaylists.push({ id: doc.id, ...doc.data() } as Playlist);
             });
              // Sort playlists, e.g., by name or creation date
             userPlaylists.sort((a, b) => a.name.localeCompare(b.name)); // Example: sort by name
             set({ playlists: userPlaylists });
         } catch (error) {
             console.error("Failed to fetch user playlists:", error);
             set({ playlists: [] }); // Set empty on error
         } finally {
             set(produce((state: PlayerState) => { delete state.playlistLoading['fetch']; }));
         }
      },


      searchVideos: async (query) => {
        set({ loading: true, activePlaylistId: null, currentPlaylistVideos: [] });
        try {
          const results = await searchYouTubeVideos(query, 20);
          set({ searchResults: results.items || [], loading: false });
        } catch (error) {
          console.error("Failed to search videos:", error);
          set({ searchResults: [], loading: false });
        }
      },

      fetchPopularVideos: async () => {
         set({ loading: true, activePlaylistId: null, currentPlaylistVideos: [] });
         try {
           const results = await getPopularMusicVideos(20);
           const videos = (results.items || []).filter(item => item.id?.kind === 'youtube#video' && item.id?.videoId);
           set({ searchResults: videos, loading: false });
         } catch (error) {
           console.error("Failed to fetch popular videos:", error);
           set({ searchResults: [], loading: false });
         }
       },

      addPlaylist: async (name) => {
         const userId = get().userId;
         if (!userId) {
             console.error("Cannot add playlist: User not logged in.");
             return; // Or throw error/show notification
         }
         const newPlaylistData: Omit<FirestorePlaylist, 'id'> = {
             userId,
             name,
             createdAt: serverTimestamp(), // Use server timestamp
             videoIds: [],
         };
          set(produce((state: PlayerState) => { state.playlistLoading['add'] = true; }));
         try {
             const docRef = await addDoc(playlistsCollection, newPlaylistData);
             const newPlaylist: Playlist = { ...newPlaylistData, id: docRef.id, createdAt: Timestamp.now() /* Optimistic update with client time */ }; // Use client time for immediate UI update
             set(
               produce((state: PlayerState) => {
                 state.playlists.push(newPlaylist);
                  // Optionally sort again
                  state.playlists.sort((a, b) => a.name.localeCompare(b.name));
               })
             );
             // Potentially re-fetch or just rely on optimistic update
             // await get().fetchUserPlaylists(userId); // Uncomment if you prefer re-fetching
         } catch (error) {
             console.error("Failed to add playlist:", error);
             // Optionally show error toast
         } finally {
              set(produce((state: PlayerState) => { delete state.playlistLoading['add']; }));
         }
      },

       removePlaylist: async (id) => {
         const userId = get().userId;
          if (!userId) {
             console.error("Cannot remove playlist: User not logged in.");
             return;
          }
           // Verify ownership before deleting (optional but recommended for security rules later)
         const playlistToRemove = get().playlists.find(p => p.id === id);
          if (!playlistToRemove || playlistToRemove.userId !== userId) {
             console.error("Cannot remove playlist: Permission denied or playlist not found.");
             return;
          }

         set(produce((state: PlayerState) => { state.playlistLoading[id] = true; }));
         try {
             const playlistDocRef = doc(db, 'playlists', id);
             await deleteDoc(playlistDocRef);
             set(
               produce((state: PlayerState) => {
                 state.playlists = state.playlists.filter((p) => p.id !== id);
                 if (state.activePlaylistId === id) {
                   state.activePlaylistId = null;
                   state.currentPlaylistVideos = [];
                 }
                 // Consider player state reset if the current playing list was deleted
               })
             );
         } catch (error) {
             console.error("Failed to remove playlist:", error);
         } finally {
              set(produce((state: PlayerState) => { delete state.playlistLoading[id]; }));
         }
       },

       addVideoToPlaylist: async (video, playlistId) => {
         const userId = get().userId;
          if (!userId) return;

           // Verify ownership
         const playlist = get().playlists.find(p => p.id === playlistId);
          if (!playlist || playlist.userId !== userId) return;

         if (playlist.videoIds.includes(video.id.videoId)) {
              console.log("Video already in playlist");
              return; // Already exists
         }

          set(produce((state: PlayerState) => { state.playlistLoading[playlistId] = true; }));
          try {
             const playlistDocRef = doc(db, 'playlists', playlistId);
             await updateDoc(playlistDocRef, {
                 videoIds: arrayUnion(video.id.videoId)
             });

             // Optimistic UI update
              set(
                produce((state: PlayerState) => {
                  const targetPlaylist = state.playlists.find((p) => p.id === playlistId);
                  if (targetPlaylist) {
                     targetPlaylist.videoIds.push(video.id.videoId);
                     if (!state.playlistDetails[video.id.videoId]) {
                        state.playlistDetails[video.id.videoId] = video;
                     }
                     if (state.activePlaylistId === playlistId) {
                        // Add to the currently viewed list if it's the active one
                        // Ensure video details are available before adding
                         const videoWithDetails = state.playlistDetails[video.id.videoId] || video;
                        state.currentPlaylistVideos.push(videoWithDetails);
                     }
                  }
                })
              );
              // await get().loadPlaylist(playlistId); // Optionally reload full details after update
          } catch (error) {
              console.error("Failed to add video to playlist:", error);
          } finally {
                set(produce((state: PlayerState) => { delete state.playlistLoading[playlistId]; }));
          }
       },


       removeVideoFromPlaylist: async (videoId, playlistId) => {
         const userId = get().userId;
         if (!userId) return;
         const playlist = get().playlists.find(p => p.id === playlistId);
         if (!playlist || playlist.userId !== userId) return; // Check ownership

          set(produce((state: PlayerState) => { state.playlistLoading[playlistId] = true; }));
         try {
             const playlistDocRef = doc(db, 'playlists', playlistId);
             await updateDoc(playlistDocRef, {
                 videoIds: arrayRemove(videoId)
             });

              // Optimistic UI update
              set(
                produce((state: PlayerState) => {
                  const targetPlaylist = state.playlists.find((p) => p.id === playlistId);
                  if (targetPlaylist) {
                    targetPlaylist.videoIds = targetPlaylist.videoIds.filter(id => id !== videoId);
                     if (state.activePlaylistId === playlistId) {
                         state.currentPlaylistVideos = state.currentPlaylistVideos.filter(v => v.id.videoId !== videoId);
                     }
                  }
                })
              );
         } catch (error) {
             console.error("Failed to remove video from playlist:", error);
         } finally {
              set(produce((state: PlayerState) => { delete state.playlistLoading[playlistId]; }));
         }
       },


       removeVideoFromCurrentPlaylist: async (videoId, playlistId) => {
          // This now calls the Firestore-aware remove function
          await get().removeVideoFromPlaylist(videoId, playlistId);

          // Update player state if the removed video was playing or in the queue
          set(produce((state: PlayerState) => {
              // Check if the video was in the current playback queue
              const removedIndex = state.currentPlaylist.findIndex(track => track.id.videoId === videoId);
              if (removedIndex !== -1) {
                  state.currentPlaylist = state.currentPlaylist.filter(track => track.id.videoId !== videoId);

                  // Adjust currentTrackIndex if necessary
                  if (state.currentTrackIndex === removedIndex) {
                      // If the removed track was the current one
                      if (state.currentPlaylist.length === 0) {
                          state.currentTrack = null;
                          state.currentTrackIndex = -1;
                          state.isPlaying = false;
                      } else {
                           // Move index, wrap if needed (ensure index stays within bounds)
                           state.currentTrackIndex = removedIndex % state.currentPlaylist.length;
                           state.currentTrack = state.currentPlaylist[state.currentTrackIndex];
                           // state.isPlaying remains unchanged or set based on preference
                      }
                  } else if (state.currentTrackIndex > removedIndex) {
                      state.currentTrackIndex--; // Adjust index if removed track was before current
                  }
              }
          }));
       },


      playTrack: (track, playlist, index) => {
         const { isShuffling } = get();
         const actualPlaylist = isShuffling ? shuffleArray(playlist) : playlist;
         const actualIndex = actualPlaylist.findIndex(t => t.id.videoId === track.id.videoId);

         set({
           currentTrack: track,
           currentPlaylist: actualPlaylist,
           currentTrackIndex: actualIndex !== -1 ? actualIndex : 0,
           isPlaying: true,
         });
      },

     playNext: () => {
          set(produce((state: PlayerState) => {
              if (!state.currentTrack || state.currentPlaylist.length === 0) return;

              const { currentTrackIndex, currentPlaylist, isRepeating } = state;
              let nextIndex = currentTrackIndex + 1;

              if (isRepeating && nextIndex >= currentPlaylist.length) {
                  nextIndex = 0;
              }

              if (nextIndex >= 0 && nextIndex < currentPlaylist.length) {
                  state.currentTrackIndex = nextIndex;
                  state.currentTrack = state.currentPlaylist[nextIndex];
                  state.isPlaying = true;
              } else {
                  state.isPlaying = false;
              }
          }));
      },

     playPrevious: () => {
         set(produce((state: PlayerState) => {
             if (!state.currentTrack || state.currentPlaylist.length === 0) return;
             const { currentTrackIndex, currentPlaylist, isRepeating } = state;
             let prevIndex = currentTrackIndex - 1;

             if (prevIndex < 0) {
                 if (isRepeating) {
                     prevIndex = currentPlaylist.length - 1;
                 } else {
                     // Stop or stay on first track
                     // For now, just stay
                      // Attempt to seek to 0 - This logic ideally belongs in the player component
                     // playerRef.current?.seekTo(0);
                     return;
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
                  const currentId = state.currentTrack?.id.videoId;
                 if (state.isShuffling) {
                     // Shuffle
                     state.currentPlaylist = shuffleArray(state.currentPlaylist);
                     const newIndex = state.currentPlaylist.findIndex(track => track.id.videoId === currentId);
                     state.currentTrackIndex = newIndex !== -1 ? newIndex : 0;
                 } else {
                     // Unshuffle - requires original order
                     // Fetch original order based on active context (search or playlist)
                     let originalOrder: PlayerTrackInfo[] = [];
                      if (state.activePlaylistId) {
                          const activePlaylist = state.playlists.find(p => p.id === state.activePlaylistId);
                          if (activePlaylist) {
                             originalOrder = activePlaylist.videoIds
                                 .map(id => state.playlistDetails[id])
                                 .filter((v): v is PlayerTrackInfo => !!v); // Map IDs to cached details
                          }
                      } else {
                          originalOrder = state.searchResults; // Assume search results are the original order
                      }

                      // Filter originalOrder to only include items currently in the shuffled list
                      const currentIdsSet = new Set(state.currentPlaylist.map(t => t.id.videoId));
                      state.currentPlaylist = originalOrder.filter(t => currentIdsSet.has(t.id.videoId));

                     // Find the new index of the current track
                     const newIndex = state.currentPlaylist.findIndex(track => track.id.videoId === currentId);
                     state.currentTrackIndex = newIndex !== -1 ? newIndex : 0;
                 }
             }
         }));
      },

       setActivePlaylist: (id) => {
          set({ activePlaylistId: id });
          if (id) {
              get().loadPlaylist(id); // Load videos when playlist becomes active
          } else {
               set({ currentPlaylistVideos: [] }); // Clear when switching to search/popular
          }
        },


       _hydratePlaylistVideos: (playlistId, videos) => {
          set(produce((state: PlayerState) => {
             videos.forEach(video => {
                  // Ensure video has necessary structure
                  if (video && video.id?.videoId && video.snippet) {
                     state.playlistDetails[video.id.videoId] = video;
                  } else {
                      console.warn("Attempted to hydrate invalid video data for playlist:", playlistId, video);
                  }
             });
             if (state.activePlaylistId === playlistId) {
                 state.currentPlaylistVideos = videos.filter(v => v && v.id?.videoId); // Ensure valid videos
             }
              state.playlistLoading[playlistId] = false;
          }));
       },

       loadPlaylist: async (id) => {
          const playlist = get().playlists.find(p => p.id === id);
          if (!playlist || playlist.userId !== get().userId) return; // Check ownership

           set(produce((state: PlayerState) => { state.playlistLoading[id] = true; }));

          // Get IDs already cached
          const cachedDetails = get().playlistDetails;
          const videoIdsToFetch = playlist.videoIds.filter(videoId => !cachedDetails[videoId]);

          try {
              let fetchedVideosMap: Record<string, PlayerTrackInfo> = {};
              if (videoIdsToFetch.length > 0) {
                 const detailsResult = await getYouTubeVideoDetailsByIds(videoIdsToFetch);
                 detailsResult.items.forEach(item => {
                    fetchedVideosMap[item.id] = {
                        kind: 'youtube#searchResult',
                        etag: item.etag,
                        id: { kind: 'youtube#video', videoId: item.id },
                        snippet: item.snippet,
                        details: item,
                    };
                 });
              }

               // Combine cached and fetched, maintaining original playlist order
               const allPlaylistVideos = playlist.videoIds.map(videoId => {
                    return cachedDetails[videoId] || fetchedVideosMap[videoId];
                }).filter((video): video is PlayerTrackInfo => Boolean(video));

               get()._hydratePlaylistVideos(id, allPlaylistVideos);

          } catch (error) {
              console.error(`Failed to load playlist ${id}:`, error);
              set(produce((state: PlayerState) => { state.playlistLoading[id] = false; }));
          }
       },

    }),
    {
      name: 'vibeverse-player-storage',
      storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
            // Only persist non-user-specific settings or non-sensitive data
            volume: state.volume,
            isMuted: state.isMuted,
            isRepeating: state.isRepeating,
            isShuffling: state.isShuffling,
             playlistDetails: state.playlistDetails, // Cache video details across sessions
             // DO NOT persist userId, playlists, etc. Fetch them based on auth state.
        }),
       onRehydrateStorage: (state) => {
         console.log("Hydration starting...");
         return (hydratedState, error) => {
           if (error) {
             console.error('Hydration error:', error);
           } else {
              console.log("Hydration complete.");
             // Potentially trigger initial fetches based on auth state *after* hydration
             // This is complex because auth state might not be ready yet.
             // It's often better to handle initial data fetching in the AuthProvider effect.
           }
         };
       },
    }
  )
);

// Initial fetch logic moved to AuthProvider useEffect to ensure auth state is ready
// if (typeof window !== 'undefined') {
//     const initialState = usePlayerStore.getState();
//     if (!initialState.userId && initialState.searchResults.length === 0 && initialState.playlists.length === 0 && !initialState.activePlaylistId) {
//        usePlayerStore.getState().fetchPopularVideos();
//     }
// }
