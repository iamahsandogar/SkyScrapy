import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { colors } from "../../design-system/tokens";
import AddIcon from "@mui/icons-material/Add";
function ActiveLeads() {
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
        <Typography variant="p" fontWeight="bold">
          Active Leads
        </Typography>

        <Typography
          color={colors.greenAccent[500]}
          fontSize="12px"
          sx={{ whiteSpace: "nowrap" }} // prevent wrapping
        >
          December 25, 3:00 AM
        </Typography>
      </Box>

      <Typography
        variant="h4"
        mt={2}
        sx={{ whiteSpace: "nowrap" }} // prevent wrapping
      >
        Bob Smith
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
          View All Active Leads
        </Typography>

        {/* Plus icon with colored background */}
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: "3px",
            backgroundColor: colors.grey[900], // pick your color
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <AddIcon fontSize="small" />
        </Box>
      </Box>
    </Box>
  );
}

export default ActiveLeads;
