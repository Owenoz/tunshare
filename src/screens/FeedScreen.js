import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView
} from 'react-native';
import { Audio, Video, ResizeMode } from 'expo-av';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../constants/theme';
import { 
  getAllPosts, 
  toggleLike, 
  getCurrentAuthUser, 
  logoutUser,
  onAuthChange 
} from '../utils/storage';
import SearchBar from '../components/SearchBar';

const FeedScreen = ({ navigation }) => {
  const [posts, setPosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Media playback state
  const [currentPlayingId, setCurrentPlayingId] = useState(null);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  // Audio mode setup
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    
    return () => {
      // Cleanup sound on unmount
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  // Cleanup function for stopping playback
  const stopPlayback = async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }
      setIsPlaying(false);
      setCurrentPlayingId(null);
    } catch (error) {
      console.error('Error stopping playback:', error);
    }
  };

  // Play audio/song
  const playAudio = async (url, postId) => {
    try {
      setIsLoadingMedia(true);
      
      // Stop any current playback
      await stopPlayback();
      
      setCurrentPlayingId(postId);
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        (playbackStatus) => {
          if (playbackStatus.isLoaded && playbackStatus.didJustFinish) {
            setIsPlaying(false);
            setCurrentPlayingId(null);
          }
        }
      );
      
      setSound(newSound);
      setIsPlaying(true);
      setIsLoadingMedia(false);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsLoadingMedia(false);
      setCurrentPlayingId(null);
      Alert.alert('Error', 'Could not play audio. Please check the URL.');
    }
  };

  // Toggle play/pause
  const togglePlayback = async () => {
    try {
      if (!sound) return;
      
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  // Open media modal
  const openMediaModal = (item) => {
    setSelectedMedia(item);
    setMediaModalVisible(true);
  };

  // Close media modal
  const closeMediaModal = async () => {
    await stopPlayback();
    setMediaModalVisible(false);
    setSelectedMedia(null);
  };

  const loadData = useCallback(async () => {
    try {
      const user = await getCurrentAuthUser();
      setCurrentUser(user);
      const allPosts = await getAllPosts();
      setPosts(allPosts);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Listen for auth changes
    const unsubscribeAuth = onAuthChange((user) => {
      setCurrentUser(user);
    });
    
    loadData();
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    
    return () => {
      unsubscribeAuth();
      unsubscribe();
    };
  }, [loadData, navigation]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleLike = async (postId) => {
    if (!currentUser) {
      Alert.alert('Error', 'Please login to like posts');
      return;
    }
    
    const result = await toggleLike(postId, currentUser.uid);
    if (result.post) {
      setPosts(posts.map(p => p.id === postId ? result.post : p));
    }
  };

  const handleLogout = () => {
    console.log('Logout button pressed');
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Logging out...');
              await logoutUser();
              console.log('Logout successful');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', error.message || 'Failed to logout. Please try again.');
            }
          }
        },
      ]
    );
  };

  // Handle user selection from search
  const handleUserSelect = (user) => {
    if (user && user.id) {
      navigation.navigate('OtherProfile', { userId: user.id });
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'Just now';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderPost = ({ item, index }) => {
    const isLiked = currentUser && item.likes?.includes(currentUser.uid);
    const isAdmin = item.isAdmin;
    const isVideo = item.mediaType === 'video';
    const isImage = item.mediaType === 'image';
    const isCurrentlyPlaying = currentPlayingId === item.id;
    
    return (
      <View style={styles.postCard}>
        {/* Header with Admin Badge */}
        <View style={styles.postHeader}>
          <TouchableOpacity 
            style={styles.userInfo}
            onPress={() => navigation.navigate('OtherProfile', { userId: item.userId })}
          >
            <View style={[styles.avatar, isAdmin && styles.adminAvatar]}>
              <Text style={styles.avatarText}>
                {item.userName?.charAt(0).toUpperCase() || '?'}
              </Text>
              {isAdmin && <View style={styles.adminCrown}><Text style={styles.crownText}>👑</Text></View>}
            </View>
            <View>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{item.userName}</Text>
                {isAdmin && <Text style={styles.adminBadge}>ADMIN</Text>}
              </View>
              <Text style={styles.postTime}>{formatTime(item.createdAt)}</Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.mediaTypeBadge}>
            <Text style={styles.mediaTypeIcon}>{isVideo ? '🎬' : isImage ? '🖼️' : '🎵'}</Text>
            <Text style={styles.mediaTypeText}>{isVideo ? 'Video' : isImage ? 'Image' : 'Song'}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.songTitle}>{item.title}</Text>
          {item.description && (
            <Text style={styles.description}>{item.description}</Text>
          )}
          
          {/* Media Preview - Clickable */}
          {item.mediaUrl && (
            <TouchableOpacity 
              style={styles.mediaPreview} 
              activeOpacity={0.7}
              onPress={() => openMediaModal(item)}
            >
              {isImage ? (
                <Image 
                  source={{ uri: item.mediaUrl }} 
                  style={styles.mediaImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.mediaPlaceholder}>
                  <Text style={styles.mediaIcon}>
                    {isCurrentlyPlaying ? (isPlaying ? '⏸️' : '▶️') : (isVideo ? '▶️' : '🎧')}
                  </Text>
                  <Text style={styles.mediaPlayText}>
                    {isCurrentlyPlaying 
                      ? (isPlaying ? 'Playing...' : 'Paused') 
                      : (isVideo ? 'Watch Video' : 'Play Song')
                    }
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Text style={styles.statText}>👁️ {item.views || 0} views</Text>
          <Text style={styles.genreBadge}>{item.genre}</Text>
        </View>

        {/* Actions */}
        <View style={styles.postActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleLike(item.id)}
          >
            <Text style={[styles.actionIcon, isLiked && styles.likedIcon]}>
              {isLiked ? '❤️' : '🤍'}
            </Text>
            <Text style={[styles.actionText, isLiked && styles.likedText]}>
              {item.likes?.length || 0}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Comments', { postId: item.id })}
          >
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>
              {item.comments?.length || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>📤</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🎵</Text>
      <Text style={styles.emptyTitle}>No content yet</Text>
      <Text style={styles.emptySubtitle}>
        Admin will post songs & videos soon!
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logo}>🎵</Text>
          <Text style={styles.logoText}>TuneShare</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={handleLogout} 
            style={styles.logoutButton}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutText}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar 
          onUserSelect={handleUserSelect}
          placeholder="Search users..."
        />
      </View>

      {/* Role Indicator */}
      {currentUser && (
        <View style={styles.roleIndicator}>
          <Text style={styles.roleText}>
            👤 {currentUser.username || currentUser.email?.split('@')[0]}
          </Text>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => navigation.navigate('CreatePost')}
          >
            <Text style={styles.createButtonText}>+ New Post</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Posts Feed */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        contentContainerStyle={posts.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      />

      {/* Media Modal */}
      <MediaModal 
        visible={mediaModalVisible} 
        media={selectedMedia} 
        onClose={closeMediaModal}
        isPlaying={isPlaying}
        onTogglePlay={togglePlayback}
        isLoadingMedia={isLoadingMedia}
        playAudio={playAudio}
      />
    </SafeAreaView>
  );
};

// Media Modal for viewing images and playing videos/audio
const MediaModal = ({ visible, media, onClose, isPlaying, onTogglePlay, isLoadingMedia, playAudio }) => {
  const [videoRef, setVideoRef] = useState(null);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setLocalIsPlaying(false);
    }
  }, [visible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef) {
        videoRef.unloadAsync();
      }
    };
  }, [videoRef]);

  const handleVideoPlayPause = async () => {
    if (videoRef) {
      if (localIsPlaying) {
        await videoRef.pauseAsync();
      } else {
        await videoRef.playAsync();
      }
      setLocalIsPlaying(!localIsPlaying);
    }
  };

  const handleAudioPlay = () => {
    if (media && media.mediaUrl && playAudio) {
      playAudio(media.mediaUrl, media.id);
    }
  };

  if (!media) return null;

  const isImage = media.mediaType === 'image';
  const isVideo = media.mediaType === 'video';
  const isAudio = media.mediaType === 'song' || media.mediaType === 'audio';

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {/* Media Title */}
          <Text style={styles.modalTitle}>{media.title}</Text>

          {/* Media Content */}
          <View style={styles.mediaContainer}>
            {isImage ? (
              <Image
                source={{ uri: media.mediaUrl }}
                style={styles.fullMediaImage}
                resizeMode="contain"
              />
            ) : isVideo ? (
              <View style={styles.videoWrapper}>
                <Video
                  ref={setVideoRef}
                  source={{ uri: media.mediaUrl }}
                  style={styles.videoPlayer}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  isLooping
                  onPlaybackStatusUpdate={(status) => {
                    if (status.isLoaded) {
                      setLocalIsPlaying(status.isPlaying);
                    }
                  }}
                />
              </View>
            ) : (
              // Audio Player UI
              <View style={styles.audioPlayerContainer}>
                <View style={styles.audioAlbumArt}>
                  <Text style={styles.audioIcon}>🎵</Text>
                </View>
                <Text style={styles.audioTitle}>{media.title}</Text>
                {media.description && (
                  <Text style={styles.audioDescription}>{media.description}</Text>
                )}
                <View style={styles.audioControls}>
                  <TouchableOpacity 
                    style={styles.playButton}
                    onPress={handleAudioPlay}
                    disabled={isLoadingMedia}
                  >
                    <Text style={styles.playButtonText}>
                      {isLoadingMedia ? '⏳' : (isPlaying ? '⏸️' : '▶️')}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.genreTag}>{media.genre}</Text>
                
                {/* Now Playing Indicator */}
                {isPlaying && (
                  <View style={styles.nowPlayingIndicator}>
                    <Text style={styles.nowPlayingText}>🔊 Now Playing...</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Description */}
          {media.description && (
            <View style={styles.modalDescription}>
              <Text style={styles.modalDescriptionText}>{media.description}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontSize: 28,
    marginRight: SPACING.xs,
  },
  logoText: {
    fontSize: TYPOGRAPHY.h2,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  logoutIcon: {
    fontSize: 14,
    marginRight: SPACING.xs,
  },
  logoutText: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  firebaseIcon: {
    fontSize: 18,
    marginRight: SPACING.md,
  },
  searchContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  logoutText: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.danger,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  logoutIcon: {
    fontSize: 14,
    marginRight: SPACING.xs,
  },
  roleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  roleText: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.neonOrange,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  createButtonText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  list: {
    paddingBottom: 100,
  },
  emptyList: {
    flexGrow: 1,
  },
  postCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.neonCyan,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  adminAvatar: {
    backgroundColor: COLORS.neonOrange,
  },
  adminCrown: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
  crownText: {
    fontSize: 12,
  },
  avatarText: {
    fontSize: TYPOGRAPHY.h3,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginRight: SPACING.xs,
  },
  adminBadge: {
    fontSize: 10,
    color: COLORS.neonOrange,
    fontWeight: 'bold',
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  postTime: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
  },
  mediaTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  mediaTypeIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  mediaTypeText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.primary,
    fontWeight: '500',
  },
  content: {
    padding: SPACING.md,
    paddingTop: 0,
  },
  songTitle: {
    fontSize: TYPOGRAPHY.h3,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  description: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },
  mediaPreview: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  mediaPlaceholder: {
    alignItems: 'center',
  },
  mediaIcon: {
    fontSize: 40,
    marginBottom: SPACING.sm,
  },
  mediaPlayText: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  statText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
  },
  genreBadge: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.primary,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.lg,
    padding: SPACING.xs,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: SPACING.xs,
  },
  likedIcon: {
    transform: [{ scale: 1.1 }],
  },
  actionText: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  likedText: {
    color: COLORS.neonPink,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.h2,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.h2,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  mediaContainer: {
    width: '100%',
    maxHeight: '60%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullMediaImage: {
    width: '100%',
    height: 400,
    borderRadius: BORDER_RADIUS.md,
  },
  videoPlayer: {
    width: '100%',
    height: 300,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#000',
  },
  videoWrapper: {
    width: '100%',
    height: 300,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  audioPlayerContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    width: '100%',
  },
  audioAlbumArt: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  audioIcon: {
    fontSize: 60,
  },
  audioTitle: {
    fontSize: TYPOGRAPHY.h3,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  audioDescription: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  audioControls: {
    marginVertical: SPACING.lg,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.neon,
  },
  playButtonText: {
    fontSize: 30,
  },
  genreTag: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.primary,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.md,
  },
  nowPlayingIndicator: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.neonGreen,
    borderRadius: BORDER_RADIUS.full,
  },
  nowPlayingText: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  modalDescription: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BORDER_RADIUS.md,
    width: '100%',
  },
  modalDescriptionText: {
    fontSize: TYPOGRAPHY.body,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 22,
  },
  mediaImage: {
    width: '100%',
    height: 200,
    borderRadius: BORDER_RADIUS.md,
  },
});

export default FeedScreen;

