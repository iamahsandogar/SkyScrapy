import { useState } from "react";
import { Box, Typography, TextField, Button, Link, Alert } from "@mui/material";
import { colors } from "../../design-system/tokens";
import { authAPI } from "../services/api";
import { env } from "../../config/env.js";

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
  // Autofill styles
  const autofillSx = {
    "& input:-webkit-autofill": {
      WebkitBoxShadow: "0 0 0px 1000px #d0ebff inset", // blue background on autofill
      WebkitTextFillColor: "#000", // black text
      transition: "background-color 5000s ease-in-out 0s",
    },
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{ bgcolor: "#F4F6F8" }}
    >
      <Box
        width={400}
        p={4}
        sx={{
          bgcolor: "#fff",
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        {/* Logo + Reset Password Text */}
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

        <Typography
          color="text.secondary"
          fontSize={14}
          sx={{ display: "block", textAlign: "center", mt: 3, mb: 3 }}
        >
          Enter your email and we'll send you a reset link
        </Typography>

        {/* Email Label */}
        <Typography fontWeight="bold" mb={0.5}>
          Email <span style={{ color: colors.redAccent[500] }}>*</span>
        </Typography>

        {/* Email Input */}
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Enter your email"
          name="email"
          value={email}
          onChange={handleChange}
          InputProps={{
            sx: {
              backgroundColor: "#fff", // initial white background
              borderRadius: 2,
              color: "black",
              "& .MuiOutlinedInput-input": {
                color: "black",
              },
              "&.Mui-focused": {
                backgroundColor: "#fff", // keep white on focus
              },
              ...autofillSx, // apply autofill styles
            },
          }}
          sx={{ mb: 3 }}
        />

        {/* Send Reset Link Button */}
        <Button
          variant="contained"
          fullWidth
          sx={{ py: 1.2, fontWeight: "bold" }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>

        {/* Add message/error display */}
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
      </Box>
    </Box>
  );
}
