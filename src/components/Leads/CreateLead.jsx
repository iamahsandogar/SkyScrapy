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

export default function CreateLead() {
  const { editId } = useParams();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [meta, setMeta] = useState({ status: [], source: [] });
  const [loadingMeta, setLoadingMeta] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    company_name: "",
    contact_first_name: "",
    contact_last_name: "",
    contact_email: "",
    contact_phone: "",
    description: "",
    status: null, // Will store status ID
    source: "",
    assigned_to: null, // Will store employee UUID
    is_active: true,
  });

  /* ------------------------------------
     FETCH STATUS & SOURCE FROM BACKEND
  -------------------------------------*/
  const fetchLeadOptions = async () => {
    try {
      setLoadingMeta(true);
      const [statuses, sources] = await Promise.all([
        apiRequest("/ui/options/statuses/"),
        apiRequest("/ui/options/sources/"),
      ]);

      setMeta({
        status: statuses?.statuses || [],
        source: sources?.sources || [],
      });
    } catch (error) {
      console.error("Failed to load lead options", error);
      // Set empty arrays on error to prevent crashes
      setMeta({ status: [], source: [] });
    } finally {
      setLoadingMeta(false);
    }
  };

  useEffect(() => {
    // Fetch employees from API
    const fetchEmployees = async () => {
      try {
        const data = await apiRequest("/ui/employees/");
        const employeesList = data?.employees || data || [];
        setEmployees(employeesList.filter((e) => e.status === "Active" || e.is_active));
      } catch (error) {
        console.error("Failed to load employees", error);
        setEmployees([]);
      }
    };

    fetchEmployees();
    fetchLeadOptions();

    if (editId) {
      // Fetch lead data from API for editing
      const fetchLead = async () => {
        try {
          const leadToEdit = await apiRequest(`/api/leads/${editId}/`);
          if (leadToEdit) {
            setFormData({
              title: leadToEdit.title || "",
              company_name: leadToEdit.company_name || "",
              contact_first_name: leadToEdit.contact_first_name || "",
              contact_last_name: leadToEdit.contact_last_name || "",
              contact_email: leadToEdit.contact_email || "",
              contact_phone: leadToEdit.contact_phone || "",
              description: leadToEdit.description || "",
              status: leadToEdit.status || null,
              source: leadToEdit.source || "",
              assigned_to: leadToEdit.assigned_to || null,
              is_active: leadToEdit.is_active !== false,
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

  const validateForm = () => {
    const requiredFields = [
      "title",
      "contact_first_name",
      "contact_email",
    ];
    for (let field of requiredFields) {
      if (!formData[field] || formData[field].trim() === "") return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      alert("Please fill all required fields (Title, First Name, Email).");
      return;
    }

    // Prepare payload according to API structure
    const payload = {
      title: formData.title.trim(),
      company_name: formData.company_name?.trim() || "",
      contact_first_name: formData.contact_first_name.trim(),
      contact_last_name: formData.contact_last_name?.trim() || "",
      contact_email: formData.contact_email.trim(),
      contact_phone: formData.contact_phone?.trim() || "",
      description: formData.description?.trim() || "",
      is_active: formData.is_active !== false, // Default to true
    };

    // Add optional fields only if they have values
    if (formData.status) {
      payload.status = formData.status; // status ID
    }
    if (formData.source && formData.source.trim() !== "") {
      payload.source = formData.source.trim();
    }
    if (formData.assigned_to) {
      payload.assigned_to = formData.assigned_to;
    }

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
                <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                  Status
                </Typography>
                <TextField
                  sx={MuiSelectPadding}
                  select
                  fullWidth
                  name="status"
                  value={formData.status || ""}
                  onChange={(e) => {
                    const selectedId = e.target.value === "None" || e.target.value === "" ? null : parseInt(e.target.value);
                    setFormData({ ...formData, status: selectedId });
                  }}
                  disabled={loadingMeta}
                >
                  <MenuItem value="">None</MenuItem>
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
                <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                  Assigned To
                </Typography>
                <TextField
                  sx={MuiSelectPadding}
                  select
                  fullWidth
                  name="assigned_to"
                  value={formData.assigned_to || ""}
                  onChange={(e) => {
                    const value = e.target.value === "None" || e.target.value === "" ? null : e.target.value;
                    setFormData({ ...formData, assigned_to: value });
                  }}
                >
                  <MenuItem value="">None</MenuItem>
                  {employees.map((emp) => {
                    const empId = emp.id || emp.pk || emp.uuid;
                    const firstName = emp.firstName || emp.first_name || "";
                    const lastName = emp.lastName || emp.last_name || "";
                    return (
                      <MenuItem key={empId} value={empId}>
                        {firstName} {lastName}
                      </MenuItem>
                    );
                  })}
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
