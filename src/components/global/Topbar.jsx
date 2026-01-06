import { Box, IconButton, useTheme as useMUITheme } from "@mui/material";
import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { getColors } from "../../design-system/tokens";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import MenuIcon from "@mui/icons-material/Menu";
import { useMediaQuery } from "@mui/material";

function Topbar({ children, onHamburgerClick }) {
  const { mode, toggleTheme } = useTheme();
  const colors = getColors(mode);
  const muiTheme = useMUITheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm"));

  // Separate title from buttons
  const childrenArray = React.Children.toArray(children);

  // Pick first Typography with h1-h6 variant or fallback
  let titleElement = childrenArray.find(
    (child) =>
      React.isValidElement(child) && child.props?.variant?.startsWith("h")
  );
  if (!titleElement) {
    titleElement =
      childrenArray.find(
        (child) =>
          React.isValidElement(child) && child.type?.name === "Typography"
      ) || childrenArray[0];
  }

  const buttons = childrenArray.filter((child) => child !== titleElement);

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      gap={2}
      padding={isMobile ? 2 : 3}
      backgroundColor={mode === "dark" ? colors.primary[600] : colors.bg[100]}
      borderRadius="12px"
      sx={{ color: colors.grey[100] }}
    >
      {/* Hamburger + Title */}
      <Box display="flex" alignItems="center" gap={1} flexGrow={1} minWidth={0}>
        {isMobile && onHamburgerClick && (
          <IconButton
            size="small"
            onClick={onHamburgerClick}
            sx={{ color: colors.grey[100] }}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Box
          sx={{
            flexGrow: 1,
            flexShrink: 1,
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {titleElement}
        </Box>
      </Box>

      {/* Buttons on right */}
      <Box display="flex" alignItems="center" gap={1} flexShrink={0}>
        {buttons}
        <IconButton
          size={isMobile ? "small" : "medium"}
          onClick={toggleTheme}
          sx={{
            color: colors.grey[100],
            "&:hover": {
              backgroundColor:
                mode === "dark" ? colors.bg[100] : colors.bg[900],
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
