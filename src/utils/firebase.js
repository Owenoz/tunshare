// Firebase configuration for TuneShare app
// Using Firebase Web SDK - works with Expo

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCuNy-sFCP-x-yjXuvWNpryK2hj3WVqgLY",
  authDomain: "teens-kulture.firebaseapp.com",
  projectId: "teens-kulture",
  storageBucket: "teens-kulture.firebasestorage.app",
  messagingSenderId: "648946624476",
  appId: "1:648946624476:web:e916334dc628adf37e9119"
};

// Initialize Firebase
let app;
let auth;
let db;
let storage;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
}

// Export for use in other modules
export { app, auth, db, storage };
export default { app, auth, db, storage };

