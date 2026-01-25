import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useCredits } from '../../src/hooks/useCredits';
import { useVOPIUpload } from '../../src/hooks/useVOPIUpload';
import { VideoPicker } from '../../src/components/ui/VideoPicker';
import { UploadProgress } from '../../src/components/ui/UploadProgress';

export default function HomeScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { balance, refresh: refreshCredits } = useCredits();
  const { state, uploadAndProcess, cancel, reset } = useVOPIUpload();

  const handleVideoSelect = async (video: { uri: string; fileName?: string; mimeType?: string }) => {
    await uploadAndProcess(video);
  };

  const handleViewResults = () => {
    if (state.status === 'completed') {
      router.push({
        pathname: '/results',
        params: {
          jobId: state.job.id,
        },
      });
    }
  };

  const isProcessing = state.status === 'uploading' || state.status === 'processing';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name || 'User'}</Text>
          <Text style={styles.credits}>{balance} credits</Text>
        </View>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.signOut}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Process Video</Text>
        <Text style={styles.description}>
          Select a product video to extract frames and generate commercial images.
        </Text>

        <VideoPicker onSelect={handleVideoSelect} disabled={isProcessing} />

        <UploadProgress state={state} onCancel={cancel} />

        {state.status === 'completed' && (
          <View style={styles.completedActions}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleViewResults}>
              <Text style={styles.primaryButtonText}>View Results</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                reset();
                refreshCredits();
              }}
            >
              <Text style={styles.secondaryButtonText}>Process Another Video</Text>
            </TouchableOpacity>
          </View>
        )}

        {(state.status === 'error' || state.status === 'cancelled') && (
          <TouchableOpacity style={styles.secondaryButton} onPress={reset}>
            <Text style={styles.secondaryButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
  },
  credits: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  signOut: {
    color: '#FF3B30',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  completedActions: {
    marginTop: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
});
