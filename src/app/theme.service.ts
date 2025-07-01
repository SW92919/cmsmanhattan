import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isDarkModeSubject = new BehaviorSubject<boolean>(false);
  public isDarkMode$ = this.isDarkModeSubject.asObservable();

  constructor() {
    this.initializeTheme();
  }

  async initializeTheme() {
    try {
      // Try to get saved theme preference
      const { value } = await Preferences.get({ key: 'theme' });
      
      if (value) {
        // Use saved preference
        this.setDarkMode(value === 'dark');
      } else {
        // Fall back to system preference (only on web or if supported)
        if (!Capacitor.isNativePlatform()) {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
          this.setDarkMode(prefersDark.matches);
        } else {
          // Default to light mode on mobile if no preference saved
          this.setDarkMode(false);
        }
        // Save the initial preference
        await this.saveThemePreference();
      }
    } catch (error) {
      console.error('Error initializing theme:', error);
      // Fallback to light mode
      this.setDarkMode(false);
    }
  }

  async toggleDarkMode() {
    const newValue = !this.isDarkModeSubject.value;
    await this.setDarkMode(newValue);
  }

  async setDarkMode(isDark: boolean) {
    this.isDarkModeSubject.next(isDark);
    this.applyDarkMode(isDark);
    await this.saveThemePreference();
  }

  get isDarkMode(): boolean {
    return this.isDarkModeSubject.value;
  }

  private applyDarkMode(isDark: boolean) {
    if (isDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }

  private async saveThemePreference() {
    try {
      await Preferences.set({
        key: 'theme',
        value: this.isDarkMode ? 'dark' : 'light'
      });
    } catch (error) {
      console.error('Error saving theme preference:', error);
      // Fallback to localStorage for web
      if (!Capacitor.isNativePlatform()) {
        localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
      }
    }
  }
} 