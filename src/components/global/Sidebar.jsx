import { Box } from "@mui/material";
import React from "react";
import { colors } from "../../design-system/tokens";
import SidebarMenu from "./SidebarMenu";

function Sidebar() {
  return (
    <Box
      sx={{
        maxWidth: "220px",
        width: "220px",
        bgcolor: colors.bg[100],
        borderRadius: "12px",
        height: "100%",
        border: `1px solid ${colors.grey[900]}`,
      }}
    >
      <SidebarMenu />
    </Box>
  );
}

export default Sidebar;
