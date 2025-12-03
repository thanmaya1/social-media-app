import React, { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'smapp_locale';
const LocaleContext = createContext();

const translations = {
  en: {
    feed: 'Feed',
    notifications: 'Notifications',
    admin: 'Admin',
    verify: 'Verify',
    unverify: 'Unverify',
  },
  es: {
    feed: 'Feed',
    notifications: 'Notificaciones',
    admin: 'Administración',
    verify: 'Verificar',
    unverify: 'Desverificar',
  },
};

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'en';
    } catch (e) {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch (e) {}
  }, [locale]);

  const t = (key) => (translations[locale] && translations[locale][key]) || translations.en[key] || key;

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
