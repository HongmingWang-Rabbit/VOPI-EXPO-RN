import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TermsOfServiceScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.lastUpdated}>Last updated: January 25, 2025</Text>

        <Text style={styles.section}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By accessing or using VOPI ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
        </Text>

        <Text style={styles.section}>2. Description of Service</Text>
        <Text style={styles.paragraph}>
          VOPI is a video processing service that extracts high-quality product photography frames from videos and generates commercial images using artificial intelligence.
        </Text>

        <Text style={styles.section}>3. User Accounts</Text>
        <Text style={styles.paragraph}>
          To use the Service, you must create an account using Google or Apple authentication. You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account.
        </Text>

        <Text style={styles.section}>4. Credits and Payments</Text>
        <Text style={styles.paragraph}>
          • New users receive 5 free credits upon registration{'\n'}
          • Additional credits can be purchased through the app{'\n'}
          • Credits are non-refundable and non-transferable{'\n'}
          • Credit prices may change with notice{'\n'}
          • All payments are processed securely through Stripe
        </Text>

        <Text style={styles.section}>5. Acceptable Use</Text>
        <Text style={styles.paragraph}>
          You agree not to:{'\n'}
          • Upload content that infringes on intellectual property rights{'\n'}
          • Upload illegal, harmful, or offensive content{'\n'}
          • Attempt to reverse engineer or exploit the Service{'\n'}
          • Use the Service for any unlawful purpose{'\n'}
          • Share your account credentials with others
        </Text>

        <Text style={styles.section}>6. Content Ownership</Text>
        <Text style={styles.paragraph}>
          You retain ownership of all videos you upload. By uploading content, you grant us a limited license to process your videos for the purpose of providing the Service. Generated images are owned by you upon creation.
        </Text>

        <Text style={styles.section}>7. Intellectual Property</Text>
        <Text style={styles.paragraph}>
          The Service, including its original content, features, and functionality, is owned by 24Rabbit and is protected by international copyright, trademark, and other intellectual property laws.
        </Text>

        <Text style={styles.section}>8. Disclaimer of Warranties</Text>
        <Text style={styles.paragraph}>
          The Service is provided "as is" without warranties of any kind. We do not guarantee that the Service will be uninterrupted, secure, or error-free. AI-generated content may not always meet your expectations.
        </Text>

        <Text style={styles.section}>9. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          To the maximum extent permitted by law, 24Rabbit shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service.
        </Text>

        <Text style={styles.section}>10. Termination</Text>
        <Text style={styles.paragraph}>
          We reserve the right to terminate or suspend your account at any time for violation of these Terms. You may also delete your account at any time through the app settings.
        </Text>

        <Text style={styles.section}>11. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We may modify these Terms at any time. We will notify users of significant changes via email or in-app notification. Continued use of the Service after changes constitutes acceptance of the new Terms.
        </Text>

        <Text style={styles.section}>12. Governing Law</Text>
        <Text style={styles.paragraph}>
          These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
        </Text>

        <Text style={styles.section}>13. Contact Information</Text>
        <Text style={styles.paragraph}>
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
    backgroundColor: '#fff',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  section: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
    color: '#1a1a1a',
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 12,
  },
  footer: {
    height: 40,
  },
});
