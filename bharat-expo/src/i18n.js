import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 1. Import all your language dictionaries
import en from './locales/en.json';
import mr from './locales/mr.json';
import hi from './locales/hi.json';
import gu from './locales/gu.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import kn from './locales/kn.json';
import ml from './locales/ml.json';
import bn from './locales/bn.json';
import pa from './locales/pa.json';
import or from './locales/or.json';
import as from './locales/as.json';
import ur from './locales/ur.json';

// 2. Register them with the engine
const resources = {
  en: { translation: en },
  mr: { translation: mr },
  hi: { translation: hi },
  gu: { translation: gu },
  ta: { translation: ta },
  te: { translation: te },
  kn: { translation: kn },
  ml: { translation: ml },
  bn: { translation: bn },
  pa: { translation: pa },
  or: { translation: or },
  as: { translation: as },
  ur: { translation: ur }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React Native is already safe from XSS
    }
  });

export default i18n;