import bcryptjs from 'bcryptjs';
import { getSettings, saveSettings } from './db';
import type { Settings } from '@shared/schema';

const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
const ADMIN_PASSWORD_ENV = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

export class AuthManager {
  private sessionTimer: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();
  private isAuthenticated: boolean = false;

  async initialize(): Promise<void> {
    // Check if admin password is set, if not create default
    let settings = await getSettings();
    if (!settings) {
      const defaultPasswordHash = await bcryptjs.hash(ADMIN_PASSWORD_ENV, 12);
      settings = {
        companyName: '',
        companyAbn: '',
        defaultGstRate: 0.1,
        adminPasswordHash: defaultPasswordHash,
        sessionTimeout: SESSION_TIMEOUT,
      };
      await saveSettings(settings);
    }

    // Start session monitoring
    this.startSessionMonitoring();
  }

  async authenticate(password: string): Promise<boolean> {
    const settings = await getSettings();
    if (!settings) return false;

    const isValid = await bcryptjs.compare(password, settings.adminPasswordHash);
    if (isValid) {
      this.isAuthenticated = true;
      this.updateActivity();
      return true;
    }
    return false;
  }

  logout(): void {
    this.isAuthenticated = false;
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  updateActivity(): void {
    this.lastActivity = Date.now();
    this.resetSessionTimer();
  }

  private startSessionMonitoring(): void {
    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, () => {
        if (this.isAuthenticated) {
          this.updateActivity();
        }
      }, true);
    });
  }

  private resetSessionTimer(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }

    this.sessionTimer = setTimeout(() => {
      this.logout();
      // Dispatch custom event for session expiry
      window.dispatchEvent(new CustomEvent('sessionExpired'));
    }, SESSION_TIMEOUT);
  }

  getAuthenticationStatus(): boolean {
    return this.isAuthenticated;
  }

  getTimeRemaining(): number {
    if (!this.isAuthenticated) return 0;
    const elapsed = Date.now() - this.lastActivity;
    return Math.max(0, SESSION_TIMEOUT - elapsed);
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    const settings = await getSettings();
    if (!settings) return false;

    const isCurrentValid = await bcryptjs.compare(currentPassword, settings.adminPasswordHash);
    if (!isCurrentValid) return false;

    const newPasswordHash = await bcryptjs.hash(newPassword, 12);
    await saveSettings({
      ...settings,
      adminPasswordHash: newPasswordHash,
    });

    return true;
  }
}

export const authManager = new AuthManager();
