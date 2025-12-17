import React from "react";
import AddIcon from "@mui/icons-material/Add";
import { Box, Grid, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

function QuickActions() {
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: "280px",
        borderRadius: "18px",
        padding: 3,
        backgroundColor: "#fff",
      }}
    >
      <Typography variant="p" fontWeight="bold">
        Quick Actions
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            borderRadius: "12px",
            textTransform: "none",
            fontWeight: "bold",
            whiteSpace: "nowrap",
          }}
          onClick={() => navigate("/create-lead")}
        >
          New Lead
        </Button>

        <Button
          sx={{ whiteSpace: "nowrap" }}
          startIcon={<AddIcon />}
          onClick={() => navigate("/create-employee")}
        >
          Add Employee
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
        <Button>Manage Options</Button>
        <Button>Test Emails</Button>
      </Box>
    </Box>
  );
}

export default QuickActions;
