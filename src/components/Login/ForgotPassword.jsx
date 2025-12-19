import { useState } from "react";
import { Box, Typography, TextField, Button, Link, Alert } from "@mui/material";
import { colors } from "../../design-system/tokens";
import { authAPI } from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setEmail(e.target.value);
    setMessage("");
    setError("");
  };

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
        response.message ||
          "If an account with this email exists, a password reset link has been sent."
      );
    } catch (err) {
      setError(err.message || "Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ... rest of component JSX, but update the button:

  <Button
    variant="contained"
    fullWidth
    sx={{ py: 1.2, fontWeight: "bold" }}
    onClick={handleSubmit}
    disabled={loading}
  >
    {loading ? "Sending..." : "Send Reset Link"}
  </Button>;

  {
    /* Add message/error display */
  }
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
