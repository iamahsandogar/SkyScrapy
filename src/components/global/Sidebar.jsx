import { Box, Drawer, IconButton, useMediaQuery } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import React, { useState } from "react";
import { useTheme as useMuiTheme } from "@mui/material/styles";
import { useTheme } from "../../contexts/ThemeContext";
import { getColors } from "../../design-system/tokens";
import SidebarMenu from "./SidebarMenu";

function Sidebar({ user }) {
  const { mode } = useTheme();
  const colors = getColors(mode);

  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));

  const [open, setOpen] = useState(false);

  const sidebarContent = (
    <Box
      sx={{
        width: 220,
        height: "100%",
        bgcolor: mode === "dark" ? colors.primary[600] : colors.bg[100],
        borderRadius: isMobile ? 0 : "12px",
      }}
    >
      <SidebarMenu
        user={user}
        onItemClick={() => setOpen(false)}
        onClose={() => setOpen(false)}
        isMobile={isMobile}
      />
    </Box>
  );

  // ✅ MOBILE → Drawer + Hamburger
  if (isMobile) {
    return (
      <>
        {/* Hamburger Button */}
        <IconButton
          onClick={() => setOpen(true)}
          sx={{
            position: "fixed",
            top: "calc(8px)",
            left: 0,
            zIndex: 1300,
            bgcolor: mode === "dark" ? colors.primary[600] : colors.bg[100],
          }}
        >
          <MenuIcon />
        </IconButton>

        {/* Drawer */}
        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          variant="temporary"
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": {
              width: 220,
              bgcolor: mode === "dark" ? colors.primary[600] : colors.bg[100],
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      </>
    );
  }

  // ✅ DESKTOP → Fixed Sidebar
  return sidebarContent;
}

export default Sidebar;
