import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../constants/theme';
import { 
  getUserById, 
  getUserPosts, 
  getCurrentAuthUser, 
  toggleFollow,
  onAuthChange 
} from '../utils/storage';

const OtherProfileScreen = ({ navigation, route }) => {
  const { userId } = route.params;
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen for auth changes
    const unsubscribeAuth = onAuthChange((authUser) => {
      setCurrentUser(authUser);
    });

    loadData();

    return () => unsubscribeAuth();
  }, [userId]);

  const loadData = async () => {
    try {
      const [targetUser, userPosts, currUser] = await Promise.all([
        getUserById(userId),
        getUserPosts(userId),
        getCurrentAuthUser(),
      ]);
      
      setUser(targetUser);
      setPosts(userPosts);
      setCurrentUser(currUser);
      
      // Check if following
      if (currUser && targetUser) {
        const following = currUser.following || [];
        setIsFollowing(following.includes(userId));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Please login to follow users');
      return;
    }
    
    if (currentUser.uid === userId) {
      return; // Can't follow yourself
    }
    
    const result = await toggleFollow(currentUser.uid, userId);
    if (result.success) {
      setIsFollowing(result.following);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      loadData(); // Refresh to update follower count
    }
  };

  const renderPost = ({ item }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Text style={styles.mediaIcon}>{item.mediaType === 'video' ? '🎬' : '🎵'}</Text>
        <View style={styles.postInfo}>
          <Text style={styles.postTitle}>{item.title}</Text>
          <Text style={styles.postGenre}>{item.genre}</Text>
        </View>
      </View>
      <View style={styles.postStats}>
        <Text style={styles.postStat}>❤️ {item.likes?.length || 0}</Text>
        <Text style={styles.postStat}>💬 {item.comments?.length || 0}</Text>
      </View>
    </View>
  );

  if (isLoading || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{user.displayName || user.username}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatarLarge, user.role === 'admin' && styles.adminAvatarLarge]}>
            {user.avatar ? (
              // If avatar URL exists, use it (would need Image component)
              <Text style={styles.avatarTextLarge}>
                {user.displayName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || '?'}
              </Text>
            ) : (
              <Text style={styles.avatarTextLarge}>
                {user.displayName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || '?'}
              </Text>
            )}
          </View>
          
          <Text style={styles.displayName}>{user.displayName || user.username}</Text>
          <Text style={styles.username}>@{user.username}</Text>
          
          {user.role === 'admin' && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>👑 ADMIN</Text>
            </View>
          )}
          
          {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
          
          {/* Follow Button */}
          {currentUser && currentUser.uid !== userId && (
            <TouchableOpacity 
              style={[
                styles.followButton,
                isFollowing && styles.followingButton
              ]}
              onPress={handleFollow}
            >
              <Text style={[
                styles.followButtonText,
                isFollowing && styles.followingButtonText
              ]}>
                {isFollowing ? '✓ Following' : '+ Follow'}
              </Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{posts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{user.followers?.length || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{user.following?.length || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>
        </View>

        {/* User's Posts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Posts</Text>
          
          {posts.length > 0 ? (
            posts.map((post) => renderPost({ item: post }))
          ) : (
            <View style={styles.emptyPosts}>
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
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
  placeholder: {
    width: 40,
  },
  profileHeader: {
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.neonPink,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.neon,
  },
  adminAvatarLarge: {
    backgroundColor: COLORS.neonOrange,
  },
  avatarTextLarge: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  displayName: {
    fontSize: TYPOGRAPHY.h1,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  username: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  adminBadge: {
    backgroundColor: COLORS.neonOrange,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.sm,
  },
  adminBadgeText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  bio: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 22,
  },
  followButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.md,
    ...SHADOWS.neon,
  },
  followingButton: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  followButtonText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  followingButtonText: {
    color: COLORS.primary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: SPACING.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: TYPOGRAPHY.h2,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  section: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.h3,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  postCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.card,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  mediaIcon: {
    fontSize: 24,
    marginRight: SPACING.sm,
  },
  postInfo: {
    flex: 1,
  },
  postTitle: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  postGenre: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.primary,
  },
  postStats: {
    flexDirection: 'row',
  },
  postStat: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginRight: SPACING.md,
  },
  emptyPosts: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
});

export default OtherProfileScreen;

