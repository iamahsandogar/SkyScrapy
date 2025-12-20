const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL;

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
