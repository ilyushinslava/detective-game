import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Language, I18nContextType } from './types';
import { ru } from './ru';
import { en } from './en';

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const translations = { ru, en };

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>('ru');

  useEffect(() => {
    const savedLang = localStorage.getItem('crime_city_lang') as Language;
    if (savedLang === 'ru' || savedLang === 'en') {
      setLangState(savedLang);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('crime_city_lang', newLang);
  };

  const t = translations[lang];

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      lang: 'ru',
      setLang: () => {},
      t: ru,
    };
  }
  return context;
};