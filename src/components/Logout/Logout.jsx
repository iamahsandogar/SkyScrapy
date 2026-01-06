import React from "react";
import { useNavigate } from "react-router-dom";
import { ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { colors } from "../../design-system/tokens";
import { authAPI } from "../../services/api"; // Add this import

const LogoutButton = () => {
  const handleLogout = async () => {
    try {
      // Call logout API to clear cookies on backend
      const response = await authAPI.logout();
      console.log("Logout response:", response);
    } catch (error) {
      console.error("Logout error:", error);
      // Continue with logout even if API call fails
    }
  };

  return (
    <ListItemButton
      sx={{
        color: colors.redAccent[500],
        "&:hover": {
          backgroundColor: colors.blueAccent[600],
        },
      }}
      onClick={handleLogout}
    >
      <ListItemIcon sx={{ minWidth: 36, color: colors.redAccent[500] }}>
        <LogoutRoundedIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText primary="Logout" />
    </ListItemButton>
  );
};

export default LogoutButton;
