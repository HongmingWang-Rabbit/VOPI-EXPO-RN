import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../constants/storage';
import { colors as lightColors, Colors } from '../theme/colors';
import { darkColors } from '../theme/darkColors';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextType {
  colors: Colors;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    storage.getItem(STORAGE_KEYS.THEME_MODE).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeModeState(stored);
      }
    }).catch(() => {});
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    storage.setItem(STORAGE_KEYS.THEME_MODE, mode).catch(() => {});
  }, []);

  // Resolve theme immediately using system scheme as default before stored preference loads.
  // This avoids a flash of empty content while storage is read.
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');
  const colors = isDark ? darkColors : lightColors;

  const value = useMemo(() => ({
    colors,
    isDark,
    themeMode,
    setThemeMode,
  }), [colors, isDark, themeMode, setThemeMode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
