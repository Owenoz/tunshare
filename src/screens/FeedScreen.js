import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert
} from 'react-native';
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
            <Text style={styles.mediaTypeIcon}>{isVideo ? '🎬' : '🎵'}</Text>
            <Text style={styles.mediaTypeText}>{isVideo ? 'Video' : 'Song'}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.songTitle}>{item.title}</Text>
          {item.description && (
            <Text style={styles.description}>{item.description}</Text>
          )}
          
          {/* Media Preview */}
          {item.mediaUrl && (
            <TouchableOpacity style={styles.mediaPreview} activeOpacity={0.7}>
              <View style={styles.mediaPlaceholder}>
                <Text style={styles.mediaIcon}>{isVideo ? '▶️' : '🎧'}</Text>
                <Text style={styles.mediaPlayText}>
                  {isVideo ? 'Watch Video' : 'Play Song'}
                </Text>
              </View>
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
    </SafeAreaView>
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
});

export default FeedScreen;

