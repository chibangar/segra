import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { en, Translations } from '../locales/en';
import { ptPT } from '../locales/pt-PT';

export type Language = 'en' | 'pt-PT';

export interface SupportedLanguage {
  code: Language;
  label: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'pt-PT', label: 'Português (Portugal)' },
  { code: 'en', label: 'English' },
];

const dictionaries: Record<Language, Translations> = {
  en,
  'pt-PT': ptPT,
};

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<Translations>;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey | string, params?: Record<string, string | number>) => string;
  locale: string;
  supportedLanguages: SupportedLanguage[];
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = 'segra.language';

function getDefaultLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (saved && (saved === 'en' || saved === 'pt-PT')) {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getDefaultLanguage);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage errors
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const locale = language === 'pt-PT' ? 'pt-PT' : 'en-US';

  const t = useMemo(() => {
    const currentDict = dictionaries[language] || en;

    return (key: TranslationKey | string, params?: Record<string, string | number>): string => {
      const keys = key.split('.');
      let result: any = currentDict;

      for (const k of keys) {
        if (result && typeof result === 'object' && k in result) {
          result = result[k];
        } else {
          result = undefined;
          break;
        }
      }

      // Fallback to English if missing in current dictionary
      if (result === undefined && language !== 'en') {
        let fallback: any = en;
        for (const k of keys) {
          if (fallback && typeof fallback === 'object' && k in fallback) {
            fallback = fallback[k];
          } else {
            fallback = undefined;
            break;
          }
        }
        result = fallback;
      }

      if (typeof result !== 'string') {
        return key;
      }

      if (params) {
        return Object.entries(params).reduce(
          (str, [paramKey, paramValue]) =>
            str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue)),
          result,
        );
      }

      return result;
    };
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      locale,
      supportedLanguages: SUPPORTED_LANGUAGES,
    }),
    [language, t, locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
