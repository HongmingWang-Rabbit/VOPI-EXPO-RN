import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Switch, Modal, TextInput, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { vopiService } from '../src/services/vopi.service';
import { DownloadUrlsResponse, Job, PlatformConnection, ProductMetadata } from '../src/types/vopi.types';
import { useConnections } from '../src/hooks/useConnections';
import { useTheme } from '../src/contexts/ThemeContext';
import { useToast } from '../src/contexts/ToastContext';
import { haptics } from '../src/utils/haptics';
import { FlatImageGallery } from '../src/components/product/FlatImageGallery';
import { EditableField } from '../src/components/product/EditableField';
import { SkeletonResultsPage } from '../src/components/ui/SkeletonResultsPage';
import { useTemplates } from '../src/hooks/useTemplates';
import { MetadataTemplate } from '../src/services/templates';
import { spacing, borderRadius, fontSize, fontWeight, shadows } from '../src/theme';

const BACK_ICON_SIZE = 24;

function PlatformPushButton({
  platform,
  label,
  pushing,
  disabled,
  onPress,
}: {
  platform: string;
  label: string;
  pushing: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.pushButton, { backgroundColor: colors.primary }, pushing && styles.pushButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Push product to ${label}`}
    >
      <View style={styles.pushButtonContent}>
        {pushing ? (
          <Text style={styles.pushButtonText}>Pushing...</Text>
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
            <Text style={styles.pushButtonText}>Push to {label}</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

/** Fields that are per-product and should NOT be saved into reusable templates */
const PER_PRODUCT_FIELDS: ReadonlySet<keyof ProductMetadata['product']> = new Set([
  'confidence', 'title', 'description', 'shortDescription', 'bulletPoints',
] as const);

export default function ResultsScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [downloadUrls, setDownloadUrls] = useState<DownloadUrlsResponse | null>(null);
  const [metadata, setMetadata] = useState<ProductMetadata | null>(null);
  const [partialError, setPartialError] = useState<string | null>(null);
  const [publishAsDraft, setPublishAsDraft] = useState(true);
  const [pushingPlatform, setPushingPlatform] = useState<string | null>(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showApplyTemplate, setShowApplyTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const { templates, saveTemplate, deleteTemplate } = useTemplates();
  const { activeShopifyConnection, activeAmazonConnection, activeEbayConnection, loading: connectionsLoading } = useConnections();

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

      const failedParts: string[] = [];
      if (urlsResult.status === 'rejected') failedParts.push('images');
      if (metaResult.status === 'rejected') failedParts.push('metadata');
      setPartialError(failedParts.length > 0 ? `Failed to load ${failedParts.join(' and ')}` : null);

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

  const handlePushToPlatform = useCallback(async (connection: PlatformConnection, platformName: string, draft?: boolean) => {
    if (!jobId) return;
    haptics.light();
    try {
      setPushingPlatform(connection.platform);
      const { confidence: _, ...productFields } = metadata?.product ?? ({} as Partial<ProductMetadata['product']>);
      const response = await vopiService.pushToListing({
        jobId,
        connectionId: connection.id,
        options: {
          ...(draft !== undefined && { publishAsDraft: draft }),
          overrideMetadata: productFields,
        },
      });
      haptics.success();
      showToast(`Product pushed to ${platformName} (${response.status}).`, 'success');
    } catch (err) {
      haptics.error();
      const message = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Push failed: ${message}`, 'error');
    } finally {
      setPushingPlatform(null);
    }
  }, [jobId, metadata, showToast]);

  const handleSaveTemplate = useCallback(async () => {
    if (!templateName.trim() || !metadata?.product) return;
    try {
      const reusableFields = Object.fromEntries(
        Object.entries(metadata.product).filter(([key]) => !PER_PRODUCT_FIELDS.has(key as keyof ProductMetadata['product']))
      );
      await saveTemplate(templateName.trim(), reusableFields as MetadataTemplate['fields']);
      setTemplateName('');
      setShowSaveTemplate(false);
      showToast('Template saved', 'success');
    } catch {
      showToast('Failed to save template', 'error');
    }
  }, [templateName, metadata, saveTemplate, showToast]);

  const handleApplyTemplate = useCallback(async (template: MetadataTemplate) => {
    if (!jobId) return;
    try {
      const updated = await vopiService.updateProductMetadata(jobId, template.fields);
      setMetadata(updated);
      setShowApplyTemplate(false);
      haptics.success();
      showToast(`Applied "${template.name}"`, 'success');
    } catch (err) {
      showToast('Failed to apply template', 'error');
    }
  }, [jobId, showToast]);

  const product = metadata?.product;
  const title = product?.title || `Job #${jobId?.slice(0, 8)}`;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={BACK_ICON_SIZE} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} accessibilityRole="header">Results</Text>
          <View style={styles.headerSpacer} />
        </View>
        <SkeletonResultsPage />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={BACK_ICON_SIZE} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} accessibilityRole="header">Results</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={fetchResults}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={BACK_ICON_SIZE} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Partial load warning — tap to retry */}
        {partialError && (
          <TouchableOpacity
            style={[styles.partialErrorBanner, { backgroundColor: colors.warningLight }]}
            onPress={fetchResults}
            accessibilityRole="button"
            accessibilityLabel="Retry loading failed data"
          >
            <Ionicons name="warning-outline" size={16} color={colors.warning} />
            <Text style={[styles.partialErrorText, { color: colors.warning }]}>{partialError}. Tap to retry.</Text>
          </TouchableOpacity>
        )}

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
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {job?.status === 'completed'
                ? 'No commercial images were generated.'
                : `Job status: ${job?.status || 'unknown'}`}
            </Text>
          </View>
        )}

        {/* Editable Metadata */}
        {product && (
          <View style={styles.metadataSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Product Details</Text>

            <EditableField label="Title" value={product.title} onSave={(v) => saveField('title', v)} />
            <EditableField label="Description" value={product.description} onSave={(v) => saveField('description', v)} multiline />
            <EditableField label="Short Description" value={product.shortDescription} onSave={(v) => saveField('shortDescription', v)} />
            <EditableField label="Brand" value={product.brand} onSave={(v) => saveField('brand', v)} />
            <EditableField label="Category" value={product.category} onSave={(v) => saveField('category', v)} />
            <EditableField label="Color" value={product.color} onSave={(v) => saveField('color', v)} />
            <EditableField label="Price" value={product.price} onSave={(v) => saveField('price', v)} isNumber />
            <EditableField label="Currency" value={product.currency} onSave={(v) => saveField('currency', v)} />
            <EditableField label="Compare At Price" value={product.compareAtPrice} onSave={(v) => saveField('compareAtPrice', v)} isNumber />
            <EditableField label="Cost Per Item" value={product.costPerItem} onSave={(v) => saveField('costPerItem', v)} isNumber />

            <Text style={[styles.sectionTitle, { marginTop: spacing.xl, color: colors.text }]}>Demographics</Text>

            <EditableField label="Gender" value={product.gender} onSave={(v) => saveField('gender', v)} />
            <EditableField label="Target Audience" value={product.targetAudience} onSave={(v) => saveField('targetAudience', v)} />
            <EditableField label="Age Group" value={product.ageGroup} onSave={(v) => saveField('ageGroup', v)} />
            <EditableField label="Style" value={product.style} onSave={(v) => saveField('style', v)} />
            <EditableField label="Model Number" value={product.modelNumber} onSave={(v) => saveField('modelNumber', v)} />
            <EditableField label="Manufacturer" value={product.manufacturer} onSave={(v) => saveField('manufacturer', v)} />
            <EditableField label="Country of Origin" value={product.countryOfOrigin} onSave={(v) => saveField('countryOfOrigin', v)} />
            <EditableField label="Pattern" value={product.pattern} onSave={(v) => saveField('pattern', v)} />
            <EditableField label="Product Type" value={product.productType} onSave={(v) => saveField('productType', v)} />

            <Text style={[styles.sectionTitle, { marginTop: spacing.xl, color: colors.text }]}>Lists</Text>

            <EditableField label="Bullet Points" value={product.bulletPoints} onSave={(v) => saveField('bulletPoints', v)} isArray />
            <EditableField label="Materials" value={product.materials} onSave={(v) => saveField('materials', v)} isArray />
            <EditableField label="Keywords" value={product.keywords} onSave={(v) => saveField('keywords', v)} isArray />
          </View>
        )}

        {/* Templates */}
        {product && (
          <View style={styles.templateSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Templates</Text>
            <View style={styles.templateButtons}>
              <TouchableOpacity
                style={[styles.templateBtn, { borderColor: colors.border }]}
                onPress={() => setShowSaveTemplate(true)}
              >
                <Ionicons name="save-outline" size={18} color={colors.primary} />
                <Text style={[styles.templateBtnText, { color: colors.primary }]}>Save as Template</Text>
              </TouchableOpacity>
              {templates.length > 0 && (
                <TouchableOpacity
                  style={[styles.templateBtn, { borderColor: colors.border }]}
                  onPress={() => setShowApplyTemplate(true)}
                >
                  <Ionicons name="clipboard-outline" size={18} color={colors.primary} />
                  <Text style={[styles.templateBtnText, { color: colors.primary }]}>Apply Template</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Push to Platforms */}
        {job?.status === 'completed' && !connectionsLoading && (
          <View style={styles.shopifySection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Push to Platform</Text>

            {/* Shopify */}
            {activeShopifyConnection ? (
              <>
                <View style={styles.draftRow}>
                  <Text style={[styles.draftLabel, { color: colors.text }]}>Shopify: publish as draft</Text>
                  <Switch
                    value={publishAsDraft}
                    onValueChange={setPublishAsDraft}
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                </View>
                <PlatformPushButton
                  platform="shopify"
                  label="Shopify"
                  pushing={pushingPlatform === 'shopify'}
                  disabled={pushingPlatform !== null}
                  onPress={() => handlePushToPlatform(activeShopifyConnection, 'Shopify', publishAsDraft)}
                />
              </>
            ) : null}

            {/* Amazon */}
            {activeAmazonConnection ? (
              <View style={styles.pushButtonSpaced}>
                <PlatformPushButton
                  platform="amazon"
                  label="Amazon"
                  pushing={pushingPlatform === 'amazon'}
                  disabled={pushingPlatform !== null}
                  onPress={() => handlePushToPlatform(activeAmazonConnection, 'Amazon')}
                />
              </View>
            ) : null}

            {/* eBay */}
            {activeEbayConnection ? (
              <View style={styles.pushButtonSpaced}>
                <PlatformPushButton
                  platform="ebay"
                  label="eBay"
                  pushing={pushingPlatform === 'ebay'}
                  disabled={pushingPlatform !== null}
                  onPress={() => handlePushToPlatform(activeEbayConnection, 'eBay')}
                />
              </View>
            ) : null}

            {/* No connections */}
            {!activeShopifyConnection && !activeAmazonConnection && !activeEbayConnection && (
              <View style={[styles.noConnectionCard, { backgroundColor: colors.primaryBackground, borderColor: colors.border }]}>
                <Ionicons name="storefront-outline" size={24} color={colors.textSecondary} />
                <Text style={[styles.noConnectionText, { color: colors.textSecondary }]}>
                  Connect a platform in Settings to push products.
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Save Template Modal */}
      <Modal visible={showSaveTemplate} transparent animationType="fade" onRequestClose={() => setShowSaveTemplate(false)}>
        <View style={styles.tmplOverlay}>
          <View style={[styles.tmplModal, { backgroundColor: colors.background }]}>
            <Text style={[styles.tmplTitle, { color: colors.text }]}>Save Template</Text>
            <Text style={[styles.tmplDesc, { color: colors.textSecondary }]}>
              Saves brand, category, currency, gender, and other reusable fields.
            </Text>
            <TextInput
              style={[styles.tmplInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.backgroundSecondary }]}
              placeholder="Template name"
              placeholderTextColor={colors.textTertiary}
              value={templateName}
              onChangeText={setTemplateName}
              autoFocus
            />
            <View style={styles.tmplBtnRow}>
              <TouchableOpacity onPress={() => { setShowSaveTemplate(false); setTemplateName(''); }} style={styles.tmplCancelBtn}>
                <Text style={[styles.tmplCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveTemplate}
                disabled={!templateName.trim()}
                style={[styles.tmplSaveBtn, { backgroundColor: templateName.trim() ? colors.primary : colors.borderDark }]}
              >
                <Text style={styles.tmplSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Apply Template Modal */}
      <Modal visible={showApplyTemplate} transparent animationType="fade" onRequestClose={() => setShowApplyTemplate(false)}>
        <View style={styles.tmplOverlay}>
          <View style={[styles.tmplModal, { backgroundColor: colors.background, maxHeight: '60%' }]}>
            <Text style={[styles.tmplTitle, { color: colors.text }]}>Apply Template</Text>
            <FlatList
              data={templates}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={[styles.tmplItem, { borderColor: colors.border }]}>
                  <TouchableOpacity style={styles.tmplItemInfo} onPress={() => handleApplyTemplate(item)}>
                    <Text style={[styles.tmplItemName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.tmplItemFields, { color: colors.textSecondary }]}>
                      {Object.keys(item.fields).length} fields
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert('Delete Template', `Delete "${item.name}"?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteTemplate(item.id) },
                      ]);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              )}
            />
            <TouchableOpacity onPress={() => setShowApplyTemplate(false)} style={styles.tmplCancelBtn}>
              <Text style={[styles.tmplCancelText, { color: colors.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    ...shadows.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  headerSpacer: {
    width: BACK_ICON_SIZE,
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
    marginBottom: spacing.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  emptyImages: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
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
  },
  pushButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  pushButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pushButtonDisabled: {
    opacity: 0.5,
  },
  pushButtonSpaced: {
    marginTop: spacing.sm,
  } as const,
  pushButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  noConnectionCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
  },
  noConnectionText: {
    flex: 1,
    fontSize: fontSize.sm,
  },
  templateSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  templateButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  templateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  templateBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  tmplOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  tmplModal: {
    width: '100%',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  tmplTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  tmplDesc: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  tmplInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    marginBottom: spacing.md,
  },
  tmplBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  tmplCancelBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  tmplCancelText: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  tmplSaveBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  tmplSaveText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  tmplItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  tmplItemInfo: {
    flex: 1,
  },
  tmplItemName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  tmplItemFields: {
    fontSize: fontSize.xs,
  },
  partialErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  partialErrorText: {
    fontSize: fontSize.sm,
    flex: 1,
  },
  bottomSpacer: {
    height: spacing.xxxl,
  },
});
