import React from "react";
import { useNavigate } from "react-router-dom";
import { ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded"; // MUI logout icon
import { colors } from "../../design-system/tokens";

const LogoutButton = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
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
