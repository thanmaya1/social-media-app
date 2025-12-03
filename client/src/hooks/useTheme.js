import { useEffect, useState } from 'react';

const STORAGE_KEY = 'smapp_theme';

export default function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v || 'light';
    } catch (e) {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      // ignore
    }
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return { theme, setTheme, toggle };
}
