import { Box, IconButton } from "@mui/material";
import React, { useState } from "react";
import { colors } from "../../design-system/tokens";
import SidebarMenu from "./SidebarMenu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

function Sidebar({ user }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Box
      sx={{
        maxWidth: collapsed ? "70px" : "220px",
        width: collapsed ? "70px" : "220px",
        bgcolor: colors.bg[100],
        borderRadius: "12px",
        height: "100%",
        border: `1px solid ${colors.grey[900]}`,
        position: "relative",
        transition: "width 0.3s ease",
      }}
    >
      <IconButton
        onClick={() => setCollapsed(!collapsed)}
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 10,
          bgcolor: colors.grey[800],
          "&:hover": {
            bgcolor: colors.grey[700],
          },
          width: 24,
          height: 24,
        }}
      >
        {collapsed ? (
          <ChevronRightIcon sx={{ fontSize: 16, color: colors.grey[100] }} />
        ) : (
          <ChevronLeftIcon sx={{ fontSize: 16, color: colors.grey[100] }} />
        )}
      </IconButton>
      <SidebarMenu user={user} collapsed={collapsed} setCollapsed={setCollapsed} />
    </Box>
  );
}

export default Sidebar;
