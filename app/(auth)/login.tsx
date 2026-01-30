import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { haptics } from '../../src/utils/haptics';
import { spacing, borderRadius, fontSize, fontWeight, shadows } from '../../src/theme';

const LOGO_SIZE = 140;
const LOGO_BORDER_RADIUS = 32;

function AnimatedLogo() {
  const { colors } = useTheme();
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(10)).current;

  const sparkle1Y = useRef(new Animated.Value(0)).current;
  const sparkle2Y = useRef(new Animated.Value(0)).current;
  const sparkle3Y = useRef(new Animated.Value(0)).current;
  const sparkle1Opacity = useRef(new Animated.Value(0)).current;
  const sparkle2Opacity = useRef(new Animated.Value(0)).current;
  const sparkle3Opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entranceAnim = Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);
    entranceAnim.start();

    const sparkleAnims: Animated.CompositeAnimation[] = [];

    const floatSparkle = (anim: Animated.Value, opacityAnim: Animated.Value, delay: number) => {
      const composite = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(anim, { toValue: -8, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(opacityAnim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 8, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        ]),
      );
      sparkleAnims.push(composite);
      composite.start();
    };

    floatSparkle(sparkle1Y, sparkle1Opacity, 0);
    floatSparkle(sparkle2Y, sparkle2Opacity, 800);
    floatSparkle(sparkle3Y, sparkle3Opacity, 1600);

    return () => {
      entranceAnim.stop();
      sparkleAnims.forEach((a) => a.stop());
    };
  }, [logoScale, logoOpacity, subtitleOpacity, subtitleTranslateY, sparkle1Y, sparkle2Y, sparkle3Y, sparkle1Opacity, sparkle2Opacity, sparkle3Opacity]);

  return (
    <View style={styles.logoArea}>
      <Animated.View style={[styles.sparkle, styles.sparkle1, { opacity: sparkle1Opacity, transform: [{ translateY: sparkle1Y }] }]}>
        <Ionicons name="sparkles" size={16} color={colors.accentPurple} />
      </Animated.View>
      <Animated.View style={[styles.sparkle, styles.sparkle2, { opacity: sparkle2Opacity, transform: [{ translateY: sparkle2Y }] }]}>
        <Ionicons name="sparkles" size={12} color={colors.accentAmber} />
      </Animated.View>
      <Animated.View style={[styles.sparkle, styles.sparkle3, { opacity: sparkle3Opacity, transform: [{ translateY: sparkle3Y }] }]}>
        <Ionicons name="sparkles" size={14} color={colors.accentCyan} />
      </Animated.View>

      <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
        <Image
          source={require('../../assets/images/Vopi-1200px.png')}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="VOPI app logo"
        />
      </Animated.View>

      <Animated.Text style={[styles.subtitle, { color: colors.textSecondary, opacity: subtitleOpacity, transform: [{ translateY: subtitleTranslateY }] }]}>
        Video to Product Instant
      </Animated.Text>
    </View>
  );
}

export default function LoginScreen() {
  const { signInWithGoogle, signInWithApple, isLoading } = useAuth();
  const { colors } = useTheme();
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(buttonsOpacity, {
        toValue: 1,
        duration: 500,
        delay: 800,
        useNativeDriver: true,
      }),
      Animated.timing(buttonsTranslateY, {
        toValue: 0,
        duration: 500,
        delay: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [buttonsOpacity, buttonsTranslateY]);

  const handleGoogleSignIn = async () => {
    haptics.light();
    try {
      await signInWithGoogle();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Sign In Failed', message);
    }
  };

  const handleAppleSignIn = async () => {
    haptics.light();
    try {
      await signInWithApple();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Sign In Failed', message);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Signing in...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AnimatedLogo />

      <Animated.View style={[styles.buttons, { opacity: buttonsOpacity, transform: [{ translateY: buttonsTranslateY }] }]}>
        <TouchableOpacity
          style={[styles.googleButton, { backgroundColor: colors.background, borderColor: colors.borderDark }]}
          onPress={handleGoogleSignIn}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
        >
          <Ionicons name="logo-google" size={20} color={colors.text} style={styles.buttonIcon} />
          <Text style={[styles.googleButtonText, { color: colors.text }]}>Continue with Google</Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={styles.appleButton}
            onPress={handleAppleSignIn}
            accessibilityRole="button"
            accessibilityLabel="Continue with Apple"
          >
            <Ionicons name="logo-apple" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.appleButtonText}>Continue with Apple</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      <View style={styles.termsContainer}>
        <Text style={[styles.terms, { color: colors.textTertiary }]}>By continuing, you agree to our </Text>
        <Link href="/terms-of-service" asChild>
          <TouchableOpacity accessibilityRole="link">
            <Text style={[styles.termsLink, { color: colors.primary }]}>Terms of Service</Text>
          </TouchableOpacity>
        </Link>
        <Text style={[styles.terms, { color: colors.textTertiary }]}> and </Text>
        <Link href="/privacy" asChild>
          <TouchableOpacity accessibilityRole="link">
            <Text style={[styles.termsLink, { color: colors.primary }]}>Privacy Policy</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_BORDER_RADIUS,
  },
  subtitle: {
    fontSize: fontSize.lg,
    marginTop: spacing.lg,
  },
  sparkle: {
    position: 'absolute',
    zIndex: 1,
  },
  sparkle1: {
    top: spacing.sm,
    right: '25%',
  },
  sparkle2: {
    top: '45%',
    left: '20%',
  },
  sparkle3: {
    bottom: spacing.xxl,
    right: '22%',
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  buttons: {
    gap: spacing.md,
  },
  googleButton: {
    borderWidth: 1,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  googleButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  appleButton: {
    backgroundColor: '#000000',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  appleButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#FFFFFF',
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
  termsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.xxxl,
  },
  terms: {
    fontSize: fontSize.xs,
  },
  termsLink: {
    fontSize: fontSize.xs,
    textDecorationLine: 'underline',
  },
});
