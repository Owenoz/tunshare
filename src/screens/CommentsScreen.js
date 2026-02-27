import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import { 
  getPostById, 
  addComment, 
  getCurrentAuthUser,
  onAuthChange 
} from '../utils/storage';

const CommentsScreen = ({ navigation, route }) => {
  const { postId } = route.params;
  const [post, setPost] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen for auth changes
    const unsubscribeAuth = onAuthChange(async (user) => {
      setCurrentUser(user);
      if (user) {
        await loadData();
      }
    });

    loadData();

    return () => unsubscribeAuth();
  }, [postId]);

  const loadData = async () => {
    try {
      const user = await getCurrentAuthUser();
      setCurrentUser(user);
      
      const foundPost = await getPostById(postId);
      setPost(foundPost);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    if (!currentUser) {
      alert('Please login to comment');
      return;
    }

    const result = await addComment(postId, currentUser.uid, currentUser, commentText);
    if (result.comment) {
      // Reload the post to get updated comments
      await loadData();
      setCommentText('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'Just now';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderComment = ({ item }) => (
    <View style={styles.commentItem}>
      <View style={[styles.commentAvatar, item.userRole === 'admin' && styles.adminCommentAvatar]}>
        <Text style={styles.commentAvatarText}>
          {item.userName?.charAt(0).toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUserName}>{item.userName}</Text>
          {item.userRole === 'admin' && (
            <Text style={styles.adminTag}>👑</Text>
          )}
          <Text style={styles.commentTime}>{formatTime(item.createdAt)}</Text>
        </View>
        <Text style={styles.commentText}>{item.text}</Text>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.postHeader}>
      <Text style={styles.songTitle}>{post?.title}</Text>
      <Text style={styles.songArtist}>by {post?.userName}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comments</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <FlatList
          data={post?.comments || []}
          keyExtractor={(item) => item.id}
          renderItem={renderComment}
          ListHeaderComponent={post ? renderHeader : null}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No comments yet</Text>
              <Text style={styles.emptySubtext}>Be the first to comment!</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />

        {/* Comment Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor={COLORS.textTertiary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity 
            style={[
              styles.sendButton,
              !commentText.trim() && styles.sendButtonDisabled
            ]}
            onPress={handleAddComment}
            disabled={!commentText.trim()}
          >
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  listContent: {
    paddingBottom: SPACING.md,
  },
  postHeader: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  songTitle: {
    fontSize: TYPOGRAPHY.h3,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  songArtist: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  commentItem: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  adminCommentAvatar: {
    backgroundColor: COLORS.neonOrange,
  },
  commentAvatarText: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.primary,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  commentUserName: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginRight: SPACING.xs,
  },
  adminTag: {
    fontSize: 10,
    marginRight: SPACING.xs,
  },
  commentTime: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
  },
  commentText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  emptySubtext: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    paddingTop: SPACING.sm,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    maxHeight: 100,
    marginRight: SPACING.sm,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendText: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});

export default CommentsScreen;

