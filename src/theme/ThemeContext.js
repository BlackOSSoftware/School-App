import React, { createContext, useContext, useMemo, useState } from 'react';
import { THEMES } from './colors';

const ThemeContext = createContext({
  mode: 'light',
  colors: THEMES.light,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light');

  const toggleTheme = () => {
    setMode(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const value = useMemo(
    () => ({
      mode,
      colors: THEMES[mode] ?? THEMES.light,
      isDark: mode === 'dark',
      toggleTheme,
    }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
