
import { useCallback, useEffect, useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";
import Topbar from "../../components/global/Topbar";
import UnreadNotesSummary from "../../components/Dashboard/UnreadNotesSummary";
import ChartBox from "../../components/Dashboard/ChartBox";
import Cards from "../../components/Dashboard/Cards";
import { prefetchLeadData, getCachedLeadData } from "../../utils/prefetchData";
import OverdueLeads from "../../components/Dashboard/OverdueLeads";
import DueTodayLeads from "../../components/Dashboard/DueTodayLeads";
import MonthlyRemindersCalendar from "../../components/Dashboard/MonthlyRemindersCalendar";
import { getColors } from "../../design-system/tokens";
import { useTheme } from "../../contexts/ThemeContext";
import apiRequest from "../../components/services/api";
import { parseEmployeesPayload } from "../../components/Leads/leadFormUtils";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const mode = theme?.mode ?? theme?.palette?.mode ?? "light";
  const colors = getColors(mode);

  const [statusData, setStatusData] = useState(null);
  const [remindersData, setRemindersData] = useState(null);
  const [notesData, setNotesData] = useState(null);
  const [employeeCount, setEmployeeCount] = useState(0);

  // Fetch lead statuses and employees
  useEffect(() => {
    const fetchStatusData = async () => {
      try {
        const [dashboardResponse, allEmployeesResponse] = await Promise.all([
          apiRequest("/api/common/dashboard/lead-statuses-employees/"),
          apiRequest("/ui/employees/")
        ]);

        console.log("Status API Response:", dashboardResponse);

        // Use the count from all employees (Active + Deactivated)
        let totalEmployeeCount = 0;
        if (allEmployeesResponse && allEmployeesResponse.counts && allEmployeesResponse.counts.total !== undefined) {
           totalEmployeeCount = allEmployeesResponse.counts.total;
        } else {
           const allEmployees = parseEmployeesPayload(allEmployeesResponse);
           totalEmployeeCount = allEmployees.length;
        }
        setEmployeeCount(totalEmployeeCount);

        if (dashboardResponse) {
          const statuses = (dashboardResponse.lead_statuses || []).map(s => ({
            id: s.status_id,
            name: s.status_name,
            count: s.count,
          }));

          const totalLeadsCount = dashboardResponse.total_leads_count !== undefined 
            ? dashboardResponse.total_leads_count 
            : (dashboardResponse.lead_statuses || []).reduce((sum, s) => sum + s.count, 0);

          setStatusData({
            lead_statuses: dashboardResponse.lead_statuses || [],
            employees: dashboardResponse.employees || [],
            statuses: statuses,
            total_leads_count: totalLeadsCount,
            always_active: dashboardResponse.always_active || { count: 0 },
          });
        }
      } catch (err) {
        console.error("Failed to fetch status data:", err);
        setStatusData({ lead_statuses: [], employees: [], statuses: [], total_leads_count: 0, always_active: { count: 0 } });
      }
    };
    fetchStatusData();
  }, []);

  // Fetch reminders
  useEffect(() => {
    const fetchRemindersData = async () => {
      try {
        const response = await apiRequest("/api/common/dashboard/reminders/");
        console.log("Reminders API Response:", response);
        if (response) {
          setRemindersData({
            reminders: response.reminders || {},
          });
        }
      } catch (err) {
        console.error("Failed to fetch reminders data:", err);
        setRemindersData({ reminders: {} });
      }
    };
    fetchRemindersData();
  }, []);

  // Fetch unread notes
  useEffect(() => {
    const fetchNotesData = async () => {
      try {
        const response = await apiRequest("/api/common/dashboard/unread-notes/");
        console.log("Notes API Response:", response);
        if (response) {
          setNotesData({
            unread_notes: response.unread_notes || { notes: [], unread_count: 0 },
          });
        }
      } catch (err) {
        console.error("Failed to fetch notes data:", err);
        setNotesData({ unread_notes: { notes: [], unread_count: 0 } });
      }
    };
    fetchNotesData();
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

      <Cards data={statusData} mode="admin" employeeCount={employeeCount} />

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
        <ChartBox data={statusData} />
        <MonthlyRemindersCalendar data={remindersData} />
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          marginTop: 2,
        }}
      >
        <OverdueLeads 
          data={remindersData ? { ...remindersData, statuses: statusData?.statuses } : null} 
        />
        <DueTodayLeads 
          data={remindersData ? { ...remindersData, statuses: statusData?.statuses } : null} 
        />
        <UnreadNotesSummary 
          data={notesData ? { ...notesData, reminders: remindersData?.reminders } : null} 
        />
      </Box>
    </Box>
  );
}