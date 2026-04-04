import en, { type TranslationKeys } from './en';
import es from './es';
import he from './he';
import type { LocaleDefinition, TextDirection } from './types';

export const locales = {
    en,
    es,
    he,
} as const;

export type LocaleCode = keyof typeof locales;

export const availableLocales = Object.values(locales) as LocaleDefinition[];
export const defaultLocaleCode: LocaleCode = 'en';

export function isLocaleCode(value: string): value is LocaleCode {
    return value in locales;
}

export function getLocale(code?: string | null): LocaleDefinition {
    if (code && isLocaleCode(code)) {
        return locales[code];
    }
    return locales[defaultLocaleCode];
}

export type { TranslationKeys, LocaleDefinition, TextDirection };
