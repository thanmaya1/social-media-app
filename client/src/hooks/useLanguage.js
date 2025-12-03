import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LANGUAGE_STORAGE_KEY = 'smapp_language';

export default function useLanguage() {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return saved || i18n.language || 'en';
  });

  const changeLanguage = async (lang) => {
    try {
      await i18n.changeLanguage(lang);
      setLanguage(lang);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  return {
    language,
    changeLanguage,
    availableLanguages: ['en', 'es', 'fr', 'de', 'ja', 'zh'],
    languageNames: {
      en: 'English',
      es: 'Español',
      fr: 'Français',
      de: 'Deutsch',
      ja: '日本語',
      zh: '中文',
    },
  };
}
