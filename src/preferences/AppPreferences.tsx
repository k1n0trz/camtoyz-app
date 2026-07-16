import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { darkTheme, lightTheme, type AppTheme } from '@/theme/index';

export type LanguagePreference = 'system' | 'es' | 'en';
export type ThemePreference = 'light' | 'dark';
export type AppLanguage = 'es' | 'en';

interface AppPreferencesValue {
  languagePreference: LanguagePreference;
  themePreference: ThemePreference;
  language: AppLanguage;
  theme: AppTheme;
  ready: boolean;
  setLanguagePreference: (preference: LanguagePreference) => Promise<void>;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
}

const LANGUAGE_KEY = 'camtoyz.preference.language';
const THEME_KEY = 'camtoyz.preference.theme';
const PreferencesContext = createContext<AppPreferencesValue | undefined>(undefined);

function isLanguagePreference(value: string | null): value is LanguagePreference {
  return value === 'system' || value === 'es' || value === 'en';
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark';
}

function systemLanguage(): AppLanguage {
  return Localization.getLocales()[0]?.languageCode?.toLowerCase() === 'en' ? 'en' : 'es';
}

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const [languagePreference, setLanguageState] = useState<LanguagePreference>('system');
  const [themePreference, setThemeState] = useState<ThemePreference>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      SecureStore.getItemAsync(LANGUAGE_KEY),
      SecureStore.getItemAsync(THEME_KEY),
    ]).then(([language, theme]) => {
      if (!active) return;
      if (isLanguagePreference(language)) setLanguageState(language);
      if (isThemePreference(theme)) setThemeState(theme);
      setReady(true);
    }).catch(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const setLanguagePreference = useCallback(async (preference: LanguagePreference) => {
    setLanguageState(preference);
    await SecureStore.setItemAsync(LANGUAGE_KEY, preference);
  }, []);

  const setThemePreference = useCallback(async (preference: ThemePreference) => {
    setThemeState(preference);
    await SecureStore.setItemAsync(THEME_KEY, preference);
  }, []);

  const language = languagePreference === 'system' ? systemLanguage() : languagePreference;
  const theme = themePreference === 'dark' ? darkTheme : lightTheme;

  const value = useMemo<AppPreferencesValue>(() => ({
    languagePreference,
    themePreference,
    language,
    theme,
    ready,
    setLanguagePreference,
    setThemePreference,
  }), [
    languagePreference,
    themePreference,
    language,
    theme,
    ready,
    setLanguagePreference,
    setThemePreference,
  ]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useAppPreferences(): AppPreferencesValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('useAppPreferences debe usarse dentro de AppPreferencesProvider.');
  return value;
}

export function useAppTheme(): AppTheme {
  return useAppPreferences().theme;
}
