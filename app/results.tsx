import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { vopiService } from '../src/services/vopi.service';
import { DownloadUrlsResponse, Job, ProductMetadata } from '../src/types/vopi.types';
import { useConnections } from '../src/hooks/useConnections';
import { FlatImageGallery } from '../src/components/product/FlatImageGallery';
import { EditableField } from '../src/components/product/EditableField';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../src/theme';

export default function ResultsScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [downloadUrls, setDownloadUrls] = useState<DownloadUrlsResponse | null>(null);
  const [metadata, setMetadata] = useState<ProductMetadata | null>(null);
  const [publishAsDraft, setPublishAsDraft] = useState(true);
  const [pushing, setPushing] = useState(false);
  const { activeShopifyConnection, loading: connectionsLoading } = useConnections();

  const fetchResults = useCallback(async () => {
    if (!jobId) return;

    try {
      setLoading(true);
      setError(null);

      const [jobResult, urlsResult, metaResult] = await Promise.allSettled([
        vopiService.getJob(jobId),
        vopiService.getDownloadUrls(jobId),
        vopiService.getProductMetadata(jobId),
      ]);

      if (jobResult.status === 'rejected') {
        throw jobResult.reason;
      }

      const jobData = jobResult.value;
      const urlsData = urlsResult.status === 'fulfilled' ? urlsResult.value : null;
      const metaData = metaResult.status === 'fulfilled' ? metaResult.value : null;

      if (__DEV__) {
        if (urlsResult.status === 'rejected') console.warn('[Results] Failed to fetch URLs:', urlsResult.reason);
        if (metaResult.status === 'rejected') console.warn('[Results] Failed to fetch metadata:', metaResult.reason);
      }

      setJob(jobData);
      setDownloadUrls(urlsData);
      setMetadata(metaData ?? urlsData?.productMetadata ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleDeleteImage = useCallback(
    async (frameId: string, version: string) => {
      if (!jobId) return;
      await vopiService.deleteJobImage(jobId, frameId, version);
    },
    [jobId]
  );

  const saveField = useCallback(
    async (field: keyof ProductMetadata['product'], value: string | string[] | number) => {
      if (!jobId) return;
      try {
        const updated = await vopiService.updateProductMetadata(jobId, { [field]: value });
        setMetadata(updated);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        Alert.alert(`Failed to save ${field}`, message);
        throw err;
      }
    },
    [jobId]
  );

  const handlePushToShopify = useCallback(async () => {
    if (!jobId || !activeShopifyConnection) return;
    try {
      setPushing(true);
      const { confidence: _, ...productFields } = metadata?.product ?? {} as ProductMetadata['product'];
      const response = await vopiService.pushToListing({
        jobId,
        connectionId: activeShopifyConnection.id,
        options: {
          publishAsDraft,
          overrideMetadata: productFields,
        },
      });
      Alert.alert('Success', `Product pushed to Shopify (${response.status}).`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Push Failed', message);
    } finally {
      setPushing(false);
    }
  }, [jobId, activeShopifyConnection, publishAsDraft, metadata]);

  const product = metadata?.product;
  const title = product?.title || `Job #${jobId?.slice(0, 8)}`;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading results...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} accessibilityRole="header">Results</Text>
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchResults}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.closeButton}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        {downloadUrls?.commercialImages &&
        Object.keys(downloadUrls.commercialImages).length > 0 ? (
          <View style={styles.section}>
            <FlatImageGallery
              commercialImages={downloadUrls.commercialImages}
              jobId={jobId!}
              onDeleteImage={handleDeleteImage}
            />
          </View>
        ) : (
          <View style={styles.emptyImages}>
            <Text style={styles.emptyText}>
              {job?.status === 'completed'
                ? 'No commercial images were generated.'
                : `Job status: ${job?.status || 'unknown'}`}
            </Text>
          </View>
        )}

        {/* Editable Metadata */}
        {product && (
          <View style={styles.metadataSection}>
            <Text style={styles.sectionTitle}>Product Details</Text>

            <EditableField
              label="Title"
              value={product.title}
              onSave={(v) => saveField('title', v)}
            />
            <EditableField
              label="Description"
              value={product.description}
              onSave={(v) => saveField('description', v)}
              multiline
            />
            <EditableField
              label="Short Description"
              value={product.shortDescription}
              onSave={(v) => saveField('shortDescription', v)}
            />
            <EditableField
              label="Brand"
              value={product.brand}
              onSave={(v) => saveField('brand', v)}
            />
            <EditableField
              label="Category"
              value={product.category}
              onSave={(v) => saveField('category', v)}
            />
            <EditableField
              label="Color"
              value={product.color}
              onSave={(v) => saveField('color', v)}
            />
            <EditableField
              label="Price"
              value={product.price}
              onSave={(v) => saveField('price', v)}
              isNumber
            />
            <EditableField
              label="Currency"
              value={product.currency}
              onSave={(v) => saveField('currency', v)}
            />
            <EditableField
              label="Compare At Price"
              value={product.compareAtPrice}
              onSave={(v) => saveField('compareAtPrice', v)}
              isNumber
            />
            <EditableField
              label="Cost Per Item"
              value={product.costPerItem}
              onSave={(v) => saveField('costPerItem', v)}
              isNumber
            />

            <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Demographics</Text>

            <EditableField
              label="Gender"
              value={product.gender}
              onSave={(v) => saveField('gender', v)}
            />
            <EditableField
              label="Target Audience"
              value={product.targetAudience}
              onSave={(v) => saveField('targetAudience', v)}
            />
            <EditableField
              label="Age Group"
              value={product.ageGroup}
              onSave={(v) => saveField('ageGroup', v)}
            />
            <EditableField
              label="Style"
              value={product.style}
              onSave={(v) => saveField('style', v)}
            />
            <EditableField
              label="Model Number"
              value={product.modelNumber}
              onSave={(v) => saveField('modelNumber', v)}
            />
            <EditableField
              label="Manufacturer"
              value={product.manufacturer}
              onSave={(v) => saveField('manufacturer', v)}
            />
            <EditableField
              label="Country of Origin"
              value={product.countryOfOrigin}
              onSave={(v) => saveField('countryOfOrigin', v)}
            />
            <EditableField
              label="Pattern"
              value={product.pattern}
              onSave={(v) => saveField('pattern', v)}
            />
            <EditableField
              label="Product Type"
              value={product.productType}
              onSave={(v) => saveField('productType', v)}
            />

            <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Lists</Text>

            <EditableField
              label="Bullet Points"
              value={product.bulletPoints}
              onSave={(v) => saveField('bulletPoints', v)}
              isArray
            />
            <EditableField
              label="Materials"
              value={product.materials}
              onSave={(v) => saveField('materials', v)}
              isArray
            />
            <EditableField
              label="Keywords"
              value={product.keywords}
              onSave={(v) => saveField('keywords', v)}
              isArray
            />
          </View>
        )}

        {/* Push to Shopify */}
        {job?.status === 'completed' && !connectionsLoading && (
          <View style={styles.shopifySection}>
            <Text style={styles.sectionTitle}>Push to Shopify</Text>
            {activeShopifyConnection ? (
              <>
                <View style={styles.draftRow}>
                  <Text style={styles.draftLabel}>Publish as draft</Text>
                  <Switch
                    value={publishAsDraft}
                    onValueChange={setPublishAsDraft}
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.pushButton, pushing && styles.pushButtonDisabled]}
                  onPress={handlePushToShopify}
                  disabled={pushing}
                  accessibilityRole="button"
                  accessibilityLabel="Push product to Shopify"
                >
                  {pushing ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={20} color={colors.white} />
                      <Text style={styles.pushButtonText}>Push to Shopify</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.noConnectionCard}>
                <Ionicons name="storefront-outline" size={24} color={colors.textSecondary} />
                <Text style={styles.noConnectionText}>
                  Connect your Shopify store in Settings to push products.
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scroll: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.md,
  },
  closeButton: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  section: {
    paddingTop: spacing.lg,
  },
  metadataSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  emptyImages: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  shopifySection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  draftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  draftLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  pushButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  pushButtonDisabled: {
    opacity: 0.6,
  },
  pushButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  noConnectionCard: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  noConnectionText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  bottomSpacer: {
    height: spacing.xxxl,
  },
});
