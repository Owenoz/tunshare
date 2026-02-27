// Firebase Firestore database wrapper for TuneShare
// Using Firebase Web SDK

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";

// Get db instance
let db;
try {
  const firebase = require('./firebase');
  db = firebase.db;
} catch (error) {
  console.error('Error loading Firestore:', error);
}

// ==================== POSTS ====================

// Get all posts (feed) - newest first
export const getAllPosts = async () => {
  if (!db) {
    console.error('Firestore not initialized');
    return [];
  }
  
  try {
    // Try with ordering first
    const postsQuery = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(100)
    );
    
    const querySnapshot = await getDocs(postsQuery);
    const posts = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      });
    });
    
    return posts;
  } catch (error) {
    console.error('Error getting posts with order, trying without:', error);
    
    // If ordering fails (e.g., missing index), try without order
    try {
      const simpleQuery = query(
        collection(db, "posts"),
        limit(100)
      );
      
      const querySnapshot = await getDocs(simpleQuery);
      const posts = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        posts.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });
      
      // Sort by createdAt manually
      posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return posts;
    } catch (fallbackError) {
      console.error('Error getting posts (fallback):', fallbackError);
      return [];
    }
  }
};

// Get posts by user
export const getUserPosts = async (userId) => {
  if (!db) return [];
  
  try {
    const postsQuery = query(
      collection(db, "posts"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(postsQuery);
    const posts = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      });
    });
    
    return posts;
  } catch (error) {
    console.error('Error getting user posts:', error);
    return [];
  }
};

// Create a post
export const createPost = async (userId, userData, title, mediaUrl, description, genre, mediaType) => {
  if (!db) return { error: 'Firestore not initialized' };
  
  try {
    const newPost = {
      userId,
      userName: userData.displayName || userData.username,
      userAvatar: userData.avatar,
      isAdmin: userData.role === 'admin',
      title,
      mediaUrl,
      mediaType: mediaType || 'song',
      description,
      genre: genre || 'Other',
      likes: [],
      comments: [],
      views: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, "posts"), newPost);
    
    return { 
      post: { 
        id: docRef.id, 
        ...newPost,
        createdAt: new Date().toISOString()
      } 
    };
  } catch (error) {
    console.error('Error creating post:', error);
    return { error: 'Failed to create post: ' + error.message };
  }
};

// Get post by ID
export const getPostById = async (postId) => {
  if (!db) return null;
  
  try {
    const postDoc = await getDoc(doc(db, "posts", postId));
    if (postDoc.exists()) {
      const data = postDoc.data();
      return {
        id: postDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting post:', error);
    return null;
  }
};

// ==================== LIKES ====================

// Toggle like on a post
export const toggleLike = async (postId, userId) => {
  if (!db) return { error: 'Firestore not initialized' };
  
  try {
    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      return { error: 'Post not found' };
    }
    
    const postData = postDoc.data();
    const likes = postData.likes || [];
    const isLiked = likes.includes(userId);
    
    if (isLiked) {
      await updateDoc(postRef, {
        likes: arrayRemove(userId)
      });
    } else {
      await updateDoc(postRef, {
        likes: arrayUnion(userId)
      });
    }
    
    const updatedDoc = await getDoc(postRef);
    const updatedData = updatedDoc.data();
    return { 
      post: { 
        id: updatedDoc.id, 
        ...updatedData,
        createdAt: updatedData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      } 
    };
  } catch (error) {
    console.error('Error toggling like:', error);
    return { error: 'Failed to toggle like' };
  }
};

// ==================== COMMENTS ====================

// Add comment to a post
export const addComment = async (postId, userId, userData, text) => {
  if (!db) return { error: 'Firestore not initialized' };
  
  try {
    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      return { error: 'Post not found' };
    }
    
    const newComment = {
      userId,
      userName: userData.displayName || userData.username || 'User',
      userAvatar: userData.avatar,
      userRole: userData.role || 'user',
      text,
      createdAt: serverTimestamp()
    };
    
    const commentRef = await addDoc(collection(db, "posts", postId, "comments"), newComment);
    
    await updateDoc(postRef, {
      commentCount: increment(1)
    });
    
    return { 
      comment: { 
        id: commentRef.id, 
        ...newComment,
        createdAt: new Date().toISOString()
      } 
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    return { error: 'Failed to add comment' };
  }
};

// Get comments for a post
export const getComments = async (postId) => {
  if (!db) return [];
  
  try {
    const commentsQuery = query(
      collection(db, "posts", postId, "comments"),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(commentsQuery);
    const comments = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      comments.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      });
    });
    
    return comments;
  } catch (error) {
    console.error('Error getting comments:', error);
    return [];
  }
};

// ==================== FOLLOWS ====================

// Toggle follow a user
export const toggleFollow = async (currentUserId, targetUserId) => {
  if (!db) return { error: 'Firestore not initialized' };
  
  try {
    const currentUserRef = doc(db, "users", currentUserId);
    const currentUserDoc = await getDoc(currentUserRef);
    
    const targetUserRef = doc(db, "users", targetUserId);
    const targetUserDoc = await getDoc(targetUserRef);
    
    if (!currentUserDoc.exists() || !targetUserDoc.exists()) {
      return { error: 'User not found' };
    }
    
    const currentUserData = currentUserDoc.data();
    const targetUserData = targetUserDoc.data();
    
    const currentFollowing = currentUserData.following || [];
    const targetFollowers = targetUserData.followers || [];
    
    const isFollowing = currentFollowing.includes(targetUserId);
    
    if (isFollowing) {
      await updateDoc(currentUserRef, {
        following: arrayRemove(targetUserId)
      });
      await updateDoc(targetUserRef, {
        followers: arrayRemove(currentUserId)
      });
    } else {
      await updateDoc(currentUserRef, {
        following: arrayUnion(targetUserId)
      });
      await updateDoc(targetUserRef, {
        followers: arrayUnion(currentUserId)
      });
    }
    
    return { success: true, following: !isFollowing };
  } catch (error) {
    console.error('Error toggling follow:', error);
    return { error: 'Failed to toggle follow' };
  }
};

// ==================== SEARCH ====================

// Search users
export const searchUsers = async (searchTerm) => {
  if (!db) return [];
  
  try {
    const usersQuery = query(
      collection(db, "users"),
      limit(20)
    );
    
    const querySnapshot = await getDocs(usersQuery);
    const users = [];
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      const username = userData.username?.toLowerCase() || '';
      const displayName = userData.displayName?.toLowerCase() || '';
      
      if (username.includes(lowerSearchTerm) || displayName.includes(lowerSearchTerm)) {
        users.push({
          id: doc.id,
          ...userData
        });
      }
    });
    
    return users;
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};

// Get feed
export const getFeed = async (userId, followingList = []) => {
  if (!db) return [];
  
  try {
    if (followingList.length === 0) {
      return await getAllPosts();
    }
    
    const followingSlice = followingList.slice(0, 10);
    
    const postsQuery = query(
      collection(db, "posts"),
      where("userId", "in", followingSlice),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    
    const querySnapshot = await getDocs(postsQuery);
    const posts = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      });
    });
    
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return posts;
  } catch (error) {
    console.error('Error getting feed:', error);
    return [];
  }
};

