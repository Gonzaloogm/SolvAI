import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
 const [themePreference, setThemePreference] = useState(() => {
 return localStorage.getItem('solvai-theme') || 'system';
 });

 const [actualTheme, setActualTheme] = useState('light');

 useEffect(() => {
 const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
 
 const updateTheme = () => {
 const isDark = 
 themePreference === 'dark' || 
 (themePreference === 'system' && mediaQuery.matches);
 
 setActualTheme(isDark ? 'dark' : 'light');
 
 const root = document.documentElement;
 if (isDark) {
 root.classList.add('dark');
 root.classList.remove('light');
 root.setAttribute('data-theme', 'dark');
 } else {
 root.classList.add('light');
 root.classList.remove('dark');
 root.setAttribute('data-theme', 'light');
 }
 };

 updateTheme();
 localStorage.setItem('solvai-theme', themePreference);

 // Listen for system preference changes
 const listener = (e) => {
 if (themePreference === 'system') {
 updateTheme();
 }
 };
 
 mediaQuery.addEventListener('change', listener);
 return () => mediaQuery.removeEventListener('change', listener);
 }, [themePreference]);

 const toggleTheme = () => {
 setThemePreference(prev => {
 if (prev === 'light') return 'dark';
 if (prev === 'dark') return 'system';
 return 'light';
 });
 };

 const setTheme = (newTheme) => {
 setThemePreference(newTheme);
 };

 return (
 <ThemeContext.Provider value={{ theme: themePreference, actualTheme, setTheme, toggleTheme }}>
 {children}
 </ThemeContext.Provider>
 );
}

export function useTheme() {
 return useContext(ThemeContext);
}
