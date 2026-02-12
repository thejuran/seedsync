import {Injectable, signal, computed, effect, OnDestroy} from "@angular/core";
import {ThemeMode, ResolvedTheme, THEME_STORAGE_KEY} from "./theme.types";

/**
 * ThemeService manages the application theme using Angular signals.
 *
 * Features:
 * - Signal-based reactive state management
 * - localStorage persistence with fallback for private browsing
 * - Multi-tab synchronization via storage events
 * - OS preference detection and change tracking
 * - FOUC prevention (paired with inline script in index.html)
 *
 * The service automatically applies theme changes to the DOM via effect().
 */
@Injectable({providedIn: "root"})
export class ThemeService implements OnDestroy {
  // Private writable signal for user's theme preference
  // Disable equality checking to allow same-value assignment to trigger re-computation
  private _theme = signal<ThemeMode>("auto", {equal: () => false});

  // Public readonly signal exposing the theme preference
  public readonly theme = this._theme.asReadonly();

  // Computed signal that resolves 'auto' to 'light' or 'dark'
  public readonly resolvedTheme = computed<ResolvedTheme>(() => {
    const mode = this._theme();
    if (mode === "light" || mode === "dark") {
      return mode;
    }
    // Resolve 'auto' by checking OS preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  });

  private _mediaQuery: MediaQueryList;
  private _mediaQueryListener: () => void;
  private _storageListener: (event: StorageEvent) => void;

  constructor() {
    // 1. Initialize from localStorage
    this._initializeFromStorage();

    // 2. Apply theme to DOM whenever resolvedTheme changes
    effect(() => {
      const resolved = this.resolvedTheme();
      document.documentElement.setAttribute("data-bs-theme", resolved);
    });

    // 3. Set up multi-tab synchronization via storage events
    this._storageListener = (event: StorageEvent): void => {
      if (event.key === THEME_STORAGE_KEY && event.newValue) {
        const newValue = event.newValue as ThemeMode;
        // Validate the value before applying
        if (newValue === "light" || newValue === "dark" || newValue === "auto") {
          this._theme.set(newValue);
        }
      }
    };
    window.addEventListener("storage", this._storageListener);

    // 4. Set up OS preference change listener
    this._mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    this._mediaQueryListener = (): void => {
      // Only react if we're in 'auto' mode
      if (this._theme() === "auto") {
        // Force re-evaluation of the computed signal by setting to same value
        // This triggers the computed to re-run matchMedia, which may now return different result
        this._theme.set("auto");
      }
    };
    this._mediaQuery.addEventListener("change", this._mediaQueryListener);
  }

  /**
   * Initialize theme from localStorage with fallback to 'auto'.
   */
  private _initializeFromStorage(): void {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "auto") {
        this._theme.set(stored);
      }
      // If stored is null or invalid, keep default 'auto'
    } catch (e) {
      // localStorage may throw in private browsing mode - silently fall back to 'auto'
      console.warn("ThemeService: localStorage not available, using 'auto' mode", e);
    }
  }

  /**
   * Set the theme mode and persist to localStorage.
   */
  public setTheme(mode: ThemeMode): void {
    this._theme.set(mode);

    // Persist to localStorage
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.warn("ThemeService: failed to persist theme to localStorage", e);
    }
  }

  /**
   * Clean up event listeners on service destruction.
   */
  public ngOnDestroy(): void {
    window.removeEventListener("storage", this._storageListener);
    this._mediaQuery.removeEventListener("change", this._mediaQueryListener);
  }
}
