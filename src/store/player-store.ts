
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

// Define Firestore Playlist Structure - Renamed to Playlist for consistency
export interface Playlist {
  id?: string; // Firestore document ID, added after creation
  userId: string;
  name: string;
  createdAt: Timestamp | FieldValue; // Use Firestore Timestamp or FieldValue for server time
  videoIds: string[]; // Array of YouTube video IDs
}
// FieldValue type from Firestore for serverTimestamp
import type { FieldValue } from 'firebase/firestore';


// Extend the search result item for internal use
export type PlayerTrackInfo = YouTubeVideoSearchResultItem & { details?: YouTubeVideoDetailsItem };

interface PlayerState {
  userId: string | null; // Track the current user ID
  searchResults: PlayerTrackInfo[];
  playlists: Playlist[]; // Now mirrors Firestore data for the logged-in user
  currentTrack: PlayerTrackInfo | null;
  currentPlaylist: PlayerTrackInfo[]; // Current playback queue
  currentTrackIndex: number;
  activePlaylistId: string | null; // Firestore document ID of the active playlist being VIEWED
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  isRepeating: boolean;
  isShuffling: boolean;
  loading: boolean; // General loading state (search, popular)
  playlistLoading: Record<string, boolean>; // Loading state per playlist ID or action ('add', 'fetch', 'playlistId')
  playlistDetails: Record<string, PlayerTrackInfo>; // Cache for video details by ID
  currentPlaylistVideos: PlayerTrackInfo[]; // Videos currently loaded for the active playlist VIEW

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
  removeVideoFromCurrentPlaylist: (videoId: string, playlistId: string) => Promise<void>; // Removes from Firestore and updates view/player state
  playTrack: (track: PlayerTrackInfo, playlist: PlayerTrackInfo[], index: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  togglePlayPause: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  setActivePlaylist: (id: string | null) => void; // Sets the active playlist for VIEWING
  loadPlaylist: (id: string) => Promise<void>; // Fetches video details for a playlist
  _hydratePlaylistVideos: (playlistId: string, videos: PlayerTrackInfo[]) => void; // Internal helper
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
      userId: null,
      searchResults: [],
      playlists: [],
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

      clearUserData: () => set(produce((state: PlayerState) => {
         console.log("Clearing user data in Zustand store.");
         state.userId = null;
         state.playlists = [];
         state.activePlaylistId = null;
         state.currentPlaylistVideos = [];
         state.searchResults = []; // Clear search results as well
         // Reset player state completely on logout
         state.currentTrack = null;
         state.currentPlaylist = [];
         state.currentTrackIndex = -1;
         state.isPlaying = false;
         // Keep volume/mute/repeat/shuffle preferences or reset as desired
         // state.volume = 0.8;
         // state.isMuted = false;
         // state.isRepeating = false;
         // state.isShuffling = false;

         // Optionally fetch popular videos if logged out
         get().fetchPopularVideos();
       })),

      fetchUserPlaylists: async (userId) => {
         if (!userId) {
             console.log("fetchUserPlaylists called with no userId, clearing playlists.");
             set({ playlists: [] });
             return;
         }
         console.log(`Fetching playlists for user: ${userId}`);
         set(produce((state: PlayerState) => { state.playlistLoading['fetch'] = true; }));
         try {
             const q = query(playlistsCollection, where('userId', '==', userId));
             const querySnapshot = await getDocs(q);
             const userPlaylists: Playlist[] = [];
             querySnapshot.forEach((doc) => {
                 // Ensure createdAt is handled correctly (might be null initially or a server timestamp placeholder)
                 const data = doc.data();
                 userPlaylists.push({
                     id: doc.id,
                     userId: data.userId,
                     name: data.name,
                     createdAt: data.createdAt || Timestamp.now(), // Use now() as fallback if needed
                     videoIds: data.videoIds || [],
                 } as Playlist);
             });
              // Sort playlists by name
             userPlaylists.sort((a, b) => a.name.localeCompare(b.name));
             console.log(`Fetched ${userPlaylists.length} playlists.`);
             set({ playlists: userPlaylists });
         } catch (error) {
             console.error("Failed to fetch user playlists:", error);
             set({ playlists: [] }); // Set empty on error
         } finally {
             set(produce((state: PlayerState) => { delete state.playlistLoading['fetch']; }));
         }
      },


      searchVideos: async (query) => {
        console.log(`Searching videos for query: ${query}`);
        set({ loading: true, activePlaylistId: null, currentPlaylistVideos: [] });
        try {
          const results = await searchYouTubeVideos(query, 20);
          const videos = (results.items || []).filter(item => item.id?.kind === 'youtube#video' && item.id?.videoId);
          console.log(`Found ${videos.length} search results.`);
          set({ searchResults: videos, loading: false });
        } catch (error) {
          console.error("Failed to search videos:", error);
          set({ searchResults: [], loading: false });
        }
      },

      fetchPopularVideos: async () => {
         console.log("Fetching popular videos...");
         set({ loading: true, activePlaylistId: null, currentPlaylistVideos: [] });
         try {
           const results = await getPopularMusicVideos(20); // Fetch 20 popular videos
           const videos = (results.items || []).filter(item => item.id?.kind === 'youtube#video' && item.id?.videoId);
           console.log(`Fetched ${videos.length} popular videos.`);
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
             return;
         }
         console.log(`Adding playlist "${name}" for user: ${userId}`);
         const newPlaylistData: Omit<Playlist, 'id'> = {
             userId,
             name,
             createdAt: serverTimestamp(), // Use server timestamp for actual save
             videoIds: [],
         };
          set(produce((state: PlayerState) => { state.playlistLoading['add'] = true; }));
         try {
             const docRef = await addDoc(playlistsCollection, newPlaylistData);
             console.log(`Playlist added with ID: ${docRef.id}`);
             // Optimistic update with client-generated temporary ID and timestamp
             const optimisticPlaylist: Playlist = {
                 ...newPlaylistData,
                 id: docRef.id, // Use the real ID now
                 createdAt: Timestamp.now() // Use client time for UI
             };
             set(
               produce((state: PlayerState) => {
                 state.playlists.push(optimisticPlaylist);
                 state.playlists.sort((a, b) => a.name.localeCompare(b.name));
               })
             );
             // Optionally re-fetch to get server timestamp, but optimistic is usually enough
             // await get().fetchUserPlaylists(userId);
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
         const playlistToRemove = get().playlists.find(p => p.id === id);
          if (!playlistToRemove || playlistToRemove.userId !== userId) {
             console.error("Cannot remove playlist: Permission denied or playlist not found.");
             return;
          }
         console.log(`Removing playlist "${playlistToRemove.name}" (ID: ${id})`);
         set(produce((state: PlayerState) => { state.playlistLoading[id] = true; }));
         try {
             const playlistDocRef = doc(db, 'playlists', id);
             await deleteDoc(playlistDocRef);
             console.log(`Playlist ${id} deleted from Firestore.`);
             // Optimistic UI update
             set(
               produce((state: PlayerState) => {
                 state.playlists = state.playlists.filter((p) => p.id !== id);
                 // If the deleted playlist was active, switch view to search results
                 if (state.activePlaylistId === id) {
                   console.log("Active playlist was deleted, switching to search results view.");
                   state.activePlaylistId = null;
                   state.currentPlaylistVideos = []; // Clear the view
                 }
                 // If the deleted playlist was the current playback queue, stop playback
                 if (state.currentPlaylist.length > 0 && state.currentPlaylist[0]?.snippet?.channelId === `playlist_${id}`) { // Need a way to identify playlist source
                      console.log("Current playback queue was from the deleted playlist, stopping player.");
                      state.currentTrack = null;
                      state.currentPlaylist = [];
                      state.currentTrackIndex = -1;
                      state.isPlaying = false;
                 }
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
         if (!userId) {
             console.error("Cannot add video: User not logged in.");
             return;
         }
         const playlist = get().playlists.find(p => p.id === playlistId);
         if (!playlist || playlist.userId !== userId) {
             console.error("Cannot add video: Playlist not found or permission denied.");
             return;
         }
         if (!video || !video.id?.videoId) {
             console.error("Cannot add video: Invalid video data.");
             return;
         }

         const videoId = video.id.videoId;

         if (playlist.videoIds.includes(videoId)) {
              console.log(`Video ${videoId} already in playlist ${playlistId}.`);
              return; // Already exists
         }

         console.log(`Adding video ${videoId} to playlist ${playlistId}`);
         set(produce((state: PlayerState) => {
             state.playlistLoading[playlistId] = true;
             // Also use a specific key for the video add operation if needed
             state.playlistLoading[`add_${playlistId}_${videoId}`] = true;
         }));

         try {
             const playlistDocRef = doc(db, 'playlists', playlistId);
             await updateDoc(playlistDocRef, {
                 videoIds: arrayUnion(videoId)
             });
             console.log(`Video ${videoId} added to Firestore playlist ${playlistId}.`);

             // Optimistic UI update
             set(
                produce((state: PlayerState) => {
                  const targetPlaylist = state.playlists.find((p) => p.id === playlistId);
                  if (targetPlaylist && !targetPlaylist.videoIds.includes(videoId)) {
                     targetPlaylist.videoIds.push(videoId);
                     // Cache video details if not already present
                     if (!state.playlistDetails[videoId]) {
                        state.playlistDetails[videoId] = video;
                     }
                     // If the updated playlist is the one being viewed, add the video to the view
                     if (state.activePlaylistId === playlistId) {
                        // Ensure video details are available before adding
                        const videoWithDetails = state.playlistDetails[videoId] || video;
                        // Avoid duplicates in the view (shouldn't happen with check above, but belt-and-suspenders)
                        if (!state.currentPlaylistVideos.some(v => v.id.videoId === videoId)) {
                            state.currentPlaylistVideos.push(videoWithDetails);
                        }
                     }
                  }
                })
             );
             // Optionally reload full details after update? Maybe not necessary.
             // await get().loadPlaylist(playlistId);
          } catch (error) {
              console.error("Failed to add video to playlist:", error);
          } finally {
                set(produce((state: PlayerState) => {
                    delete state.playlistLoading[playlistId];
                    delete state.playlistLoading[`add_${playlistId}_${videoId}`];
                }));
          }
       },


       removeVideoFromPlaylist: async (videoId, playlistId) => {
         const userId = get().userId;
         if (!userId) {
             console.error("Cannot remove video: User not logged in.");
             return;
         }
         const playlist = get().playlists.find(p => p.id === playlistId);
         if (!playlist || playlist.userId !== userId) {
             console.error("Cannot remove video: Playlist not found or permission denied.");
             return;
         }
         if (!playlist.videoIds.includes(videoId)) {
             console.log(`Video ${videoId} not found in playlist ${playlistId}.`);
             return; // Video not in playlist
         }

         console.log(`Removing video ${videoId} from playlist ${playlistId}`);
         set(produce((state: PlayerState) => {
             state.playlistLoading[playlistId] = true;
             state.playlistLoading[`remove_${playlistId}_${videoId}`] = true;
          }));

         try {
             const playlistDocRef = doc(db, 'playlists', playlistId);
             await updateDoc(playlistDocRef, {
                 videoIds: arrayRemove(videoId)
             });
             console.log(`Video ${videoId} removed from Firestore playlist ${playlistId}.`);

             // Optimistic UI update
             set(
                produce((state: PlayerState) => {
                  const targetPlaylist = state.playlists.find((p) => p.id === playlistId);
                  if (targetPlaylist) {
                    targetPlaylist.videoIds = targetPlaylist.videoIds.filter(id => id !== videoId);
                     // If the updated playlist is the one being viewed, remove the video from the view
                     if (state.activePlaylistId === playlistId) {
                         state.currentPlaylistVideos = state.currentPlaylistVideos.filter(v => v.id.videoId !== videoId);
                     }
                  }
                })
             );

         } catch (error) {
             console.error("Failed to remove video from playlist:", error);
         } finally {
              set(produce((state: PlayerState) => {
                  delete state.playlistLoading[playlistId];
                  delete state.playlistLoading[`remove_${playlistId}_${videoId}`];
              }));
         }
       },


       removeVideoFromCurrentPlaylist: async (videoId, playlistId) => {
          console.log(`Request to remove video ${videoId} from currently viewed playlist ${playlistId}`);
          // 1. Remove from Firestore and update internal playlist state
          await get().removeVideoFromPlaylist(videoId, playlistId);

          // 2. Update player state if the removed video was playing or in the current playback queue
          set(produce((state: PlayerState) => {
              // Check if the video was in the current playback queue
              const removedIndex = state.currentPlaylist.findIndex(track => track.id.videoId === videoId);

              if (removedIndex !== -1) {
                  console.log(`Video ${videoId} was in the current playback queue at index ${removedIndex}. Removing...`);
                  const newPlaylist = state.currentPlaylist.filter(track => track.id.videoId !== videoId);
                  state.currentPlaylist = newPlaylist;

                  // Adjust currentTrackIndex if necessary
                  if (state.currentTrackIndex === removedIndex) {
                      console.log("Removed video was the currently playing track.");
                      if (newPlaylist.length === 0) {
                          console.log("Playback queue is now empty. Stopping player.");
                          state.currentTrack = null;
                          state.currentTrackIndex = -1;
                          state.isPlaying = false;
                      } else {
                           // Play the next track in the modified queue
                           state.currentTrackIndex = removedIndex % newPlaylist.length; // Wrap index
                           state.currentTrack = newPlaylist[state.currentTrackIndex];
                           console.log(`Playing next track: ${state.currentTrack.snippet.title} at index ${state.currentTrackIndex}`);
                           // state.isPlaying remains true (or set based on preference, usually true)
                      }
                  } else if (state.currentTrackIndex > removedIndex) {
                      state.currentTrackIndex--; // Adjust index if removed track was before current
                      console.log(`Adjusted current track index to ${state.currentTrackIndex}`);
                  }
              } else {
                   console.log(`Video ${videoId} was not in the current playback queue.`);
              }
          }));
       },


      playTrack: (track, playlist, index) => {
         console.log(`Playing track: "${track.snippet.title}" at index ${index}`);
         const { isShuffling } = get();
         // Use the provided playlist directly, shuffling is handled elsewhere if active
         const actualPlaylist = playlist; // isShuffling ? shuffleArray(playlist) : playlist;
         // Find the index in the *potentially shuffled* list passed in
         const actualIndex = actualPlaylist.findIndex(t => t.id.videoId === track.id.videoId);

          console.log(`Playlist for playback has ${actualPlaylist.length} tracks. ${isShuffling ? '(Shuffled)' : '(Original Order)'}`);
          console.log(`Actual index in playback list: ${actualIndex}`);

         set({
           currentTrack: track,
           currentPlaylist: actualPlaylist, // Set the playback queue
           currentTrackIndex: actualIndex !== -1 ? actualIndex : 0, // Use found index or default to 0
           isPlaying: true,
         });
      },

     playNext: () => {
          set(produce((state: PlayerState) => {
              if (!state.currentTrack || state.currentPlaylist.length === 0) {
                   console.log("PlayNext: No current track or playlist.");
                   state.isPlaying = false;
                   return;
              }

              const { currentTrackIndex, currentPlaylist, isRepeating } = state;
              let nextIndex = currentTrackIndex + 1;
              console.log(`PlayNext: Current index ${currentTrackIndex}, Playlist length ${currentPlaylist.length}, Repeating ${isRepeating}`);

              if (nextIndex >= currentPlaylist.length) {
                   console.log("PlayNext: Reached end of playlist.");
                  if (isRepeating) {
                      nextIndex = 0;
                      console.log("PlayNext: Repeating playlist, setting index to 0.");
                  } else {
                       console.log("PlayNext: Not repeating, stopping playback.");
                       state.isPlaying = false;
                       // Optionally: Reset track/index or keep last track paused
                       // state.currentTrack = null;
                       // state.currentTrackIndex = -1;
                       return; // Stop further execution
                  }
              }

               if (nextIndex >= 0 && nextIndex < currentPlaylist.length) {
                   state.currentTrackIndex = nextIndex;
                   state.currentTrack = state.currentPlaylist[nextIndex];
                   state.isPlaying = true;
                   console.log(`PlayNext: Playing track "${state.currentTrack.snippet.title}" at index ${nextIndex}`);
               } else {
                   // This case should ideally not be reached due to the logic above
                   console.log("PlayNext: Calculated nextIndex is out of bounds, stopping playback.");
                   state.isPlaying = false;
               }
          }));
      },

     playPrevious: () => {
         set(produce((state: PlayerState) => {
             if (!state.currentTrack || state.currentPlaylist.length === 0) {
                 console.log("PlayPrevious: No current track or playlist.");
                 state.isPlaying = false;
                 return;
             }
             const { currentTrackIndex, currentPlaylist, isRepeating } = state;
             let prevIndex = currentTrackIndex - 1;
              console.log(`PlayPrevious: Current index ${currentTrackIndex}, Playlist length ${currentPlaylist.length}, Repeating ${isRepeating}`);

             if (prevIndex < 0) {
                  console.log("PlayPrevious: Reached start of playlist.");
                 if (isRepeating) {
                     prevIndex = currentPlaylist.length - 1; // Wrap around
                     console.log(`PlayPrevious: Repeating playlist, wrapping to index ${prevIndex}.`);
                 } else {
                     // Option 1: Stop playback
                     // state.isPlaying = false;
                     // return;

                     // Option 2: Seek to 0 and stay on first track (player component should handle seek)
                     console.log("PlayPrevious: Not repeating, staying on first track.");
                     // Trigger a seek to 0 in the player component - Zustand shouldn't do this directly.
                     // For now, just don't change the track.
                     return;
                 }
             }
             state.currentTrackIndex = prevIndex;
             state.currentTrack = state.currentPlaylist[prevIndex];
             state.isPlaying = true;
              console.log(`PlayPrevious: Playing track "${state.currentTrack.snippet.title}" at index ${prevIndex}`);
         }));
     },

      togglePlayPause: () => set(produce((state: PlayerState) => {
          if (state.currentTrack) { // Only toggle if there's a track
             state.isPlaying = !state.isPlaying;
             console.log(`TogglePlayPause: isPlaying set to ${state.isPlaying}`);
          } else {
              console.log("TogglePlayPause: No track to play/pause.");
          }
      })),
      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
      toggleRepeat: () => set((state) => {
           console.log(`ToggleRepeat: Repeating set to ${!state.isRepeating}`);
           return { isRepeating: !state.isRepeating };
      }),

      toggleShuffle: () => {
         set(produce((state: PlayerState) => {
             const wasShuffling = state.isShuffling;
             state.isShuffling = !wasShuffling;
             console.log(`ToggleShuffle: Shuffling set to ${state.isShuffling}`);

             if (state.currentPlaylist.length > 0 && state.currentTrack) {
                  const currentId = state.currentTrack.id.videoId;
                  let basePlaylist: PlayerTrackInfo[] = [];

                  // Determine the base (unshuffled) playlist order
                  if (state.activePlaylistId) {
                      // Get order from the viewed playlist's details
                      const activePlaylist = state.playlists.find(p => p.id === state.activePlaylistId);
                      if (activePlaylist) {
                           basePlaylist = activePlaylist.videoIds
                              .map(id => state.playlistDetails[id])
                              .filter((v): v is PlayerTrackInfo => !!v);
                          console.log(`ToggleShuffle: Using active playlist "${activePlaylist.name}" as base (${basePlaylist.length} videos).`);
                      } else {
                           console.warn("ToggleShuffle: Active playlist ID set, but playlist not found in state.");
                           basePlaylist = [...state.currentPlaylistVideos]; // Fallback to current view
                      }
                  } else {
                      // Use search results as the base order
                      basePlaylist = [...state.searchResults];
                       console.log(`ToggleShuffle: Using search results as base (${basePlaylist.length} videos).`);
                  }

                  // Filter basePlaylist to only include tracks currently in the playback queue
                  // This handles cases where the playback queue might be a subset (e.g., user played from search, then shuffled)
                  const currentPlaybackIds = new Set(state.currentPlaylist.map(t => t.id.videoId));
                  basePlaylist = basePlaylist.filter(t => currentPlaybackIds.has(t.id.videoId));
                  console.log(`ToggleShuffle: Filtered base playlist to match current playback queue (${basePlaylist.length} videos).`);


                 if (state.isShuffling) {
                     // Shuffle the base playlist to create the new playback queue
                     state.currentPlaylist = shuffleArray(basePlaylist);
                     console.log("ToggleShuffle: Shuffled playlist.");
                 } else {
                     // Unshuffle: Restore the order from the base playlist
                     state.currentPlaylist = basePlaylist;
                     console.log("ToggleShuffle: Restored original order.");
                 }

                 // Find the new index of the currently playing track
                 const newIndex = state.currentPlaylist.findIndex(track => track.id.videoId === currentId);
                 state.currentTrackIndex = newIndex !== -1 ? newIndex : 0;
                  console.log(`ToggleShuffle: New index for current track "${state.currentTrack.snippet.title}" is ${state.currentTrackIndex}.`);

             } else {
                  console.log("ToggleShuffle: No current playlist or track, nothing to shuffle/unshuffle.");
             }
         }));
      },

       setActivePlaylist: (id) => {
          console.log(`Setting active playlist view to: ${id ?? 'Search Results'}`);
          // Only change if the ID is different
          if (get().activePlaylistId !== id) {
             set({ activePlaylistId: id, currentPlaylistVideos: [], searchResults: id === null ? get().searchResults : [] }); // Clear view/search when switching
             if (id) {
                 console.log(`Loading details for playlist: ${id}`);
                 get().loadPlaylist(id); // Load videos when playlist becomes active for viewing
             } else {
                 // If switching back to search/popular, potentially re-fetch popular if search is empty
                 if (get().searchResults.length === 0) {
                    console.log("Switched to Search/Popular view with no results, fetching popular.");
                    // get().fetchPopularVideos(); // Decide if this should happen automatically
                 }
             }
          } else {
              console.log(`Playlist ${id} is already the active view.`);
          }
        },


       _hydratePlaylistVideos: (playlistId, videos) => {
          set(produce((state: PlayerState) => {
             console.log(`Hydrating ${videos.length} videos for playlist ${playlistId}.`);
             videos.forEach(video => {
                  if (video && video.id?.videoId && video.snippet) {
                     // Only update cache if it doesn't exist or maybe if newer? For now, just add if missing.
                     if (!state.playlistDetails[video.id.videoId]) {
                        state.playlistDetails[video.id.videoId] = video;
                     }
                  } else {
                      console.warn("Attempted to hydrate invalid video data for playlist:", playlistId, video);
                  }
             });
             // IMPORTANT: Only update currentPlaylistVideos if the hydrated playlist is STILL the active one
             if (state.activePlaylistId === playlistId) {
                 state.currentPlaylistVideos = videos.filter(v => v && v.id?.videoId); // Ensure valid videos
                  console.log(`Updated currentPlaylistVideos for active playlist ${playlistId}.`);
             }
             delete state.playlistLoading[playlistId]; // Mark loading as complete for this playlist
          }));
       },

       loadPlaylist: async (id) => {
          const playlist = get().playlists.find(p => p.id === id);
          if (!playlist || playlist.userId !== get().userId) {
              console.error(`loadPlaylist: Playlist ${id} not found or user mismatch.`);
              set(produce((state: PlayerState) => { delete state.playlistLoading[id]; })); // Clear loading state
              return;
          }

          console.log(`Loading details for playlist: ${id} (${playlist.videoIds.length} videos)`);
          set(produce((state: PlayerState) => { state.playlistLoading[id] = true; }));

          const cachedDetails = get().playlistDetails;
          const videoIdsToFetch = playlist.videoIds.filter(videoId => !cachedDetails[videoId]);
          console.log(`Need to fetch details for ${videoIdsToFetch.length} videos.`);

          try {
              let fetchedVideosMap: Record<string, PlayerTrackInfo> = {};
              if (videoIdsToFetch.length > 0) {
                 console.log(`Fetching details for IDs: ${videoIdsToFetch.join(', ')}`);
                 const detailsResult = await getYouTubeVideoDetailsByIds(videoIdsToFetch);
                 console.log(`Fetched details for ${detailsResult.items.length} videos from API.`);
                 detailsResult.items.forEach(item => {
                    // Create PlayerTrackInfo structure from details
                    fetchedVideosMap[item.id] = {
                        kind: 'youtube#searchResult', // Mimic structure
                        etag: item.etag,
                        id: { kind: 'youtube#video', videoId: item.id },
                        snippet: item.snippet,
                        details: item, // Keep full details if needed later
                    };
                 });
              }

               // Combine cached and fetched, maintaining original playlist order from videoIds
               const allPlaylistVideos = playlist.videoIds.map(videoId => {
                    const video = cachedDetails[videoId] || fetchedVideosMap[videoId];
                    if (!video) {
                         console.warn(`Video details for ID ${videoId} not found after fetch/cache check.`);
                    }
                    return video;
                }).filter((video): video is PlayerTrackInfo => Boolean(video)); // Filter out any null/undefined

               console.log(`Total videos with details for playlist ${id}: ${allPlaylistVideos.length}`);
               get()._hydratePlaylistVideos(id, allPlaylistVideos);

          } catch (error) {
              console.error(`Failed to load playlist ${id}:`, error);
              set(produce((state: PlayerState) => { delete state.playlistLoading[id]; }));
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
            // DO NOT persist userId, playlists, currentTrack, etc. Fetch them based on auth state.
        }),
       onRehydrateStorage: (state) => {
         console.log("Hydration from localStorage starting...");
         return (hydratedState, error) => {
           if (error) {
             console.error('Hydration error:', error);
             // Handle potential errors, e.g., clear storage
             // localStorage.removeItem('vibeverse-player-storage');
           } else {
              console.log("Hydration complete. State loaded:", hydratedState);
             // Trigger initial popular video fetch AFTER hydration if needed
              if (typeof window !== 'undefined') {
                  // Use timeout to ensure hydration completes and auth state might be ready
                  setTimeout(() => {
                      const currentState = usePlayerStore.getState();
                      if (!currentState.userId && currentState.searchResults.length === 0 && !currentState.activePlaylistId && !currentState.loading) {
                           console.log("Initial state after hydration: No user, no results. Fetching popular videos.");
                           currentState.fetchPopularVideos();
                      }
                  }, 0);
              }
           }
         };
       },
    }
  )
);

// Initial fetch logic moved to onRehydrateStorage callback
```