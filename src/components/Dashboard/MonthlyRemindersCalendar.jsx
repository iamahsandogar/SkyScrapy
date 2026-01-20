import { lazy, Suspense } from "react";
import { Paper, Typography } from "@mui/material";
import { useTheme } from "../../contexts/ThemeContext";
import { getColors } from "../../design-system/tokens";
import DotLoader from "../global/DotLoader";

// Lazy load the MonthlyRemindersCalendarContent component
const LazyMonthlyRemindersCalendarContent = lazy(() => import("./MonthlyRemindersCalendarContent"));

function MonthlyRemindersCalendarFallback() {
  const { mode } = useTheme();
  const colors = getColors(mode);
  const isDark = mode === "dark";

  return (
    <Paper
      sx={{
        flex: 1,
        minWidth: 300,
        maxWidth: 500,
        borderRadius: 3,
        height: "390px",
        overflowY: "none",
        backgroundColor: mode === "dark" ? colors.primary[600] : colors.bg[100],
        p: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
      elevation={0}
    >
      <Typography variant="h6" fontWeight="bold" mb={2}>
        Monthly reminders
      </Typography>
      <DotLoader />
      <Typography sx={{ color: isDark ? colors.grey[200] : colors.primary[200], mt: 2 }}>
        Loading calendar data...
      </Typography>
    </Paper>
  );
}

export default function MonthlyRemindersCalendar({ data }) {
  return (
    <Suspense fallback={<MonthlyRemindersCalendarFallback />}>
      <LazyMonthlyRemindersCalendarContent data={data} />
    </Suspense>
  );
}
