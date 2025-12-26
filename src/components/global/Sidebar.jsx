import { Box } from "@mui/material";
import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { getColors } from "../../design-system/tokens";
import SidebarMenu from "./SidebarMenu";

function Sidebar({ user }) {
  const { mode } = useTheme();
  const colors = getColors(mode);

  return (
    <Box
      sx={{
        maxWidth: "220px",
        width: "220px",
        bgcolor: mode === "dark" ? colors.primary[600] : colors.bg[100],
        borderRadius: "12px",
        height: "100%",
      }}
    >
      <SidebarMenu user={user} />
    </Box>
  );
}

export default Sidebar;
