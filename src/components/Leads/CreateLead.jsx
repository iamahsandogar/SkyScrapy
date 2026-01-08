import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Paper,
} from "@mui/material";
import { useState, useEffect } from "react";
import Topbar from "../global/Topbar";
import { useParams, useNavigate } from "react-router-dom";
import { LocalizationProvider, DatePicker, TimePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import apiRequest from "../services/api";
import { getCachedLeadData, prefetchLeadData, clearLeadDataCache, addLeadToCache } from "../../utils/prefetchData";

// Module-level flag to prevent duplicate API calls
let isRefreshing = false;
let lastRefreshTime = 0;
const REFRESH_COOLDOWN = 10000; // 10 seconds - prevent duplicate calls within this window

const MuiSelectPadding = {
  "& .MuiOutlinedInput-root": {
    padding: 0,
  },
  "& .MuiSelect-select": {
    padding: "7px",
    height: "auto",
  },
  "& .MuiPickersSectionList-sectionContent": {
    padding: "7px",
  },
};

const MuiTextFieldPadding = {
  "& .MuiOutlinedInput-root": {
    padding: 0,
  },
  "& .MuiOutlinedInput-input": {
    padding: "7px",
    height: "auto",
  },
};

const MuiDatePickerPadding = {
  "& .MuiOutlinedInput-root": {
    padding: 0,
  },
  "& .MuiPickersInputBase-sectionsContainer": {
    padding: "7px",
  },
  "& .MuiPickersSectionList-sectionContent": {
    padding: 0,
  },
};

export default function CreateLead() {
  const { editId } = useParams();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [meta, setMeta] = useState({ status: [], source: [] });
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loadingLead, setLoadingLead] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    status: null,
    source: "",
    description: "",
    company_name: "",
    contact_first_name: "",
    contact_last_name: "",
    contact_email: "",
    contact_phone: "",
    contact_position_title: "",
    contact_linkedin_url: "",
    assigned_to: null,
    follow_up_at: null,
    follow_up_time: null,
    follow_up_status: "",
  });

  /* ------------------------------------
     FETCH ALL DATA FROM BACKEND (STATUS, SOURCE, EMPLOYEES)
     This function is called for both admin and employee users
     Uses cached data first for instant loading, then refreshes
  -------------------------------------*/
  const fetchAllData = async () => {
      setLoadingMeta(true);

    // Try to get cached data first for instant loading
    const cachedData = getCachedLeadData();
    const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes
    
    if (cachedData && cachedData.timestamp) {
      const cacheAge = Date.now() - cachedData.timestamp;
      const isCacheFresh = cacheAge < CACHE_MAX_AGE;
      
      if (isCacheFresh) {
        console.log("Using cached lead data (cache is fresh, no API calls needed)");
      setMeta({
          status: cachedData.statuses || [],
          source: cachedData.sources || [],
        });
        
        // Filter employees based on user role even from cache
        const storedUser = localStorage.getItem("user");
        let currentUserId = null;
        let isCurrentUserAdmin = false;
        let userData = null;
        
        if (storedUser) {
          userData = JSON.parse(storedUser);
          currentUserId = userData.id || userData.pk || userData.uuid;
          isCurrentUserAdmin = 
            userData.is_staff ||
            userData.is_admin ||
            userData.is_superuser ||
            userData.role === 0 ||
            userData.role === "0";
        }
        
        let filteredEmployees = [];
        if (!isCurrentUserAdmin && !editId) {
          // For employees creating a new lead: only show themselves and Admin users
          if (cachedData.employees && cachedData.employees.length > 0) {
            filteredEmployees = cachedData.employees.filter((e) => {
              const empId = e.id || e.pk || e.uuid;
              const isAdmin = 
                e.is_staff ||
                e.is_admin ||
                e.is_superuser ||
                e.role === 0 ||
                e.role === "0";
              
              return String(empId) === String(currentUserId) || isAdmin;
            });
          }
          
          // If no cached employees or filtered list is empty, create fallback from logged-in user
          if (filteredEmployees.length === 0 && currentUserId && userData) {
            const fallbackEmployee = {
              id: currentUserId,
              pk: currentUserId,
              uuid: currentUserId,
              firstName: userData.first_name || userData.firstName || "",
              first_name: userData.first_name || userData.firstName || "",
              lastName: userData.last_name || userData.lastName || "",
              last_name: userData.last_name || userData.lastName || "",
              is_staff: userData.is_staff || false,
              is_admin: userData.is_admin || false,
              is_superuser: userData.is_superuser || false,
              role: userData.role || null,
            };
            filteredEmployees = [fallbackEmployee];
            console.log("Using fallback employee from cache:", fallbackEmployee);
          }
        } else {
          // For admins or when editing: show all employees from cache
          filteredEmployees = cachedData.employees || [];
        }
        
        setEmployees(filteredEmployees);
        setLoadingMeta(false);
        
        // Only refresh in background if cache is older than 5 minutes
        // This prevents unnecessary API calls when opening the page multiple times
        if (cacheAge > CACHE_MAX_AGE) {
          console.log("Cache is stale, refreshing in background...");
          refreshDataInBackground();
        } else {
          console.log("Cache is fresh, skipping API calls");
        }
        return;
      } else {
        console.log("Cache is stale, fetching fresh data...");
      }
    } else {
      console.log("No cache available, fetching fresh data...");
    }

    // No cache or cache is stale, fetch fresh data
    await refreshDataInBackground();
  };

  const refreshDataInBackground = async () => {
    // Prevent duplicate calls
    const now = Date.now();
    if (isRefreshing) {
      console.log("Refresh already in progress, skipping duplicate call");
      return;
    }
    
    if (now - lastRefreshTime < REFRESH_COOLDOWN) {
      console.log("Refresh called too soon after last call, skipping to prevent duplicates");
      return;
    }
    
    isRefreshing = true;
    lastRefreshTime = now;
    
    try {
      // Initialize with empty arrays
      let statusesList = [];
      let sourcesList = [];
      let employeesList = [];

    // Fetch statuses - handle errors individually so other calls can still succeed
    try {
      console.log("Fetching statuses from /ui/options/statuses/");
      const statusesResponse = await apiRequest("/ui/options/statuses/");
      console.log("Statuses API response:", statusesResponse);

      // Handle multiple response structures
      if (Array.isArray(statusesResponse)) {
        statusesList = statusesResponse;
      } else if (statusesResponse?.statuses) {
        statusesList = statusesResponse.statuses;
      } else if (statusesResponse?.data) {
        statusesList = Array.isArray(statusesResponse.data)
          ? statusesResponse.data
          : statusesResponse.data?.statuses || [];
      }

      console.log("Parsed statuses:", statusesList);
    } catch (error) {
      console.error("Failed to fetch statuses:", error);
      console.error("Statuses error details:", {
        message: error.message,
        endpoint: "/ui/options/statuses/",
      });
      statusesList = [];
    }

    // Fetch sources - handle errors individually so other calls can still succeed
    try {
      console.log("Fetching sources from /ui/options/sources/");
      const sourcesResponse = await apiRequest("/ui/options/sources/");
      console.log("Sources API response:", sourcesResponse);

      // Handle multiple response structures
      if (Array.isArray(sourcesResponse)) {
        sourcesList = sourcesResponse;
      } else if (sourcesResponse?.sources) {
        sourcesList = sourcesResponse.sources;
      } else if (sourcesResponse?.data) {
        sourcesList = Array.isArray(sourcesResponse.data)
          ? sourcesResponse.data
          : sourcesResponse.data?.sources || [];
      }

      console.log("Parsed sources:", sourcesList);
    } catch (error) {
      console.error("Failed to fetch sources:", error);
      console.error("Sources error details:", {
        message: error.message,
        endpoint: "/ui/options/sources/",
      });
      sourcesList = [];
    }

    // Fetch employees - handle errors individually so other calls can still succeed
    // Get current user info first (needed for fallback)
    const storedUser = localStorage.getItem("user");
    let currentUserId = null;
    let isCurrentUserAdmin = false;
    let userData = null;
    
    if (storedUser) {
      userData = JSON.parse(storedUser);
      currentUserId = userData.id || userData.pk || userData.uuid;
      isCurrentUserAdmin = 
        userData.is_staff ||
        userData.is_admin ||
        userData.is_superuser ||
        userData.role === 0 ||
        userData.role === "0";
    }

    // Only fetch employees API if user is admin
    if (isCurrentUserAdmin) {
      try {
        console.log("Admin user - Fetching employees from /ui/employees/");
        const employeesResponse = await apiRequest("/ui/employees/");
        console.log("Employees API response:", employeesResponse);

        // Handle multiple response structures
        if (Array.isArray(employeesResponse)) {
          employeesList = employeesResponse;
        } else if (employeesResponse?.employees) {
          employeesList = employeesResponse.employees;
        } else if (employeesResponse?.data) {
          employeesList = Array.isArray(employeesResponse.data)
            ? employeesResponse.data
            : employeesResponse.data?.employees || [];
        }

        console.log("Parsed employees (before filter):", employeesList);

        // For admins: show all active employees + admins
        let filteredEmployees = employeesList.filter(
          (e) => 
            e.status === "Active" || 
            e.is_active === true ||
            e.is_staff === true ||
            e.is_admin === true ||
            e.is_superuser === true ||
            e.role === 0 ||
            e.role === "0"
        );
        console.log("Filtered employees (admin view - all active + admins):", filteredEmployees);

        employeesList = filteredEmployees;
    } catch (error) {
        console.error("Failed to fetch employees:", error);
        console.error("Employees error details:", {
          message: error.message,
          endpoint: "/ui/employees/",
        });
        employeesList = [];
      }
    } else {
      // For employees, don't call the API - they don't need the employees list
      // The "Assigned To" field is hidden for employees when creating new leads
      console.log("Employee user - Skipping employees API call");
      employeesList = [];
    }
    // Update state with fetched data (even if some are empty)
    setMeta({
      status: statusesList,
      source: sourcesList,
    });
    setEmployees(employeesList);

      setLoadingMeta(false);

    // Update cache with fresh data (only if we got some data)
    if (statusesList.length > 0 || sourcesList.length > 0 || employeesList.length > 0) {
      const cacheData = {
        statuses: statusesList,
        sources: sourcesList,
        employees: employeesList,
        timestamp: Date.now(),
      };
      localStorage.setItem("leadDataCache", JSON.stringify(cacheData));
    }

      // Log summary
      console.log("Data fetch complete:", {
        statusesCount: statusesList.length,
        sourcesCount: sourcesList.length,
        employeesCount: employeesList.length,
      });
    } finally {
      // Always reset flag, even if there was an error
      isRefreshing = false;
    }
  };

  useEffect(() => {
    // Get current user from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      // Check if user is admin/manager
      // role 0 = Admin/Manager, role 1 = Employee
      const admin =
        userData.is_staff ||
        userData.is_admin ||
        userData.is_superuser ||
        userData.role === 0 ||
        userData.role === "0";
      setIsAdmin(admin);

      // For employees creating a new lead, don't set assigned_to
      // Backend will handle the assignment automatically
      // We don't set assigned_to here to avoid sending invalid profile ID
    }

    // Load all data (status, source, employees) when page opens
    // Then load lead data if editing
    const loadData = async () => {
      // First, fetch status, source, and employees
      await fetchAllData();

      // Then, if editing, fetch the lead data
      // IMPORTANT: Wait for employees to load before loading lead data
      // This ensures we can properly match assigned_to with employees list
    if (editId) {
        setLoadingLead(true);
        try {
          // Ensure editId is a valid string/number
          const leadId = String(editId).trim();
          if (!leadId || leadId === 'undefined' || leadId === 'null') {
            throw new Error(`Invalid lead ID: ${editId}`);
          }

          console.log("Fetching lead data for edit, editId:", leadId);

          // First, try to get lead from cache (faster and works even if API fails)
          const cachedData = getCachedLeadData();
          let leadToEdit = null;
          let fromCache = false;

          if (cachedData?.leads && Array.isArray(cachedData.leads)) {
            const cachedLead = cachedData.leads.find(
              (lead) => String(lead.id) === String(leadId)
            );
            if (cachedLead) {
              console.log("Found lead in cache, using cached data");
              leadToEdit = cachedLead;
              fromCache = true;
            }
          }

          // If not in cache, try API
          if (!leadToEdit) {
            console.log("Lead not in cache, fetching from API...");
            let lastError;

            try {
              leadToEdit = await apiRequest(`/api/leads/${leadId}/`);
              console.log("Successfully fetched with trailing slash");
            } catch (slashError) {
              console.log("Failed with trailing slash, trying without...", slashError);
              lastError = slashError;
              try {
                leadToEdit = await apiRequest(`/api/leads/${leadId}`);
                console.log("Successfully fetched without trailing slash");
              } catch (noSlashError) {
                console.error("Both API attempts failed");
                lastError = noSlashError;
                
                // If we have cached data, use it as fallback
                if (cachedData?.leads && Array.isArray(cachedData.leads)) {
                  const cachedLead = cachedData.leads.find(
                    (lead) => String(lead.id) === String(leadId)
                  );
                  if (cachedLead) {
                    console.warn("API failed, but using cached lead data as fallback");
                    leadToEdit = cachedLead;
                    fromCache = true;
                  } else {
                    // No cached data available, throw error
                    throw noSlashError;
                  }
                } else {
                  // No cache available, throw error
                  throw noSlashError;
                }
              }
            }
          }

          console.log("Lead data received (raw):", leadToEdit);

          if (!leadToEdit) {
            throw new Error("No data received from API - response was empty");
          }

          // Handle different response formats - API might return { lead: {...} } or { data: {...} }
          let leadData = leadToEdit;
          if (leadToEdit.lead) {
            leadData = leadToEdit.lead;
            console.log("Lead data found in 'lead' property");
          } else if (leadToEdit.data) {
            leadData = leadToEdit.data;
            console.log("Lead data found in 'data' property");
          }

          console.log("Processed lead data:", leadData);

          // Ensure status is set as ID (number) if it comes as an object
          let statusId = leadData.status;
          if (typeof leadData.status === 'object' && leadData.status !== null) {
            statusId = leadData.status.id || leadData.status.pk || null;
          }

          // Extract assigned_to ID properly - handle nested structure
          // API returns: assigned_to.user_details.id (user ID) or assigned_to.id (profile ID)
          // For employees, we don't need to set this in formData (field is hidden)
          // But we extract it for reference/logging
          let assignedToId = leadData.assigned_to || leadData.assignedTo || null;
          let assignedToProfileId = null; // Store profile ID as well for matching
          
          if (assignedToId && typeof assignedToId === 'object' && assignedToId !== null) {
            // Store profile ID (assigned_to.id) - this is what employees list might use
            assignedToProfileId = assignedToId.id || assignedToId.pk || assignedToId.uuid || null;
            
            // Check user_details.id first (this is the actual user ID)
            if (assignedToId.user_details && assignedToId.user_details.id) {
              assignedToId = assignedToId.user_details.id;
            } else {
              // Fallback to profile ID
              assignedToId = assignedToProfileId;
            }
          }

          // For employees, ensure assigned_to is set to their own ID (even if not shown in form)
          if (!isAdmin) {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
              const userData = JSON.parse(storedUser);
              const currentUserId = userData.id || userData.pk || userData.uuid;
              if (currentUserId) {
                assignedToId = currentUserId;
                console.log("Employee editing lead - auto-assigning to employee ID:", currentUserId);
              }
            }
          }

          // For admins: Try to match with employees list using both profile ID and user ID
          // Employees list typically uses profile ID (assigned_to.id), so prioritize that
          if (isAdmin && employees.length > 0) {
            const originalAssignedTo = leadData.assigned_to || leadData.assignedTo;
            let matchedEmployee = null;
            
            // First, try matching with profile ID (assigned_to.id) - this is most common
            if (originalAssignedTo && typeof originalAssignedTo === 'object' && originalAssignedTo.id) {
              matchedEmployee = employees.find((emp) => {
                const empId = emp.id || emp.pk || emp.uuid;
                return String(empId) === String(originalAssignedTo.id);
              });
              
              if (matchedEmployee) {
                assignedToId = matchedEmployee.id || matchedEmployee.pk || matchedEmployee.uuid;
                console.log("✅ Matched employee by profile ID:", {
                  employee: `${matchedEmployee.firstName || matchedEmployee.first_name} ${matchedEmployee.lastName || matchedEmployee.last_name}`,
                  profileId: originalAssignedTo.id,
                  employeeId: assignedToId
                });
              }
            }
            
            // If not found by profile ID, try matching with user ID (assigned_to.user_details.id)
            if (!matchedEmployee && originalAssignedTo && typeof originalAssignedTo === 'object' && originalAssignedTo.user_details?.id) {
              matchedEmployee = employees.find((emp) => {
                const empId = emp.id || emp.pk || emp.uuid;
                const empUserId = emp.user_id || emp.userId || emp.user_details?.id;
                return (
                  String(empId) === String(originalAssignedTo.user_details.id) ||
                  String(empUserId) === String(originalAssignedTo.user_details.id)
                );
              });
              
              if (matchedEmployee) {
                assignedToId = matchedEmployee.id || matchedEmployee.pk || matchedEmployee.uuid;
                console.log("✅ Matched employee by user ID:", {
                  employee: `${matchedEmployee.firstName || matchedEmployee.first_name} ${matchedEmployee.lastName || matchedEmployee.last_name}`,
                  userId: originalAssignedTo.user_details.id,
                  employeeId: assignedToId
                });
              }
            }
            
            // If still not found, try with the extracted assignedToId
            if (!matchedEmployee && assignedToId) {
              matchedEmployee = employees.find((emp) => {
                const empId = emp.id || emp.pk || emp.uuid;
                const empUserId = emp.user_id || emp.userId || emp.user_details?.id;
                return (
                  String(empId) === String(assignedToId) ||
                  String(empUserId) === String(assignedToId)
                );
              });
              
              if (matchedEmployee) {
                assignedToId = matchedEmployee.id || matchedEmployee.pk || matchedEmployee.uuid;
                console.log("✅ Matched employee by extracted ID:", {
                  employee: `${matchedEmployee.firstName || matchedEmployee.first_name} ${matchedEmployee.lastName || matchedEmployee.last_name}`,
                  extractedId: assignedToId,
                  employeeId: assignedToId
                });
              }
            }
            
            if (!matchedEmployee) {
              console.warn("⚠️ Could not find matching employee for assigned_to:", {
                originalAssignedTo: originalAssignedTo,
                assignedToId: assignedToId,
                assignedToProfileId: assignedToProfileId,
                employeesCount: employees.length,
                employeeIds: employees.map(e => ({ 
                  id: e.id, 
                  pk: e.pk, 
                  uuid: e.uuid, 
                  name: `${e.firstName || e.first_name} ${e.lastName || e.last_name}` 
                }))
              });
            }
          }

          // Parse follow_up_at datetime properly
          // follow_up_at now contains combined date and time as ISO datetime string
          let followUpDate = null;
          let followUpTime = null;
          
          if (leadData.follow_up_at || leadData.followUpAt) {
            const dateTimeValue = leadData.follow_up_at || leadData.followUpAt;
            const dateTime = dayjs(dateTimeValue);
            
            if (dateTime.isValid()) {
              // Extract date part (set to start of day for date picker)
              followUpDate = dateTime.startOf('day');
              // Extract time part (create a dayjs object with just the time for time picker)
              followUpTime = dayjs().hour(dateTime.hour()).minute(dateTime.minute()).second(0).millisecond(0);
            } else {
              console.warn("Invalid follow_up_at datetime:", dateTimeValue);
            }
          }
          
          // Fallback: if follow_up_time exists separately (for backward compatibility)
          if (!followUpTime && (leadData.follow_up_time || leadData.followUpTime)) {
            const timeValue = leadData.follow_up_time || leadData.followUpTime;
            // Try parsing as time string (HH:mm format)
            if (typeof timeValue === 'string' && timeValue.includes(':')) {
              followUpTime = dayjs(timeValue, "HH:mm");
            } else {
              followUpTime = dayjs(timeValue);
            }
            if (!followUpTime.isValid()) {
              console.warn("Invalid follow_up_time:", timeValue);
              followUpTime = null;
            }
          }

          // For admins: Try to match assigned_to with employees list to get the correct ID
          // Employees list might use profile ID or user ID, so we need to match both
          // IMPORTANT: Always preserve the original assigned_to profile ID if we can't find a match
          let finalAssignedToId = assignedToId;
          const originalAssignedTo = leadData.assigned_to || leadData.assignedTo;
          
          // For admins, prioritize preserving the profile ID (assigned_to.id) which is what the backend expects
          if (isAdmin) {
            // First, try to get the profile ID from the original assigned_to object
            if (originalAssignedTo && typeof originalAssignedTo === 'object' && originalAssignedTo.id) {
              // Use the profile ID as the default (this is what the backend expects)
              finalAssignedToId = originalAssignedTo.id;
              console.log("Using profile ID from assigned_to:", finalAssignedToId);
            } else if (!finalAssignedToId && assignedToProfileId) {
              // Fallback to stored profile ID if we have it
              finalAssignedToId = assignedToProfileId;
              console.log("Using stored profile ID:", finalAssignedToId);
            }
            
            // Then try to match with employees list if available
            // This is CRITICAL: We need to match with employees list to get the correct ID format for the dropdown
            // The dropdown uses employee.id/pk/uuid, so we MUST match and use that format
            if (employees.length > 0 && finalAssignedToId) {
              // Try to find matching employee using both profile ID and user ID
              // We need to match the original assigned_to with employees to get the correct ID format
              let matchedEmployee = null;
              
              // PRIMARY MATCH: Direct match by profile ID (assigned_to.id === employee.id)
              // This is the most common case - both use profile IDs
              if (originalAssignedTo && typeof originalAssignedTo === 'object' && originalAssignedTo.id) {
                const assignedToProfileId = String(originalAssignedTo.id).trim();
                
                matchedEmployee = employees.find((emp) => {
                  const empId = emp.id || emp.pk || emp.uuid;
                  if (!empId) return false;
                  
                  // Direct match: employee.id === assigned_to.id (both are profile IDs)
                  return String(empId).trim() === assignedToProfileId;
                });
                
                if (matchedEmployee) {
                  console.log("✅ PRIMARY MATCH: assigned_to.id === employee.id", {
                    assignedToId: originalAssignedTo.id,
                    employeeId: matchedEmployee.id,
                    employeeName: `${matchedEmployee.firstName || matchedEmployee.first_name} ${matchedEmployee.lastName || matchedEmployee.last_name}`,
                    employeeEmail: matchedEmployee.email
                  });
                }
              }
              
              // If not found, try matching by user ID (assigned_to.user_details.id)
              if (!matchedEmployee && originalAssignedTo && typeof originalAssignedTo === 'object' && originalAssignedTo.user_details?.id) {
                matchedEmployee = employees.find((emp) => {
                  const empId = emp.id || emp.pk || emp.uuid;
                  const empUserId = emp.user_id || emp.userId || emp.user_details?.id;
                  return (
                    String(empId) === String(originalAssignedTo.user_details.id) ||
                    String(empUserId) === String(originalAssignedTo.user_details.id)
                  );
                });
              }
              
              // IMPORTANT: Also try matching assigned_to.id as a user ID
              // Sometimes assigned_to.id might actually be a user ID, not a profile ID
              if (!matchedEmployee && originalAssignedTo && typeof originalAssignedTo === 'object' && originalAssignedTo.id) {
                matchedEmployee = employees.find((emp) => {
                  const empUserId = emp.user_id || emp.userId || emp.user_details?.id;
                  // Try matching the assigned_to.id as a user ID
                  return String(empUserId) === String(originalAssignedTo.id);
                });
              }
              
              // If still not found, try matching with extracted assignedToId
              if (!matchedEmployee && assignedToId) {
                matchedEmployee = employees.find((emp) => {
                  const empId = emp.id || emp.pk || emp.uuid;
                  const empUserId = emp.user_id || emp.userId || emp.user_details?.id;
                  return (
                    String(empId) === String(assignedToId) ||
                    String(empUserId) === String(assignedToId) ||
                    String(empId) === String(finalAssignedToId)
                  );
                });
              }
              
              // Last resort: try matching finalAssignedToId as user ID
              if (!matchedEmployee && finalAssignedToId) {
                matchedEmployee = employees.find((emp) => {
                  const empUserId = emp.user_id || emp.userId || emp.user_details?.id;
                  return String(empUserId) === String(finalAssignedToId);
                });
              }

              if (matchedEmployee) {
                // Use the employee's profile ID (id/pk/uuid) for the form
                // This MUST match the format used in the dropdown MenuItem values
                finalAssignedToId = matchedEmployee.id || matchedEmployee.pk || matchedEmployee.uuid;
                console.log("✅ Matched employee for assigned_to:", {
                  employee: `${matchedEmployee.firstName || matchedEmployee.first_name} ${matchedEmployee.lastName || matchedEmployee.last_name}`,
                  employeeId: finalAssignedToId,
                  employeeIdType: typeof finalAssignedToId,
                  originalAssignedToId: assignedToId,
                  originalAssignedTo: originalAssignedTo
                });
              } else {
                // If no match found, keep the profile ID we extracted earlier
                // But log a warning so we can debug
                console.warn("⚠️ Could not find matching employee in list, preserving original assigned_to profile ID:", {
                  preservedProfileId: finalAssignedToId,
                  preservedProfileIdType: typeof finalAssignedToId,
                  originalAssignedTo: originalAssignedTo,
                  assignedToId: assignedToId,
                  employeesCount: employees.length,
                  sampleEmployeeIds: employees.slice(0, 5).map(e => ({
                    id: e.id,
                    pk: e.pk,
                    uuid: e.uuid,
                    name: `${e.firstName || e.first_name} ${e.lastName || e.last_name}`
                  }))
                });
              }
            } else {
              console.warn("⚠️ Employees list is empty, cannot match assigned_to. Preserving original ID:", finalAssignedToId);
            }
          }

          // Set form data with lead data - this will populate all fields
          // Handle both snake_case (from API) and camelCase (from list) formats
          const formDataToSet = {
            title: leadData.title || leadData.leadTitle || "",
            status: statusId,
            source: leadData.source || "",
            description: leadData.description || "",
            company_name: leadData.company_name || leadData.company || "",
            contact_first_name: leadData.contact_first_name || leadData.firstName || "",
            contact_last_name: leadData.contact_last_name || leadData.lastName || "",
            contact_email: leadData.contact_email || leadData.email || "",
            contact_phone: leadData.contact_phone || leadData.phone || "",
            contact_position_title: leadData.contact_position_title || leadData.positionTitle || "",
            contact_linkedin_url: leadData.contact_linkedin_url || leadData.linkedIn || "",
            assigned_to: finalAssignedToId,
            follow_up_at: followUpDate,
            follow_up_time: followUpTime,
            follow_up_status: leadData.follow_up_status || leadData.followupStatus || "",
          };

          // Validate that finalAssignedToId exists in employees list before setting form data
          // This prevents MUI "out-of-range value" errors
          let validatedAssignedToId = finalAssignedToId;
          if (isAdmin && finalAssignedToId && employees.length > 0) {
            const isValidId = employees.some((emp) => {
              const empId = emp.id || emp.pk || emp.uuid;
              return String(empId) === String(finalAssignedToId);
            });
            
            if (!isValidId) {
              console.warn("⚠️ assigned_to ID not found in employees list, clearing value to prevent MUI error:", {
                invalidId: finalAssignedToId,
                employeesCount: employees.length,
                availableIds: employees.map(e => e.id || e.pk || e.uuid)
              });
              validatedAssignedToId = null; // Clear invalid ID
            }
          }
          
          console.log("Setting form data for edit:", {
            ...formDataToSet,
            assigned_to: validatedAssignedToId
          });
          console.log("Assigned To Details:", {
            finalAssignedToId: finalAssignedToId,
            validatedAssignedToId: validatedAssignedToId,
            originalAssignedTo: originalAssignedTo,
            assignedToId: assignedToId,
            assignedToProfileId: assignedToProfileId,
            employeesCount: employees.length,
            employeesList: employees.map(e => ({
              id: e.id,
              pk: e.pk,
              uuid: e.uuid,
              name: `${e.firstName || e.first_name} ${e.lastName || e.last_name}`
            }))
          });
          
            setFormData({
            ...formDataToSet,
            assigned_to: validatedAssignedToId
          });

          setIsDataLoaded(true);
          console.log("Form data loaded and set for editing:", {
            status: statusId,
            assigned_to: formDataToSet.assigned_to,
            assigned_to_type: typeof formDataToSet.assigned_to,
            originalAssignedTo: leadData.assigned_to || leadData.assignedTo,
            title: leadData.title || leadData.leadTitle,
            contact_first_name: leadData.contact_first_name || leadData.firstName,
            fromCache: fromCache,
          });

          // Show warning if using cached data (API might be down)
          if (fromCache) {
            console.warn("⚠️ Using cached lead data. Some fields might be outdated. API call failed.");
            // Don't show alert - just use cached data silently
            // User can still edit and save, which will update the data
          }
        } catch (error) {
          console.error("Failed to load lead - Full error:", error);
          console.error("Error message:", error.message);
          console.error("Error stack:", error.stack);

          // Try to use cached data as last resort
          const cachedData = getCachedLeadData();
          if (cachedData?.leads && Array.isArray(cachedData.leads)) {
            const cachedLead = cachedData.leads.find(
              (lead) => String(lead.id) === String(leadId)
            );
            if (cachedLead) {
              console.warn("API failed, but found lead in cache. Using cached data.");
              try {
                // Process cached lead data (same logic as above)
                let leadData = cachedLead;
                let statusId = leadData.status;
                if (typeof leadData.status === 'object' && leadData.status !== null) {
                  statusId = leadData.status.id || leadData.status.pk || null;
                }

                // Extract assigned_to ID properly
                let assignedToId = leadData.assigned_to || leadData.assignedTo || null;
                if (assignedToId && typeof assignedToId === 'object' && assignedToId !== null) {
                  if (assignedToId.user_details && assignedToId.user_details.id) {
                    assignedToId = assignedToId.user_details.id;
                  } else {
                    assignedToId = assignedToId.id || assignedToId.pk || assignedToId.uuid || null;
                  }
                }

                // Parse dates
                let followUpDate = null;
                if (leadData.follow_up_at || leadData.followUpAt) {
                  const dateValue = leadData.follow_up_at || leadData.followUpAt;
                  followUpDate = dayjs(dateValue);
                  if (!followUpDate.isValid()) {
                    followUpDate = null;
                  }
                }

                let followUpTime = null;
                if (leadData.follow_up_time || leadData.followUpTime) {
                  const timeValue = leadData.follow_up_time || leadData.followUpTime;
                  if (typeof timeValue === 'string' && timeValue.includes(':')) {
                    followUpTime = dayjs(timeValue, "HH:mm");
                  } else {
                    followUpTime = dayjs(timeValue);
                  }
                  if (!followUpTime.isValid()) {
                    followUpTime = null;
                  }
                }

                const formDataToSet = {
                  title: leadData.title || leadData.leadTitle || "",
                  status: statusId,
                  source: leadData.source || "",
                  description: leadData.description || "",
                  company_name: leadData.company_name || leadData.company || "",
                  contact_first_name: leadData.contact_first_name || leadData.firstName || "",
                  contact_last_name: leadData.contact_last_name || leadData.lastName || "",
                  contact_email: leadData.contact_email || leadData.email || "",
                  contact_phone: leadData.contact_phone || leadData.phone || "",
                  contact_position_title: leadData.contact_position_title || leadData.positionTitle || "",
                  contact_linkedin_url: leadData.contact_linkedin_url || leadData.linkedIn || "",
                  assigned_to: assignedToId,
                  follow_up_at: followUpDate,
                  follow_up_time: followUpTime,
                  follow_up_status: leadData.follow_up_status || leadData.followupStatus || "",
                };

                setFormData(formDataToSet);
                setIsDataLoaded(true);
                setLoadingLead(false);
                
                const errorMessage = error.message || "Unknown error";
                alert(
                  `⚠️ API Error: ${errorMessage}\n\nUsing cached data. Some fields might be outdated.\n\nYou can still edit and save the lead.`
                );
                return; // Successfully loaded from cache
              } catch (cacheError) {
                console.error("Failed to load from cache:", cacheError);
              }
            }
          }

          // If we get here, we couldn't load from cache either
          const errorMessage = error.message || "Unknown error";
          alert(
            `Failed to load lead data.\n\nError: ${errorMessage}\n\nPlease check:\n1. The lead ID is correct\n2. You have permission to view this lead\n3. The API is accessible\n\nPlease refresh the page and try again.`
          );
        } finally {
          setLoadingLead(false);
        }
      } else {
        // Not editing, mark as loaded
        setIsDataLoaded(true);
      }
    };

    // Reset form data and loading state when editId changes
    // Only reset if editId actually changed (not on initial mount)
    if (editId) {
      setIsDataLoaded(false);
      // Don't clear form data here - let it load from API
      // This prevents form from being cleared while loading
    }

    loadData();
  }, [editId]);

  // Update assigned_to when employees list loads (in case it loads after form data is set)
  // This ensures the dropdown shows the correct employee even if employees load asynchronously
  useEffect(() => {
    // Only update if we're editing and have formData.assigned_to but it's not matching any employee
    if (editId && isAdmin && formData.assigned_to && employees.length > 0 && isDataLoaded) {
      const currentAssignedToId = formData.assigned_to;
      const currentIdStr = String(currentAssignedToId).trim();
      
      // PRIMARY MATCH: Check if current assigned_to matches employee.id (profile ID)
      // This is the most common case - both use profile IDs
      // The lead's assigned_to.id should match the employee's id directly
      let matchedEmployee = employees.find((emp) => {
        const empId = emp.id || emp.pk || emp.uuid;
        if (!empId) return false;
        // Direct match: employee.id === assigned_to (both are profile IDs)
        return String(empId).trim() === currentIdStr;
      });
      
      // FALLBACK: If not found by profile ID, try matching by user_id
      if (!matchedEmployee) {
        matchedEmployee = employees.find((emp) => {
          const empUserId = emp.user_id || emp.userId || emp.user_details?.id;
          if (!empUserId) return false;
          return String(empUserId).trim() === currentIdStr;
        });
      }

      // If we found a match, ensure we're using the correct profile ID (employee.id)
      if (matchedEmployee) {
        const correctId = matchedEmployee.id || matchedEmployee.pk || matchedEmployee.uuid;
        const correctIdStr = String(correctId).trim();
        
        // Update if the IDs are different (format mismatch) or if current is null/empty
        if (currentIdStr !== correctIdStr || !currentIdStr) {
          console.log("🔄 Updating assigned_to to match employees list:", {
            oldId: currentAssignedToId,
            newId: correctId,
            employee: `${matchedEmployee.firstName || matchedEmployee.first_name} ${matchedEmployee.lastName || matchedEmployee.last_name}`,
            employeeEmail: matchedEmployee.email
          });
          
          setFormData(prev => ({
            ...prev,
            assigned_to: correctId
          }));
        } else {
          console.log("✅ assigned_to already matches employee:", {
            assignedToId: currentAssignedToId,
            employeeId: correctId,
            employee: `${matchedEmployee.firstName || matchedEmployee.first_name} ${matchedEmployee.lastName || matchedEmployee.last_name}`
          });
        }
      } else {
        // If no match found, log detailed info but don't clear (preserve the ID)
        console.warn("⚠️ assigned_to value not found in employees list:", {
          assignedToId: currentAssignedToId,
          employeesCount: employees.length,
          availableEmployeeIds: employees.map(e => ({
            id: e.id,
            user_id: e.user_id,
            name: `${e.firstName || e.first_name} ${e.lastName || e.last_name}`
          }))
        });
        
        // Don't clear - preserve the ID even if not in list (employee might be inactive/deleted)
        // The validation in the TextField value prop will handle showing "Select Employee"
      }
    }
  }, [employees, editId, isAdmin, isDataLoaded, formData.assigned_to]); // Re-run when employees list or formData changes

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDateChange = (date) => {
    setFormData({ ...formData, follow_up_at: date });
  };

  const handleTimeChange = (time) => {
    setFormData({ ...formData, follow_up_time: time });
  };

  const isValidLinkedInURL = (url) => {
    const regex =
      /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/(in|company)\/[A-Za-z0-9._-]+\/?$/i;
    return regex.test(url);
  };

  const validateForm = () => {
    // For employees creating a new lead, assigned_to is not required (auto-assigned by backend)
    // For admins or when editing, assigned_to is required
    const requiredFields = [
      "title",
      "status",
    ];
    
    // Only require assigned_to for admins (employees auto-assign to themselves)
    if (isAdmin) {
      requiredFields.push("assigned_to");
    }

    for (let field of requiredFields) {
      if (
        !formData[field] ||
        (typeof formData[field] === "string" && formData[field].trim() === "")
      ) {
        return false;
      }
    }

    // Validate LinkedIn URL format
    if (
      formData.contact_linkedin_url &&
      !isValidLinkedInURL(formData.contact_linkedin_url)
    ) {
      alert("Please enter a valid LinkedIn URL !");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      alert("Please fill all required fields !");
      return;
    }

    // Prepare payload according to API structure
    const payload = {
      title: formData.title.trim(),
      status: formData.status,
      source: formData.source?.trim() || "",
      description: formData.description?.trim() || "",
      company_name: formData.company_name?.trim() || "",
      contact_first_name: formData.contact_first_name.trim(),
      contact_last_name: formData.contact_last_name?.trim() || "",
      contact_email: formData.contact_email.trim(),
      contact_phone: formData.contact_phone?.trim() || "",
      contact_position_title: formData.contact_position_title.trim(),
      contact_linkedin_url: formData.contact_linkedin_url.trim(),
      // Only include assigned_to for admins
      // For employees (creating or editing), don't send assigned_to (backend will auto-assign)
      ...(isAdmin && formData.assigned_to && { assigned_to: formData.assigned_to }),
      // Combine follow_up_at (date) and follow_up_time (time) into a single datetime string
      follow_up_at: (() => {
        if (formData.follow_up_at && formData.follow_up_time) {
          // Combine date and time into ISO datetime string with timezone
          const date = dayjs(formData.follow_up_at);
          const time = dayjs(formData.follow_up_time);
          const combined = date
            .hour(time.hour())
            .minute(time.minute())
            .second(0)
            .millisecond(0);
          // Format as ISO string with timezone (e.g., "2026-01-07T14:30:00+05:30")
          return combined.format();
        } else if (formData.follow_up_at) {
          // Only date, set time to start of day
          return dayjs(formData.follow_up_at).startOf('day').format();
        }
        return null;
      })(),
      follow_up_status: formData.follow_up_status?.trim() || "",
    };
    
    console.log("Submitting lead payload:", payload);
    console.log("Is Admin:", isAdmin, "Is Edit:", !!editId, "Has assigned_to:", !!formData.assigned_to);

    try {
      if (editId) {
        // 🔁 UPDATE LEAD
        const response = await apiRequest(`/api/leads/${editId}/`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        alert("Lead updated successfully!");
        
        // Parse the response to get the updated lead
        let updatedLead = null;
        if (response) {
          // Handle different response formats
          if (response.lead) {
            updatedLead = response.lead;
          } else if (response.data) {
            updatedLead = response.data.lead || response.data;
          } else if (Array.isArray(response)) {
            updatedLead = response[0];
          } else {
            updatedLead = response;
          }
        }
        
        // If response doesn't have all fields, merge with form data
        // Also ensure assigned_to is set for employees (backend auto-assigns)
        if (updatedLead) {
          // Get current user to set assigned_to for employees
          const storedUser = localStorage.getItem("user");
          let currentUserId = null;
          if (storedUser && !isAdmin) {
            const userData = JSON.parse(storedUser);
            currentUserId = userData.id || userData.pk || userData.uuid;
          }
          
          // Merge form data with API response to ensure all fields are present
          const mergedLead = {
            ...updatedLead,

            // Ensure all form fields are included
            title: updatedLead.title || formData.title,
            status: updatedLead.status || formData.status,
            source: updatedLead.source || formData.source,
            description: updatedLead.description || formData.description,
            company_name: updatedLead.company_name || formData.company_name,
            contact_first_name:
              updatedLead.contact_first_name || formData.contact_first_name,
            contact_last_name:
              updatedLead.contact_last_name || formData.contact_last_name,
            contact_email: updatedLead.contact_email || formData.contact_email,
            contact_phone: updatedLead.contact_phone || formData.contact_phone,
            contact_position_title:
              updatedLead.contact_position_title ||
              formData.contact_position_title,
            contact_linkedin_url:
              updatedLead.contact_linkedin_url || formData.contact_linkedin_url,

            // follow_up_at now contains combined date and time as ISO datetime string
            follow_up_at:
              updatedLead.follow_up_at ||
              (formData.follow_up_at && formData.follow_up_time
                ? dayjs(formData.follow_up_at)
                    .hour(dayjs(formData.follow_up_time).hour())
                    .minute(dayjs(formData.follow_up_time).minute())
                    .second(0)
                    .millisecond(0)
                    .format()
                : formData.follow_up_at
                ? dayjs(formData.follow_up_at).startOf('day').format()
                : null),
            follow_up_status:
              updatedLead.follow_up_status || formData.follow_up_status,

            // ✅ Ensure assignment (employee-safe)
            assigned_to:
              updatedLead.assigned_to ||
              updatedLead.assignedTo ||
              (currentUserId ? currentUserId : formData.assigned_to),
          };

          // Update cache with the updated lead
          addLeadToCache(mergedLead);
          console.log("Updated lead added to cache, navigating to AllLeads", mergedLead);
        } else {
          console.warn("Could not parse updated lead from response:", response);
          // Fallback: clear cache if we can't parse the response
          clearLeadDataCache();
        }
      } else {
        // ➕ CREATE LEAD
        const response = await apiRequest("/api/leads/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        alert("Lead created successfully!");
        
        // Parse the response to get the created lead
        let createdLead = null;
        if (response) {
          // Handle different response formats
          if (response.lead) {
            createdLead = response.lead;
          } else if (response.data) {
            createdLead = response.data.lead || response.data;
          } else if (Array.isArray(response)) {
            createdLead = response[0];
          } else {
            createdLead = response;
          }
        }
        
        // If response doesn't have all fields, merge with form data
        // Also ensure assigned_to is set for employees (backend auto-assigns)
        if (createdLead) {
          // Get current user to set assigned_to for employees
          const storedUser = localStorage.getItem("user");
          let currentUserId = null;
          if (storedUser && !isAdmin) {
            const userData = JSON.parse(storedUser);
            currentUserId = userData.id || userData.pk || userData.uuid;
          }
          
          // Merge form data with API response to ensure all fields are present
          const mergedLead = {
            ...createdLead,

            // Ensure all form fields are included
            title: createdLead.title || formData.title,
            status: createdLead.status || formData.status,
            source: createdLead.source || formData.source,
            description: createdLead.description || formData.description,
            company_name: createdLead.company_name || formData.company_name,
            contact_first_name:
              createdLead.contact_first_name || formData.contact_first_name,
            contact_last_name:
              createdLead.contact_last_name || formData.contact_last_name,
            contact_email: createdLead.contact_email || formData.contact_email,
            contact_phone: createdLead.contact_phone || formData.contact_phone,
            contact_position_title:
              createdLead.contact_position_title ||
              formData.contact_position_title,
            contact_linkedin_url:
              createdLead.contact_linkedin_url || formData.contact_linkedin_url,

            // follow_up_at now contains combined date and time as ISO datetime string
            follow_up_at:
              createdLead.follow_up_at ||
              (formData.follow_up_at && formData.follow_up_time
                ? dayjs(formData.follow_up_at)
                    .hour(dayjs(formData.follow_up_time).hour())
                    .minute(dayjs(formData.follow_up_time).minute())
                    .second(0)
                    .millisecond(0)
                    .format()
                : formData.follow_up_at
                ? dayjs(formData.follow_up_at).startOf('day').format()
                : null),
            follow_up_status:
              createdLead.follow_up_status || formData.follow_up_status,

            // ✅ CRITICAL FIX — ensure creator is ALWAYS present
            created_by:
              createdLead.created_by || createdLead.createdBy || currentUserId,

            // ✅ Ensure assignment (employee-safe)
            assigned_to:
              createdLead.assigned_to ||
              createdLead.assignedTo ||
              (currentUserId ? currentUserId : formData.assigned_to),
          };

          
          addLeadToCache(mergedLead);
          console.log("New lead added to cache, navigating to AllLeads", mergedLead);
        } else {
          console.warn("Could not parse created lead from response:", response);
          // Fallback: clear cache if we can't parse the response
          clearLeadDataCache();
        }
      }

      navigate("/all-leads");
    } catch (error) {
      console.error("Submit Lead Error:", error);
      alert(error.message || "Failed to submit lead");
    }
  };

  const RequiredLabel = ({ text }) => (
    <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
      {text} <span style={{ color: "red" }}>*</span>
    </Typography>
  );

  return (
    <>
      <Topbar>
        <Typography variant="h5" fontWeight="bold">
          {editId ? "Edit Lead" : "Create Lead"}
        </Typography>
      </Topbar>

      <Box mt={2} sx={{ boxShadow: "none" }}>
        <Paper sx={{ p: 3, borderRadius: 3, boxShadow: "none" }} elevation={1}>
          {loadingLead && editId ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
              <Typography>Loading lead data...</Typography>
            </Box>
          ) : (
          <Box display="flex" flexDirection="column" gap={2}>
            {/* ROW 1 */}
            <Box display="flex" gap={2} flexWrap="wrap">
              <Box flex={1} minWidth={200}>
                {/* <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                  Title
                </Typography> */}
                <RequiredLabel text="Title" />

                <TextField
                  sx={MuiTextFieldPadding}
                  fullWidth
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                />
              </Box>
              <Box flex={1} minWidth={200}>
                {/* <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                  Status
                </Typography> */}
                <RequiredLabel text="Status" />

                <TextField
                  sx={MuiSelectPadding}
                  select
                  fullWidth
                  name="status"
                  value={formData.status || ""}
                  onChange={(e) => {
                    const selectedId =
                      e.target.value === "" ? null : parseInt(e.target.value);
                    setFormData({ ...formData, status: selectedId });
                  }}
                  disabled={loadingMeta}
                  displayempty="true"
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (val) => {
                      if (!val && val !== 0) return "Select Status";
                      const selectedStatus = meta.status.find(
                        (item) =>
                          (typeof item === "object"
                            ? item.id || item.pk
                            : null) === val
                      );
                      return selectedStatus
                        ? typeof selectedStatus === "string"
                          ? selectedStatus
                          : selectedStatus.name
                        : "Select Status";
                    },
                  }}
                >
                  <MenuItem value="" disabled>
                    {loadingMeta
                      ? "Loading..."
                      : meta.status.length === 0
                        ? "No statuses available"
                        : "Select Status"}
                  </MenuItem>
                  {meta.status.map((item, index) => {
                    const statusId =
                      typeof item === "object" ? item.id || item.pk : null;
                    const statusName =
                      typeof item === "string" ? item : item.name;
                    const key = statusId || index;
                    return (
                      <MenuItem key={key} value={statusId || ""}>
                        {statusName}
                      </MenuItem>
                    );
                  })}
                </TextField>
              </Box>
              <Box flex={1} minWidth={200}>
                <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                  Source
                </Typography>
                <TextField
                  sx={MuiSelectPadding}
                  select
                  fullWidth
                  name="source"
                  value={formData.source ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, source: e.target.value })
                  }
                  disabled={loadingMeta}
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (val) => {
                      if (val === "" || val === null) return "None";
                      return val;
                    },
                  }}
                >
                  <MenuItem value="">None</MenuItem>
                  {meta.source.length === 0 && !loadingMeta ? (
                    <MenuItem value="" disabled>
                      No sources available
                    </MenuItem>
                  ) : (
                    meta.source.map((item, index) => {
                    const value = typeof item === "string" ? item : item.name;
                    const key =
                      typeof item === "object" && item.id ? item.id : index;
                    return (
                      <MenuItem key={key} value={value}>
                        {value}
                      </MenuItem>
                    );
                    })
                  )}
                </TextField>
              </Box>
            </Box>

            {/* Description */}
            <Box>
              <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                Description
              </Typography>
              <TextField
                sx={MuiTextFieldPadding}
                fullWidth
                multiline
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleChange}
              />
            </Box>

            {/* ROW 2 */}
            <Box display="flex" gap={2} flexWrap="wrap">
              {/* Only show "Assigned To" field for admins */}
              {/* For employees (creating or editing), field is hidden and auto-assigned to themselves */}
              {!isAdmin ? null : (
              <Box flex={1} minWidth={200}>
                <RequiredLabel text="Assigned To" />
                <TextField
                  sx={MuiSelectPadding}
                  select
                  fullWidth
                  name="assigned_to"
                  value={(() => {
                    // Validate that assigned_to value exists in employees list
                    // This prevents MUI "out-of-range value" errors
                    if (!formData.assigned_to) return "";
                    
                    const assignedToStr = String(formData.assigned_to).trim();
                    if (!assignedToStr) return "";
                    
                    // Check if the value exists in employees list
                    const isValid = employees.some((emp) => {
                      const empId = emp.id || emp.pk || emp.uuid;
                      const empUserId = emp.user_id || emp.userId || emp.user_details?.id;
                      return (
                        (empId && String(empId).trim() === assignedToStr) ||
                        (empUserId && String(empUserId).trim() === assignedToStr) ||
                        (emp.pk && String(emp.pk).trim() === assignedToStr) ||
                        (emp.uuid && String(emp.uuid).trim() === assignedToStr)
                      );
                    });
                    
                    // Only return the value if it's valid, otherwise return empty string
                    return isValid ? assignedToStr : "";
                  })()}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      assigned_to: e.target.value || null,
                    });
                  }}
                    disabled={loadingMeta}
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (val) => {
                        if (!val && val !== 0) return "Select Employee";
                        
                        // Convert val to string for consistent comparison
                        const valStr = String(val).trim();
                        if (!valStr) return "Select Employee";
                        
                        // Try to find employee by multiple ID fields with better matching
                        const selectedEmp = employees.find((emp) => {
                          const empId = emp.id || emp.pk || emp.uuid;
                          const empUserId = emp.user_id || emp.userId || emp.user_details?.id;
                          
                          // Compare as strings to avoid type mismatch issues
                          // Check all possible ID fields
                          return (
                            (empId && String(empId).trim() === valStr) ||
                            (empUserId && String(empUserId).trim() === valStr) ||
                            (emp.pk && String(emp.pk).trim() === valStr) ||
                            (emp.uuid && String(emp.uuid).trim() === valStr)
                          );
                        });
                        
                        if (selectedEmp) {
                          const name = `${selectedEmp.firstName || selectedEmp.first_name || ""
                            } ${selectedEmp.lastName || selectedEmp.last_name || ""
                            }`.trim();
                          return name || "Unknown Employee";
                        }
                        
                        return "Select Employee";
                      },
                    }}
                  >
                    <MenuItem value="" disabled>
                      {loadingMeta
                        ? "Loading..."
                        : employees.length === 0
                        ? "No employees available"
                        : "Select Employee"}
                  </MenuItem>

                  {employees.map((emp) => {
                    const empId = emp.id || emp.pk || emp.uuid;
                    if (!empId) return null;

                    return (
                      <MenuItem key={empId} value={String(empId)}>
                        {emp.firstName || emp.first_name || ""}{" "}
                        {emp.lastName || emp.last_name || ""}
                      </MenuItem>
                    );
                  })}
                </TextField>
              </Box>
              )}
              <Box flex={1} minWidth={200}>
                <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                  Follow Up Date
                </Typography>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    value={formData.follow_up_at}
                    onChange={handleDateChange}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: MuiDatePickerPadding,
                      },
                    }}
                  />
                </LocalizationProvider>
              </Box>
              <Box flex={1} minWidth={200}>
                <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                  Follow Up Time
                </Typography>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <TimePicker
                    value={formData.follow_up_time}
                    onChange={handleTimeChange}
                    ampm
                    timeSteps={{ minutes: 1 }}   
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: MuiDatePickerPadding,
                      },
                    }}
                  />
                </LocalizationProvider>

              </Box>
              <Box flex={1} minWidth={200}>
                <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                  Follow Up Status
                </Typography>
                <TextField
                  sx={MuiSelectPadding}
                  select
                  fullWidth
                  name="follow_up_status"
                  value={formData.follow_up_status || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      follow_up_status: e.target.value,
                    })
                  }
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (val) => (val === "" ? "None" : val),
                  }}
                >
                  {/* <MenuItem value="">None</MenuItem> */}
                  <MenuItem value="done">done</MenuItem>
                  <MenuItem value="pending">pending</MenuItem>
                </TextField>
              </Box>
            </Box>

            {/* ROW 3 */}
            <Box display="flex" gap={2} flexWrap="wrap">
              <Box flex={1} minWidth={200}>
                <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                  Company Name
                </Typography>
                <TextField
                  sx={MuiTextFieldPadding}
                  fullWidth
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                />
              </Box>
              <Box flex={1} minWidth={200}>
                <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                  Contact First Name
                </Typography>
                <TextField
                  sx={MuiTextFieldPadding}
                  fullWidth
                  name="contact_first_name"
                  value={formData.contact_first_name}
                  onChange={handleChange}
                />
              </Box>
              <Box flex={1} minWidth={200}>
                <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                  Contact Last Name
                </Typography>
                <TextField
                  sx={MuiTextFieldPadding}
                  fullWidth
                  name="contact_last_name"
                  value={formData.contact_last_name}
                  onChange={handleChange}
                />
              </Box>
            </Box>

            {/* ROW 4 */}
            <Box display="flex" gap={2} flexWrap="wrap">
              <Box flex={1} minWidth={200}>
                <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                  Contact Email
                </Typography>
                <TextField
                  sx={MuiTextFieldPadding}
                  fullWidth
                  name="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={handleChange}
                />
              </Box>
              <Box flex={1} minWidth={200}>
                <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                  Contact Phone
                </Typography>
                <TextField
                  sx={MuiTextFieldPadding}
                  fullWidth
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                />
              </Box>
              <Box flex={1} minWidth={200}>
                <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                  Contact Position Title
                </Typography>
                <TextField
                  sx={MuiTextFieldPadding}
                  fullWidth
                  name="contact_position_title"
                  value={formData.contact_position_title}
                  onChange={handleChange}
                />
              </Box>
            </Box>

            {/* ROW 5 - LinkedIn URL */}
            <Box>
              <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                Contact LinkedIn URL
              </Typography>
              <TextField
                sx={MuiTextFieldPadding}
                fullWidth
                name="contact_linkedin_url"
                value={formData.contact_linkedin_url}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/username"
                onBlur={() => {
                  if (
                    formData.contact_linkedin_url &&
                    !isValidLinkedInURL(formData.contact_linkedin_url)
                  ) {
                    alert(
                      "Please enter a valid LinkedIn URL (e.g., https://linkedin.com/in/username)"
                    );
                  }
                }}
              />
            </Box>

            {/* Submit */}
            <Box>
              <Button
                variant="contained"
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: "bold",
                  px: 3,
                  py: 1,
                }}
                onClick={handleSubmit}
              >
                {editId ? "Update Lead" : "Create Lead"}
              </Button>
            </Box>
          </Box>
          )}
        </Paper>
      </Box>
    </>
  );
}
