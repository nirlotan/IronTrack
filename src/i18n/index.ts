import en, { type TranslationKeys } from './en';
import he from './he';
import { useAppStore } from '../store/appStore';

const translations: Record<string, Record<TranslationKeys, string>> = { en, he };

export function t(key: TranslationKeys): string {
  const lang = useAppStore.getState().language;
  return translations[lang]?.[key] ?? translations.en[key] ?? key;
}

export function useTranslation() {
  const language = useAppStore((s) => s.language);
  const isRTL = language === 'he';
  const isHebrew = language === 'he';

  const translate = (key: TranslationKeys): string => {
    return translations[language]?.[key] ?? translations.en[key] ?? key;
  };

  return {
    t: translate,
    isRTL,
    language,
    fontBold: isHebrew ? 'Heebo_800ExtraBold' : 'SpaceGrotesk_700Bold',
    fontRegular: isHebrew ? 'Heebo_400Regular' : 'Manrope_400Regular',
    fontSemiBold: isHebrew ? 'Heebo_600SemiBold' : 'SpaceGrotesk_700Bold',
  };
}

export type { TranslationKeys };
