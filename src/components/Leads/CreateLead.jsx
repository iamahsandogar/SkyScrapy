import {
  Box,
  Button,
  Paper,
  Typography,
} from "@mui/material";
import { useState, useEffect } from "react";
import Topbar from "../global/Topbar";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  LocalizationProvider,
  DatePicker,
  TimePicker,
} from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import apiRequest from "../services/api";
import { clearLeadDataCache, addLeadToCache, getCachedLeadData } from "../../utils/prefetchData";
import { useNotification } from "../../contexts/NotificationContext.jsx";
import LeadFormFields from "./LeadFormFields";
import { parseEmployeesPayload, isValidLinkedInURL, filterAssignableEmployees } from "./leadFormUtils";

export default function CreateLead() {
  const { editId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { notifyError, notifySuccess } = useNotification();
  const [employees, setEmployees] = useState([]);
  const [meta, setMeta] = useState({ status: [], source: [], lifecycle: [] });
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loadingLead, setLoadingLead] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    status: null,
    source: "",
    lifecycle: "",
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
    send_reminder_email: false,
    reminder_time_offset: "exact",
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

      // Parse statuses, sources, and lifecycles
      let statusesList = [];
      let sourcesList = [];
      let lifecyclesList = [];

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

        if (Array.isArray(optionsResponse.lifecycles)) {
          lifecyclesList = optionsResponse.lifecycles;
        } else if (
          optionsResponse?.data?.lifecycles &&
          Array.isArray(optionsResponse.data.lifecycles)
        ) {
          lifecyclesList = optionsResponse.data.lifecycles;
        }
      }

      // Parse employees
      let employeesList = [];
      if (isCurrentUserAdmin) {
        employeesList = parseEmployeesPayload(employeesResponse);
      } else {
        // For employees: use cache to allow assigning to self or admins; fallback to self only
        const cachedEmployees = parseEmployeesPayload(getCachedLeadData()?.employees);
        const filtered = filterAssignableEmployees(cachedEmployees, currentUserId, false);

        if (filtered.length > 0) {
          employeesList = filtered;
        } else {
          const selfEntry = {
            id: userData?.employee_profile_id || userData?.profile_id || currentUserId,
            firstName: userData?.firstName || userData?.first_name || userData?.name,
            lastName: userData?.lastName || userData?.last_name || "",
            user_id: currentUserId,
          };
          employeesList = [selfEntry];
        }
      }

      setMeta({ status: statusesList, source: sourcesList, lifecycle: lifecyclesList });
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
      setMeta({ status: [], source: [], lifecycle: [] });
      setEmployees([]);
    } finally {
      setLoadingMeta(false);
    }
  };

  const loadMetaFromCache = (isCurrentAdmin) => {
    const cachedData = getCachedLeadData();
    const cachedStatuses = cachedData?.statuses || [];
    const cachedSources = cachedData?.sources || [];

    setMeta((prev) => ({
      status: cachedStatuses.length > 0 ? cachedStatuses : prev.status,
      source: cachedSources.length > 0 ? cachedSources : prev.source,
    }));

    if (isCurrentAdmin) {
      setEmployees(cachedData?.employees || []);
      return;
    }

    const storedUser = localStorage.getItem("user");
    let currentUserId = null;
    let userData = null;
    if (storedUser) {
      try {
        userData = JSON.parse(storedUser);
        currentUserId =
          userData.id || userData.pk || userData.uuid || userData.user_id;
      } catch (error) {
        console.warn("Unable to parse user while loading cached meta:", error);
      }
    }

    const filtered = filterAssignableEmployees(
      parseEmployeesPayload(cachedData?.employees),
      currentUserId,
      false
    );

    if (filtered.length > 0) {
      setEmployees(filtered);
      return;
    }

    const fallbackEmployee = {
      id: userData?.employee_profile_id || userData?.profile_id || currentUserId,
      firstName: userData?.firstName || userData?.first_name || userData?.name,
      lastName: userData?.lastName || userData?.last_name || "",
      user_id: currentUserId,
    };

    setEmployees([fallbackEmployee]);
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
      title: leadData.title || leadData.leadTitle || "",
      status: statusId,
      source: leadData.source || "",
      lifecycle: leadData.lifecycle || "",
      description: leadData.description || "",
      company_name: leadData.company_name || leadData.company || "",
      contact_first_name: leadData.contact_first_name || leadData.firstName || "",
      contact_last_name: leadData.contact_last_name || leadData.lastName || "",
      contact_email: leadData.contact_email || leadData.email || "",
      contact_phone: leadData.contact_phone || leadData.phone || "",
      contact_position_title: leadData.contact_position_title || leadData.positionTitle || "",
      contact_linkedin_url: leadData.contact_linkedin_url || leadData.linkedIn || "",
      assigned_to: validatedAssignedToId,
      follow_up_at: followUpDate,
      follow_up_time: followUpTime,
      follow_up_status: leadData.follow_up_status || leadData.followupStatus || "",
      send_reminder_email: Boolean(leadData.send_reminder_email),
      reminder_time_offset: leadData.reminder_time_offset || leadData.reminder_offset || "exact",
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
    const storedUser = localStorage.getItem("user");
    let admin = false;
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      admin =
        userData.is_staff ||
        userData.is_admin ||
        userData.is_superuser ||
        userData.role === 0 ||
        userData.role === "0";
      setIsAdmin(admin);
    }

    const targetPath = location.pathname;
    const isEditRoute = targetPath.startsWith("/edit-lead");

    if (isEditRoute) {
      setIsDataLoaded(false);
    }

    const initializeEditForm = async () => {
      if (isEditRoute) {
        if (!editId) {
          console.warn("Edit route opened without editId yet, waiting for params...");
          return;
        }

        loadMetaFromCache(admin);
        setLoadingLead(true);
        const leadId = String(editId).trim();

        try {
          if (!leadId || leadId === "undefined" || leadId === "null") {
            throw new Error(`Invalid lead ID: ${editId}`);
          }

          const cachedLead = getLeadFromCache(leadId);
          if (cachedLead) {
            populateFormWithLeadData(cachedLead, admin, true);
          }

          console.log("Fetching fresh lead data from API, editId:", leadId);
          const leadToEdit = await fetchLeadFromApi(leadId);

          console.log("Lead data received from API (raw):", leadToEdit);

          if (!leadToEdit) {
            if (cachedLead) {
              console.warn("API failed but using cached data");
              setIsDataLoaded(true);
              return;
            }
            throw new Error("No data received from API - response was empty");
          }

          populateFormWithLeadData(leadToEdit, admin, false);
        } catch (error) {
          console.error("Failed to load lead - Full error:", error);
          const errorMessage = error.message || "Unknown error";
          notifyError(
            `Failed to load lead data.\n\nError: ${errorMessage}\n\nPlease check:\n1. The lead ID is correct\n2. You have permission to view this lead\n3. The API is accessible\n\nPlease refresh the page and try again.`
          );
        } finally {
          setLoadingLead(false);
        }

        return;
      }

      await fetchAllData();
      setIsDataLoaded(true);
    };

    initializeEditForm();
  }, [editId, location.pathname]);

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

  const handleReminderToggle = (checked) => {
    setFormData((prev) => ({
      ...prev,
      send_reminder_email: checked && prev.follow_up_at && prev.follow_up_time ? checked : false,
      reminder_time_offset: checked ? (prev.reminder_time_offset || "exact") : null,
    }));
  };

  const handleReminderOffsetChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      reminder_time_offset: value,
    }));
  };

  const handleDateChange = (date) => {
    const cleared = !date;
    setFormData({
      ...formData,
      follow_up_at: date,
      ...(cleared
        ? { send_reminder_email: false, reminder_time_offset: null }
        : {}),
    });
  };

  const handleTimeChange = (time) => {
    const cleared = !time;
    setFormData({
      ...formData,
      follow_up_time: time,
      ...(cleared
        ? { send_reminder_email: false, reminder_time_offset: null }
        : {}),
    });
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
        console.log(`❌ Validation failed: Missing required field "${field}"`);
        console.log(`Field value:`, formData[field]);
        return false;
      }
    }

    // Validate LinkedIn URL format
    if (
      formData.contact_linkedin_url &&
      !isValidLinkedInURL(formData.contact_linkedin_url)
    ) {
      console.log("❌ Validation failed: Invalid LinkedIn URL");
      notifyError("Please enter a valid LinkedIn URL !");
      return false;
    }

    // Validate FollowUpStatus requirement
    // If FollowUpAt is set (meaning a date is selected), then FollowUpStatus is required
    // We check if follow_up_at is present, and if so, follow_up_status must not be empty
    if (formData.follow_up_at) {
      const statusValue = formData.follow_up_status;
      if (
        statusValue === undefined ||
        statusValue === null ||
        (typeof statusValue === "string" && statusValue.trim() === "")
      ) {
        console.log("❌ Validation failed: Follow-up-status is required when followUpAt is given");
        notifyError("Follow-up-status is required when followUpAt is given");
        return false;
      }
    }

    console.log("✅ All validations passed");
    return true;
  };


  const callScheduleFollowUp = async (leadId) => {
    try {
      const followUpAt = dayjs(formData.follow_up_at)
        .hour(dayjs(formData.follow_up_time).hour())
        .minute(dayjs(formData.follow_up_time).minute())
        .second(0)
        .toISOString();

      await apiRequest(`/api/leads/${leadId}/follow-up/`, {
        method: "POST",
        body: JSON.stringify({
          follow_up_at: followUpAt,
          send_reminder_email: formData.send_reminder_email,
          reminder_time_offset: formData.reminder_time_offset,
        }),
      });
    } catch (error) {
      console.error("Failed to schedule follow-up:", error);
      throw error;
    }
  };


