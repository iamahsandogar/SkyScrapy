import { useCallback, useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";
import Topbar from "../global/Topbar";
import QuickActions from "./QuickActions";
import ActiveLeads from "./ActiveLeads";
import LeadNotesPanel from "./LeadNotesPanel";
import UnreadNotesSummary from "./UnreadNotesSummary";
import OngoingProjects from "./OngoingProjects";
import ChartBox from "./ChartBox";
import Cards from "./Cards";
import { prefetchLeadData } from "../../utils/prefetchData";
import UpcomingReminders from "./UpcomingReminders";
import MonthlyRemindersCalendar from "./MonthlyRemindersCalendar";
import DotLoader from "../global/DotLoader";
import { getColors } from "../../design-system/tokens";
import { useTheme } from "../../contexts/ThemeContext";
import UnreadNotes from "./UnreadNotes";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const mode = theme?.mode ?? theme?.palette?.mode ?? "light";
  const colors = getColors(mode);

  const [loadingStates, setLoadingStates] = useState({
    cards: true,
    chart: true,
    calendar: true,
    activeLeads: true,
    upcomingReminders: true,
    unreadNotesSummary: true,
  });

  const updateLoadingState = useCallback((section, value) => {
    setLoadingStates((prev) => {
      if (prev[section] === value) return prev;
      return { ...prev, [section]: value };
    });
  }, []);

  const handleCardsLoadingChange = useCallback(
    (value) => updateLoadingState("cards", value),
    [updateLoadingState]
  );
  const handleChartLoadingChange = useCallback(
    (value) => updateLoadingState("chart", value),
    [updateLoadingState]
  );
  const handleCalendarLoadingChange = useCallback(
    (value) => updateLoadingState("calendar", value),
    [updateLoadingState]
  );

  const handleActiveLeadsLoadingChange = useCallback(
    (value) => updateLoadingState("activeLeads", value),
    [updateLoadingState]
  );

  const handleUpcomingRemindersLoadingChange = useCallback(
    (value) => updateLoadingState("upcomingReminders", value),
    [updateLoadingState]
  );

  const handleUnreadNotesSummaryLoadingChange = useCallback(
    (value) => updateLoadingState("unreadNotesSummary", value),
    [updateLoadingState]
  );

  const isDashboardLoading = Object.values(loadingStates).some(Boolean);
  const overlayBg =
    mode === "dark" ? colors.grey[100] : colors.grey[900];
  const overlayTextColor =
    mode === "dark" ? colors.grey[100] : colors.grey[900];

  const warmUpLeadForm = useCallback(() => {
    prefetchLeadData({ includeLeads: false });
  }, []);

  const handleOpenCreateLead = useCallback(() => {
    warmUpLeadForm();
    navigate("/create-lead");
  }, [navigate, warmUpLeadForm]);

  return (
    <Box>
      {isDashboardLoading && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 1400,
            bgcolor: overlayBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <DotLoader size={56} color={colors.blueAccent[500]} />
          <Typography sx={{ color: overlayTextColor }}>
            Loading dashboard…
          </Typography>
        </Box>
      )}

      <Topbar>
        <Typography variant="h5" fontWeight="bold">
          Dashboard
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              borderRadius: "9px",
              textTransform: "none",
              fontWeight: "bold",
              backgroundColor: colors.blueAccent[500],
            }}
            onClick={handleOpenCreateLead}
          >
            Add New Lead
          </Button>
        </Box>
      </Topbar>

      <Cards onLoadingChange={handleCardsLoadingChange} />

      <Box
        display="grid"
        gap={2}
        mt={2}
        sx={{
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr",
            md: "2fr 1fr",
          },
        }}
      >
        {/* <OngoingProjects /> */}

        <ChartBox onLoadingChange={handleChartLoadingChange} />
        <MonthlyRemindersCalendar
          onLoadingChange={handleCalendarLoadingChange}
        />
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          marginTop: 2,
        }}
      >
        <QuickActions />
        <UpcomingReminders onLoadingChange={handleUpcomingRemindersLoadingChange} />
        <ActiveLeads onLoadingChange={handleActiveLeadsLoadingChange} />
        {/* <UnreadNotes  leadId={"788f521f-d55d-4842-9ad1-5fc4853e564d"}/> */}
        <UnreadNotesSummary onLoadingChange={handleUnreadNotesSummaryLoadingChange} />
      </Box>
    </Box>
  );
}export { default } from "../../pages/Dashboard/AdminDashboard";
