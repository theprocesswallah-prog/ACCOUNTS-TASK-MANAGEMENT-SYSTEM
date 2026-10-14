/**
 * Configuration for Accounts Task Management System
 */

// Default endpoint from environment variable if present
const ENV_URL = (import.meta as any).env?.VITE_APPS_SCRIPT_URL || '';

// LocalStorage key for user-configured endpoint
const STORAGE_ENDPOINT_KEY = 'accounts_task_apps_script_url';
const STORAGE_USER_KEY = 'accounts_task_active_user_id';
const STORAGE_DEMO_KEY = 'accounts_task_demo_mode';

export const APP_CONFIG = {
  // Application metadata
  COMPANY_NAME: 'ALFA INTERCONTINENTAL LIMITED',
  APP_NAME: 'Accounts Task Management System',
  DEPARTMENT: 'Accounts & Finance',
  TIMEZONE: 'Asia/Kolkata',
  TIMEZONE_OFFSET_HOURS: 5.5,
  
  // Point system rules
  POINTS_ON_TIME: 5,
  POINTS_APPROVED_EXTENSION: 5,
  POINTS_LATE: 0,
  
  // Refresh intervals
  BOARD_AUTO_REFRESH_INTERVAL_MS: 20000, // 20 seconds
  COUNTDOWN_TICK_INTERVAL_MS: 1000,
  
  // Storage Keys
  STORAGE_ENDPOINT_KEY,
  STORAGE_USER_KEY,
  STORAGE_DEMO_KEY,
};

/**
 * Returns currently active Google Apps Script Web App URL
 */
export function getAppsScriptUrl(): string {
  const custom = localStorage.getItem(STORAGE_ENDPOINT_KEY);
  if (custom && custom.trim().length > 0) {
    return custom.trim();
  }
  return ENV_URL.trim();
}

/**
 * Updates the user-configured Web App URL
 */
export function setAppsScriptUrl(url: string): void {
  if (!url || url.trim().length === 0) {
    localStorage.removeItem(STORAGE_ENDPOINT_KEY);
  } else {
    localStorage.setItem(STORAGE_ENDPOINT_KEY, url.trim());
  }
}

/**
 * Checks if a live Apps Script URL is configured
 */
export function isAppsScriptConfigured(): boolean {
  const url = getAppsScriptUrl();
  return url.length > 0 && url.startsWith('http');
}
