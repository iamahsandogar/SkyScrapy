import React from "react";
import { useNavigate } from "react-router-dom";
import { ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { colors } from "../../design-system/tokens";
import { authAPI } from "../../services/api"; // Add this import

const LogoutButton = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Call logout API to clear cookies on backend
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
      // Continue with logout even if API call fails
    } finally {
      // Clear local storage
      localStorage.clear();
      navigate("/login", { replace: true });
    }
  };

  return (
    <ListItemButton
      sx={{ color: colors.redAccent[500] }}
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
