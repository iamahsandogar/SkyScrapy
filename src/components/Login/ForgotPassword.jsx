import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
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
      const response = await authAPI.passwordResetRequest(email);
      setMessage(
        response.message || "If an account exists, a reset link has been sent."
      );
    } catch (err) {
      setError(err.message || "Failed to send reset link.");
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
      <Paper elevation={3} sx={{ width: 380, p: 4, borderRadius: 4 }}>
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
          <Typography variant="h5" fontWeight="bold" mb={2} textAlign="center">
            Forgot Password
          </Typography>
        </Box>

        <TextField
          fullWidth
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Button
          fullWidth
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>

        {message && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {message}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>
    </Box>
  );
}
