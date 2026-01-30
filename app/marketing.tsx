import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MarketingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>VOPI</Text>
        <Text style={styles.tagline}>Turn product videos into ready-to-sell listings</Text>

        <View style={styles.heroSection}>
          <Text style={styles.heroText}>
            VOPI uses AI to transform a simple product video into professional commercial images, detailed descriptions, and platform-ready listings — in minutes, not hours.
          </Text>
        </View>

        <Text style={styles.section}>How It Works</Text>

        <View style={styles.step}>
          <Text style={styles.stepNumber}>1</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Record or Upload</Text>
            <Text style={styles.paragraph}>
              Capture a short video of your product, or upload an existing one. Show it from multiple angles and describe its features.
            </Text>
          </View>
        </View>

        <View style={styles.step}>
          <Text style={styles.stepNumber}>2</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>AI Processing</Text>
            <Text style={styles.paragraph}>
              VOPI analyzes your video using advanced AI to extract product details, generate commercial-quality images, and write compelling descriptions.
            </Text>
          </View>
        </View>

        <View style={styles.step}>
          <Text style={styles.stepNumber}>3</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Review and Export</Text>
            <Text style={styles.paragraph}>
              Review the generated listing, edit any details, and export to Shopify, Amazon, eBay, or download the images directly.
            </Text>
          </View>
        </View>

        <Text style={styles.section}>Features</Text>

        <View style={styles.feature}>
          <Text style={styles.featureTitle}>Commercial Image Generation</Text>
          <Text style={styles.paragraph}>
            Get multiple image variants for each product — transparent background, solid color, lifestyle, and creative styles.
          </Text>
        </View>

        <View style={styles.feature}>
          <Text style={styles.featureTitle}>Smart Product Metadata</Text>
          <Text style={styles.paragraph}>
            AI-extracted titles, descriptions, bullet points, pricing, materials, categories, and more — all editable to your liking.
          </Text>
        </View>

        <View style={styles.feature}>
          <Text style={styles.featureTitle}>Multi-Platform Listings</Text>
          <Text style={styles.paragraph}>
            Automatically formatted listings for Shopify, Amazon, and eBay. Each platform gets optimized content tailored to its requirements.
          </Text>
        </View>

        <View style={styles.feature}>
          <Text style={styles.featureTitle}>Recording Tips</Text>
          <Text style={styles.paragraph}>
            Real-time tips while recording guide you on what to mention — brand, materials, pricing, target audience — for the best AI results.
          </Text>
        </View>

        <Text style={styles.section}>Pricing</Text>
        <Text style={styles.paragraph}>
          VOPI uses a credit-based system. New users receive free credits to get started. Additional credits can be purchased in-app starting at $0.99.
        </Text>

        <Text style={styles.section}>About 24Rabbit</Text>
        <Text style={styles.paragraph}>
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
    backgroundColor: '#fff',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  heroSection: {
    backgroundColor: '#F5F8FF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 8,
  },
  heroText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#333',
  },
  section: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 28,
    marginBottom: 16,
    color: '#1a1a1a',
  },
  step: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 36,
    marginRight: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 12,
  },
  feature: {
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  footer: {
    height: 40,
  },
});
