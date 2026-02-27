// Storage wrapper for TuneShare
// Using Cloudinary for file uploads (not Firebase)

import { uploadToCloudinary, getOptimizedUrl } from './cloudinaryStorage';

// Upload media file using Cloudinary
export const uploadMedia = async (uri, userId, mediaType = 'media') => {
  try {
    // If it's already a URL, return it
    if (uri && (uri.startsWith('http://') || uri.startsWith('https://'))) {
      return { url: uri, path: '' };
    }

    // Validate URI
    if (!uri) {
      return { error: 'No file URI provided' };
    }

    // Map mediaType to Cloudinary resource type
    let cloudinaryType = 'image';
    if (mediaType === 'video') cloudinaryType = 'video';
    else if (mediaType === 'song' || mediaType === 'audio') cloudinaryType = 'audio';

    const result = await uploadToCloudinary(uri, cloudinaryType);
    
    // Handle both success and warning cases
    if (result.error) {
      return { error: result.error };
    }

    // If there's a warning (Cloudinary not configured), still return the URL but warn the user
    if (result.warning) {
      console.warn('Cloudinary upload warning:', result.warning);
      return { url: result.url, path: result.publicId, warning: result.warning };
    }

    return { url: result.url, path: result.publicId };
  } catch (error) {
    console.error('Error uploading media:', error);
    return { error: 'Failed to upload media: ' + error.message };
  }
};

// Upload avatar using Cloudinary
export const uploadAvatar = async (uri, userId) => {
  try {
    // If it's already a URL, return it
    if (uri && (uri.startsWith('http://') || uri.startsWith('https://'))) {
      return { url: uri, path: '' };
    }

    if (!uri) {
      return { error: 'No file URI provided' };
    }

    const result = await uploadToCloudinary(uri, 'image');
    
    if (result.error) {
      return { error: result.error };
    }

    // If there's a warning, still return the URL
    if (result.warning) {
      return { url: result.url, path: result.publicId, warning: result.warning };
    }

    return { url: result.url, path: result.publicId };
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return { error: 'Failed to upload avatar: ' + error.message };
  }
};

// Delete media (placeholder - requires server-side API for Cloudinary)
export const deleteMedia = async (filepath) => {
  return { success: true };
};

// Delete avatar (placeholder)
export const deleteAvatar = async (userId) => {
  return { success: true };
};

// Get media URL with optimizations
export const getMediaURL = async (filepath, options = {}) => {
  if (!filepath) {
    return { error: 'No filepath provided' };
  }

  // If it's already a full URL, return optimized version
  if (filepath.startsWith('http://') || filepath.startsWith('https://')) {
    const optimizedUrl = getOptimizedUrl(filepath, options);
    return { url: optimizedUrl };
  }

  // For Cloudinary public IDs
  const baseUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME || 'demo'}/image/upload`;
  const optimizedUrl = getOptimizedUrl(baseUrl + '/' + filepath, options);
  
  return { url: optimizedUrl };
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
  const extension = filename?.split('.').pop()?.toLowerCase();
  
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
