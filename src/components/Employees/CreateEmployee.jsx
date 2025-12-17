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

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const getEmployees = () =>
    JSON.parse(localStorage.getItem("employees")) || [];

  const saveEmployees = (data) =>
    localStorage.setItem("employees", JSON.stringify(data));

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.password
    ) {
      alert("Please fill all required fields");
      return;
    }

    const employees = getEmployees();

    const newEmployee = {
      id: Date.now(),
      ...formData,
      status: "Active",
    };

    saveEmployees([...employees, newEmployee]);

    alert("Employee Created Successfully");

    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    });
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
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Enter first name"
              />
            </Box>

            <Box flex={1}>
              <RequiredLabel text="Last Name" />
              <TextField
                sx={MuiTextFieldPadding}
                fullWidth
                name="lastName"
                value={formData.lastName}
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

          <Button
            variant="contained"
            sx={{ width: "fit-content", mt: 2 }}
            onClick={handleSubmit}
          >
            Add Employee
          </Button>
        </Box>
      </Paper>
    </>
  );
}
