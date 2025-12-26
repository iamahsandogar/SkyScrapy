import React from "react";
import { Box, Typography } from "@mui/material";
import { colors } from "../../design-system/tokens";

function UnreadNotes() {
  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="flex-start"
      alignItems="flex-start"
      bgcolor={colors.bg[100]}
      borderColor={colors.grey[900]}
      borderRadius="12px"
      padding={3}
      width="100%" // <-- make it full width
    >
      {/* Heading */}
      <Typography variant="p" fontWeight="bold">
        Unread Notes
      </Typography>

      {/* Paragraph */}
      <Typography variant="body2" color={colors.grey[100]}>
        No Unread Notes
      </Typography>
    </Box>
  );
}

export default UnreadNotes;
