import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../constants/theme';
import { createPost, getCurrentAuthUser, uploadMedia } from '../utils/storage';

const GENRES = [
  'Hip Hop', 'Pop', 'R&B', 'Rock', 'EDM', 'Jazz', 'Classical', 
  'Country', 'Latin', 'Afrobeats', 'Other'
];

const MEDIA_TYPES = [
  { label: '🎵 Song', value: 'song' },
  { label: '🎬 Video', value: 'video' },
  { label: '🖼️ Image', value: 'image' },
];

// Supported file types
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a', 'audio/m4a'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const CreatePostScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [localMediaUri, setLocalMediaUri] = useState('');
  const [localMediaName, setLocalMediaName] = useState('');
  const [mediaMimeType, setMediaMimeType] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('Hip Hop');
  const [mediaType, setMediaType] = useState('song');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showGenres, setShowGenres] = useState(false);

  // Pick file from device
  const pickFile = async () => {
    try {
      Haptics.selectionAsync();
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'video/*', 'image/*'],
        copyToCacheDirectory: true,
      });
      
      if (result.canceled) {
        return;
      }
      
      const asset = result.assets[0];
      setLocalMediaUri(asset.uri);
      setLocalMediaName(asset.name);
      setMediaMimeType(asset.mimeType || 'application/octet-stream');
      setMediaUrl(''); // Clear URL when file is selected
      
      // Auto-detect media type based on mime type
      if (asset.mimeType?.startsWith('image/')) {
        setMediaType('image');
      } else if (asset.mimeType?.startsWith('video/')) {
        setMediaType('video');
      } else if (asset.mimeType?.startsWith('audio/')) {
        setMediaType('song');
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  // Pick image from gallery
  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please grant access to your photo library');
        return;
      }
      
      Haptics.selectionAsync();
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (result.canceled) {
        return;
      }
      
      const asset = result.assets[0];
      setLocalMediaUri(asset.uri);
      setLocalMediaName(asset.fileName || 'image.jpg');
      setMediaMimeType('image/jpeg');
      setMediaType('image');
      setMediaUrl(''); // Clear URL when file is selected
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please grant access to your camera');
        return;
      }
      
      Haptics.selectionAsync();
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (result.canceled) {
        return;
      }
      
      const asset = result.assets[0];
      setLocalMediaUri(asset.uri);
      setLocalMediaName('photo.jpg');
      setMediaMimeType('image/jpeg');
      setMediaType('image');
      setMediaUrl('');
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  // Clear selected file
  const clearSelectedFile = () => {
    setLocalMediaUri('');
    setLocalMediaName('');
    setMediaMimeType('');
    Haptics.selectionAsync();
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!mediaUrl.trim() && !localMediaUri.trim()) {
      Alert.alert('Error', 'Please enter a media URL or select a file');
      return;
    }

    const user = await getCurrentAuthUser();
    if (!user) {
      Alert.alert('Error', 'Please login to post');
      return;
    }

    setIsLoading(true);
    setIsUploading(true);
    
    try {
      let finalMediaUrl = mediaUrl.trim();
      let uploadWarning = null;
      
      // If there's a local media file, upload it to Firebase/Cloudinary Storage
      if (localMediaUri.trim()) {
        const uploadResult = await uploadMedia(
          localMediaUri.trim(), 
          user.uid, 
          mediaType
        );
        
        if (uploadResult.error) {
          Alert.alert('Upload Error', uploadResult.error);
          setIsLoading(false);
          setIsUploading(false);
          return;
        }
        
        finalMediaUrl = uploadResult.url;
        
        // Check if there's a warning from the upload
        if (uploadResult.warning) {
          uploadWarning = uploadResult.warning;
          console.warn('Upload warning:', uploadWarning);
        }
      }
      
      setIsUploading(false);
      
      // Create the post
      const result = await createPost(
        user.uid, 
        user,
        title, 
        finalMediaUrl, 
        description, 
        genre,
        mediaType
      );
      
      console.log('Create post result:', result);
      
      if (result.error) {
        Alert.alert('Error', result.error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Show success message with optional warning about upload
        if (uploadWarning) {
          Alert.alert('Success', 'Post created! Note: File upload service is not configured. Please use media URLs for best experience.', [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]);
        } else {
          Alert.alert('Success', 'Post created!', [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]);
        }
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Something went wrong: ' + error.message);
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  const selectGenre = (selectedGenre) => {
    Haptics.selectionAsync();
    setGenre(selectedGenre);
    setShowGenres(false);
  };

  // Handle URL input change - clear local file if URL is provided
  const handleMediaUrlChange = (text) => {
    setMediaUrl(text);
    if (text.trim()) {
      setLocalMediaUri('');
      setLocalMediaName('');
      setMediaMimeType('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Create Post</Text>
          
          <TouchableOpacity 
            onPress={handleSubmit}
            style={[styles.postButton, isLoading && styles.postButtonDisabled]}
            disabled={isLoading}
          >
            <Text style={styles.postText}>
              {isLoading ? (isUploading ? 'Uploading...' : 'Posting...') : 'Post'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Media Type Selection */}
          <View>
            <Text style={styles.label}>Content Type</Text>
            <View style={styles.mediaTypeContainer}>
              {MEDIA_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.mediaTypeButton,
                    mediaType === type.value && styles.mediaTypeButtonActive
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setMediaType(type.value);
                  }}
                >
                  <Text style={[
                    styles.mediaTypeText,
                    mediaType === type.value && styles.mediaTypeTextActive
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Title */}
          <View>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder={mediaType === 'song' ? "Song title" : "Video title"}
              placeholderTextColor={COLORS.textTertiary}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* Media URL */}
          <View>
            <Text style={styles.label}>Media URL *</Text>
            <TextInput
              style={styles.input}
              placeholder={mediaType === 'song' ? "Audio link (YouTube, SoundCloud...)" : mediaType === 'video' ? "Video link (YouTube, Vimeo...)" : "Image URL"}
              placeholderTextColor={COLORS.textTertiary}
              value={mediaUrl}
              onChangeText={handleMediaUrlChange}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          {/* OR Divider */}
          <View style={styles.orDivider}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.orLine} />
          </View>

          {/* Upload File Section */}
          <View>
            <Text style={styles.label}>Upload File</Text>
            
            {/* Selected File Preview */}
            {localMediaUri ? (
              <View style={styles.selectedFileContainer}>
                <View style={styles.selectedFile}>
                  <Text style={styles.selectedFileIcon}>
                    {mediaType === 'image' ? '🖼️' : mediaType === 'video' ? '🎬' : '🎵'}
                  </Text>
                  <View style={styles.selectedFileInfo}>
                    <Text style={styles.selectedFileName} numberOfLines={1}>
                      {localMediaName}
                    </Text>
                    <Text style={styles.selectedFileType}>
                      {mediaType === 'image' ? 'Image' : mediaType === 'video' ? 'Video' : 'Audio'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={clearSelectedFile} style={styles.clearFileButton}>
                    <Text style={styles.clearFileText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {/* File Type Selection */}
                <View style={styles.uploadOptions}>
                  {/* Audio/Video File Picker */}
                  <TouchableOpacity style={styles.uploadButton} onPress={pickFile}>
                    <Text style={styles.uploadButtonIcon}>📁</Text>
                    <Text style={styles.uploadButtonText}>Browse Files</Text>
                    <Text style={styles.uploadButtonSubtext}>Audio, Video</Text>
                  </TouchableOpacity>

                  {/* Image Picker */}
                  <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                    <Text style={styles.uploadButtonIcon}>🖼️</Text>
                    <Text style={styles.uploadButtonText}>Gallery</Text>
                    <Text style={styles.uploadButtonSubtext}>Photos</Text>
                  </TouchableOpacity>

                  {/* Camera */}
                  <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
                    <Text style={styles.uploadButtonIcon}>📷</Text>
                    <Text style={styles.uploadButtonText}>Camera</Text>
                    <Text style={styles.uploadButtonSubtext}>Take Photo</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Genre Selection */}
          <View>
            <Text style={styles.label}>Genre</Text>
            <TouchableOpacity 
              style={styles.genreSelector}
              onPress={() => setShowGenres(!showGenres)}
            >
              <Text style={styles.genreSelected}>{genre}</Text>
              <Text style={styles.genreArrow}>{showGenres ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            
            {showGenres && (
              <View style={styles.genreList}>
                {GENRES.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genreItem,
                      genre === g && styles.genreItemSelected
                    ]}
                    onPress={() => selectGenre(g)}
                  >
                    <Text style={[
                      styles.genreItemText,
                      genre === g && styles.genreItemTextSelected
                    ]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Description */}
          <View>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell viewers about your content..."
              placeholderTextColor={COLORS.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>

          {/* Admin Badge */}
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>👑 Admin Post</Text>
          </View>
          
          {/* Firebase Status */}
          <View style={styles.firebaseBadge}>
            <Text style={styles.firebaseBadgeText}>☁️ Powered by Firebase</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  backButton: {
    padding: SPACING.sm,
    marginLeft: -SPACING.sm,
  },
  backText: {
    fontSize: 24,
    color: COLORS.textPrimary,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.h3,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  postButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    ...SHADOWS.neon,
  },
  postButtonDisabled: {
    opacity: 0.6,
  },
  postText: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  label: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  mediaTypeContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  mediaTypeButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  mediaTypeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceLight,
  },
  mediaTypeText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  mediaTypeTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 120,
    paddingTop: SPACING.md,
  },
  storageNote: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  storageNoteText: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  storageNoteSubtext: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
  // Upload section styles
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  orText: {
    paddingHorizontal: SPACING.md,
    color: COLORS.textTertiary,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  uploadOptions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  uploadButtonIcon: {
    fontSize: 28,
    marginBottom: SPACING.xs,
  },
  uploadButtonText: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  uploadButtonSubtext: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
  },
  selectedFileContainer: {
    marginTop: SPACING.sm,
  },
  selectedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  selectedFileIcon: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  selectedFileInfo: {
    flex: 1,
  },
  selectedFileName: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  selectedFileType: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  clearFileButton: {
    padding: SPACING.sm,
    backgroundColor: COLORS.danger,
    borderRadius: BORDER_RADIUS.full,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearFileText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  genreSelector: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  genreSelected: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },
  genreArrow: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  genreList: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  genreItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  genreItemSelected: {
    backgroundColor: COLORS.primary,
  },
  genreItemText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },
  genreItemTextSelected: {
    fontWeight: '600',
  },
  adminBadge: {
    backgroundColor: COLORS.neonOrange,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
    ...SHADOWS.neon,
  },
  adminBadgeText: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  firebaseBadge: {
    backgroundColor: COLORS.neonCyan,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  firebaseBadgeText: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});

export default CreatePostScreen;

