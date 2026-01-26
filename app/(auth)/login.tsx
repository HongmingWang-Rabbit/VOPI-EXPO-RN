import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';

export default function LoginScreen() {
  const { signInWithGoogle, signInWithApple, isLoading } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Google sign in failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Sign In Failed', message);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
    } catch (error) {
      console.error('Apple sign in failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Sign In Failed', message);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Signing in...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>VOPI</Text>
        <Text style={styles.subtitle}>Video to Product Instant</Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <TouchableOpacity style={styles.appleButton} onPress={handleAppleSignIn}>
            <Text style={styles.appleButtonText}>Continue with Apple</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.termsContainer}>
        <Text style={styles.terms}>By continuing, you agree to our </Text>
        <Link href="/terms-of-service" asChild>
          <TouchableOpacity>
            <Text style={styles.termsLink}>Terms of Service</Text>
          </TouchableOpacity>
        </Link>
        <Text style={styles.terms}> and </Text>
        <Link href="/privacy" asChild>
          <TouchableOpacity>
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
    backgroundColor: '#fff',
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  buttons: {
    gap: 16,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  appleButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  termsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 40,
  },
  terms: {
    fontSize: 12,
    color: '#999',
  },
  termsLink: {
    fontSize: 12,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
});
