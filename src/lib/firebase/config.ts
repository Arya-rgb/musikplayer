
// src/lib/firebase/config.ts

// Note: Ensure these environment variables are set in your .env.local file
// Example:
// NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
// NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
// NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
// NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
// NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
// NEXT_PUBLIC_FIREBASE_APP_ID=1:...:web:...

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Basic validation to ensure config is loaded
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  // Avoid logging sensitive info like the key itself in warnings
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    console.warn('Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is missing in .env.local');
  }
   if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.warn('Firebase Project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is missing in .env.local');
  }
  console.warn(
    'Firebase configuration might be incomplete. Please check your environment variables in .env.local.'
  );
}
