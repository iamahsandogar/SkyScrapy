import { lazy, Suspense } from "react";
import { Box, Typography, Chip } from "@mui/material";
import { tokens } from "../../design-system/tokens/colors.js";
import { useTheme } from "../../contexts/ThemeContext";
import DotLoader from "../global/DotLoader";

// Lazy load the UnreadNotesSummaryContent component
const LazyUnreadNotesSummaryContent = lazy(() => import("./UnreadNotesSummaryContent"));

function UnreadNotesSummaryFallback() {
  const { mode } = useTheme();
  const colors = tokens(mode);
  const backgroundColor = mode === "dark" ? colors.primary[600] : colors.bg[100];
  const headingColor = colors.grey[100];
  const secondaryTextColor = mode === "dark" ? colors.grey[200] : colors.grey[600];

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: "320px",
        maxHeight: 190,
        borderRadius: "12px",
        padding: 3,
        backgroundColor: backgroundColor,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
        <Typography variant="h6" fontWeight={700} color={headingColor}>
          Unread Notes
        </Typography>
        <Chip
          label="..."
          size="small"
          color="default"
        />
      </Box>
      <Typography variant="caption" color={secondaryTextColor}>
        ...
      </Typography>
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          minHeight: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <DotLoader />
        <Typography variant="body2" color={secondaryTextColor} mt={1}>
          Loading unread notes...
        </Typography>
      </Box>
    </Box>
  );
}

export default function UnreadNotesSummary({ data }) {
  return (
    <Suspense fallback={<UnreadNotesSummaryFallback />}>
      <LazyUnreadNotesSummaryContent data={data} />
    </Suspense>
  );
}
