// Cloudinary Storage for TuneShare
// Alternative to Firebase Storage

// Cloudinary configuration
// IMPORTANT: Replace these with your actual Cloudinary credentials
// Get your cloud name from Cloudinary Dashboard (cloud name, not the full URL)
const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo';
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

// Check if Cloudinary is properly configured
const isCloudinaryConfigured = () => {
  return CLOUDINARY_CLOUD_NAME !== 'your-cloud-name' && CLOUDINARY_CLOUD_NAME !== '';
};

// Upload media to Cloudinary
export const uploadToCloudinary = async (uri, mediaType = 'image') => {
  if (!isCloudinaryConfigured()) {
    console.warn('Cloudinary not configured properly. Using fallback mode.');
    // Return a mock URL for demo purposes when not configured
    return { 
      url: 'https://via.placeholder.com/400x400.png?text=Media+Upload+Required', 
      publicId: 'placeholder',
      warning: 'Cloudinary not configured - upload skipped'
    };
  }

  try {
    // If it's already a URL, return it
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      return { url: uri, path: '' };
    }

    // Validate URI
    if (!uri) {
      return { error: 'No file URI provided' };
    }

    // Determine resource type based on media type
    let resourceType = 'auto';
    if (mediaType === 'video') {
      resourceType = 'video';
    } else if (mediaType === 'audio' || mediaType === 'song') {
      resourceType = 'raw'; // Cloudinary uses raw for audio
    }

    // Create form data
    const formData = new FormData();
    
    // For React Native
    const filename = uri.split('/').pop() || 'media';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri,
      name: filename,
      type,
    });
    
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudinary upload error:', response.status, errorText);
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    const data = await response.json();
    
    return { 
      url: data.secure_url, 
      publicId: data.public_id 
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return { error: 'Failed to upload: ' + error.message };
  }
};

// Delete media from Cloudinary
export const deleteFromCloudinary = async (publicId) => {
  // Note: For unsigned uploads, deletion requires server-side API
  // This is a placeholder
  console.log('Delete not implemented for unsigned uploads');
  return { success: true };
};

// Get optimized Cloudinary URL
export const getOptimizedUrl = (url, options = {}) => {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }

  const {
    width,
    height,
    quality = 'auto',
    format = 'auto'
  } = options;

  // Add transformation parameters
  let transformations = [];
  
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  transformations.push(`q_${quality}`);
  transformations.push(`f_${format}`);

  if (transformations.length > 0) {
    // Insert transformations into URL
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      return `${parts[0]}/upload/${transformations.join(',')}/${parts[1]}`;
    }
  }

  return url;
};

export default {
  uploadToCloudinary,
  deleteFromCloudinary,
  getOptimizedUrl,
  isCloudinaryConfigured
};
