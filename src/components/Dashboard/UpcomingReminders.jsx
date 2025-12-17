import React from "react";
import { Box, Typography } from "@mui/material";
import { colors } from "../../design-system/tokens";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
function UpcomingReminders() {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: "280px",
        borderRadius: "12px",
        padding: 3,
        backgroundColor: "#fff",
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography
          variant="p"
          fontWeight="bold"
          sx={{ whiteSpace: "nowrap" }} // prevent wrapping
        >
          Up-coming Reminders
        </Typography>

        <Typography
          color={colors.redAccent[500]}
          fontSize="12px"
          sx={{ whiteSpace: "nowrap" }} // prevent wrapping
        >
          25 Dec 2025
        </Typography>
      </Box>

      <Typography
        variant="h4"
        mt={2}
        sx={{ whiteSpace: "nowrap" }} // prevent wrapping
      >
        Office Work
      </Typography>

      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mt={2} // spacing from previous content
      >
        <Typography
          component="a"
          href="projects"
          sx={{
            color: "#1152C2",
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          View all
        </Typography>

        <Box
          borderRadius="3px" // circular background
          p={1} // padding inside the circle
          display="flex"
          alignItems="center"
          justifyContent="center"
          sx={{ cursor: "pointer", backgroundColor: colors.grey[900] }}
        >
          <ShoppingBagRoundedIcon fontSize="small" />
        </Box>
      </Box>
    </Box>
  );
}

export default UpcomingReminders;
