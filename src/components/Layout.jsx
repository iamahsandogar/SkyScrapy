import { Box, useMediaQuery } from "@mui/material";
import React from "react";
import Sidebar from "./global/Sidebar";
import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTheme as useMuiTheme } from "@mui/material/styles";
import { useTheme } from "../contexts/ThemeContext";
import { getColors } from "../design-system/tokens";

function Layout({ children }) {
  const [user, setUser] = useState(null);
  const { mode } = useTheme();
  const colors = getColors(mode);
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  return (
    <Box
      display={"flex"}
      gap={{ xs: 0, md: 2 }}
      sx={{
        minHeight: "100vh",
        width: "100%",
        flexDirection: { xs: "column", md: "row" },
        backgroundColor: mode === "dark" ? colors.primary[500] : colors.bg[500],
        paddingBottom: { xs: 4, md: 0 },
      }}
    >
      {!isMobile && (
        <Box
          sx={{
            padding: "10px 0px 10px 10px",
            position: "sticky",
            top: "0px",
            maxHeight: "100vh",
          }}
        >
          <Sidebar user={user} />
        </Box>
      )}
      <Box
        sx={{
          overflowX: "hidden",
          padding: {
            xs: "70px 16px 16px",
            md: "10px 10px 10px 0px",
          },
          flexGrow: 1,
          width: "100%",
        }}
      >
        {children ? children : <Outlet />}
      </Box>
      {isMobile && <Sidebar user={user} />}
    </Box>
  );
}

export default Layout;
