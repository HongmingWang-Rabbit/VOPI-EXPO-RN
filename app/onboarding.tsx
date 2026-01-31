import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/contexts/ThemeContext';
import { haptics } from '../src/utils/haptics';
import { storage } from '../src/utils/storage';
import { STORAGE_KEYS } from '../src/constants/storage';
import { spacing, borderRadius, fontSize, fontWeight } from '../src/theme';

const SLIDES = [
  {
    icon: 'videocam' as const,
    title: 'Record Your Product',
    description: 'Simply record a short video of your product. Show it from multiple angles and mention key details like brand, price, and materials.',
    color: '#2563EB',
  },
  {
    icon: 'sparkles' as const,
    title: 'AI Does the Work',
    description: 'Our AI extracts the best frames, generates commercial-quality images, and creates complete product metadata — title, description, pricing, and more.',
    color: '#8B5CF6',
  },
  {
    icon: 'storefront' as const,
    title: 'Push to Your Store',
    description: 'One tap to publish your product to Shopify, Amazon, or eBay. Connect your stores in Settings and start selling instantly.',
    color: '#059669',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleComplete = async () => {
    haptics.success();
    await storage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
    router.replace('/(tabs)');
  };

  const handleNext = () => {
    haptics.light();
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      handleComplete();
    }
  };

  const handleSkip = async () => {
    haptics.light();
    await handleComplete();
  };

  const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => (
    <View style={[styles.slide, { width }]}>
      {/* Appends hex alpha (8%) — safe because SLIDES colors are always 6-char hex */}
      <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
        <Ionicons name={item.icon} size={64} color={item.color} />
      </View>
      <Text style={[styles.slideTitle, { color: colors.text }]}>{item.title}</Text>
      <Text style={[styles.slideDescription, { color: colors.textSecondary }]}>{item.description}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.skipContainer}>
        {activeIndex < SLIDES.length - 1 ? (
          <TouchableOpacity onPress={handleSkip}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
          </TouchableOpacity>
        ) : <View />}
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={(e) => {
          setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
      />

      {/* Dots */}
      <View style={styles.dotsContainer}>
        {SLIDES.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 24, 8], extrapolate: 'clamp' });
          const opacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });
          return (
            <Animated.View
              key={i}
              style={[styles.dot, { width: dotWidth, opacity, backgroundColor: colors.primary }]}
            />
          );
        })}
      </View>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: colors.primary }]}
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel={activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
        >
          <Text style={styles.nextButtonText}>
            {activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          {activeIndex < SLIDES.length - 1 && (
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  skipText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  slideTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  slideDescription: {
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  bottomContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
});
