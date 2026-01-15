import { useCallback, useEffect, useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";
import Topbar from "../../components/global/Topbar";
import ActiveLeads from "../../components/Dashboard/ActiveLeads";
import UnreadNotesSummary from "../../components/Dashboard/UnreadNotesSummary";
import MonthlyRemindersCalendar from "../../components/Dashboard/MonthlyRemindersCalendar";
import ChartBox from "../../components/Dashboard/ChartBox";
import Cards from "../../components/Dashboard/Cards";
import UpcomingReminders from "../../components/Dashboard/UpcomingReminders";
import DotLoader from "../../components/global/DotLoader";
import { getColors } from "../../design-system/tokens";
import { useTheme } from "../../contexts/ThemeContext";
import { prefetchLeadData } from "../../utils/prefetchData";
import apiRequest from "../../components/services/api";

export default function EmployeeDashboard() {
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
        
        // Fetch dashboard data and employees in parallel
        const [dashboardResponse, employeesResponse] = await Promise.all([
          apiRequest("/api/common/dashboard/"),
          // apiRequest("/ui/employees/").catch(err => {
          //   console.warn("Failed to fetch employees:", err);
          //   return [];
          // })
        ]);
        
        console.log("Employee Dashboard API Response:", dashboardResponse);
        
        if (dashboardResponse) {
          // Transform API response to expected format
          const reminders = dashboardResponse.reminders || {};
          
          // Collect all leads from reminders sections
          const allLeads = [
            ...(reminders.overdue?.leads || []),
            ...(reminders.due_today?.leads || []),
            ...(reminders.upcoming?.leads || []),
            ...(reminders.done?.leads || []),
          ];
          
          // Transform lead_statuses to statuses format
          const statuses = (dashboardResponse.lead_statuses || []).map(s => ({
            id: s.status_id,
            name: s.status_name,
            count: s.count,
          }));
          
          // Calculate total leads from status counts
          const totalLeadsCount = (dashboardResponse.lead_statuses || []).reduce((sum, s) => sum + s.count, 0);
          
          // Parse employees response
          const employeesList = employeesResponse?.employees || employeesResponse || [];
          
          const dashboardPayload = {
            leads: allLeads,
            statuses: statuses,
            lead_statuses: dashboardResponse.lead_statuses || [],
            employees: Array.isArray(employeesList) ? employeesList : [],
            unread_notes: dashboardResponse.unread_notes || { notes: [], unread_count: 0 },
            reminders: reminders,
            always_active: dashboardResponse.always_active || { count: 0 },
            total_leads_count: totalLeadsCount,
          };
          
          setDashboardData(dashboardPayload);
        } else {
          console.warn("Dashboard API returned empty response");
          setDashboardData({ leads: [], employees: [], statuses: [], lead_statuses: [], unread_notes: { notes: [], unread_count: 0 }, reminders: {}, always_active: { count: 0 }, total_leads_count: 0 });
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setDashboardData({ leads: [], employees: [], statuses: [], lead_statuses: [], unread_notes: { notes: [], unread_count: 0 }, reminders: {}, always_active: { count: 0 }, total_leads_count: 0 });
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
          Employee Dashboard
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              borderRadius: "9px",
              textTransform: "none",
              fontWeight: "bold",
            }}
            onClick={handleOpenCreateLead}
          >
            Add New Lead
          </Button>
        </Box>
      </Topbar>

      <Cards mode="employee" data={dashboardData} />

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