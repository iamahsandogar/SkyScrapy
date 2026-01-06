import apiRequest from "../components/services/api";

// Module-level flags to prevent duplicate API calls
let isPrefetching = false;
let lastPrefetchTime = 0;
const PREFETCH_COOLDOWN = 15000; // 15 seconds - prevent duplicate calls within this window

/**
 * Pre-fetch statuses, sources, employees, and leads data and store in localStorage
 * This is called after login to make data instantly available
 */
export const prefetchLeadData = async () => {
  const now = Date.now();
  
  // Prevent duplicate calls - check both flag and time window
  if (isPrefetching) {
    console.log("Prefetch already in progress, skipping duplicate call");
    return getCachedLeadData(); // Return existing cache if available
  }
  
  // Prevent calls within cooldown period (React StrictMode protection)
  if (now - lastPrefetchTime < PREFETCH_COOLDOWN) {
    console.log("Prefetch called too soon after last call, skipping to prevent duplicates");
    return getCachedLeadData(); // Return existing cache if available
  }
  
  try {
    isPrefetching = true;
    lastPrefetchTime = now;
    console.log("Pre-fetching lead data (statuses, sources, employees, leads)...");

    // Fetch all four APIs in parallel
    const [statusesResponse, sourcesResponse, employeesResponse, leadsResponse] =
      await Promise.all([
        apiRequest("/ui/options/statuses/").catch((err) => {
          console.error("Failed to prefetch statuses:", err);
          return null;
        }),
        apiRequest("/ui/options/sources/").catch((err) => {
          console.error("Failed to prefetch sources:", err);
          return null;
        }),
        apiRequest("/ui/employees/").catch((err) => {
          console.error("Failed to prefetch employees:", err);
          return null;
        }),
        apiRequest("/api/leads/").catch((err) => {
          console.error("Failed to prefetch leads:", err);
          return null;
        }),
      ]);

    // Parse statuses
    let statusesList = [];
    if (statusesResponse) {
      if (Array.isArray(statusesResponse)) {
        statusesList = statusesResponse;
      } else if (statusesResponse?.statuses) {
        statusesList = statusesResponse.statuses;
      } else if (statusesResponse?.data) {
        statusesList = Array.isArray(statusesResponse.data)
          ? statusesResponse.data
          : statusesResponse.data?.statuses || [];
      }
    }

    // Parse sources
    let sourcesList = [];
    if (sourcesResponse) {
      if (Array.isArray(sourcesResponse)) {
        sourcesList = sourcesResponse;
      } else if (sourcesResponse?.sources) {
        sourcesList = sourcesResponse.sources;
      } else if (sourcesResponse?.data) {
        sourcesList = Array.isArray(sourcesResponse.data)
          ? sourcesResponse.data
          : sourcesResponse.data?.sources || [];
      }
    }

    // Parse employees
    let employeesList = [];
    if (employeesResponse) {
      if (Array.isArray(employeesResponse)) {
        employeesList = employeesResponse;
      } else if (employeesResponse?.employees) {
        employeesList = employeesResponse.employees;
      } else if (employeesResponse?.data) {
        employeesList = Array.isArray(employeesResponse.data)
          ? employeesResponse.data
          : employeesResponse.data?.employees || [];
      }
    }

    // Don't filter employees - store all employees for lookup
    // (leads might be assigned to inactive employees, so we need all for display)
    const allEmployees = employeesList;

    // Parse leads
    let leadsList = [];
    if (leadsResponse) {
      if (Array.isArray(leadsResponse)) {
        leadsList = leadsResponse;
      } else if (leadsResponse?.leads) {
        leadsList = leadsResponse.leads;
      } else if (leadsResponse?.data) {
        leadsList = Array.isArray(leadsResponse.data)
          ? leadsResponse.data
          : leadsResponse.data?.leads || [];
      }
    }

    // Store in localStorage with timestamp
    const cacheData = {
      statuses: statusesList,
      sources: sourcesList,
      employees: allEmployees,
      leads: leadsList,
      timestamp: Date.now(),
    };

    localStorage.setItem("leadDataCache", JSON.stringify(cacheData));
    console.log("Lead data pre-fetched and cached:", {
      statusesCount: statusesList.length,
      sourcesCount: sourcesList.length,
      employeesCount: allEmployees.length,
      leadsCount: leadsList.length,
    });

    isPrefetching = false;
    console.log("Prefetch completed successfully at", new Date().toISOString());
    return cacheData;
  } catch (error) {
    console.error("Error pre-fetching lead data:", error);
    isPrefetching = false;
    // Don't throw - allow login to continue even if prefetch fails
    return null;
  }
};

/**
 * Get cached lead data from localStorage
 * Returns null if cache is missing or expired (older than 5 minutes)
 */
export const getCachedLeadData = () => {
  try {
    const cached = localStorage.getItem("leadDataCache");
    if (!cached) return null;

    const cacheData = JSON.parse(cached);
    const cacheAge = Date.now() - cacheData.timestamp;
    const maxAge = 5 * 60 * 1000; // 5 minutes

    if (cacheAge > maxAge) {
      console.log("Cache expired, will refresh");
      localStorage.removeItem("leadDataCache");
      return null;
    }

    return cacheData;
  } catch (error) {
    console.error("Error reading cached lead data:", error);
    return null;
  }
};

/**
 * Clear cached lead data
 */
export const clearLeadDataCache = () => {
  localStorage.removeItem("leadDataCache");
};

