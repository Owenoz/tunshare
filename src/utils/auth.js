// Firebase Authentication wrapper for TuneShare
// Using Firebase Web SDK

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

// Import Firebase services - direct import
import { auth, db } from './firebase';

// Current user cache
let currentUser = null;
let authListeners = [];

// ==================== AUTH STATE ====================

// Listen to auth state changes
export const onAuthChange = (callback) => {
  if (!auth) {
    console.error('Firebase auth not initialized');
    callback(null);
    return () => {};
  }
  
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          currentUser = { uid: user.uid, ...userDoc.data() };
        } else {
          // Check if this is admin email
          const isAdminEmail = user.email?.toLowerCase() === 'admin@admin.com';
          
          currentUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'User',
            username: user.email?.split('@')[0] || 'user',
            role: isAdminEmail ? 'admin' : 'user',
            avatar: null,
            bio: isAdminEmail ? 'Admin account' : '',
            followers: [],
            following: [],
            createdAt: new Date().toISOString()
          };
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        currentUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          role: 'user'
        };
      }
    } else {
      currentUser = null;
    }
    callback(currentUser);
  });
  
  return unsubscribe;
};

// Get current user
export const getCurrentAuthUser = () => {
  return currentUser;
};

// ==================== REGISTRATION ====================

// Register a new user
export const registerUser = async (email, password, username, displayName) => {
  if (!auth || !db) {
    return { error: 'Firebase not initialized. Please restart the app.' };
  }
  
  try {
    // Check if username is taken
    const usernameQuery = await getDoc(doc(db, "usernames", username.toLowerCase()));
    if (usernameQuery.exists()) {
      return { error: 'Username already taken' };
    }

    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, {
      displayName: displayName || username
    });

    // Check if this is admin email
    const isAdminEmail = email.toLowerCase() === 'admin@admin.com';

    // Create user document in Firestore
    const newUser = {
      uid: user.uid,
      email: user.email,
      username: username.toLowerCase(),
      displayName: displayName || username,
      role: isAdminEmail ? 'admin' : 'user',
      avatar: null,
      bio: isAdminEmail ? 'Admin account' : '',
      followers: [],
      following: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Save user to Firestore
    await setDoc(doc(db, "users", user.uid), newUser);
    
    // Save username mapping
    await setDoc(doc(db, "usernames", username.toLowerCase()), {
      uid: user.uid,
      username: username.toLowerCase()
    });

    currentUser = newUser;
    return { user: { uid: user.uid, ...newUser } };
  } catch (error) {
    console.error('Error registering user:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      return { error: 'Email already registered' };
    }
    if (error.code === 'auth/weak-password') {
      return { error: 'Password should be at least 6 characters' };
    }
    if (error.code === 'auth/invalid-email') {
      return { error: 'Invalid email address' };
    }
    
    return { error: 'Failed to register: ' + error.message };
  }
};

// ==================== LOGIN ====================

// Login user
export const loginUser = async (email, password) => {
  if (!auth || !db) {
    return { error: 'Firebase not initialized. Please restart the app.' };
  }
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get user data from Firestore
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        currentUser = { uid: user.uid, ...userDoc.data() };
        return { user: currentUser };
      }
    } catch (firestoreError) {
      console.log('Firestore error, using basic user data');
    }
    
    // Check if this is admin email
    const isAdminEmail = user.email?.toLowerCase() === 'admin@admin.com';
    
    currentUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      username: user.email?.split('@')[0] || 'user',
      role: isAdminEmail ? 'admin' : 'user',
      avatar: null,
      bio: isAdminEmail ? 'Admin account' : '',
      followers: [],
      following: []
    };
    
    return { user: currentUser };
  } catch (error) {
    console.error('Error logging in:', error);
    
    if (error.code === 'auth/invalid-email') {
      return { error: 'Invalid email address' };
    }
    if (error.code === 'auth/user-not-found') {
      return { error: 'No user found with this email' };
    }
    if (error.code === 'auth/wrong-password') {
      return { error: 'Invalid password' };
    }
    if (error.code === 'auth/network-request-failed') {
      return { error: 'Network error. Please check your connection.' };
    }
    
    return { error: 'Failed to login: ' + error.message };
  }
};

// ==================== LOGOUT ====================

// Logout user
export const logoutUser = async () => {
  if (!auth) {
    console.error('Firebase auth not initialized');
    throw new Error('Firebase auth not initialized. Please restart the app.');
  }
  
  try {
    await signOut(auth);
    currentUser = null;
    console.log('User logged out successfully');
    return true;
  } catch (error) {
    console.error('Error logging out:', error);
    throw new Error('Failed to logout: ' + error.message);
  }
};

// ==================== PASSWORD RESET ====================

// Send password reset email
export const resetPassword = async (email) => {
  if (!auth) {
    return { error: 'Firebase not initialized' };
  }
  
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Error sending reset email:', error);
    
    if (error.code === 'auth/invalid-email') {
      return { error: 'Invalid email address' };
    }
    if (error.code === 'auth/user-not-found') {
      return { error: 'No user found with this email' };
    }
    
    return { error: 'Failed to send reset email' };
  }
};

// ==================== PROFILE UPDATE ====================

// Update user profile
export const updateUserProfile = async (userId, updates) => {
  if (!db) {
    return { error: 'Firebase not initialized' };
  }
  
  try {
    const userRef = doc(db, "users", userId);
    
    if (updates.username) {
      const usernameQuery = await getDoc(doc(db, "usernames", updates.username.toLowerCase()));
      if (usernameQuery.exists() && usernameQuery.data().uid !== userId) {
        return { error: 'Username already taken' };
      }
    }

    await setDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp()
    }, { merge: true });

    if (updates.username && updates.username !== currentUser?.username) {
      await setDoc(doc(db, "usernames", updates.username.toLowerCase()), {
        uid: userId,
        username: updates.username.toLowerCase()
      });
    }

    currentUser = { ...currentUser, ...updates };
    
    return { user: currentUser };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { error: 'Failed to update profile' };
  }
};

// ==================== UTILITY FUNCTIONS ====================

// Get user by ID
export const getUserById = async (userId) => {
  if (!db) {
    return null;
  }
  
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
};

// Get user by username
export const getUserByUsername = async (username) => {
  if (!db) {
    return null;
  }
  
  try {
    const usernameDoc = await getDoc(doc(db, "usernames", username.toLowerCase()));
    if (usernameDoc.exists()) {
      const uid = usernameDoc.data().uid;
      return await getUserById(uid);
    }
    return null;
  } catch (error) {
    console.error('Error getting user by username:', error);
    return null;
  }
};

