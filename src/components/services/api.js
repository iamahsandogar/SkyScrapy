const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const createApiError = (message, status, data) => {
  const error = new Error(message);
  if (typeof status === "number") {
    error.status = status;
  }
  if (data) {
    error.data = data;
  }
  return error;
};

const extractErrorMessage = (data, status) => {
  let errorMessage = null;

  // 1. Try standard string properties
  if (data?.error && typeof data.error === 'string') errorMessage = data.error;
  else if (data?.detail && typeof data.detail === 'string') errorMessage = data.detail;
  else if (data?.message && typeof data.message === 'string') errorMessage = data.message;
  else if (data?.msg && typeof data.msg === 'string') errorMessage = data.msg;

  // 2. Scan object for field errors (skipping flags)
  if (!errorMessage && data && typeof data === 'object') {
    const keys = Object.keys(data);
    for (const key of keys) {
      if (['error', 'success', 'status', 'code', 'ok', 'is_active', 'is_staff'].includes(key)) continue;

      const value = data[key];
      // Case A: Array of strings (Django style: { title: ["Error msg"] })
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
        errorMessage = value[0];
        break;
      } 
      // Case B: Simple string (e.g. { error_msg: "Error" })
      else if (typeof value === 'string') {
        errorMessage = value;
        break;
      }
      // Case C: Nested object (e.g. { data: { title: ["Error"] } })
      else if (typeof value === 'object' && value !== null) {
        // Recursive check (shallow)
        if (value.title && Array.isArray(value.title)) errorMessage = value.title[0];
        else if (value.error) errorMessage = value.error;
        if (errorMessage) break;
      }
    }
  }

  // 3. Fallback: Log the full structure to console for debugging if still generic
  if (!errorMessage) {
    console.warn("API Error extraction failed. Raw data:", data);
  }

  return errorMessage || `HTTP error! status: ${status}`;
};

/**
 * Internal function to refresh token (doesn't use apiRequest to avoid circular dependency)
 */
async function refreshTokenInternal() {
  const url = `${API_BASE_URL}/api/common/auth/refresh-token/`;
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response.ok;
}

/**
 * Make API request with automatic cookie handling
 * Cookies are automatically sent and received by the browser
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultOptions = {
    credentials: "include", // CRITICAL: This sends cookies with the request
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  });

  // Handle 401 Unauthorized (expired access token) - try refresh token
  if (response.status === 401) {
    // Don't handle refresh for auth endpoints
    const authEndpoints = [
      "/api/common/auth/login/",
      "/api/common/auth/logout/",
      "/api/common/auth/refresh-token/",
      "/api/common/auth/password-reset-request/",
      "/api/common/auth/password-reset-confirm/",
    ];

    const isAuthEndpoint = authEndpoints.some((authPath) =>
      endpoint.includes(authPath)
    );

    if (!isAuthEndpoint) {
      // Try to refresh token
      try {
        const refreshSuccess = await refreshTokenInternal();
        if (!refreshSuccess) {
          throw createApiError("Token refresh failed", response.status);
        }

        // Retry the original request after refresh
        const retryResponse = await fetch(url, {
          ...defaultOptions,
          ...options,
          headers: {
            ...defaultOptions.headers,
            ...options.headers,
          },
        });

        // If retry still fails, redirect to login
        if (retryResponse.status === 401) {
          localStorage.removeItem("user");
          localStorage.removeItem("isAuth");
          window.location.href = "/login";
          return;
        }

        // Process retry response
        const retryContentType = retryResponse.headers.get("content-type");
        if (
          !retryContentType ||
          !retryContentType.includes("application/json")
        ) {
          if (!retryResponse.ok) {
            throw createApiError(
              `HTTP error! status: ${retryResponse.status}`,
              retryResponse.status
            );
          }
          return null;
        }

        const retryData = await retryResponse.json();
        if (!retryResponse.ok) {
          throw createApiError(
            extractErrorMessage(retryData, retryResponse.status),
            retryResponse.status,
            retryData
          );
        }

        return retryData;
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem("user");
        localStorage.removeItem("isAuth");
        window.location.href = "/login";
        return;
      }
    }
  }

  // Handle non-JSON responses
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    if (!response.ok) {
      throw createApiError(
        `HTTP error! status: ${response.status}`,
        response.status
      );
    }
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw createApiError(
      extractErrorMessage(data, response.status),
      response.status,
      data
    );
  }

  return data;
}

// Authentication API methods
const AUTH_BASE = "/api/common/auth";

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
    return apiRequest(`${AUTH_BASE}/password-reset-request/`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  passwordResetConfirm: async (data) => {
    return apiRequest(`${AUTH_BASE}/password-reset-confirm/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// Generic API request method for other endpoints
export default apiRequest;
