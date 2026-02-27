import React, { useState, useEffect } from 'react';
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
  ActivityIndicator
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../constants/theme';
import { loginUser, registerUser, onAuthChange } from '../utils/storage';

const LoginScreen = ({ navigation }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (user) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.replace('MainTabs');
      }
    });
    return () => unsubscribe();
  }, [navigation]);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!isLogin && !username.trim()) {
      Alert.alert('Error', 'Please choose a username');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!isLogin && password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    
    try {
      if (isLogin) {
        // Try to login first
        const result = await loginUser(email.trim(), password);
        
        if (result.error) {
          // If login fails and it's admin@admin.com, try to create the admin account
          if (email.toLowerCase().trim() === 'admin@admin.com' && password === 'admin123') {
            console.log('Admin user not found, creating...');
            
            // Try to register the admin user
            const registerResult = await registerUser(
              email.trim(),
              password,
              'admin',
              'Admin'
            );
            
            if (registerResult.error) {
              Alert.alert('Error', registerResult.error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } else {
              Alert.alert('Success', 'Admin account created! Please sign in.');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setIsLogin(true);
            }
          } else {
            Alert.alert('Login Failed', result.error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        } else {
          // Login successful - onAuthChange will handle navigation
          console.log('Login successful, user:', result.user?.email);
        }
      } else {
        const result = await registerUser(
          email.trim(), 
          password, 
          username.trim(), 
          displayName.trim()
        );
        if (result.error) {
          Alert.alert('Registration Failed', result.error);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else {
          Alert.alert('Success', 'Account created! Please sign in.');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setIsLogin(true);
          setPassword('');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Error', 'Something went wrong: ' + error.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLogin(!isLogin);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo & Title */}
          <View style={styles.header}>
            <Text style={styles.logo}>🎵</Text>
            <Text style={styles.title}>TuneShare</Text>
            <Text style={styles.subtitle}>
              Admin posts songs & videos{'\n'}Users like & comment
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </Text>

            {!isLogin && (
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor={COLORS.textTertiary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={COLORS.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {!isLogin && (
              <TextInput
                style={styles.input}
                placeholder="Display Name (optional)"
                placeholderTextColor={COLORS.textTertiary}
                value={displayName}
                onChangeText={setDisplayName}
              />
            )}

            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.textPrimary} />
              ) : (
                <Text style={styles.buttonText}>
                  {isLogin ? 'Sign In' : 'Sign Up'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.toggleButton}
              onPress={toggleMode}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleText}>
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <Text style={styles.toggleHighlight}>
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Admin Info */}
          <View style={styles.adminInfo}>
            <Text style={styles.adminTitle}>TUNESHARE</Text>
            <Text style={styles.adminCredentials}>
              SUPPONSERED BY{'\n'}
               HIPLEX STAR
            </Text>
          </View>

          {/* Firebase Badge */}
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
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  logo: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.h1 + 8,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  formTitle: {
    fontSize: TYPOGRAPHY.h2,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
    minHeight: 50,
    justifyContent: 'center',
    ...SHADOWS.neon,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  toggleButton: {
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  toggleHighlight: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  adminInfo: {
    marginTop: SPACING.xl,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  adminTitle: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.neonOrange,
    marginBottom: SPACING.xs,
  },
  adminCredentials: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  firebaseBadge: {
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  firebaseBadgeText: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.neonCyan,
    fontWeight: '600',
  },
});

export default LoginScreen;

