import { useState, useEffect, useCallback, useMemo } from 'react';
import { vopiService } from '../services/vopi.service';
import { PlatformConnection } from '../types/vopi.types';

export function useConnections() {
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { connections: data } = await vopiService.getConnections();
      setConnections(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load connections';
      setError(message);
      if (__DEV__) {
        console.warn('[Connections] Failed to fetch connections:', message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const shopifyConnections = useMemo(() => connections.filter((c) => c.platform === 'shopify'), [connections]);
  const activeShopifyConnection = useMemo(() => shopifyConnections.find((c) => c.status === 'active'), [shopifyConnections]);

  const amazonConnections = useMemo(() => connections.filter((c) => c.platform === 'amazon'), [connections]);
  const activeAmazonConnection = useMemo(() => amazonConnections.find((c) => c.status === 'active'), [amazonConnections]);

  const ebayConnections = useMemo(() => connections.filter((c) => c.platform === 'ebay'), [connections]);
  const activeEbayConnection = useMemo(() => ebayConnections.find((c) => c.status === 'active'), [ebayConnections]);

  return { connections, shopifyConnections, activeShopifyConnection, amazonConnections, activeAmazonConnection, ebayConnections, activeEbayConnection, loading, error, refresh };
}
