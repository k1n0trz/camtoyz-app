import { useCallback } from 'react';

import { useAppPreferences } from '@/preferences/AppPreferences';
import { translate, type TranslationKey, type TranslationValues } from './translations';

export function useTranslation() {
  const { language } = useAppPreferences();
  const t = useCallback(
    (key: TranslationKey, values?: TranslationValues) => translate(language, key, values),
    [language],
  );
  const pick = useCallback(
    (spanish: string, english: string) => language === 'en' ? english : spanish,
    [language],
  );
  const error = useCallback(
    (message?: string) => {
      if (!message || language === 'es') return message;
      const normalized = message.toLowerCase();
      if (normalized.includes('bluetooth')) return 'The Bluetooth operation could not be completed. Check permissions and try again.';
      if (normalized.includes('sala') || normalized.includes('servidor')) return 'The room service could not be reached. Please try again.';
      if (normalized.includes('cámara') || normalized.includes('micrófono')) return 'Camera or microphone access could not be completed. Check permissions.';
      if (normalized.includes('dispositivo')) return 'The device operation could not be completed. Please try again.';
      return 'The operation could not be completed. Please try again.';
    },
    [language],
  );
  return { language, t, pick, error };
}
