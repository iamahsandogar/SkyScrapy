import { useCallback, useEffect, useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";
import Topbar from "../../components/global/Topbar";
import ActiveLeads from "../../components/Dashboard/ActiveLeads";
import UnreadNotesSummary from "../../components/Dashboard/UnreadNotesSummary";
import ChartBox from "../../components/Dashboard/ChartBox";
import Cards from "../../components/Dashboard/Cards";
import { prefetchLeadData } from "../../utils/prefetchData";
import UpcomingReminders from "../../components/Dashboard/UpcomingReminders";
import MonthlyRemindersCalendar from "../../components/Dashboard/MonthlyRemindersCalendar";
import DotLoader from "../../components/global/DotLoader";
import { getColors } from "../../design-system/tokens";
import { useTheme } from "../../contexts/ThemeContext";
import apiRequest from "../../components/services/api";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const mode = theme?.mode ?? theme?.palette?.mode ?? "light";
  const colors = getColors(mode);

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  // Fetch all dashboard data from single API endpoint
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await apiRequest("/api/common/dashboard/");
        setDashboardData(response);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const overlayBg =
    mode === "dark" ? "rgba(5, 9, 20, 0.85)" : "rgba(255, 255, 255, 0.85)";
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
      {loading && (
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

      <Cards data={dashboardData} />

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
        <ChartBox data={dashboardData} />
        <MonthlyRemindersCalendar data={dashboardData} />
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          marginTop: 2,
        }}
      >
        <UpcomingReminders data={dashboardData} />
        <ActiveLeads data={dashboardData} />
        <UnreadNotesSummary data={dashboardData} />
      </Box>
    </Box>
  );
}