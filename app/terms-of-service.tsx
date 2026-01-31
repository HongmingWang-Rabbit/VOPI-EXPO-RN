import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/ThemeContext';
import { spacing, fontSize, fontWeight } from '../src/theme';

export default function TermsOfServiceScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Terms of Service</Text>
        <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>Last updated: January 25, 2025</Text>

        <Text style={[styles.section, { color: colors.text }]}>1. Acceptance of Terms</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          By accessing or using VOPI ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
        </Text>

        <Text style={[styles.section, { color: colors.text }]}>2. Description of Service</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          VOPI is a video processing service that extracts high-quality product photography frames from videos and generates commercial images using artificial intelligence.
        </Text>

        <Text style={[styles.section, { color: colors.text }]}>3. User Accounts</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          To use the Service, you must create an account using Google or Apple authentication. You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account.
        </Text>

        <Text style={[styles.section, { color: colors.text }]}>4. Credits and Payments</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          • New users receive 5 free credits upon registration{'\n'}
          • Additional credits can be purchased through the app{'\n'}
          • Credits are non-refundable and non-transferable{'\n'}
          • Credit prices may change with notice{'\n'}
          • All payments are processed securely through Stripe
        </Text>

        <Text style={[styles.section, { color: colors.text }]}>5. Acceptable Use</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          You agree not to:{'\n'}
          • Upload content that infringes on intellectual property rights{'\n'}
          • Upload illegal, harmful, or offensive content{'\n'}
          • Attempt to reverse engineer or exploit the Service{'\n'}
          • Use the Service for any unlawful purpose{'\n'}
          • Share your account credentials with others
        </Text>

        <Text style={[styles.section, { color: colors.text }]}>6. Content Ownership</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          You retain ownership of all videos you upload. By uploading content, you grant us a limited license to process your videos for the purpose of providing the Service. Generated images are owned by you upon creation.
        </Text>

        <Text style={[styles.section, { color: colors.text }]}>7. Intellectual Property</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          The Service, including its original content, features, and functionality, is owned by 24Rabbit and is protected by international copyright, trademark, and other intellectual property laws.
        </Text>

        <Text style={[styles.section, { color: colors.text }]}>8. Disclaimer of Warranties</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          The Service is provided "as is" without warranties of any kind. We do not guarantee that the Service will be uninterrupted, secure, or error-free. AI-generated content may not always meet your expectations.
        </Text>

        <Text style={[styles.section, { color: colors.text }]}>9. Limitation of Liability</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          To the maximum extent permitted by law, 24Rabbit shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service.
        </Text>

        <Text style={[styles.section, { color: colors.text }]}>10. Termination</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          We reserve the right to terminate or suspend your account at any time for violation of these Terms. You may also delete your account at any time through the app settings.
        </Text>

        <Text style={[styles.section, { color: colors.text }]}>11. Changes to Terms</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          We may modify these Terms at any time. We will notify users of significant changes via email or in-app notification. Continued use of the Service after changes constitutes acceptance of the new Terms.
        </Text>

        <Text style={[styles.section, { color: colors.text }]}>12. Governing Law</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
        </Text>

        <Text style={[styles.section, { color: colors.text }]}>13. Contact Information</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          For questions about these Terms, please contact us at:{'\n'}
          Email: legal@24rabbit.com
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
  paragraph: {
    fontSize: fontSize.md,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  footer: {
    height: 40,
  },
});
