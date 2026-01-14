import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  IconButton,
  InputAdornment,
  Alert,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { authAPI } from "../services/api";

export default function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  const [passwords, setPasswords] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setPasswords((p) => ({ ...p, [e.target.name]: e.target.value }));
    setMessage("");
    setError("");
  };

  const handleUpdate = async () => {
    const { password, confirmPassword } = passwords;

    // Validation
    if (!password || !confirmPassword) {
      setError("Please fill both password fields");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!uid || !token) {
      setError("Invalid reset link. Please check your email for the correct link.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      // POST to /api/common/auth/password-reset-confirm/ with { uid, token, password }
      const payload = {
        uid,
        token,
        password,
      };
      
      const res = await authAPI.passwordResetConfirm(payload);
      
      // On success, redirect to login page
      setMessage(
        res?.message || "Your password has been updated successfully. Redirecting to login..."
      );
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err?.message || "Failed to reset password. Please try again.");
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
            Reset Password
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
                  onClick={() => setShowPassword((s) => !s)}
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

        <Typography fontWeight="bold" mb={0.5}>
          Confirm Password <span style={{ color: "red" }}>*</span>
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          type={showConfirm ? "text" : "password"}
          placeholder="Confirm your password"
          name="confirmPassword"
          value={passwords.confirmPassword}
          onChange={handleChange}
          InputProps={{
            sx: fieldSx,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowConfirm((s) => !s)}
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
