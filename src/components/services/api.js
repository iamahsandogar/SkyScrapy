import { env } from "../../config/env.js";

const API_BASE_URL = env.API_BASE_URL;
const API_TIMEOUT = env.API_TIMEOUT;
const API_VERSION = env.API_VERSION;

/**
 * Make API request with automatic cookie handling
 * Cookies are automatically sent and received by the browser
 * @param {string} endpoint - API endpoint path (e.g., "/api/common/auth/login/")
 * @param {RequestInit} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<any>} - Response data
 */
async function apiRequest(endpoint, options = {}) {
  // Build full URL with optional API version prefix
  let fullEndpoint = endpoint;
  if (API_VERSION && !endpoint.includes(`/${API_VERSION}/`)) {
    // Insert version after /api if endpoint starts with /api
    fullEndpoint = endpoint.replace(/^(\/api)/, `$1/${API_VERSION}`);
  }
  const url = `${API_BASE_URL}${fullEndpoint}`;

  const defaultOptions = {
    credentials: "include", // CRITICAL: This sends cookies with the request
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...defaultOptions,
      ...options,
      signal: controller.signal,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    });
    
    clearTimeout(timeoutId);

    // Handle non-JSON responses
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return null;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${API_TIMEOUT}ms`);
    }
    throw error;
  }
}

// Authentication API methods
export const authAPI = {
  login: async (email, password) => {
    return apiRequest("/api/common/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  logout: async () => {
    return apiRequest("/api/common/auth/logout/", {
      method: "POST",
    });
  },

  refreshToken: async () => {
    return apiRequest("/api/common/auth/refresh-token/", {
      method: "POST",
    });
  },

  passwordResetRequest: async (email) => {
    return apiRequest("/api/common/auth/password-reset-request/", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  passwordResetConfirm: async (uid, token, password) => {
    return apiRequest("/api/common/auth/password-reset-confirm/", {
      method: "POST",
      body: JSON.stringify({ uid, token, password }),
    });
  },
};

// Generic API request method for other endpoints
export default apiRequest;
