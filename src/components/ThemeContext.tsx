/**
 * ThemeContext — Manages light/dark mode state.
 * Detects system preference, persists user choice in localStorage.
 */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface ThemeColors {
  bg: string;
  bgAlt: string;
  surface: string;
  surfaceHover: string;
  panel: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  divider: string;
  buttonBg: string;
  buttonBgHover: string;
  buttonText: string;
  nodeBg: string;
  nodeFocused: string;
  nodeConnected: string;
  nodeStroke: string;
  nodeStrokeFocused: string;
  nodeStrokeConnected: string;
  link: string;
  linkHover: string;
  linkUnderline: string;
  female: string;
  male: string;
  shadow: string;
  shadowHeavy: string;
  searchBg: string;
  inputBg: string;
  inputBorder: string;
  submitBg: string;
  submitBgHover: string;
  suggestionHover: string;
}

const lightColors: ThemeColors = {
  bg: '#fdf8f0',
  bgAlt: '#f5e6d3',
  surface: '#f5e6d3',
  surfaceHover: '#e8cba7',
  panel: 'white',
  text: '#4a3610',
  textSecondary: '#6b4f10',
  textMuted: '#8b6914',
  border: '#d4a574',
  borderLight: '#e8cba7',
  divider: '#e8cba7',
  buttonBg: 'rgba(253, 248, 240, 0.85)',
  buttonBgHover: 'rgba(232, 203, 167, 0.9)',
  buttonText: '#4a3610',
  nodeBg: '#f5e6d3',
  nodeFocused: '#e8cba7',
  nodeConnected: '#f0dbc0',
  nodeStroke: '#d4a574',
  nodeStrokeFocused: '#b8834a',
  nodeStrokeConnected: '#c49560',
  link: '#4f6e3d',
  linkHover: '#6b8c55',
  linkUnderline: 'rgba(143,170,123,0.5)',
  female: '#b8834a',
  male: '#6b8c55',
  shadow: 'rgba(0,0,0,0.1)',
  shadowHeavy: 'rgba(0,0,0,0.2)',
  searchBg: 'rgba(253, 248, 240, 0.95)',
  inputBg: 'white',
  inputBorder: '#d4a574',
  submitBg: '#6b8c55',
  submitBgHover: '#4f6e3d',
  suggestionHover: 'rgba(232, 203, 167, 0.3)',
};

const darkColors: ThemeColors = {
  bg: '#1a1209',
  bgAlt: '#2d2010',
  surface: '#2d2010',
  surfaceHover: '#4a3610',
  panel: '#241a0e',
  text: '#f5e6d3',
  textSecondary: '#d4a574',
  textMuted: '#b8834a',
  border: '#6b4f10',
  borderLight: '#4a3610',
  divider: '#4a3610',
  buttonBg: 'rgba(45, 32, 16, 0.85)',
  buttonBgHover: 'rgba(74, 54, 16, 0.9)',
  buttonText: '#f5e6d3',
  nodeBg: '#2d2010',
  nodeFocused: '#4a3610',
  nodeConnected: '#3a2a15',
  nodeStroke: '#6b4f10',
  nodeStrokeFocused: '#d4a574',
  nodeStrokeConnected: '#8b6914',
  link: '#8faa7b',
  linkHover: '#a4bf93',
  linkUnderline: 'rgba(143,170,123,0.4)',
  female: '#d4a574',
  male: '#8faa7b',
  shadow: 'rgba(0,0,0,0.3)',
  shadowHeavy: 'rgba(0,0,0,0.5)',
  searchBg: 'rgba(26, 18, 9, 0.95)',
  inputBg: '#2d2010',
  inputBorder: '#6b4f10',
  submitBg: '#4f6e3d',
  submitBgHover: '#6b8c55',
  suggestionHover: 'rgba(74, 54, 16, 0.5)',
};

interface ThemeContextValue {
  isDark: boolean;
  toggle: () => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  toggle: () => {},
  colors: lightColors,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('family-tree-theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('family-tree-theme', isDark ? 'dark' : 'light');
    document.body.style.background = isDark ? darkColors.bg : lightColors.bg;
  }, [isDark]);

  const toggle = () => setIsDark((prev) => !prev);
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, toggle, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
