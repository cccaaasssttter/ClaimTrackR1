import bcryptjs from 'bcryptjs';
import { getSettings, saveSettings } from './db';
import type { Settings } from '@shared/schema';

const ADMIN_PASSWORD_ENV = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

export class AuthManager {
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
        sessionTimeout: 0, // No session timeout
      };
      await saveSettings(settings);
    }
  }

  async authenticate(password: string): Promise<boolean> {
    const settings = await getSettings();
    if (!settings) return false;

    const isValid = await bcryptjs.compare(password, settings.adminPasswordHash);
    if (isValid) {
      this.isAuthenticated = true;
      return true;
    }
    return false;
  }

  logout(): void {
    this.isAuthenticated = false;
  }

  getAuthenticationStatus(): boolean {
    return this.isAuthenticated;
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    const settings = await getSettings();
    if (!settings) return false;

    const isCurrentValid = await bcryptjs.compare(currentPassword, settings.adminPasswordHash);
    if (!isCurrentValid) return false;

    const newPasswordHash = await bcryptjs.hash(newPassword, 12);
    settings.adminPasswordHash = newPasswordHash;
    await saveSettings(settings);
    return true;
  }
}

export const authManager = new AuthManager();