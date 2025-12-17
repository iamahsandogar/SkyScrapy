import { Box } from "@mui/material";
import React from "react";
import Sidebar from "./global/Sidebar";
import { Outlet } from "react-router-dom";

function Layout({ children }) {
  return (
    <Box
      display={"flex"}
      gap={2}
      sx={{
        minHeight: "100vh",
        width: "100%",
      }}
    >
      <Box
        sx={{
          padding: "10px 0px 10px 10px",
          position: "sticky",
          top: "0px",
          maxHeight: "100vh",
        }}
      >
        <Sidebar />
      </Box>
      <Box
        sx={{
          overflowX: "hidden",
          padding: "10px 10px 10px 0px",
          flexGrow: 1,
        }}
      >
        {children ? children : <Outlet />}
      </Box>
    </Box>
  );
}

export default Layout;
