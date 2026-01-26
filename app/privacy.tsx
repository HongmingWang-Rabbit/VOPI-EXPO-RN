import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.lastUpdated}>Last updated: January 25, 2025</Text>

        <Text style={styles.section}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          VOPI ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and web service.
        </Text>

        <Text style={styles.section}>2. Information We Collect</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Account Information:</Text> When you sign in using Google or Apple, we receive your name, email address, and profile picture from the authentication provider.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Video Content:</Text> Videos you upload for processing are temporarily stored on our servers and automatically deleted after processing is complete.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Usage Data:</Text> We collect information about how you use our service, including job history and credit transactions.
        </Text>

        <Text style={styles.section}>3. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use the information we collect to:{'\n'}
          • Provide and maintain our service{'\n'}
          • Process your video uploads and generate commercial images{'\n'}
          • Manage your account and credit balance{'\n'}
          • Send you service-related communications{'\n'}
          • Improve and optimize our service
        </Text>

        <Text style={styles.section}>4. Data Storage and Security</Text>
        <Text style={styles.paragraph}>
          Your data is stored on secure servers using industry-standard encryption. Video files are processed and then deleted. Generated images are stored temporarily and can be downloaded within 24 hours.
        </Text>

        <Text style={styles.section}>5. Third-Party Services</Text>
        <Text style={styles.paragraph}>
          We use the following third-party services:{'\n'}
          • Google OAuth for authentication{'\n'}
          • Apple Sign In for authentication{'\n'}
          • Stripe for payment processing{'\n'}
          • Amazon Web Services for storage and processing
        </Text>

        <Text style={styles.section}>6. Your Rights</Text>
        <Text style={styles.paragraph}>
          You have the right to:{'\n'}
          • Access your personal data{'\n'}
          • Request deletion of your account and data{'\n'}
          • Opt out of marketing communications{'\n'}
          • Export your data
        </Text>

        <Text style={styles.section}>7. Data Retention</Text>
        <Text style={styles.paragraph}>
          We retain your account information for as long as your account is active. You can request deletion of your account at any time by contacting us.
        </Text>

        <Text style={styles.section}>8. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children.
        </Text>

        <Text style={styles.section}>9. Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
        </Text>

        <Text style={styles.section}>10. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions about this Privacy Policy, please contact us at:{'\n'}
          Email: privacy@24rabbit.com
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
  bold: {
    fontWeight: '600',
  },
  footer: {
    height: 40,
  },
});
