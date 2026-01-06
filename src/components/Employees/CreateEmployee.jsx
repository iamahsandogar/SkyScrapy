import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Paper,
  InputAdornment,
} from "@mui/material";
import { useState } from "react";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Topbar from "../global/Topbar";
import apiRequest from "../services/api";
import { useNavigate } from "react-router-dom";
const MuiTextFieldPadding = {
  "& .MuiOutlinedInput-root": {
    padding: 0,
  },
  "& .MuiOutlinedInput-input": {
    padding: "7px",
    height: "auto",
  },
};

export default function CreateEmployee() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone: "",
    alternate_phone: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (
      !formData.first_name ||
      !formData.last_name ||
      !formData.email ||
      !formData.password ||
      !formData.phone
    ) {
      alert("Please fill all required fields");
      return;
    }

    // Phone must start with country code
    const phoneRegex = /^\+[1-9]\d{7,14}$/;
    if (!phoneRegex.test(formData.phone.trim())) {
      alert("Phone number must start with a country code (e.g. +92XXXXXXXXXX)");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim(),
        ...(formData.alternate_phone && {
          alternate_phone: formData.alternate_phone.trim(),
        }),
      };

      await apiRequest("/api/common/users/create-employee/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      alert("Employee Created Successfully");

      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        phone: "",
        alternate_phone: "",
      });
    } catch (error) {
      console.error("Failed to create employee", error);
      alert(error.message || "Failed to create employee. Please try again.");
    } finally {
      setLoading(false);
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
          Create Employee
        </Typography>
      </Topbar>

      <Paper sx={{ p: 3, borderRadius: 3, mt: 2, boxShadow: "none" }}>
        <Box display="flex" flexDirection="column" gap={2}>
          <Box display="flex" gap={2}>
            <Box flex={1}>
              <RequiredLabel text="First Name" />
              <TextField
                sx={MuiTextFieldPadding}
                fullWidth
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Enter first name"
              />
            </Box>

            <Box flex={1}>
              <RequiredLabel text="Last Name" />
              <TextField
                sx={MuiTextFieldPadding}
                fullWidth
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Enter last name"
              />
            </Box>
          </Box>

          <Box display="flex" gap={2}>
            <Box flex={1}>
              <RequiredLabel text="Email" />
              <TextField
                sx={MuiTextFieldPadding}
                fullWidth
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email"
              />
            </Box>

            <Box flex={1}>
              <RequiredLabel text="Password" />
              <TextField
                fullWidth
                sx={MuiTextFieldPadding}
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </Box>

          <Box display="flex" gap={2}>
            <Box flex={1}>
              <RequiredLabel text="Phone" />
              <TextField
                sx={MuiTextFieldPadding}
                fullWidth
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter phone no"
              />
            </Box>

            <Box flex={1}>
              <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                Alternate Phone
              </Typography>
              <TextField
                sx={MuiTextFieldPadding}
                fullWidth
                name="alternate_phone"
                value={formData.alternate_phone}
                onChange={handleChange}
                placeholder="Enter alternative phone no"
              />
            </Box>
          </Box>

          <Button
            variant="contained"
            sx={{ width: "fit-content", mt: 2 }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Creating..." : "Add Employee"}
          </Button>
        </Box>
      </Paper>
    </>
  );
}
