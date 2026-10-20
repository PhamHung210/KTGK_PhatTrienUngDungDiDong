import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lang, TKey, translations } from './translations';

const KEY = '@BIT247895_language';

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  /** Dịch theo khóa; hỗ trợ tham số {name}, {n}. Khóa không có trong từ điển được trả về nguyên văn. */
  t: (key: TKey | string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<Ctx>(null as unknown as Ctx);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en'); // mặc định English

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v === 'en' || v === 'vi') setLangState(v);
    });
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(KEY, l).catch(() => {});
  }, []);

  const value = useMemo<Ctx>(() => ({
    lang,
    setLang,
    toggle: () => setLang(lang === 'en' ? 'vi' : 'en'),
    t: (key, params) => {
      let s: string = (translations[lang] as Record<string, string>)[key] ?? key;
      if (params) for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v));
      return s;
    },
  }), [lang, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
