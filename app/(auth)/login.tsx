import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../src/theme';

export default function LoginScreen() {
  const { signInWithGoogle, signInWithApple, isLoading } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Sign In Failed', message);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Sign In Failed', message);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Signing in...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">VOPI</Text>
        <Text style={styles.subtitle}>Video to Product Instant</Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleSignIn}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
        >
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={styles.appleButton}
            onPress={handleAppleSignIn}
            accessibilityRole="button"
            accessibilityLabel="Continue with Apple"
          >
            <Text style={styles.appleButtonText}>Continue with Apple</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.termsContainer}>
        <Text style={styles.terms}>By continuing, you agree to our </Text>
        <Link href="/terms-of-service" asChild>
          <TouchableOpacity accessibilityRole="link">
            <Text style={styles.termsLink}>Terms of Service</Text>
          </TouchableOpacity>
        </Link>
        <Text style={styles.terms}> and </Text>
        <Link href="/privacy" asChild>
          <TouchableOpacity accessibilityRole="link">
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  buttons: {
    gap: spacing.lg,
  },
  googleButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderDark,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  appleButton: {
    backgroundColor: colors.black,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  appleButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  termsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 40,
  },
  terms: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  termsLink: {
    fontSize: fontSize.xs,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
