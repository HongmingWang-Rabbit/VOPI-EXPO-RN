import { useState, useEffect, useCallback } from 'react';
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

  const shopifyConnections = connections.filter((c) => c.platform === 'shopify');
  const activeShopifyConnection = shopifyConnections.find((c) => c.status === 'active');

  return { connections, shopifyConnections, activeShopifyConnection, loading, error, refresh };
}
