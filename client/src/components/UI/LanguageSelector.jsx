import React from 'react';
import { useTranslation } from 'react-i18next';
import useLanguage from '../../hooks/useLanguage';

export default function LanguageSelector() {
  const { t } = useTranslation();
  const { language, changeLanguage, availableLanguages, languageNames } = useLanguage();

  return (
    <select
      aria-label={t('settings.language')}
      value={language}
      onChange={(e) => changeLanguage(e.target.value)}
      style={{ padding: 6 }}
    >
      {availableLanguages.map((lang) => (
        <option key={lang} value={lang}>
          {languageNames[lang]}
        </option>
      ))}
    </select>
  );
}
