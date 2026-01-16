import apiRequest from "../components/services/api";

// Module-level flags to prevent duplicate API calls
let isPrefetching = false;
let lastPrefetchTime = 0;
const PREFETCH_COOLDOWN = 15000; // 15 seconds - prevent duplicate calls within this window

/**
 * Get the current user's ID for cache key isolation
 * Each user gets their own cache to avoid data leakage between admin/employee
 */
const getCurrentUserId = () => {
  try {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return null;
    const userData = JSON.parse(storedUser);
    return userData.id || userData.pk || userData.uuid || null;
  } catch (e) {
    console.warn("Error getting current user ID:", e);
    return null;
  }
};

/**
 * Get the cache key for the current user
 * Returns user-specific key like "leadDataCache_123" or fallback "leadDataCache"
 */
const getCacheKey = () => {
  const userId = getCurrentUserId();
  return userId ? `leadDataCache_${userId}` : "leadDataCache";
};

/**
 * Pre-fetch statuses, sources, employees, and optionally leads data and store in localStorage.
 * Pass `{ includeLeads: false }` if you only need metadata (used by lead form navigation).
 * This is called after login to make data instantly available.
 */
export const prefetchLeadData = async ({ includeLeads = true } = {}) => {
  const now = Date.now();

  // Prevent duplicate calls - check both flag and time window
  if (isPrefetching) {
    console.log("Prefetch already in progress, skipping duplicate call");
    return getCachedLeadData(); // Return existing cache if available
  }

  // Prevent calls within cooldown period (React StrictMode protection)
  if (now - lastPrefetchTime < PREFETCH_COOLDOWN) {
    console.log(
      "Prefetch called too soon after last call, skipping to prevent duplicates"
    );
    return getCachedLeadData(); // Return existing cache if available
  }

  // Check if user is employee (not admin) - employees can't access employees API
  const storedUser = localStorage.getItem("user");
  let isCurrentUserAdmin = false;

  if (storedUser) {
    try {
      const userData = JSON.parse(storedUser);
      isCurrentUserAdmin =
        userData.is_staff ||
        userData.is_admin ||
        userData.is_superuser ||
        userData.role === 0 ||
        userData.role === "0";
    } catch (e) {
      console.warn("Error parsing user data:", e);
    }
  }

  try {
    isPrefetching = true;
    lastPrefetchTime = now;
    console.log(
      `Pre-fetching lead data${includeLeads ? "" : " (metadata only)"}...`
    );

    // Single API call to get both statuses and sources
    const optionsPromise = apiRequest("/ui/options/").catch((err) => {
      console.error("Failed to prefetch options (statuses & sources):", err);
      return null;
    });

    const employeesPromise = isCurrentUserAdmin
      ? apiRequest("/ui/employees/").catch((err) => {
          console.error("Failed to prefetch employees:", err);
          return null;
        })
      : Promise.resolve(null);

    const leadsPromise = includeLeads
      ? apiRequest("/api/leads/").catch((err) => {
          console.error("Failed to prefetch leads:", err);
          return null;
        })
      : Promise.resolve(null);

    const [
      optionsResponse,
      employeesResponse,
      leadsResponse,
    ] = await Promise.all([
      optionsPromise,
      employeesPromise,
      leadsPromise,
    ]);

    // Parse statuses and sources from single options response
    let statusesList = [];
    let sourcesList = [];
    
    if (optionsResponse) {
      // Extract statuses
      if (Array.isArray(optionsResponse.statuses)) {
        statusesList = optionsResponse.statuses;
      } else if (optionsResponse?.data?.statuses && Array.isArray(optionsResponse.data.statuses)) {
        statusesList = optionsResponse.data.statuses;
      }

      // Extract sources
      if (Array.isArray(optionsResponse.sources)) {
        sourcesList = optionsResponse.sources;
      } else if (optionsResponse?.data?.sources && Array.isArray(optionsResponse.data.sources)) {
        sourcesList = optionsResponse.data.sources;
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

    // Parse leads (only if requested)
    let leadsList = [];
    let hasNewLeads = false;
    if (includeLeads && leadsResponse) {
      hasNewLeads = true;
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

    const existingCache = getCachedLeadData() || {
      statuses: [],
      sources: [],
      employees: [],
      leads: [],
    };

    // Store in localStorage with timestamp (merge metadata to preserve cached leads when not fetched)
    const cacheData = {
      ...existingCache,
      statuses: statusesList.length > 0 ? statusesList : existingCache.statuses,
      sources: sourcesList.length > 0 ? sourcesList : existingCache.sources,
      employees:
        employeesList.length > 0 ? employeesList : existingCache.employees,
      leads: hasNewLeads ? leadsList : existingCache.leads,
      timestamp: Date.now(),
    };

    const cacheKey = getCacheKey();
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log(`Lead data pre-fetched and cached for user (${cacheKey}):`, {
      statusesCount: statusesList.length,
      sourcesCount: sourcesList.length,
      employeesCount: allEmployees.length,
      leadsCount: hasNewLeads ? leadsList.length : cacheData.leads.length,
      includeLeads,
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
 * Uses user-specific cache key to isolate data between users
 */
export const getCachedLeadData = () => {
  try {
    const cacheKey = getCacheKey();
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const cacheData = JSON.parse(cached);
    const cacheAge = Date.now() - cacheData.timestamp;
    const maxAge = 5 * 60 * 1000; // 5 minutes

    if (cacheAge > maxAge) {
      console.log(`Cache expired for ${cacheKey}, will refresh`);
      localStorage.removeItem(cacheKey);
      return null;
    }

    return cacheData;
  } catch (error) {
    console.error("Error reading cached lead data:", error);
    return null;
  }
};

/**
 * Clear cached lead data for the current user
 */
export const clearLeadDataCache = () => {
  const cacheKey = getCacheKey();
  localStorage.removeItem(cacheKey);
};

/**
 * Clear all user caches (used on logout to clean up)
 */
export const clearAllUserCaches = () => {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("leadDataCache")) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
};

/**
 * Add a new lead to the cached leads data
 * This is used after creating a lead to update the cache without making an API call
 */
export const addLeadToCache = (newLead) => {
  try {
    const cacheKey = getCacheKey();
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const cacheData = JSON.parse(cached);
      if (cacheData.leads && Array.isArray(cacheData.leads)) {
        // Check if lead already exists (by ID) to avoid duplicates
        const existingIndex = cacheData.leads.findIndex(
          (lead) =>
            (lead.id && newLead.id && String(lead.id) === String(newLead.id)) ||
            (lead.pk && newLead.pk && String(lead.pk) === String(newLead.pk)) ||
            (lead.uuid &&
              newLead.uuid &&
              String(lead.uuid) === String(newLead.uuid))
        );

        if (existingIndex >= 0) {
          // Update existing lead
          cacheData.leads[existingIndex] = newLead;
        } else {
          // Add new lead to the beginning of the array
          cacheData.leads.unshift(newLead);
        }

        // Update timestamp
        cacheData.timestamp = Date.now();
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log("Added new lead to cache:", newLead);
        return cacheData;
      }
    } else {
      // No cache exists, create new one with just this lead
      const newCache = {
        statuses: [],
        sources: [],
        employees: [],
        leads: [newLead],
        timestamp: Date.now(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(newCache));
      console.log("Created new cache with lead:", newLead);
      return newCache;
    }
  } catch (error) {
    console.error("Error adding lead to cache:", error);
    return null;
  }
};

const getLeadIdentifierStrings = (lead) => {
  if (!lead || typeof lead !== "object") return [];
  const ids = [lead.id, lead.pk, lead.uuid, lead.lead_id, lead.leadId];
  return ids
    .filter((value) => value !== null && value !== undefined)
    .map((value) => String(value).trim())
    .filter(Boolean);
};

const resolveLeadIdentifierValue = (value) => {
  if (value == null) return null;
  if (typeof value === "object") {
    return (
      value.id ?? value.pk ?? value.uuid ?? value.lead_id ?? value.leadId ?? null
    );
  }
  return value;
};

const doesLeadMatchId = (lead, targetId) => {
  if (!targetId) return false;
  const normalizedTarget = String(targetId).trim();
  if (!normalizedTarget) return false;
  const leadIds = getLeadIdentifierStrings(lead);
  return leadIds.some((candidate) => candidate === normalizedTarget);
};

export const removeLeadFromCache = (leadLike) => {
  const resolvedId = resolveLeadIdentifierValue(leadLike);
  if (!resolvedId) return null;
  const normalized = String(resolvedId).trim();
  if (!normalized) return null;

  try {
    const cacheKey = getCacheKey();
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    const cacheData = JSON.parse(cached);
    if (!cacheData.leads || !Array.isArray(cacheData.leads)) {
      return cacheData;
    }

    const filteredLeads = cacheData.leads.filter(
      (lead) => !doesLeadMatchId(lead, normalized)
    );

    if (filteredLeads.length === cacheData.leads.length) {
      return cacheData;
    }

    const updatedCache = {
      ...cacheData,
      leads: filteredLeads,
      timestamp: Date.now(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(updatedCache));
    console.log("Removed lead from cache:", normalized);
    return updatedCache;
  } catch (error) {
    console.error("Error removing lead from cache:", error);
    return null;
  }
};
