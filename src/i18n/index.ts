import { useAppStore } from '../store/appStore';
import {
  availableLocales,
  defaultLocaleCode,
  getLocale,
  locales,
  type LocaleCode,
  type TranslationKeys,
} from './locales';

export function t(key: TranslationKeys): string {
  const locale = getLocale(useAppStore.getState().language);
  const tr = locale.translations as Partial<Record<TranslationKeys, string>>;
  const en = locales[defaultLocaleCode].translations as Record<TranslationKeys, string>;
  return tr[key] ?? en[key] ?? key;
}

export function useTranslation() {
  const language = useAppStore((s) => s.language);
  const locale = getLocale(language);
  const isRTL = locale.direction === 'rtl';

  const translate = (key: TranslationKeys): string => {
    const tr = locale.translations as Partial<Record<TranslationKeys, string>>;
    const en = locales[defaultLocaleCode].translations as Record<TranslationKeys, string>;
    return tr[key] ?? en[key] ?? key;
  };

  return {
    t: translate,
    isRTL,
    direction: locale.direction,
    language: locale.code as LocaleCode,
    locale,
    availableLocales,
    fontBold: isRTL ? 'Heebo_800ExtraBold' : 'SpaceGrotesk_700Bold',
    fontRegular: isRTL ? 'Heebo_400Regular' : 'Manrope_400Regular',
    fontSemiBold: isRTL ? 'Heebo_600SemiBold' : 'SpaceGrotesk_700Bold',
  };
}

export type { TranslationKeys };
export { availableLocales } from './locales';
