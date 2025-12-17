import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { Link } from "react-router-dom";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export default function NewPassword() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwords, setPasswords] = useState({
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const fieldSx = {
    backgroundColor: "#d0ebff",
    borderRadius: 2,
    color: "black",
    "& .MuiOutlinedInput-input": { color: "black" },
    "&.Mui-focused": { backgroundColor: "#d0ebff" },
    "& input:-webkit-autofill": {
      WebkitBoxShadow: "0 0 0px 1000px #d0ebff inset",
      WebkitTextFillColor: "#000",
      transition: "background-color 5000s ease-in-out 0s",
    },
  };

  const handleUpdate = () => {
    if (!passwords.password || !passwords.confirmPassword) {
      alert("Please enter both password fields.");
      return;
    }
    if (passwords.password !== passwords.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    alert("Password updated successfully!");
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: 380,
          padding: 4,
          borderRadius: 4,
        }}
      >
        {/* Logo + Heading */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            mb: 3,
          }}
        >
          <img
            src="/White Orange SLCW.png"
            alt="SLCW Icon"
            style={{
              width: "180px",
              height: "55px",
              objectFit: "contain",
            }}
          />

          <Typography variant="h5" fontWeight="bold" mt={1}>
            Reset Password
          </Typography>
        </Box>

        {/* New Password */}
        <Typography fontWeight="bold" mb={0.5}>
          New Password <span style={{ color: "red" }}>*</span>
        </Typography>

        <TextField
          fullWidth
          variant="outlined"
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          name="password"
          value={passwords.password}
          onChange={handleChange}
          InputProps={{
            sx: fieldSx,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  sx={{
                    backgroundColor: "#d0ebff",
                    borderRadius: 1,
                    "&:hover": { backgroundColor: "#b8e0ff" },
                  }}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />

        {/* Confirm Password */}
        <Typography fontWeight="bold" mb={0.5}>
          Confirm Password <span style={{ color: "red" }}>*</span>
        </Typography>

        <TextField
          fullWidth
          variant="outlined"
          type={showConfirm ? "text" : "password"}
          placeholder="Confirm your password"
          name="confirmPassword" // ✅ Correct field name
          value={passwords.confirmPassword}
          onChange={handleChange}
          InputProps={{
            sx: fieldSx,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowConfirm(!showConfirm)}
                  sx={{
                    backgroundColor: "#d0ebff",
                    borderRadius: 1,
                    "&:hover": { backgroundColor: "#b8e0ff" },
                  }}
                >
                  {showConfirm ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />

        {/* Update Button */}
        <Button
          variant="contained"
          fullWidth
          sx={{
            py: 1.3,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: "bold",
            fontSize: "16px",
          }}
          onClick={handleUpdate}
        >
          Update Password
        </Button>

        {/* Back to Login */}
        <Box sx={{ textAlign: "center", mt: 3 }}>
          <Link
            to="/login"
            style={{
              color: "#1152C2",
              fontSize: "14px",
              fontWeight: "600",
              textDecoration: "none",
            }}
          >
            Back to Login
          </Link>
        </Box>
      </Paper>
    </Box>
  );
}
