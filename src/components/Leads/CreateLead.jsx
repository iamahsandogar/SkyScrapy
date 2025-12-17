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
    padding: 0, // VERY IMPORTANT
  },

  // this is the main culprit
  "& .MuiPickersInputBase-sectionsContainer": {
    padding: "7px", // SAME as other TextFields
  },

  // keep sections clean
  "& .MuiPickersSectionList-sectionContent": {
    padding: 0,
  },
};
export default function CreateLead() {
  const { editId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    status: "None",
    source: "None",
    description: "",
    followUpAt: null,
    followupStatus: "None",
    assignedTo: "None",
    company: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    positionTitle: "",
    linkedIn: "",
  });

  const getLeads = () => JSON.parse(localStorage.getItem("leads")) || [];
  const saveLeads = (data) =>
    localStorage.setItem("leads", JSON.stringify(data));

  useEffect(() => {
    if (editId) {
      const leads = getLeads();
      const lead = leads.find((l) => String(l.id) === String(editId));
      if (lead)
        setFormData({
          ...lead,
          followUpAt: lead.followUpAt ? dayjs(lead.followUpAt) : null,
        });
    }
  }, [editId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDateChange = (date) => {
    setFormData({ ...formData, followUpAt: date });
  };

  const validateForm = () => {
    const requiredFields = [
      "status",
      "followupStatus",
      "firstName",
      "email",
      "linkedIn",
      "positionTitle",
    ];
    for (let field of requiredFields) {
      if (!formData[field] || formData[field] === "None") return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      alert("Please fill all required fields.");
      return;
    }

    const leads = getLeads();
    const formattedData = {
      ...formData,
      followUpAt: formData.followUpAt
        ? dayjs(formData.followUpAt).format("YYYY-MM-DD")
        : "",
    };

    if (editId) {
      const updated = leads.map((l) =>
        String(l.id) === String(editId) ? { ...formattedData, id: editId } : l
      );
      saveLeads(updated);
      alert("Lead updated successfully!");
    } else {
      const newLead = { ...formattedData, id: Date.now() };
      saveLeads([...leads, newLead]);
      alert("Lead created successfully!");
    }
    navigate("/all-leads");
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
                <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                  Title
                </Typography>
                <TextField
                  sx={MuiTextFieldPadding}
                  fullWidth
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                />
              </Box>
              <Box flex={1} minWidth={200}>
                <RequiredLabel text="Status" />
                <TextField
                  sx={MuiSelectPadding}
                  select
                  fullWidth
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  {[
                    "None",
                    "Completed",
                    "In Progress",
                    "Pending",
                    "Rejected",
                  ].map((val) => (
                    <MenuItem key={val} value={val}>
                      {val}
                    </MenuItem>
                  ))}
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
                  value={formData.source}
                  onChange={handleChange}
                >
                  {["None", "Website Form", "Email", "Phone"].map((val) => (
                    <MenuItem key={val} value={val}>
                      {val}
                    </MenuItem>
                  ))}
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
                  Follow Up At
                </Typography>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    value={formData.followUpAt}
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
                <RequiredLabel text="Follow Up Status" />
                <TextField
                  sx={MuiSelectPadding}
                  select
                  fullWidth
                  name="followupStatus"
                  value={formData.followupStatus}
                  onChange={handleChange}
                >
                  {[
                    "None",
                    "Completed",
                    "In Progress",
                    "Pending",
                    "Rejected",
                  ].map((val) => (
                    <MenuItem key={val} value={val}>
                      {val}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box flex={1} minWidth={200}>
                <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                  Assigned To
                </Typography>
                <TextField
                  sx={MuiSelectPadding}
                  select
                  fullWidth
                  name="assignedTo"
                  value={formData.assignedTo}
                  onChange={handleChange}
                >
                  {["None", "Ayesha Zahid"].map((val) => (
                    <MenuItem key={val} value={val}>
                      {val}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Box>

            {/* ROW 3 */}
            <Box display="flex" gap={2} flexWrap="wrap">
              <Box flex={1} minWidth={200}>
                <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                  Company
                </Typography>
                <TextField
                  sx={MuiTextFieldPadding}
                  fullWidth
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                />
              </Box>
              <Box flex={1} minWidth={200}>
                <RequiredLabel text="First Name" />
                <TextField
                  sx={MuiTextFieldPadding}
                  fullWidth
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </Box>
              <Box flex={1} minWidth={200}>
                <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                  Last Name
                </Typography>
                <TextField
                  sx={MuiTextFieldPadding}
                  fullWidth
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </Box>
            </Box>

            {/* ROW 4 */}
            <Box display="flex" gap={2} flexWrap="wrap">
              <Box flex={1} minWidth={200}>
                <RequiredLabel text="Email" />
                <TextField
                  sx={MuiTextFieldPadding}
                  fullWidth
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </Box>
              <Box flex={1} minWidth={200}>
                <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                  Phone
                </Typography>
                <TextField
                  sx={MuiTextFieldPadding}
                  fullWidth
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </Box>
              <Box flex={1} minWidth={200}>
                <RequiredLabel text="Position Title" />
                <TextField
                  sx={MuiTextFieldPadding}
                  fullWidth
                  name="positionTitle"
                  value={formData.positionTitle}
                  onChange={handleChange}
                />
              </Box>
            </Box>

            {/* LinkedIn */}
            <Box>
              <RequiredLabel text="LinkedIn URL" />
              <TextField
                sx={MuiTextFieldPadding}
                fullWidth
                name="linkedIn"
                value={formData.linkedIn}
                onChange={handleChange}
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
