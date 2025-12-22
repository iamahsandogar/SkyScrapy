import { useState } from "react";
import { Box, Typography, TextField, Button, Link, Alert } from "@mui/material";
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
          disabled={loading}
        >
          {loading ? "Updating..." : "Update Password"}
        </Button>
      </Paper>
    </Box>
  );
}
