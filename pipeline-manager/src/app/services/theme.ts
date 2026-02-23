import { Injectable } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private currentTheme: Theme = 'light';

  constructor() {
    const saved = localStorage.getItem('pm-theme') as Theme | null;
    if (saved) {
      this.currentTheme = saved;
    }
    this.applyTheme();
  }

  getTheme(): Theme {
    return this.currentTheme;
  }

  isDark(): boolean {
    return this.currentTheme === 'dark';
  }

  toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('pm-theme', this.currentTheme);
    this.applyTheme();
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    localStorage.setItem('pm-theme', theme);
    this.applyTheme();
  }

  private applyTheme(): void {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
  }
}
