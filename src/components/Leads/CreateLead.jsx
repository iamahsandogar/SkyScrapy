import {
  Backdrop,
  Box,
  Button,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { useState, useEffect } from "react";
import Topbar from "../global/Topbar";
import { useParams, useNavigate } from "react-router-dom";
import {
  LocalizationProvider,
  DatePicker,
  TimePicker,
} from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import apiRequest from "../services/api";
import { clearLeadDataCache, addLeadToCache, getCachedLeadData } from "../../utils/prefetchData";
import DotLoader from "../global/DotLoader";
import { useNotification } from "../../contexts/NotificationContext.jsx";

const parseEmployeesPayload = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.employees)) return payload.employees;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.employees)) return payload.data.employees;
  return [];
};

const getEmployeeDisplayName = (employee = {}) => {
  if (!employee || typeof employee !== "object") {
    return "Unknown Employee";
  }

  const firstName = employee.firstName || employee.first_name || "";
  const lastName = employee.lastName || employee.last_name || "";
  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim();
  }

  const fallbackNames = [
    employee.name,
    employee.fullName,
    employee.full_name,
    employee.display_name,
    employee.username,
    employee.user_name,
  ];

  for (const candidate of fallbackNames) {
    if (candidate && typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed) return trimmed;
    }
  }

  const userDetails =
    employee.user_details || employee.userDetails || employee.user;
  if (userDetails && typeof userDetails === "object") {
    const udFirst = userDetails.firstName || userDetails.first_name || "";
    const udLast = userDetails.lastName || userDetails.last_name || "";
    if (udFirst || udLast) {
      return `${udFirst} ${udLast}`.trim();
    }
    const udFallback =
      userDetails.name || userDetails.fullName || userDetails.username;
    if (udFallback && typeof udFallback === "string") {
      return udFallback.trim();
    }
  }

  return "Unknown Employee";
};

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
  const { notifyError, notifySuccess } = useNotification();
  const [employees, setEmployees] = useState([]);
  const [meta, setMeta] = useState({ status: [], source: [] });
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loadingLead, setLoadingLead] = useState(false);
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
     No cache usage; single calls to ui/options and ui/employees
  -------------------------------------*/
  const fetchAllData = async () => {
    setLoadingMeta(true);

    // Get current user for role-based filtering
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

    try {
      // Always fetch options; fetch employees only for admins
      const requests = [apiRequest("/ui/options/")];
      if (isCurrentUserAdmin) {
        requests.push(apiRequest("/ui/employees/"));
      }

      const [optionsResponse, employeesResponse] = await Promise.all(requests);

      // Parse statuses and sources
      let statusesList = [];
      let sourcesList = [];

      if (optionsResponse) {
        if (Array.isArray(optionsResponse.statuses)) {
          statusesList = optionsResponse.statuses;
        } else if (
          optionsResponse?.data?.statuses &&
          Array.isArray(optionsResponse.data.statuses)
        ) {
          statusesList = optionsResponse.data.statuses;
        }

        if (Array.isArray(optionsResponse.sources)) {
          sourcesList = optionsResponse.sources;
        } else if (
          optionsResponse?.data?.sources &&
          Array.isArray(optionsResponse.data.sources)
        ) {
          sourcesList = optionsResponse.data.sources;
        }
      }

      // Parse employees
      let employeesList = [];
      if (isCurrentUserAdmin) {
        employeesList = parseEmployeesPayload(employeesResponse);
      } else {
        // For employees: avoid employees API; show only self
        const selfEntry = {
          id: currentUserId,
          firstName: userData?.firstName || userData?.first_name || userData?.name,
          lastName: userData?.lastName || userData?.last_name || "",
          user_id: currentUserId,
        };
        employeesList = [selfEntry];
      }

      setMeta({ status: statusesList, source: sourcesList });
      setEmployees(employeesList);

      // For employees (non-admin) on create, default Assigned To to self if not set
      if (!isCurrentUserAdmin && !editId) {
        const selfEmployee = employeesList.find((emp) => {
          const profileId = emp.id || emp.pk || emp.uuid;
          const userId = emp.user_id || emp.userId || emp.user_details?.id;
          return (
            (profileId && String(profileId) === String(currentUserId)) ||
            (userId && String(userId) === String(currentUserId))
          );
        });

        if (selfEmployee) {
          const selfId =
            selfEmployee.id || selfEmployee.pk || selfEmployee.uuid || currentUserId;
          setFormData((prev) =>
            prev.assigned_to ? prev : { ...prev, assigned_to: String(selfId) }
          );
        }
      }
    } catch (error) {
      console.error("Failed to fetch meta data:", error);
      setMeta({ status: [], source: [] });
      setEmployees([]);
    } finally {
      setLoadingMeta(false);
    }
  };

  // Removed cache-based refresh helpers to avoid localStorage usage for meta data

  const fetchLeadFromApi = async (leadId) => {
    try {
      const response = await apiRequest(`/api/leads/${leadId}/`);
      console.log("Successfully fetched lead with trailing slash");
      return response;
    } catch (slashError) {
      console.log("Failed with trailing slash, trying without...", slashError);
      try {
        const response = await apiRequest(`/api/leads/${leadId}`);
        console.log("Successfully fetched lead without trailing slash");
        return response;
      } catch (noSlashError) {
        console.error("Both API attempts failed while fetching lead details");
        throw noSlashError;
      }
    }
  };

  const getLeadFromCache = (leadId) => {
    // Try to get lead from user's cache for instant display
    const cachedData = getCachedLeadData();
    if (cachedData && Array.isArray(cachedData.leads)) {
      const cachedLead = cachedData.leads.find((l) => {
        const id = l.id || l.pk || l.uuid;
        return String(id) === String(leadId);
      });
      if (cachedLead) {
        console.log("Found lead in cache for instant display:", cachedLead);
        return cachedLead;
      }
    }
    return null;
  };

  // Helper function to populate form with lead data (used for both cache and API data)
  const populateFormWithLeadData = (leadToEdit, isCurrentAdmin, fromCache = false) => {
    try {
      if (!leadToEdit) {
        console.error("populateFormWithLeadData called with null/undefined data");
        return;
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

      if (!leadData || typeof leadData !== 'object') {
        console.error("Invalid lead data structure:", leadData);
        return;
      }

      // Ensure status is set as ID (number) if it comes as an object
      let statusId = leadData.status;
      if (typeof leadData.status === "object" && leadData.status !== null) {
        statusId = leadData.status.id || leadData.status.pk || null;
      }

    // Extract assigned_to ID properly - handle nested structure
    let assignedToId = leadData.assigned_to || leadData.assignedTo || null;
    let assignedToProfileId = null;

    if (assignedToId && typeof assignedToId === "object" && assignedToId !== null) {
      assignedToProfileId = assignedToId.id || assignedToId.pk || assignedToId.uuid || null;
      if (assignedToId.user_details && assignedToId.user_details.id) {
        assignedToId = assignedToId.user_details.id;
      } else {
        assignedToId = assignedToProfileId;
      }
    }

    // For employees, ensure assigned_to is set to their own ID
    if (!isCurrentAdmin) {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        const currentUserId = userData.id || userData.pk || userData.uuid;
        if (currentUserId) {
          assignedToId = currentUserId;
        }
      }
    }

    // Parse follow_up_at datetime properly
    let followUpDate = null;
    let followUpTime = null;

    if (leadData.follow_up_at || leadData.followUpAt) {
      const dateTimeValue = leadData.follow_up_at || leadData.followUpAt;
      const dateTime = dayjs(dateTimeValue);
      if (dateTime.isValid()) {
        followUpDate = dateTime.startOf("day");
        followUpTime = dayjs().hour(dateTime.hour()).minute(dateTime.minute()).second(0).millisecond(0);
      }
    }

    if (!followUpTime && (leadData.follow_up_time || leadData.followUpTime)) {
      const timeValue = leadData.follow_up_time || leadData.followUpTime;
      if (typeof timeValue === "string" && timeValue.includes(":")) {
        followUpTime = dayjs(timeValue, "HH:mm");
      } else {
        followUpTime = dayjs(timeValue);
      }
      if (!followUpTime.isValid()) {
        followUpTime = null;
      }
    }

    let finalAssignedToId = assignedToId;
    const originalAssignedTo = leadData.assigned_to || leadData.assignedTo;

    // For admins, match with employees list
    if (isCurrentAdmin) {
      if (originalAssignedTo && typeof originalAssignedTo === "object" && originalAssignedTo.id) {
        finalAssignedToId = originalAssignedTo.id;
      } else if (!finalAssignedToId && assignedToProfileId) {
        finalAssignedToId = assignedToProfileId;
      }

      if (employees.length > 0 && finalAssignedToId) {
        let matchedEmployee = null;
        
        if (originalAssignedTo && typeof originalAssignedTo === "object" && originalAssignedTo.id) {
          const profileIdStr = String(originalAssignedTo.id).trim();
          matchedEmployee = employees.find((emp) => {
            const empId = emp.id || emp.pk || emp.uuid;
            return empId && String(empId).trim() === profileIdStr;
          });
        }

        if (!matchedEmployee && assignedToId) {
          matchedEmployee = employees.find((emp) => {
            const empId = emp.id || emp.pk || emp.uuid;
            const empUserId = emp.user_id || emp.userId || emp.user_details?.id;
            return String(empId) === String(assignedToId) || String(empUserId) === String(assignedToId);
          });
        }

        if (matchedEmployee) {
          finalAssignedToId = matchedEmployee.id || matchedEmployee.pk || matchedEmployee.uuid;
        }
      }
    }

    // Don't validate assigned_to against employees list here - 
    // the second useEffect will handle matching once employees load
    // This prevents clearing the value when employees list isn't ready yet
    let validatedAssignedToId = finalAssignedToId;

    const formDataToSet = {
      title: leadData.title || leadData.leadTitle || leadData.name || leadData.lead_title || "",
      status: statusId,
      source: leadData.source || leadData.lead_source || "",
      description: leadData.description || leadData.notes || "",
      company_name: leadData.company_name || leadData.company || leadData.companyName || "",
      contact_first_name: leadData.contact_first_name || leadData.firstName || leadData.first_name || leadData.contactFirstName || "",
      contact_last_name: leadData.contact_last_name || leadData.lastName || leadData.last_name || leadData.contactLastName || "",
      contact_email: leadData.contact_email || leadData.email || leadData.contactEmail || "",
      contact_phone: leadData.contact_phone || leadData.phone || leadData.contactPhone || "",
      contact_position_title: leadData.contact_position_title || leadData.positionTitle || leadData.position_title || leadData.contactPositionTitle || "",
      contact_linkedin_url: leadData.contact_linkedin_url || leadData.linkedIn || leadData.linkedin_url || leadData.contactLinkedinUrl || "",
      assigned_to: validatedAssignedToId,
      follow_up_at: followUpDate,
      follow_up_time: followUpTime,
      follow_up_status: leadData.follow_up_status || leadData.followupStatus || leadData.followUpStatus || "",
    };

    console.log(`Setting form data from ${fromCache ? 'cache' : 'API'}:`, formDataToSet);
    setFormData(formDataToSet);
    // Mark data as ready so UI shows cached state immediately; API refresh will overwrite
    setIsDataLoaded(true);
    } catch (error) {
      console.error("Error in populateFormWithLeadData:", error);
    }
  };

  useEffect(() => {
    // Get current user from localStorage
    const storedUser = localStorage.getItem("user");
    let admin = false;
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      // Check if user is admin/manager
      // role 0 = Admin/Manager, role 1 = Employee
      admin =
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
    const loadData = async (isCurrentAdmin) => {
      // First, fetch status, source, and employees
      await fetchAllData();

      if (!editId) {
        setIsDataLoaded(true);
        return;
      }

      setLoadingLead(true);
      const leadId = String(editId).trim();

      try {
        if (!leadId || leadId === "undefined" || leadId === "null") {
          throw new Error(`Invalid lead ID: ${editId}`);
        }

        // STEP 1: First, try to get lead from cache for instant display
        const cachedLead = getLeadFromCache(leadId);
        if (cachedLead) {
          console.log("Populating form from cache first:", cachedLead);
          populateFormWithLeadData(cachedLead, isCurrentAdmin, true);
        }

        // STEP 2: Then fetch fresh data from API (api/leads/<lead-id>/)
        console.log("Fetching fresh lead data from API, editId:", leadId);
        const leadToEdit = await fetchLeadFromApi(leadId);

        console.log("Lead data received from API (raw):", leadToEdit);

        if (!leadToEdit) {
          // If API fails but we have cache, use cache data
          if (cachedLead) {
            console.warn("API failed but using cached data");
            setIsDataLoaded(true);
            return;
          }
          throw new Error("No data received from API - response was empty");
        }

        // STEP 3: Update form with fresh API data
        console.log("Updating form with fresh API data");
        populateFormWithLeadData(leadToEdit, isCurrentAdmin, false);
      } catch (error) {
        console.error("Failed to load lead - Full error:", error);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        const errorMessage = error.message || "Unknown error";
        notifyError(
          `Failed to load lead data.\n\nError: ${errorMessage}\n\nPlease check:\n1. The lead ID is correct\n2. You have permission to view this lead\n3. The API is accessible\n\nPlease refresh the page and try again.`
        );
      } finally {
        setLoadingLead(false);
      }
    };

    // Reset form data and loading state when editId changes
    // Only reset if editId actually changed (not on initial mount)
    if (editId) {
      setIsDataLoaded(false);
      // Don't clear form data here - let it load from API
      // This prevents form from being cleared while loading
    }

    loadData(admin);
  }, [editId]);

  // Update assigned_to when employees list loads (in case it loads after form data is set)
  // This ensures the dropdown shows the correct employee even if employees load asynchronously
  useEffect(() => {
    // Only update if we're editing and have formData.assigned_to but it's not matching any employee
    if (
      editId &&
      isAdmin &&
      formData.assigned_to &&
      employees.length > 0 &&
      isDataLoaded
    ) {
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
        const correctId =
          matchedEmployee.id || matchedEmployee.pk || matchedEmployee.uuid;
        const correctIdStr = String(correctId).trim();

        // Update if the IDs are different (format mismatch) or if current is null/empty
        if (currentIdStr !== correctIdStr || !currentIdStr) {
          console.log("🔄 Updating assigned_to to match employees list:", {
            oldId: currentAssignedToId,
            newId: correctId,
            employee: `${
              matchedEmployee.firstName || matchedEmployee.first_name
            } ${matchedEmployee.lastName || matchedEmployee.last_name}`,
            employeeEmail: matchedEmployee.email,
          });

          setFormData((prev) => ({
            ...prev,
            assigned_to: correctId,
          }));
        } else {
          console.log("✅ assigned_to already matches employee:", {
            assignedToId: currentAssignedToId,
            employeeId: correctId,
            employee: `${
              matchedEmployee.firstName || matchedEmployee.first_name
            } ${matchedEmployee.lastName || matchedEmployee.last_name}`,
          });
        }
      } else {
        // If no match found, log detailed info but don't clear (preserve the ID)
        console.warn("⚠️ assigned_to value not found in employees list:", {
          assignedToId: currentAssignedToId,
          employeesCount: employees.length,
          availableEmployeeIds: employees.map((e) => ({
            id: e.id,
            user_id: e.user_id,
            name: `${e.firstName || e.first_name} ${e.lastName || e.last_name}`,
          })),
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
    const requiredFields = ["title", "status"];

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
      notifyError("Please enter a valid LinkedIn URL !");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      notifyError("Please fill all required fields !");
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
      ...(isAdmin &&
        formData.assigned_to && { assigned_to: formData.assigned_to }),
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
          return dayjs(formData.follow_up_at).startOf("day").format();
        }
        return null;
      })(),
      follow_up_status: formData.follow_up_status?.trim() || "",
    };

    console.log("Submitting lead payload:", payload);
    console.log(
      "Is Admin:",
      isAdmin,
      "Is Edit:",
      !!editId,
      "Has assigned_to:",
      !!formData.assigned_to
    );

    try {
      if (editId) {
        // 🔁 UPDATE LEAD
        const response = await apiRequest(`/api/leads/${editId}/`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        notifySuccess("Lead updated successfully!");

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
                ? dayjs(formData.follow_up_at).startOf("day").format()
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
          console.log(
            "Updated lead added to cache, navigating to AllLeads",
            mergedLead
          );
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
        notifySuccess("Lead created successfully!");

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
                ? dayjs(formData.follow_up_at).startOf("day").format()
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
          console.log(
            "New lead added to cache, navigating to AllLeads",
            mergedLead
          );
        } else {
          console.warn("Could not parse created lead from response:", response);
          // Fallback: clear cache if we can't parse the response
          clearLeadDataCache();
        }
      }

      navigate("/all-leads");
    } catch (error) {
      console.error("Submit Lead Error:", error);
      const message = error.message || "Failed to submit lead";
      notifyError(message);
    }
  };

  const RequiredLabel = ({ text }) => (
    <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
      {text} <span style={{ color: "red" }}>*</span>
    </Typography>
  );

  return (
    <>
      <Backdrop
        open={loadingMeta || (editId && !isDataLoaded)}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer,
          color: "#fff",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <DotLoader size={48} color="#0A66C2" />
        <Typography variant="body2" mt={1}>
          {editId && !isDataLoaded
            ? "Loading lead details..."
            : "Loading statuses and sources..."}
        </Typography>
      </Backdrop>
      <Topbar>
        <Typography variant="h5" fontWeight="bold">
          {editId ? "Edit Lead" : "Create Lead"}
        </Typography>
      </Topbar>

      {/* Main Area */}
      <Box mt={2} sx={{ boxShadow: "none" }}>
        <Paper sx={{ p: 3, borderRadius: 3, boxShadow: "none" }} elevation={1}>
          {loadingLead && editId ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              minHeight={200}
            >
              <Typography>Loading lead data...</Typography>
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" gap={2}>
              {/* ROW 1 */}
              <Box display="flex" gap={2} flexWrap="wrap">
                {/* Lead Title */}
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

                {/* Lead Status */}
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

                {/* Source */}
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
                        const value =
                          typeof item === "string" ? item : item.name;
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
                {/* Show "Assigned To" field for all users - employees can also assign leads */}
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

                        const assignedToStr = String(
                          formData.assigned_to
                        ).trim();
                        if (!assignedToStr) return "";

                        // Check if the value exists in employees list
                        const isValid = employees.some((emp) => {
                          const empId = emp.id || emp.pk || emp.uuid;
                          const empUserId =
                            emp.user_id || emp.userId || emp.user_details?.id;
                          return (
                            (empId && String(empId).trim() === assignedToStr) ||
                            (empUserId &&
                              String(empUserId).trim() === assignedToStr) ||
                            (emp.pk &&
                              String(emp.pk).trim() === assignedToStr) ||
                            (emp.uuid &&
                              String(emp.uuid).trim() === assignedToStr)
                          );
                        });

                        // Only return the value if it's valid, otherwise return empty string
                        return isValid ? assignedToStr : "";
                      })()}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          assigned_to: e.target.value,
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
                            const empUserId =
                              emp.user_id || emp.userId || emp.user_details?.id;

                            // Compare as strings to avoid type mismatch issues
                            // Check all possible ID fields
                            return (
                              (empId && String(empId).trim() === valStr) ||
                              (empUserId &&
                                String(empUserId).trim() === valStr) ||
                              (emp.pk && String(emp.pk).trim() === valStr) ||
                              (emp.uuid && String(emp.uuid).trim() === valStr)
                            );
                          });

                          if (selectedEmp) {
                            return getEmployeeDisplayName(selectedEmp);
                          }

                          return "Select Employee";
                        },
                      }}
                    >
                      {/* <MenuItem value="" disabled>
                        {loadingMeta
                          ? "Loading..."
                          : employees.length === 0
                          ? "No employees available"
                          : "Select Employee"}
                      </MenuItem> */}

                      {employees.map((emp) => {
                        const empId = emp.id || emp.pk || emp.uuid;
                        if (!empId) return null;

                        return (
                          <MenuItem key={empId} value={String(empId)}>
                            {getEmployeeDisplayName(emp)}
                          </MenuItem>
                        );
                      })}
                    </TextField>
                  </Box>

                {/* Follow up DATE */}
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
                      notifyError(
                        "Please enter a valid LinkedIn URL (e.g., https://linkedin.com/in/username)"
                      );
                    }
                  }}
                />
              </Box>

              {/* Submit */}
              <Box display="flex" gap={2} flexWrap="wrap">
                <Button
                  variant="outlined"
                  color="inherit"
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: "bold",
                    px: 3,
                    py: 1,
                  }}
                  onClick={() => navigate("/all-leads")}
                >
                  Cancel
                </Button>
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
