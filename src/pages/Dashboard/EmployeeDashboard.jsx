import { useCallback, useEffect, useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";
import Topbar from "../../components/global/Topbar";
import UnreadNotesSummary from "../../components/Dashboard/UnreadNotesSummary";
import MonthlyRemindersCalendar from "../../components/Dashboard/MonthlyRemindersCalendar";
import ChartBox from "../../components/Dashboard/ChartBox";
import Cards from "../../components/Dashboard/Cards";
import OverdueLeads from "../../components/Dashboard/OverdueLeads";
import DueTodayLeads from "../../components/Dashboard/DueTodayLeads";
import { getColors } from "../../design-system/tokens";
import { useTheme } from "../../contexts/ThemeContext";
import apiRequest from "../../components/services/api";
import { isConvertedStatus } from "../../components/Dashboard/leadUtils";

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const mode = theme?.mode ?? theme?.palette?.mode ?? "light";
  const colors = getColors(mode);

  const [statusData, setStatusData] = useState(null);
  const [remindersData, setRemindersData] = useState(null);
  const [notesData, setNotesData] = useState(null);

  // Fetch lead statuses and employees
  useEffect(() => {
    const fetchStatusData = async () => {
      try {
        const response = await apiRequest("/api/common/dashboard/lead-statuses-employees/");
        console.log("Employee Status API Response:", response);
        
        if (response) {
          // Filter out converted statuses
          const filteredLeadStatuses = (response.lead_statuses || []).filter(
            (s) => !isConvertedStatus(s.status_name || s.name || "")
          );

          const statuses = filteredLeadStatuses.map((s) => ({
            id: s.status_id,
            name: s.status_name,
            count: s.count,
          }));

          const totalLeadsCount = filteredLeadStatuses.reduce(
            (sum, s) => sum + s.count,
            0
          );

          setStatusData({
            lead_statuses: filteredLeadStatuses,
            employees: [],
            statuses: statuses,
            total_leads_count: totalLeadsCount,
            always_active: response.always_active || { count: 0 },
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
        console.log("Employee Reminders API Response:", response);
        if (response && response.reminders) {
          const rawReminders = response.reminders;

          const filterRemindersCategory = (category) => {
            if (!category || !Array.isArray(category.leads))
              return { ...category, leads: [] };
            return {
              ...category,
              leads: category.leads.filter((lead) => {
                const statusVal =
                  lead.status_label ||
                  lead.statusName ||
                  lead.status_name ||
                  (lead.status && typeof lead.status === "object"
                    ? lead.status.name
                    : null);

                if (statusVal) {
                  return !isConvertedStatus(statusVal);
                }
                return true;
              }),
            };
          };

          setRemindersData({
            reminders: {
              overdue: filterRemindersCategory(rawReminders.overdue),
              due_today: filterRemindersCategory(rawReminders.due_today),
              upcoming: filterRemindersCategory(rawReminders.upcoming),
              done: filterRemindersCategory(rawReminders.done),
            },
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
        console.log("Employee Notes API Response:", response);
        if (response) {
          setNotesData({
            unread_notes: response.unread_notes || response || { notes: [], unread_count: 0 },
          });
        }
      } catch (err) {
        console.error("Failed to fetch notes data:", err);
        setNotesData({ unread_notes: { notes: [], unread_count: 0 } });
      }
    };
    fetchNotesData();
  }, []);

  const handleOpenCreateLead = useCallback(() => {
    navigate("/create-lead");
  }, [navigate]);

  return (
    <Box>
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

      <Cards mode="employee" data={statusData} />

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