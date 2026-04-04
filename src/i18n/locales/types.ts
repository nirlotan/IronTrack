export type TextDirection = 'ltr' | 'rtl';

export interface LocaleDefinition<TTranslations extends Record<string, string> = Record<string, string>> {
    code: string;
    name: string;
    nativeName: string;
    direction: TextDirection;
    translations: TTranslations;
}
