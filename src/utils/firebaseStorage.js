vercel --prod// Firebase Storage wrapper for TuneShare
// Using Firebase Web SDK

import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

// Get storage instance
let storage;
try {
  const firebase = require('./firebase');
  storage = firebase.storage;
} catch (error) {
  console.error('Error loading Storage:', error);
}

// Upload media file
export const uploadMedia = async (uri, userId, mediaType = 'media') => {
  if (!storage) return { error: 'Firebase Storage not initialized' };
  
  try {
    if (!uri || (!uri.startsWith('file://') && !uri.startsWith('content://') && !uri.startsWith('ph://'))) {
      if (uri.startsWith('http://') || uri.startsWith('https://')) {
        return { url: uri, path: '' };
      }
      return { error: 'Invalid file URI' };
    }

    // Determine file extension and MIME type
    let extension = 'bin';
    let mimeType = 'application/octet-stream';
    
    // Try to get extension from URI
    const uriParts = uri.split('.');
    if (uriParts.length > 1) {
      extension = uriParts.pop().toLowerCase();
    }
    
    // Map extension to MIME type
    const mimeTypeMap = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'm4a': 'audio/mp4',
      'aac': 'audio/aac',
    };
    
    mimeType = mimeTypeMap[extension] || 'application/octet-stream';
    
    // Determine file type category
    let fileCategory = mediaType;
    if (mimeType.startsWith('image/')) {
      fileCategory = 'image';
    } else if (mimeType.startsWith('video/')) {
      fileCategory = 'video';
    } else if (mimeType.startsWith('audio/')) {
      fileCategory = 'audio';
    }
    
    const timestamp = Date.now();
    const filename = `${fileCategory}_${timestamp}.${extension}`;
    const filepath = `media/${userId}/${filename}`;
    
    const storageRef = ref(storage, filepath);
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Set content type
    const metadata = {
      contentType: mimeType,
    };
    
    const snapshot = await uploadBytes(storageRef, blob, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return { url: downloadURL, path: filepath, mimeType };
  } catch (error) {
    console.error('Error uploading media:', error);
    return { error: 'Failed to upload media: ' + error.message };
  }
};

// Upload avatar
export const uploadAvatar = async (uri, userId) => {
  if (!storage) return { error: 'Firebase Storage not initialized' };
  
  try {
    if (!uri || (!uri.startsWith('file://') && !uri.startsWith('content://'))) {
      if (uri.startsWith('http://') || uri.startsWith('https://')) {
        return { url: uri, path: '' };
      }
      return { error: 'Invalid file URI' };
    }

    const timestamp = Date.now();
    const extension = uri.split('.').pop() || 'jpg';
    const filename = `avatar_${timestamp}.${extension}`;
    const filepath = `avatars/${userId}/${filename}`;
    
    const storageRef = ref(storage, filepath);
    const response = await fetch(uri);
    const blob = await response.blob();
    const snapshot = await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return { url: downloadURL, path: filepath };
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return { error: 'Failed to upload avatar' };
  }
};

// Delete media
export const deleteMedia = async (filepath) => {
  if (!storage) return { success: true };
  if (!filepath) return { success: true };
  
  try {
    const storageRef = ref(storage, filepath);
    await deleteObject(storageRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting media:', error);
    return { error: 'Failed to delete media' };
  }
};

// Delete avatar
export const deleteAvatar = async (userId) => {
  return { success: true };
};

// Get media URL
export const getMediaURL = async (filepath) => {
  if (!storage) return { error: 'Firebase Storage not initialized' };
  if (!filepath) return { error: 'No filepath provided' };
  
  try {
    const storageRef = ref(storage, filepath);
    const downloadURL = await getDownloadURL(storageRef);
    return { url: downloadURL };
  } catch (error) {
    console.error('Error getting media URL:', error);
    return { error: 'Failed to get media URL' };
  }
};

// Media types
export const MEDIA_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document'
};

// Get MIME type
export const getMimeType = (filename) => {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'm4a': 'audio/mp4',
    'pdf': 'application/pdf'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
};

