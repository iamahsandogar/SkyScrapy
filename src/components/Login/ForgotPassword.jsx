import { useState } from "react";
import { Box, Typography, TextField, Button, Link } from "@mui/material";
import { colors } from "../../design-system/tokens";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  const handleChange = (e) => {
    setEmail(e.target.value);
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
        >
          Send Reset Link
        </Button>

        {/* Back to Login */}
        <Box mt={3}>
          <Link
            href="/login"
            underline="hover"
            fontWeight={600}
            sx={{ display: "block", textAlign: "center", mt: 3 }}
          >
            Back to Login
          </Link>
        </Box>
      </Box>
    </Box>
  );
}
