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
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import apiRequest from "../services/api";

const MuiSelectPadding = {
  "& .MuiSelect-select": {
    padding: "7px",
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
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

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
    follow_up_status: "",
  });

  /* ------------------------------------
     FETCH ALL DATA FROM BACKEND (STATUS, SOURCE, EMPLOYEES)
  -------------------------------------*/
  const fetchAllData = async () => {
    try {
      setLoadingMeta(true);

      // Fetch all three APIs in parallel for better performance
      const [statusesResponse, sourcesResponse, employeesResponse] = await Promise.all([
        apiRequest("/ui/options/statuses/"),
        apiRequest("/ui/options/sources/"),
        apiRequest("/ui/employees/"),
      ]);

      // Set status and source
      setMeta({
        status: statusesResponse?.statuses || [],
        source: sourcesResponse?.sources || [],
      });

      // Set employees (filter active ones)
      const employeesList = employeesResponse?.employees || employeesResponse || [];
      setEmployees(employeesList.filter((e) => e.status === "Active" || e.is_active));
    } catch (error) {
      console.error("Failed to load data", error);
      // Set empty arrays on error to prevent crashes
      setMeta({ status: [], source: [] });
      setEmployees([]);
    } finally {
      setLoadingMeta(false);
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

      // If employee (not admin), auto-assign to themselves when creating new lead
      if (!admin && !editId) {
        const userId = userData.id || userData.pk || userData.uuid;
        if (userId) {
          // Set the assigned_to to the employee's own ID
          setFormData((prev) => ({ ...prev, assigned_to: userId }));
        }
      }
    }

    // Load all data (status, source, employees) when page opens
    fetchAllData();

    if (editId) {
      // Fetch lead data from API for editing
      const fetchLead = async () => {
        try {
          const leadToEdit = await apiRequest(`/api/leads/${editId}/`);
          if (leadToEdit) {
            setFormData({
              title: leadToEdit.title || "",
              status: leadToEdit.status || null,
              source: leadToEdit.source || "",
              description: leadToEdit.description || "",
              company_name: leadToEdit.company_name || "",
              contact_first_name: leadToEdit.contact_first_name || "",
              contact_last_name: leadToEdit.contact_last_name || "",
              contact_email: leadToEdit.contact_email || "",
              contact_phone: leadToEdit.contact_phone || "",
              contact_position_title: leadToEdit.contact_position_title || "",
              contact_linkedin_url: leadToEdit.contact_linkedin_url || "",
              assigned_to: leadToEdit.assigned_to || null,
              follow_up_at: leadToEdit.follow_up_at ? dayjs(leadToEdit.follow_up_at) : null,
              follow_up_status: leadToEdit.follow_up_status || "",
            });
          }
        } catch (error) {
          console.error("Failed to load lead", error);
          alert("Failed to load lead data");
        }
      };
      fetchLead();
    }
  }, [editId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDateChange = (date) => {
    setFormData({ ...formData, follow_up_at: date });
  };

  const isValidLinkedInURL = (url) => {
    const regex = /^https:\/\/(www\.)?linkedin\.com\/(in|company)\/[A-Za-z0-9_-]+\/?$/i;
    return regex.test(url);
  };

  const validateForm = () => {
    const requiredFields = [
      "title",
      "status",
      "contact_first_name",
      "assigned_to",
      "contact_email",
      "contact_position_title",
      "contact_linkedin_url",
    ];

    for (let field of requiredFields) {
      if (!formData[field] || (typeof formData[field] === "string" && formData[field].trim() === "")) {
        return false;
      }
    }

    // Validate LinkedIn URL format
    if (formData.contact_linkedin_url && !isValidLinkedInURL(formData.contact_linkedin_url)) {
      alert("Please enter a valid LinkedIn URL.");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      alert("Please fill all required fields (Title, Status, First Name, Assigned To, Email, Position Title, LinkedIn URL).");
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
                    const selectedId = e.target.value === "" ? null : parseInt(e.target.value);
                    setFormData({ ...formData, status: selectedId });
                  }}
                  disabled={loadingMeta}
                  displayEmpty
                >

                  {meta.status.map((item, index) => {
                    const statusId = typeof item === "object" ? (item.id || item.pk) : null;
                    const statusName = typeof item === "string" ? item : item.name;
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
                  value={formData.source || ""}
                  onChange={handleChange}
                  disabled={loadingMeta}
                >
                  <MenuItem value="">None</MenuItem>
                  {meta.source.map((item, index) => {
                    const value = typeof item === "string" ? item : item.name;
                    const key = typeof item === "object" && item.id ? item.id : index;
                    return (
                      <MenuItem key={key} value={value}>
                        {value}
                      </MenuItem>
                    );
                  })}
                </TextField>
              </Box>
            </Box>

            {/* Description */}
            <Box>
              <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                Description
              </Typography>
              <TextField
                sx={MuiSelectPadding}
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
                disabled={!isAdmin}
                  select
                  fullWidth
                  name="assigned_to"
                  value={formData.assigned_to ? String(formData.assigned_to) : ""}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      assigned_to: e.target.value || null,
                    });
                  }}
                >
                  <MenuItem value="">
                    <em>Select Employee</em>
                  </MenuItem>

                  {employees.map((emp) => {
                    const empId = emp.id || emp.pk || emp.uuid;
                    if (!empId) return null;

                    return (
                      <MenuItem key={empId} value={String(empId)}>
                        {(emp.firstName || emp.first_name || "")}{" "}
                        {(emp.lastName || emp.last_name || "")}
                      </MenuItem>
                    );
                  })}
                </TextField>

              </Box>
              <Box flex={1} minWidth={200}>
                <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                  Follow Up At
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
                  Follow Up Status
                </Typography>
                <TextField
                  sx={MuiSelectPadding}
                  select
                  fullWidth
                  name="follow_up_status"
                  value={formData.follow_up_status || ""}
                  onChange={handleChange}
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
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
                <RequiredLabel text="Contact First Name" />
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
                <RequiredLabel text="Contact Email" />
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
                <RequiredLabel text="Contact Position Title" />
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
              <RequiredLabel text="Contact LinkedIn URL" />
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
                    alert("Please enter a valid LinkedIn URL (e.g., https://linkedin.com/in/username)");
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
