import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/ThemeContext';
import { spacing, borderRadius, fontSize, fontWeight } from '../src/theme';

export default function MarketingScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.primary }]}>VOPI</Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>Turn product videos into ready-to-sell listings</Text>

        <View style={[styles.heroSection, { backgroundColor: colors.primaryBackground }]}>
          <Text style={[styles.heroText, { color: colors.text }]}>
            VOPI uses AI to transform a simple product video into professional commercial images, detailed descriptions, and platform-ready listings — in minutes, not hours.
          </Text>
        </View>

        <Text style={[styles.section, { color: colors.text }]}>How It Works</Text>

        <View style={styles.step}>
          <Text style={[styles.stepNumber, { backgroundColor: colors.primary }]}>1</Text>
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Record or Upload</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              Capture a short video of your product, or upload an existing one. Show it from multiple angles and describe its features.
            </Text>
          </View>
        </View>

        <View style={styles.step}>
          <Text style={[styles.stepNumber, { backgroundColor: colors.primary }]}>2</Text>
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>AI Processing</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              VOPI analyzes your video using advanced AI to extract product details, generate commercial-quality images, and write compelling descriptions.
            </Text>
          </View>
        </View>

        <View style={styles.step}>
          <Text style={[styles.stepNumber, { backgroundColor: colors.primary }]}>3</Text>
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Review and Export</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              Review the generated listing, edit any details, and export to Shopify, Amazon, eBay, or download the images directly.
            </Text>
          </View>
        </View>

        <Text style={[styles.section, { color: colors.text }]}>Features</Text>

        <View style={styles.feature}>
          <Text style={[styles.featureTitle, { color: colors.text }]}>Commercial Image Generation</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Get multiple image variants for each product — transparent background, solid color, lifestyle, and creative styles.
          </Text>
        </View>

        <View style={styles.feature}>
          <Text style={[styles.featureTitle, { color: colors.text }]}>Smart Product Metadata</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            AI-extracted titles, descriptions, bullet points, pricing, materials, categories, and more — all editable to your liking.
          </Text>
        </View>

        <View style={styles.feature}>
          <Text style={[styles.featureTitle, { color: colors.text }]}>Multi-Platform Listings</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Automatically formatted listings for Shopify, Amazon, and eBay. Each platform gets optimized content tailored to its requirements.
          </Text>
        </View>

        <View style={styles.feature}>
          <Text style={[styles.featureTitle, { color: colors.text }]}>Recording Tips</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Real-time tips while recording guide you on what to mention — brand, materials, pricing, target audience — for the best AI results.
          </Text>
        </View>

        <Text style={[styles.section, { color: colors.text }]}>Pricing</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          VOPI uses a credit-based system. New users receive free credits to get started. Additional credits can be purchased in-app starting at $0.99.
        </Text>

        <Text style={[styles.section, { color: colors.text }]}>About 24Rabbit</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          VOPI is built by 24Rabbit, focused on making e-commerce product creation fast and accessible for sellers of all sizes.
        </Text>

        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
  },
  title: {
    fontSize: 36,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  tagline: {
    fontSize: fontSize.lg,
    marginBottom: spacing.xl,
  },
  heroSection: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.sm,
  },
  heroText: {
    fontSize: fontSize.md,
    lineHeight: 26,
  },
  section: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: 28,
    marginBottom: spacing.lg,
  },
  step: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    lineHeight: 36,
    marginRight: spacing.lg,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  paragraph: {
    fontSize: fontSize.md,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  feature: {
    marginBottom: spacing.sm,
  },
  featureTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  footer: {
    height: 40,
  },
});
