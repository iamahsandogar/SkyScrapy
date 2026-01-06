import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
} from "@mui/material";
import { authAPI } from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
        backgroundColor: "#f5f5f5",
      }}
    >
      <Paper elevation={3} sx={{ width: 380, padding: 4, borderRadius: 4 }}>
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
          <Typography variant="h5" fontWeight="bold" mt={1}>
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
