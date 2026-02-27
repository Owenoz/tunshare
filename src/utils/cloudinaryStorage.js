// Cloudinary Storage for TuneShare
// Alternative to Firebase Storage

// Cloudinary configuration
// Replace these with your Cloudinary credentials
const CLOUDINARY_CLOUD_NAME = 'tuneshare'; // Get from Cloudinary Dashboard
const CLOUDINARY_UPLOAD_PRESET = 'unsigned-preset'; // Create in Cloudinary Settings > Upload

// Check if Cloudinary is configured
const isCloudinaryConfigured = () => {
  return CLOUDINARY_CLOUD_NAME !== 'your-cloud-name';
};

// Upload media to Cloudinary
export const uploadToCloudinary = async (uri, mediaType = 'image') => {
  if (!isCloudinaryConfigured()) {
    return { error: 'Cloudinary not configured. Please add your cloud name.' };
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
    } else if (mediaType === 'audio') {
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
      throw new Error('Upload failed');
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
