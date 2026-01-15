import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  IconButton,
} from "@mui/material";
import { useLocation } from "react-router-dom";
import { authAPI } from "../services/api";
import { useTheme } from "../../contexts/ThemeContext";
import { getColors } from "../../design-system/tokens";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";

export default function ForgotPassword() {
  const { mode, toggleTheme } = useTheme();
  const colors = getColors(mode);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const location = useLocation();

  useEffect(() => {
    const savedEmail = sessionStorage.getItem("loginFailedEmail");
    const stateEmail = location.state?.email;
    const autoEmail = stateEmail || savedEmail || "";
    if (autoEmail) {
      setEmail(autoEmail);
    }
  }, [location.state]);

  const handleSubmit = async () => {
    if (!email) {
      setError("Please enter your email");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await authAPI.passwordResetRequest(email);
      setMessage(
        res?.message || "If an account exists, a reset link has been sent."
      );
    } catch (err) {
      setError(err?.message || "Failed to send reset link. Please try again.");
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
            style={{ width: "180px", height: "55px", objectFit: "contain" }}
          />
          <Typography
            variant="h5"
            fontWeight="bold"
            mt={1}
            sx={{
              color: mode === "dark" ? colors.grey[100] : colors.grey[100],
            }}
          >
            Forgot Password
          </Typography>
        </Box>

        {message && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {message}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography fontWeight="bold" mb={0.5}>
          Email <span style={{ color: "red" }}>*</span>
        </Typography>
        <TextField
          fullWidth
          placeholder="Enter your email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
            setMessage("");
          }}
          sx={{ mb: 3 }}
        />

        <Button
          variant="contained"
          fullWidth
          onClick={handleSubmit}
          disabled={loading}
          sx={{
            py: 1.3,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: "bold",
            fontSize: "16px",
          }}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>
      </Paper>
    </Box>
  );
}
