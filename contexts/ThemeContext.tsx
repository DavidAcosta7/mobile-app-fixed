import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

export type ThemeTokens = {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  primary: string;
  border: string;
};

const themes: Record<'light' | 'dark', ThemeTokens> = {
  light: {
    background: '#F9FAFB',
    card: '#FFFFFF',
    text: '#111827',
    textSecondary: '#6B7280',
    primary: '#2563EB',
    border: '#E5E7EB',
  },
  dark: {
    background: '#111827',
    card: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    primary: '#3B82F6',
    border: '#374151',
  },
};

const STORAGE_KEY = 'fluxpay.theme.mode';

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  theme: ThemeTokens;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setModeState(stored);
        }
      } finally {
        setHydrated(true);
      }
    };
    void load();
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const resolvedMode: 'light' | 'dark' = useMemo(() => {
    if (mode === 'system') {
      return systemScheme === 'dark' ? 'dark' : 'light';
    }
    return mode;
  }, [mode, systemScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedMode,
      theme: themes[resolvedMode],
      setMode,
    }),
    [mode, resolvedMode, setMode]
  );

  if (!hydrated) {
    return <>{children}</>;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