const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      // notifyError("Please enter all required details"); // Handled in validateForm
      return;
    }

  const payload = {
    title: formData.title.trim(),
    status: formData.status,
    source: formData.source || "",
    lifecycle: formData.lifecycle || "",
    description: formData.description || "",
    company_name: formData.company_name || "",
    contact_first_name: formData.contact_first_name,
    contact_last_name: formData.contact_last_name || "",
    contact_email: formData.contact_email,
    contact_phone: formData.contact_phone || "",
    contact_position_title: formData.contact_position_title || "",
    contact_linkedin_url: formData.contact_linkedin_url || "",
    // Include follow_up_status in initial payload if it's set (e.g. "done", "pending", or null/"")
    // If it is "None" (empty string), send null or empty string depending on backend expectation.
    follow_up_status: formData.follow_up_status || null, 
  };

  // Admin assigns explicitly
  if (isAdmin && formData.assigned_to) {
    payload.assigned_to = formData.assigned_to;
  }


  try {
    // 1️⃣ Create lead
    const response = await apiRequest("/api/leads/", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const leadId = response?.id || response?.lead?.id;
    if (!leadId) {
      throw new Error("Lead creation failed: no ID returned from API.");
    }

    // 2️⃣ Schedule follow-up if date/time selected
    if (formData.follow_up_at && formData.follow_up_time) {
      const followUpDateTime = formData.follow_up_at
        .hour(formData.follow_up_time.hour())
        .minute(formData.follow_up_time.minute())
        .second(0)
        .millisecond(0)
        .toISOString();

      await apiRequest(`/api/leads/${leadId}/schedule-follow-up/`, {
        method: "POST",
        body: JSON.stringify({
          follow_up_at: followUpDateTime,
          follow_up_status: formData.follow_up_status, // Include status in schedule request
          send_reminder_email: Boolean(formData.send_reminder_email),
          reminder_time_offset: formData.reminder_time_offset || "exact",
        }),
      });
    } else if (formData.follow_up_status) {
        // If no follow-up date but status is provided (should be "None" or empty if validated correctly, 
        // but if user selected "done"/"pending" without date and we relax validation, handle it)
        // However, per requirement "only required when followupAt is given", implies if date not given, 
        // status is optional/can be None.
        // We might want to save status even if no date is set, if the backend supports it.
        // But typically follow-up status is tied to a scheduled item or the lead's general follow-up state.
        // Let's assume we should update the lead's follow_up_status field directly if no schedule is made.
        
        // Check if we need to update status separately if it wasn't part of create payload
        // The create payload didn't include follow_up_status. Let's add it there instead?
        // Actually, let's just add it to the initial payload if it exists.
    }

    notifySuccess(
      editId ? "Lead updated successfully!" : "Lead created successfully!",
            { autoClose: 5000 }
    );
    navigate("/all-leads");
  } catch (error) {
      console.error("Lead creation error:", error);
      
      let errorMessage = error.message || "Unknown error";
      
      // Check for duplicate lead title error
      if (
        errorMessage.toLowerCase().includes("already exists") ||
        errorMessage.toLowerCase().includes("unique constraint") ||
        errorMessage.toLowerCase().includes("unique") ||
        (error.data?.title && Array.isArray(error.data.title) && error.data.title.some(msg => msg.toLowerCase().includes("exists") || msg.toLowerCase().includes("unique")))
      ) {
        notifyError("Lead already exists with this title");
        return;
      }

      notifyError(
        `Failed to create lead.\n\nError: ${errorMessage}`
      );
    }
};


  return (
    <>
      <Topbar>
        <Typography variant="h5" fontWeight="bold">
          {editId ? "Edit Lead" : "Create Lead"}
        </Typography>
      </Topbar>

      {/* Main Area */}
      <Box mt={2} sx={{ boxShadow: "none" }}>
        <Paper sx={{ p: 3, borderRadius: 3, boxShadow: "none" }} elevation={1}>
          <Box display="flex" flexDirection="column" gap={2}>
            <LeadFormFields
              formData={formData}
              employees={employees}
              meta={meta}
              loadingMeta={loadingMeta}
              onChange={handleChange}
              onAssignedToChange={(value) =>
                setFormData({ ...formData, assigned_to: value })
              }
              onDateChange={handleDateChange}
              onTimeChange={handleTimeChange}
              onReminderToggle={handleReminderToggle}
              onReminderOffsetChange={handleReminderOffsetChange}
              onLinkedInBlur={() => {
                if (
                  formData.contact_linkedin_url &&
                  !isValidLinkedInURL(formData.contact_linkedin_url)
                ) {
                  notifyError(
                    "Please enter a valid LinkedIn URL (e.g., https://linkedin.com/in/username)"
                  );
                }
              }}
              showAssignedTo={isAdmin}
            />

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
                  type="button"
                  variant="contained"
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: "bold",
                    px: 3,
                    py: 1,
                  }}
                  onClick={(e) => {
                    console.log("🔘 Create Lead button clicked");
                    handleSubmit(e);
                  }}
                >
                  {editId ? "Update Lead" : "Create Lead"}
                </Button>
              </Box>
            </Box>
        </Paper>
      </Box>
    </>
  );
}
