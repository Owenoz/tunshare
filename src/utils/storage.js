// Storage utilities for TuneShare - Firebase powered
// Re-export Firebase functions

// Auth functions
export { 
  onAuthChange, 
  getCurrentAuthUser, 
  registerUser, 
  loginUser, 
  logoutUser, 
  resetPassword, 
  updateUserProfile, 
  getUserById, 
  getUserByUsername 
} from './auth';

// Database functions
export { 
  getAllPosts, 
  getUserPosts, 
  createPost, 
  getPostById, 
  toggleLike, 
  addComment, 
  getComments, 
  toggleFollow, 
  searchUsers, 
  getFeed 
} from './db';

// Storage functions
export { 
  uploadMedia, 
  uploadAvatar, 
  deleteMedia, 
  deleteAvatar, 
  getMediaURL, 
  MEDIA_TYPES 
} from './firebaseStorage';

// Legacy compatibility - getCurrentUser is alias
export { getCurrentAuthUser as getCurrentUser } from './auth';

// Legacy functions
export const seedDemoData = async () => {
  console.log('Demo data handled by Firestore');
  return true;
};

export const getAllUsers = async () => {
  console.log('Use Firestore queries for users');
  return [];
};

