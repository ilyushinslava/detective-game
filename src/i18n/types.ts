import { ru } from './ru';

export type Language = 'ru' | 'en';
export type TranslationSchema = typeof ru;

export interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: TranslationSchema;
}