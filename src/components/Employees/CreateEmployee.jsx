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
import { useNavigate } from "react-router-dom";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Topbar from "../global/Topbar";
import apiRequest from "../services/api";
import { useNotification } from "../../contexts/NotificationContext.jsx";
import { tokens } from "../../design-system/tokens/colors.js";
import { useTheme } from "../../contexts/ThemeContext";

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
  // const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { notifyError, notifySuccess } = useNotification();
  const navigate = useNavigate();
  const { mode } = useTheme();
  const colors = tokens(mode);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    // password: "",
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
      !formData.email
    ) {
      notifyError("Please fill all required fields!");
    return;
      return;
    }

    // // Phone must start with country code
    // const phoneRegex = /^\+[1-9]\d{7,14}$/;
    // if (!phoneRegex.test(formData.phone.trim())) {
    //   alert("Phone number must start with a country code (e.g. +92XXXXXXXXXX)");
    //   return;
    // }

    try {
      setLoading(true);

      const trimmedPhone = formData.phone.trim();
      const payload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        ...(trimmedPhone && { phone: trimmedPhone }),
        ...(formData.alternate_phone && {
          alternate_phone: formData.alternate_phone.trim(),
        }),
      };

      await apiRequest("/api/common/users/create-employee/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      notifySuccess("Employee updated successfully!",
        { autoClose: 5000 }
      );
      navigate("/management/manage-employees");

      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        // password: "",
        phone: "",
        alternate_phone: "",
      });
    } catch (error) {
      console.error("Failed to create employee", error);
      notifyError("A user with this email already exists.",
        { autoClose: 5000 }
      );
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

      <Paper
        sx={{
          p: { xs: 2, md: 4 },
          borderRadius: 3,
          width: "100%",
          boxShadow: "none",
          mt: 3,
          maxWidth: "none",
        }}
      >
        <form autoComplete="off" onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
          <Box display="flex" flexDirection="column" gap={3}>
            <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} gap={2}>
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

            <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} gap={2}>
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
              {/* Password field intentionally omitted */}
            </Box>

            <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} gap={2}>
              <Box flex={1}>
                <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
                  Phone
                </Typography>
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

            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: "bold",
                  px: 3,
                  py: 1,
                  color: colors.grey[100],
                  borderColor: colors.grey[400],
                  "&:hover": {
                    borderColor: colors.grey[100],
                    backgroundColor: colors.primary[100],
                  },
                }}
                onClick={() => navigate("/manage-employees")}
                disabled={loading}
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
                disabled={loading}
                type="submit"
              >
                {loading ? "Creating..." : "Add Employee"}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>
    </>
  );
}
