
// src/context/auth-context.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { usePlayerStore } from '@/store/player-store'; // Import Zustand store
import Cookies from 'js-cookie'; // Using js-cookie for simplicity

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  // Destructure actions needed from the store
  const { setUserId, fetchUserPlaylists, clearUserData, searchResults } = usePlayerStore((state) => ({
      setUserId: state.setUserId,
      fetchUserPlaylists: state.fetchUserPlaylists,
      clearUserData: state.clearUserData,
      searchResults: state.searchResults, // Get current search results
  }));

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
       console.log("Auth state changed:", firebaseUser?.uid); // Debug log
      const currentUserId = usePlayerStore.getState().userId; // Get current userId from store directly

      if (firebaseUser) {
        setUser(firebaseUser);
        setUserId(firebaseUser.uid); // Set user ID in Zustand store
        // Fetch playlists only if userId changes from null/different to this user's ID
        if (currentUserId !== firebaseUser.uid) {
           console.log(`User changed to ${firebaseUser.uid}. Fetching playlists.`);
           await fetchUserPlaylists(firebaseUser.uid); // Fetch playlists for the logged-in user
        } else {
            console.log(`User ${firebaseUser.uid} already logged in, playlists likely loaded.`);
        }

        // Set a cookie for middleware detection (though middleware is simpler now)
        try {
           const token = await firebaseUser.getIdToken();
           // Setting cookie path to '/'
           Cookies.set('firebaseIdToken', token, { expires: 1, path: '/' });
        } catch (error) {
            console.error("Error getting ID token:", error);
             Cookies.remove('firebaseIdToken', { path: '/' });
        }

      } else {
        // User is signed out
        if (currentUserId !== null) { // Only clear if a user *was* logged in
            console.log("User logged out. Clearing user data.");
            setUser(null);
            setUserId(null); // Clear user ID in Zustand store
            clearUserData(); // Clear other user-specific data like playlists
        } else {
             console.log("Auth state changed to null, but no user was previously logged in store.");
             // Ensure popular videos are loaded if search results are empty (initial load or after logout)
              if (searchResults.length === 0 && !usePlayerStore.getState().loading) {
                 console.log("Fetching popular videos on initial load/logout.");
                 usePlayerStore.getState().fetchPopularVideos();
              }
        }
        Cookies.remove('firebaseIdToken', { path: '/' }); // Remove the cookie on sign out
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [setUserId, fetchUserPlaylists, clearUserData, searchResults]); // Add store actions/state to dependency array

   const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      // Auth state listener will handle setting user to null and clearing store data
      // Cookies are removed by the listener as well
      console.log("User signed out successfully via signOut function.");
      // Force a reload after sign out to ensure clean state and UI update
      // Removed redirect to /login, user stays on current page but UI updates
      window.location.reload();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };


  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

