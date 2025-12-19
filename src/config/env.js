/**
 * Centralized environment variable configuration
 * All environment variables must be prefixed with VITE_ to be exposed to the client
 * @see https://vitejs.dev/guide/env-and-mode.html
 */

// Validate required environment variables
const requiredEnvVars = [
  'VITE_API_BASE_URL',
  'VITE_APP_NAME',
  'VITE_APP_TITLE',
  'VITE_LOGO_ICON_PATH',
  'VITE_LOGO_FULL_PATH',
];

const missingVars = requiredEnvVars.filter(
  (varName) => !import.meta.env[varName]
);

if (missingVars.length > 0 && import.meta.env.MODE === 'production') {
  console.error(
    `Missing required environment variables: ${missingVars.join(', ')}`
  );
}

/**
 * Environment configuration object
 * All values are loaded from environment variables with no hardcoded fallbacks
 */
export const env = {
  // API Configuration
  API_BASE_URL: (() => {
    const url = import.meta.env.VITE_API_BASE_URL;
    if (!url) {
      if (import.meta.env.MODE === 'production') {
        throw new Error('VITE_API_BASE_URL is required in production');
      }
      throw new Error('VITE_API_BASE_URL is required. Please set it in your .env file.');
    }
    // Ensure URL doesn't end with a slash
    return url.endsWith('/') ? url.slice(0, -1) : url;
  })(),
  
  // API Configuration - Optional
  API_TIMEOUT: Number(import.meta.env.VITE_API_TIMEOUT) || 30000, // 30 seconds default
  API_VERSION: import.meta.env.VITE_API_VERSION || '', // Optional API version prefix

  // Application Configuration
  APP_NAME: (() => {
    const name = import.meta.env.VITE_APP_NAME;
    if (!name) {
      throw new Error('VITE_APP_NAME is required. Please set it in your .env file.');
    }
    return name;
  })(),
  
  APP_TITLE: (() => {
    const title = import.meta.env.VITE_APP_TITLE;
    if (!title) {
      throw new Error('VITE_APP_TITLE is required. Please set it in your .env file.');
    }
    return title;
  })(),

  // Asset Paths
  LOGO_ICON_PATH: (() => {
    const path = import.meta.env.VITE_LOGO_ICON_PATH;
    if (!path) {
      throw new Error('VITE_LOGO_ICON_PATH is required. Please set it in your .env file.');
    }
    return path;
  })(),
  
  LOGO_FULL_PATH: (() => {
    const path = import.meta.env.VITE_LOGO_FULL_PATH;
    if (!path) {
      throw new Error('VITE_LOGO_FULL_PATH is required. Please set it in your .env file.');
    }
    return path;
  })(),

  // Environment Mode
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
};

export default env;

