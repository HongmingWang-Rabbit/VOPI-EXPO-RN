import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/ThemeContext';
import { spacing, borderRadius, fontSize, fontWeight } from '../src/theme';

const SUPPORT_EMAIL = 'support@24rabbit.com';

export default function SupportScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Support</Text>
        <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>VOPI by 24Rabbit</Text>

        <Text style={[styles.section, { color: colors.text }]}>Contact Us</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          If you need help or have questions about VOPI, we're here to assist you. Reach out to our support team and we'll get back to you as soon as possible.
        </Text>

        <TouchableOpacity
          style={[styles.emailButton, { backgroundColor: colors.primary }]}
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          accessibilityRole="button"
          accessibilityLabel={`Send email to ${SUPPORT_EMAIL}`}
        >
          <Text style={styles.emailButtonText}>{SUPPORT_EMAIL}</Text>
        </TouchableOpacity>

        <Text style={[styles.section, { color: colors.text }]}>Frequently Asked Questions</Text>

        <Text style={[styles.question, { color: colors.text }]}>How do I create a product listing?</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Record or upload a video of your product from the Home tab. VOPI will analyze the video, extract product details, and generate commercial images automatically.
        </Text>

        <Text style={[styles.question, { color: colors.text }]}>How long does processing take?</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Most videos are processed within 2-5 minutes depending on length and complexity. You can monitor progress in the Products tab.
        </Text>

        <Text style={[styles.question, { color: colors.text }]}>What video formats are supported?</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          VOPI supports MP4, MOV, and WebM formats. Videos can be up to 5 minutes long and 500 MB in size.
        </Text>

        <Text style={[styles.question, { color: colors.text }]}>How do credits work?</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Each video processing job costs credits based on video duration. You receive free credits on signup and can purchase additional credits from the Settings tab.
        </Text>

        <Text style={[styles.question, { color: colors.text }]}>Can I edit the generated product details?</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Yes. After processing completes, tap on a product to view its details. All fields including title, description, price, and more can be edited inline.
        </Text>

        <Text style={[styles.question, { color: colors.text }]}>How do I delete a product or image?</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          To delete a product, tap the trash icon on the product card in the Products tab. To delete individual images, open the image in fullscreen and tap the trash icon.
        </Text>

        <Text style={[styles.question, { color: colors.text }]}>Is my data secure?</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Yes. All data is encrypted in transit and at rest. Videos are deleted after processing. Authentication uses OAuth with PKCE for maximum security.
        </Text>

        <Text style={[styles.section, { color: colors.text }]}>System Requirements</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          • iOS 16.0 or later{'\n'}
          • Android 10 or later{'\n'}
          • Camera and microphone access (for recording){'\n'}
          • Internet connection
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
    fontSize: 28,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  lastUpdated: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xl,
  },
  section: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  question: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  paragraph: {
    fontSize: fontSize.md,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  emailButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  emailButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  footer: {
    height: 40,
  },
});
