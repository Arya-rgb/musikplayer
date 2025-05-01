
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
  const { setUserId, fetchUserPlaylists, clearUserData } = usePlayerStore(); // Get actions from store

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
       console.log("Auth state changed:", firebaseUser?.uid); // Debug log
      if (firebaseUser) {
        setUser(firebaseUser);
        setUserId(firebaseUser.uid); // Set user ID in Zustand store
        await fetchUserPlaylists(firebaseUser.uid); // Fetch playlists for the logged-in user

        // Set a cookie for middleware detection (optional but can be helpful)
        // Note: Firebase automatically manages token refresh. This cookie is just a signal.
        try {
           const token = await firebaseUser.getIdToken();
           Cookies.set('firebaseIdToken', token, { expires: 1, path: '/' }); // Expires in 1 day, adjust as needed
        } catch (error) {
            console.error("Error getting ID token:", error);
             Cookies.remove('firebaseIdToken', { path: '/' });
        }

      } else {
        setUser(null);
        setUserId(null); // Clear user ID in Zustand store
        clearUserData(); // Clear other user-specific data like playlists
        Cookies.remove('firebaseIdToken', { path: '/' }); // Remove the cookie on sign out
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [setUserId, fetchUserPlaylists, clearUserData]); // Add store actions to dependency array

   const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      // Auth state listener will handle setting user to null and clearing store data
      // Cookies are removed by the listener as well
      console.log("User signed out successfully.");
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
