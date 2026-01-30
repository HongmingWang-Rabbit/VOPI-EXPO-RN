import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SUPPORT_EMAIL = 'support@24rabbit.com';

export default function SupportScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Support</Text>
        <Text style={styles.lastUpdated}>VOPI by 24Rabbit</Text>

        <Text style={styles.section}>Contact Us</Text>
        <Text style={styles.paragraph}>
          If you need help or have questions about VOPI, we're here to assist you. Reach out to our support team and we'll get back to you as soon as possible.
        </Text>

        <TouchableOpacity
          style={styles.emailButton}
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          accessibilityRole="button"
          accessibilityLabel={`Send email to ${SUPPORT_EMAIL}`}
        >
          <Text style={styles.emailButtonText}>{SUPPORT_EMAIL}</Text>
        </TouchableOpacity>

        <Text style={styles.section}>Frequently Asked Questions</Text>

        <Text style={styles.question}>How do I create a product listing?</Text>
        <Text style={styles.paragraph}>
          Record or upload a video of your product from the Home tab. VOPI will analyze the video, extract product details, and generate commercial images automatically.
        </Text>

        <Text style={styles.question}>How long does processing take?</Text>
        <Text style={styles.paragraph}>
          Most videos are processed within 2-5 minutes depending on length and complexity. You can monitor progress in the Products tab.
        </Text>

        <Text style={styles.question}>What video formats are supported?</Text>
        <Text style={styles.paragraph}>
          VOPI supports MP4, MOV, and WebM formats. Videos can be up to 5 minutes long and 500 MB in size.
        </Text>

        <Text style={styles.question}>How do credits work?</Text>
        <Text style={styles.paragraph}>
          Each video processing job costs credits based on video duration. You receive free credits on signup and can purchase additional credits from the Settings tab.
        </Text>

        <Text style={styles.question}>Can I edit the generated product details?</Text>
        <Text style={styles.paragraph}>
          Yes. After processing completes, tap on a product to view its details. All fields including title, description, price, and more can be edited inline.
        </Text>

        <Text style={styles.question}>How do I delete a product or image?</Text>
        <Text style={styles.paragraph}>
          To delete a product, tap the trash icon on the product card in the Products tab. To delete individual images, open the image in fullscreen and tap the trash icon.
        </Text>

        <Text style={styles.question}>Is my data secure?</Text>
        <Text style={styles.paragraph}>
          Yes. All data is encrypted in transit and at rest. Videos are deleted after processing. Authentication uses OAuth with PKCE for maximum security.
        </Text>

        <Text style={styles.section}>System Requirements</Text>
        <Text style={styles.paragraph}>
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
  question: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 6,
    color: '#1a1a1a',
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 12,
  },
  emailButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 8,
  },
  emailButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    height: 40,
  },
});
