/**
 * Theme utilities for handling dark mode
 */

/**
 * Get the current theme from localStorage or default to system preference
 * @returns boolean - true if dark mode is active
 */
export function getThemePreference(): boolean {
  // Check for stored preference in localStorage
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme) {
    return storedTheme === 'dark';
  }
  
  // Use system preference as default if available
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return true;
  }
  
  return false;
}

/**
 * Apply the current theme to the document
 * @param isDark - Whether to apply dark mode
 */
export function applyTheme(isDark: boolean): void {
  // Store preference in localStorage
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  
  // Apply to document
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

/**
 * Initialize the theme based on stored preferences
 * Call this when the app starts
 */
export function initializeTheme(): void {
  const isDark = getThemePreference();
  applyTheme(isDark);
}