import { useState, useEffect, useCallback } from 'react';
import { templateService, MetadataTemplate } from '../services/templates';
import { generateId } from '../utils/strings';

export function useTemplates() {
  const [templates, setTemplates] = useState<MetadataTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const all = await templateService.getAll();
    setTemplates(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveTemplate = useCallback(async (name: string, fields: MetadataTemplate['fields']) => {
    const template: MetadataTemplate = {
      id: generateId(),
      name,
      fields,
      createdAt: new Date().toISOString(),
    };
    try {
      await templateService.save(template);
      await refresh();
    } catch (err) {
      if (__DEV__) console.error('[useTemplates] Failed to save template:', err);
      throw err;
    }
    return template;
  }, [refresh]);

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      await templateService.remove(id);
      await refresh();
    } catch (err) {
      if (__DEV__) console.error('[useTemplates] Failed to delete template:', err);
      throw err;
    }
  }, [refresh]);

  return { templates, loading, saveTemplate, deleteTemplate, refresh };
}
