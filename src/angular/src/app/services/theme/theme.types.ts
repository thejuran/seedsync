/**
 * Theme mode options available to the user.
 * - 'light': Force light theme
 * - 'dark': Force dark theme
 * - 'auto': Follow OS preference
 */
export type ThemeMode = "light" | "dark" | "auto";

/**
 * Resolved theme that is actually applied to the DOM.
 * This is always either 'light' or 'dark' (never 'auto').
 */
export type ResolvedTheme = "light" | "dark";

/**
 * localStorage key for persisting theme preference.
 */
export const THEME_STORAGE_KEY = "theme";
