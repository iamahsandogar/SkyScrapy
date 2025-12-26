import { Box, IconButton, useTheme as useMUITheme } from "@mui/material";
import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { getColors } from "../../design-system/tokens";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";

function Topbar({ children }) {
  const { mode, toggleTheme } = useTheme();
  const colors = getColors(mode);
  const muiTheme = useMUITheme();

  // Separate title from buttons
  const childrenArray = React.Children.toArray(children);
  const title = childrenArray.find(
    (child) => React.isValidElement(child) && child.type?.displayName === "Typography" || 
               (React.isValidElement(child) && child.props?.variant?.startsWith("h"))
  ) || childrenArray[0]; // Fallback to first child if no Typography found
  
  const buttons = childrenArray.filter(
    (child, index) => 
      !(React.isValidElement(child) && child.type?.displayName === "Typography" && index === 0) &&
      !(React.isValidElement(child) && child.props?.variant?.startsWith("h") && index === 0)
  );

  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      backgroundColor={
        mode === "dark" ? colors.primary[600] : colors.bg[100]
      }
      borderRadius="12px"
      padding={3}
      sx={{
        color: mode === "dark" ? colors.grey[100] : colors.grey[100],
      }}
    >
      {/* Title on the left */}
      <Box>{title}</Box>
      
      {/* All buttons on the right */}
      <Box display="flex" alignItems="center" gap={1}>
        {buttons}
        <IconButton
          onClick={toggleTheme}
          sx={{
            color: mode === "dark" ? colors.grey[100] : colors.grey[100],
            "&:hover": {
              backgroundColor:
                mode === "dark" ? colors.primary[700] : colors.grey[200],
            },
          }}
        >
          {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </Box>
    </Box>
  );
}

export default Topbar;
