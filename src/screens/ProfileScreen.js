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
  getCurrentAuthUser, 
  getUserPosts, 
  logoutUser,
  onAuthChange 
} from '../utils/storage';

const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen for auth changes
    const unsubscribeAuth = onAuthChange((authUser) => {
      if (authUser) {
        loadData(authUser);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    // Load initial data
    const init = async () => {
      const authUser = await getCurrentAuthUser();
      if (authUser) {
        loadData(authUser);
      } else {
        setIsLoading(false);
      }
    };
    
    init();
    
    return () => unsubscribeAuth();
  }, []);

  const loadData = async (authUser) => {
    try {
      if (authUser) {
        setUser(authUser);
        const userPosts = await getUserPosts(authUser.uid);
        setPosts(userPosts);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
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
              await logoutUser();
              navigation.replace('Login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', error.message || 'Failed to logout. Please try again.');
            }
          }
        },
      ]
    );
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

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.notLoggedIn}>
          <Text style={styles.notLoggedInIcon}>🔐</Text>
          <Text style={styles.notLoggedInTitle}>Not Logged In</Text>
          <Text style={styles.notLoggedInText}>
            Please login to view your profile
          </Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.replace('Login')}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={[styles.avatarLarge, user.role === 'admin' && styles.adminAvatarLarge]}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
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
          
          {/* Firebase Badge */}
          <View style={styles.firebaseBadge}>
            <Text style={styles.firebaseBadgeText}>☁️ Firebase Auth</Text>
          </View>
          
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

        {/* Admin Post Button */}
        {user.role === 'admin' && (
          <TouchableOpacity 
            style={styles.adminPostButton}
            onPress={() => navigation.navigate('CreatePost')}
          >
            <Text style={styles.adminPostButtonText}>➕ Create New Post</Text>
          </TouchableOpacity>
        )}

        {/* My Posts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Posts</Text>
          
          {posts.length > 0 ? (
            posts.map((post) => renderPost({ item: post }))
          ) : (
            <View style={styles.emptyPosts}>
              <Text style={styles.emptyIcon}>🎵</Text>
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  notLoggedIn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  notLoggedInIcon: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  notLoggedInTitle: {
    fontSize: TYPOGRAPHY.h2,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  notLoggedInText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  loginButtonText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  header: {
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.neon,
  },
  adminAvatarLarge: {
    backgroundColor: COLORS.neonOrange,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
  firebaseBadge: {
    backgroundColor: COLORS.neonCyan,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.md,
  },
  firebaseBadgeText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  bio: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: SPACING.md,
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
  adminPostButton: {
    backgroundColor: COLORS.primary,
    margin: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    ...SHADOWS.neon,
  },
  adminPostButtonText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
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
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  logoutButton: {
    margin: SPACING.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: BORDER_RADIUS.md,
  },
  logoutText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.danger,
    fontWeight: '600',
  },
});

export default ProfileScreen;

