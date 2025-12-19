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
import { Link, useNavigate } from "react-router-dom";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { colors } from "../../design-system/tokens";
import { authAPI } from "../services/api";

export default function Login() {
  const navigate = useNavigate();

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
        backgroundColor: "#f5f5f5",
      }}
    >
      <Paper elevation={3} sx={{ width: 380, padding: 4, borderRadius: 4 }}>
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
          <Typography variant="h5" fontWeight="bold" mt={1}>
            Login
          </Typography>
        </Box>

        {/* Email */}
        <Typography fontWeight="bold" mb={0.5}>
          Email <span style={{ color: colors.redAccent[500] }}>*</span>
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
        <Typography fontWeight="bold" mb={0.5}>
          Password <span style={{ color: colors.redAccent[500] }}>*</span>
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
              color: "#1152C2",
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
            backgroundColor: "#1152C2",
            "&:hover": { backgroundColor: "#0E3AA8" },
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </Button>
      </Paper>
    </Box>
  );
}
