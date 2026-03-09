import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import mr from './locales/mr.json';
import hi from './locales/hi.json';

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  resources: {
    en: { translation: en },
    mr: { translation: mr },
    hi: { translation: hi }
  },
  lng: 'en', // Default language
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

export default i18n;