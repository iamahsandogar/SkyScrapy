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

  // ... rest of component JSX, update button and add alerts:

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
  </Button>;

  {
    message && (
      <Alert severity="success" sx={{ mt: 2 }}>
        {message}
      </Alert>
    );
  }
  {
    error && (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }
}
