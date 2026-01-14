import React from "react";
import AddIcon from "@mui/icons-material/Add";
import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { prefetchLeadData } from "../../utils/prefetchData";
import { useTheme } from "../../contexts/ThemeContext";
import { tokens } from "../../design-system/tokens/colors.js";
import { colors } from "../../design-system/tokens/index.js";

function QuickActions({ showAddEmployee = true }) {
  const navigate = useNavigate();
  const { mode } = useTheme();
  const themeColors = tokens(mode);

  const warmUpLeadForm = () => {
    prefetchLeadData({ includeLeads: false });
  };

  const handleOpenCreateLead = () => {
    warmUpLeadForm();
    navigate("/create-lead");
  };

  const containerStyles = {
    flex: 1,
    minWidth: "280px",
    borderRadius: "18px",
    padding: 3,
    backgroundColor:
      mode === "dark" ? themeColors.primary[600] : themeColors.bg[100],
    border: "none",
  };

  const textColor = colors.grey[100];
  const buttonTextColor = colors.primary[100];
  const buttonBackground = colors.blueAccent[500];

  return (
    <Box sx={containerStyles}>
      <Typography variant="p" fontWeight="bold" color={textColor}>
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
            color: buttonTextColor,
            backgroundColor: buttonBackground,
            "&:hover": {
              backgroundColor:
                mode === "dark" ? colors.grey[200] : colors.grey[200]
            },
          }}
          onClick={handleOpenCreateLead}
        >
          New Lead
        </Button>

        {showAddEmployee && (
          <Button
            sx={{ whiteSpace: "nowrap", color: textColor }}
            startIcon={<AddIcon />}
            onClick={() => navigate("/create-employee")}
          >
            Add Employee
          </Button>
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
        <Button sx={{ color: textColor }}>Manage Options</Button>
        <Button sx={{ color: textColor }}>Test Emails</Button>
      </Box>
    </Box>
  );
}

export default QuickActions;
