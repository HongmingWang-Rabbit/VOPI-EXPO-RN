import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../constants/storage';

const TEMPLATES_KEY = STORAGE_KEYS.METADATA_TEMPLATES;

export interface MetadataTemplate {
  id: string;
  name: string;
  fields: Record<string, string | number | string[] | undefined>;
  createdAt: string;
}

async function getAll(): Promise<MetadataTemplate[]> {
  const raw = await storage.getItem(TEMPLATES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function save(template: MetadataTemplate): Promise<void> {
  const templates = await getAll();
  const idx = templates.findIndex((t) => t.id === template.id);
  if (idx >= 0) {
    templates[idx] = template;
  } else {
    templates.push(template);
  }
  await storage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

async function remove(id: string): Promise<void> {
  const templates = await getAll();
  await storage.setItem(TEMPLATES_KEY, JSON.stringify(templates.filter((t) => t.id !== id)));
}

export const templateService = { getAll, save, remove };
