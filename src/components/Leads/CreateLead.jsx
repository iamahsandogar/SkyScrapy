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
import { getCachedLeadData, prefetchLeadData } from "../../utils/prefetchData";

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
    if (cachedData) {
      console.log("Using cached lead data for instant loading");
      setMeta({
        status: cachedData.statuses || [],
        source: cachedData.sources || [],
      });
      
      // Filter employees based on user role even from cache
      const storedUser = localStorage.getItem("user");
      let currentUserId = null;
      let isCurrentUserAdmin = false;
      
      if (storedUser) {
        const userData = JSON.parse(storedUser);
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
        filteredEmployees = (cachedData.employees || []).filter((e) => {
          const empId = e.id || e.pk || e.uuid;
          const isAdmin = 
            e.is_staff ||
            e.is_admin ||
            e.is_superuser ||
            e.role === 0 ||
            e.role === "0";
          
          return String(empId) === String(currentUserId) || isAdmin;
        });
      } else {
        // For admins or when editing: show all employees from cache
        filteredEmployees = cachedData.employees || [];
      }
      
      setEmployees(filteredEmployees);
      setLoadingMeta(false);

      // Refresh data in background to ensure it's up-to-date
      // Don't wait for it - user can use cached data immediately
      refreshDataInBackground();
      return;
    }

    // No cache available, fetch fresh data
    await refreshDataInBackground();
  };

  const refreshDataInBackground = async () => {
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

    try {
      console.log("Fetching employees from /ui/employees/");
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

      // Filter employees based on user role
      let filteredEmployees = [];
      
      if (!isCurrentUserAdmin && !editId) {
        // For employees creating a new lead: only show themselves and Admin users
        filteredEmployees = employeesList.filter((e) => {
          const empId = e.id || e.pk || e.uuid;
          const isAdmin = 
            e.is_staff ||
            e.is_admin ||
            e.is_superuser ||
            e.role === 0 ||
            e.role === "0";
          
          // Include if it's the logged-in employee or an Admin
          return String(empId) === String(currentUserId) || isAdmin;
        });
        console.log("Filtered employees (employee view - self + admins only):", filteredEmployees);
      } else {
        // For admins or when editing: show all active employees + admins
        filteredEmployees = employeesList.filter(
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
      }

      employeesList = filteredEmployees;
    } catch (error) {
      // Handle 403 Forbidden / unauthorized errors gracefully
      const isUnauthorized = 
        error.message?.toLowerCase().includes("unauthorized") ||
        error.message?.toLowerCase().includes("forbidden") ||
        error.message?.includes("403");
      
      console.warn("Failed to fetch employees:", error.message);
      if (isUnauthorized) {
        console.log("Employee doesn't have permission to access employees endpoint - using fallback");
      }
      
      // For employees, create a fallback with just themselves if API fails
      // This allows them to still create leads even if they can't access the employees endpoint
      if (userData && !isCurrentUserAdmin && !editId) {
        // Create a fallback employee object from the logged-in user
        const fallbackEmployee = {
          id: userData.id || userData.pk || userData.uuid,
          pk: userData.pk || userData.id || userData.uuid,
          uuid: userData.uuid || userData.id || userData.pk,
          firstName: userData.first_name || userData.firstName || "",
          first_name: userData.first_name || userData.firstName || "",
          lastName: userData.last_name || userData.lastName || "",
          last_name: userData.last_name || userData.lastName || "",
          is_staff: userData.is_staff || false,
          is_admin: userData.is_admin || false,
          is_superuser: userData.is_superuser || false,
          role: userData.role || null,
        };
        employeesList = [fallbackEmployee];
        console.log("Using fallback employee (logged-in user) due to API error:", fallbackEmployee);
      } else {
        // For admins or when editing, if API fails, try to use cached data
        const cachedData = getCachedLeadData();
        if (cachedData?.employees && cachedData.employees.length > 0) {
          employeesList = cachedData.employees;
          console.log("Using cached employees due to API error");
        } else {
          employeesList = [];
        }
      }
    }

    // Update state with fetched data (even if some are empty)
    setMeta({
      status: statusesList,
      source: sourcesList,
    });
    setEmployees(employeesList);

    setLoadingMeta(false);

    // Update cache with fresh data
    const cacheData = {
      statuses: statusesList,
      sources: sourcesList,
      employees: employeesList,
      timestamp: Date.now(),
    };
    localStorage.setItem("leadDataCache", JSON.stringify(cacheData));

    // Log summary
    console.log("Data fetch complete:", {
      statusesCount: statusesList.length,
      sourcesCount: sourcesList.length,
      employeesCount: employeesList.length,
    });
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

      // If employee (not admin), auto-assign to themselves when creating new lead
      // Employee can still change it to assign to Admin or anyone else
      if (!admin && !editId) {
        const userId = userData.id || userData.pk || userData.uuid;
        if (userId) {
          // Set the assigned_to to the employee's own ID (default)
          setFormData((prev) => ({ ...prev, assigned_to: userId }));
        }
      }
    }

    // Load all data (status, source, employees) when page opens
    // Then load lead data if editing
    const loadData = async () => {
      // First, fetch status, source, and employees
      await fetchAllData();

      // Then, if editing, fetch the lead data
      if (editId) {
        setLoadingLead(true);
        try {
          // Ensure editId is a valid string/number
          const leadId = String(editId).trim();
          if (!leadId || leadId === 'undefined' || leadId === 'null') {
            throw new Error(`Invalid lead ID: ${editId}`);
          }

          console.log("Fetching lead data for edit, editId:", leadId);

          // Try with trailing slash first (Django REST framework convention)
          let leadToEdit;
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
              console.error("Both attempts failed");
              lastError = noSlashError;
              throw noSlashError;
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

          // Set form data with lead data - this will populate all fields
          // Handle both snake_case (from API) and camelCase (from list) formats
          setFormData({
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
            assigned_to: leadData.assigned_to || leadData.assignedTo || null,
            follow_up_at: (leadData.follow_up_at || leadData.followUpAt)
              ? dayjs(leadData.follow_up_at || leadData.followUpAt)
              : null,
            follow_up_time: (leadData.follow_up_time || leadData.followUpTime)
              ? dayjs(leadData.follow_up_time || leadData.followUpTime, "HH:mm")
              : null,
            follow_up_status: leadData.follow_up_status || leadData.followupStatus || "",
          });

          setIsDataLoaded(true);
          console.log("Form data loaded and set for editing:", {
            status: statusId,
            assigned_to: leadData.assigned_to || leadData.assignedTo,
            title: leadData.title || leadData.leadTitle,
            contact_first_name: leadData.contact_first_name || leadData.firstName,
          });
        } catch (error) {
          console.error("Failed to load lead - Full error:", error);
          console.error("Error message:", error.message);
          console.error("Error stack:", error.stack);

          // Show more detailed error message
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
    if (editId) {
      setIsDataLoaded(false);
    }

    loadData();
  }, [editId]);

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
    const requiredFields = [
      "title",
      "status",
      "assigned_to",
    ];

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
      assigned_to: formData.assigned_to,
      follow_up_at: formData.follow_up_at
        ? dayjs(formData.follow_up_at).format("YYYY-MM-DD")
        : null,
      follow_up_time: formData.follow_up_time
        ? dayjs(formData.follow_up_time).format("HH:mm")
        : null,
      follow_up_status: formData.follow_up_status?.trim() || "",
    };

    try {
      if (editId) {
        // 🔁 UPDATE LEAD
        await apiRequest(`/api/leads/${editId}/`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        alert("Lead updated successfully!");
      } else {
        // ➕ CREATE LEAD
        await apiRequest("/api/leads/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        alert("Lead created successfully!");
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
              <Box flex={1} minWidth={200}>
                <RequiredLabel text="Assigned To" />
                <TextField
                  sx={MuiSelectPadding}
                  select
                  fullWidth
                  name="assigned_to"
                  value={
                    formData.assigned_to ? String(formData.assigned_to) : ""
                  }
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
                      const selectedEmp = employees.find(
                        (emp) =>
                          String(emp.id || emp.pk || emp.uuid) === String(val)
                      );
                      if (selectedEmp) {
                        return `${selectedEmp.firstName || selectedEmp.first_name || ""
                          } ${selectedEmp.lastName || selectedEmp.last_name || ""
                          }`.trim();
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
        </Paper>
      </Box>
    </>
  );
}
