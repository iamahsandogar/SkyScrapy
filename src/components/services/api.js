const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
          throw new Error("Token refresh failed");
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
            throw new Error(`HTTP error! status: ${retryResponse.status}`);
          }
          return null;
        }

        const retryData = await retryResponse.json();
        if (!retryResponse.ok) {
          throw new Error(
            retryData.error || `HTTP error! status: ${retryResponse.status}`
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
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
    return apiRequest(`${AUTH_BASE}/password-reset-request/`, {
      method: "POST",
      body: JSON.stringify(data),
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
