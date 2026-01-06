import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  useTheme as useMUITheme
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useTheme } from "../../contexts/ThemeContext";
import { getColors } from "../../design-system/tokens";
import { authAPI } from "../services/api";
import { prefetchLeadData } from "../../utils/prefetchData";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";

export default function Login() {

  const muiTheme = useMUITheme();
  const navigate = useNavigate();
  const { mode, toggleTheme } = useTheme();
  const colors = getColors(mode);

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
    setError("");
  };

  const handleLogin = async () => {
    const { email, password } = credentials;

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await authAPI.login(email, password);

      // Cookie is handled automatically
      if (response?.user) {
        localStorage.setItem("user", JSON.stringify(response.user));
        localStorage.setItem("isAuth", "true");
        
        // Pre-fetch statuses, sources, employees, and leads in the background
        // This ensures instant loading when user navigates to All Leads or Create Lead pages
        // Don't wait for it - let user navigate immediately
        prefetchLeadData().catch((err) => {
          console.error("Background prefetch failed:", err);
          // Don't block login if prefetch fails
        });
        
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor:
          mode === "dark" ? colors.primary[500] : colors.bg[500],
        position: "relative",
      }}
    >
      <IconButton
        onClick={toggleTheme}
        sx={{
          position: "absolute",
          top: 20,
          right: 20,
          color: mode === "dark" ? colors.grey[100] : colors.grey[100],
          backgroundColor:
            mode === "dark" ? colors.primary[600] : colors.bg[100],
          "&:hover": {
            backgroundColor:
              mode === "dark" ? colors.primary[700] : colors.grey[200],
          },
        }}
      >
        {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
      <Paper
        elevation={3}
        sx={{
          width: 380,
          padding: 4,
          borderRadius: 4,
          backgroundColor:
            mode === "dark" ? colors.primary[600] : colors.bg[100],
          color: mode === "dark" ? colors.grey[100] : colors.grey[100],
        }}
      >
        {/* Logo */}
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
            style={{ width: "180px", height: "55px" }}
          />
          <Typography
            variant="h5"
            fontWeight="bold"
            mt={1}
            sx={{
              color: mode === "dark" ? colors.grey[100] : colors.grey[100],
            }}
          >
            Login
          </Typography>
        </Box>

        {/* Email */}
        <Typography fontWeight="bold" mb={0.5} sx={{ color: muiTheme.palette.text.primary }}>
          Email <span style={{ color: muiTheme.palette.error.main }}>*</span>
        </Typography>
        <TextField
          fullWidth
          placeholder="Enter your email"
          name="email"
          value={credentials.email}
          onChange={handleChange}
          sx={{ mb: 3 }}
        />

        {/* Password */}
        <Typography fontWeight="bold" mb={0.5} sx={{ color: muiTheme.palette.text.primary }}>
          Password <span style={{ color: muiTheme.palette.error.main }}>*</span>
        </Typography>
        <TextField
          fullWidth
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          name="password"
          value={credentials.password}
          onChange={handleChange}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {/* Error */}
        {error && (
          <Typography color="error" fontSize={14} mb={2}>
            {error}
          </Typography>
        )}

        {/* Forgot Password */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
          <Link
            to="/forgot-password"
            style={{
              color: colors.blueAccent[500],
              fontSize: "14px",
              textDecoration: "none",
              fontWeight: "500",
            }}
          >
            Forgot Password?
          </Link>
        </Box>

        {/* Login Button */}
        <Button
          variant="contained"
          fullWidth
          onClick={handleLogin}
          disabled={loading}
          sx={{
            py: 1.3,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: "bold",
            fontSize: "16px",
            backgroundColor: colors.blueAccent[500],
            "&:hover": { backgroundColor: colors.blueAccent[600] },
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </Button>
      </Paper>
    </Box>
  );
}
