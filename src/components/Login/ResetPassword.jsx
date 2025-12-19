import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Alert,
} from "@mui/material";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { authAPI } from "../services/api";
import { env } from "../../config/env.js";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [passwords, setPasswords] = useState({
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
    setError("");
  };

  const handleUpdate = async () => {
    if (!passwords.password || !passwords.confirmPassword) {
      setError("Please enter both password fields.");
      return;
    }

    if (passwords.password !== passwords.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (passwords.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    // Get uid and token from URL
    const uid = searchParams.get("uid");
    const token = searchParams.get("token");

    if (!uid || !token) {
      setError("Invalid reset link. Please request a new password reset.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await authAPI.passwordResetConfirm(
        uid,
        token,
        passwords.password
      );

      // User is now logged in (cookies are set automatically)
      if (response.user) {
        localStorage.setItem("user", JSON.stringify(response.user));
        localStorage.setItem("isAuth", "true");
        setMessage("Password reset successfully! Redirecting...");

        // Navigate to dashboard after a short delay
        setTimeout(() => {
          navigate("/dashboard", { replace: true });
        }, 1500);
      }
    } catch (err) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
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
            src={env.LOGO_FULL_PATH}
            alt="App Logo"
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
          disabled={loading}
        >
          {loading ? "Updating..." : "Update Password"}
        </Button>
      </Paper>
    </Box>
  );
}
