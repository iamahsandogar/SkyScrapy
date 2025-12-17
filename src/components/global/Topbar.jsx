import { Box } from "@mui/material";
import React from "react";
import { colors } from "../../design-system/tokens";

function Topbar({ children }) {
  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      border={0.5}
      backgroundColor={colors.bg[100]}
      borderColor={colors.grey[900]}
      borderRadius="12px"
      padding={3}
    >
      {children}
    </Box>
  );
}

export default Topbar;
