import { Injectable, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

/**
 * Global theme controller. Toggles `body.theme-light` so all CSS variables
 * defined in styles.css swap at once. Persists choice to localStorage.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>('dark');

  private static readonly KEY = 'ide-theme';

  constructor() {
    const saved = (typeof localStorage !== 'undefined' && localStorage.getItem(ThemeService.KEY)) as Theme | null;
    const initial: Theme = saved === 'light' ? 'light' : 'dark';
    this.apply(initial);
  }

  isDark(): boolean { return this.theme() === 'dark'; }
  isLight(): boolean { return this.theme() === 'light'; }

  toggle(): void {
    this.apply(this.theme() === 'dark' ? 'light' : 'dark');
  }

  set(theme: Theme): void {
    this.apply(theme);
  }

  private apply(theme: Theme): void {
    this.theme.set(theme);
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('theme-light', theme === 'light');
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ThemeService.KEY, theme);
    }
  }
}
