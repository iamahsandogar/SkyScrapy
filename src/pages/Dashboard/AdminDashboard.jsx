
import { useCallback, useEffect, useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";
import Topbar from "../../components/global/Topbar";
import UnreadNotesSummary from "../../components/Dashboard/UnreadNotesSummary";
import ChartBox from "../../components/Dashboard/ChartBox";
import Cards from "../../components/Dashboard/Cards";
import { prefetchLeadData } from "../../utils/prefetchData";
import OverdueLeads from "../../components/Dashboard/OverdueLeads";
import DueTodayLeads from "../../components/Dashboard/DueTodayLeads";
import MonthlyRemindersCalendar from "../../components/Dashboard/MonthlyRemindersCalendar";
import { getColors } from "../../design-system/tokens";
import { useTheme } from "../../contexts/ThemeContext";
import apiRequest from "../../components/services/api";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const mode = theme?.mode ?? theme?.palette?.mode ?? "light";
  const colors = getColors(mode);

  const [dashboardData, setDashboardData] = useState(null);

  // Fetch all dashboard data from single API endpoint
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Only call dashboard API
        const dashboardResponse = await apiRequest("/api/common/dashboard/");
        
        console.log("Dashboard API Response:", dashboardResponse);
        
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
          
          // Use total_leads_count from dashboard API response, or calculate from status counts as fallback
          const totalLeadsCount = dashboardResponse.total_leads_count !== undefined 
            ? dashboardResponse.total_leads_count 
            : (dashboardResponse.lead_statuses || []).reduce((sum, s) => sum + s.count, 0);
          
          // Get employees from dashboard API if available, otherwise empty array
          const employeesList = dashboardResponse.employees || [];
          
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
      }
    };

    fetchDashboardData();
  }, []);

  const warmUpLeadForm = useCallback(() => {
    prefetchLeadData({ includeLeads: false });
  }, []);

  const handleOpenCreateLead = useCallback(() => {
    warmUpLeadForm();
    navigate("/create-lead");
  }, [navigate, warmUpLeadForm]);

  return (
    <Box>
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
        <OverdueLeads data={dashboardData} />
        <DueTodayLeads data={dashboardData} />
        <UnreadNotesSummary data={dashboardData} />
      </Box>
    </Box>
  );
}