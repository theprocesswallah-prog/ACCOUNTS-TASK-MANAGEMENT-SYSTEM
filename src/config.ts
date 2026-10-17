/**
 * Configuration for Accounts Task Management System
 * ALFA INTERCONTINENTAL LIMITED
 */

// Permanent official Google Apps Script backend endpoint
export const OFFICIAL_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzixpdkq_ahAqELG47A8cIiFXF5--e2EZtxFjYw8djYmEVYKlZJo8PjcrTREUXjeC4uoA/exec';

// LocalStorage key for user-configured endpoint override (optional admin feature)
const STORAGE_ENDPOINT_KEY = 'accounts_task_apps_script_url';
const STORAGE_USER_KEY = 'accounts_task_active_user_id';

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
};

/**
 * Returns currently active Google Apps Script Web App URL.
 * Always resolves to the permanent official endpoint, purging any stale/broken URLs from previous sessions.
 */
export function getAppsScriptUrl(): string {
  try {
    const custom = localStorage.getItem(STORAGE_ENDPOINT_KEY);
    if (custom && custom !== OFFICIAL_APPS_SCRIPT_URL) {
      localStorage.removeItem(STORAGE_ENDPOINT_KEY);
    }
  } catch (e) {
    // In restricted/incognito environments where localStorage is blocked
  }
  return OFFICIAL_APPS_SCRIPT_URL;
}

/**
 * Updates the user-configured Web App URL override
 */
export function setAppsScriptUrl(url: string): void {
  try {
    if (!url || url.trim().length === 0 || url.trim() === OFFICIAL_APPS_SCRIPT_URL) {
      localStorage.removeItem(STORAGE_ENDPOINT_KEY);
    } else {
      localStorage.setItem(STORAGE_ENDPOINT_KEY, url.trim());
    }
  } catch (e) {}
}

/**
 * Checks if a live Apps Script URL is configured.
 * Always returns true because the official backend endpoint is permanently embedded.
 */
export function isAppsScriptConfigured(): boolean {
  return true;
}
