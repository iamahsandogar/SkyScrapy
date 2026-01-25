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
import { isConvertedStatus, isProject } from "../../components/Dashboard/leadUtils";

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const mode = theme?.mode ?? theme?.palette?.mode ?? "light";
  const colors = getColors(mode);

  const [statusData, setStatusData] = useState(null);
  const [remindersData, setRemindersData] = useState(null);
  const [notesData, setNotesData] = useState(null);

  // Fetch leads to get accurate count (excluding projects)
  // This runs independently to get the actual lead count
  useEffect(() => {
    const fetchLeadsCount = async () => {
      try {
        console.log("=== FETCHING LEADS FROM API FOR ACCURATE COUNT ===");
        
        // Fetch projects and leads in parallel
        const [projectsData, leadsData] = await Promise.all([
          apiRequest("/api/leads/projects/").catch(err => {
            console.warn("Could not fetch projects list, will rely on is_project field only:", err);
            return null;
          }),
          apiRequest("/api/leads/")
        ]);
        
        // Get project IDs for exclusion
        let projectIds = new Set();
        if (projectsData) {
          const projectsList = projectsData?.projects || projectsData?.results || projectsData || [];
          if (Array.isArray(projectsList)) {
            projectsList.forEach(project => {
              const projectId = project.id || project.pk || project.uuid;
              if (projectId) {
                projectIds.add(String(projectId));
              }
            });
            console.log(`Found ${projectIds.size} projects to exclude from lead count`);
          }
        }
        
        // Handle different response formats for leads
        let leadsList = [];
        if (leadsData && Array.isArray(leadsData.leads)) {
          leadsList = leadsData.leads;
        } else if (leadsData && Array.isArray(leadsData)) {
          leadsList = leadsData;
        } else if (leadsData?.data) {
          if (Array.isArray(leadsData.data)) {
            leadsList = leadsData.data;
          } else if (leadsData.data?.leads && Array.isArray(leadsData.data.leads)) {
            leadsList = leadsData.data.leads;
          }
        }

        console.log(`Initial leads fetched: ${leadsList.length}`);

        // Handle pagination if needed
        const totalCount = leadsData?.count || null;
        if (totalCount !== null && leadsList.length < totalCount) {
          console.log(`API is paginating: Got ${leadsList.length} of ${totalCount} leads. Fetching remaining...`);
          let allLeads = [...leadsList];
          let currentOffset = leadsList.length;
          const fetchLimit = 1000;
          
          while (allLeads.length < totalCount) {
            try {
              const nextPageData = await apiRequest(`/api/leads/?limit=${fetchLimit}&offset=${currentOffset}`);
              let nextPageLeads = [];
              if (nextPageData && Array.isArray(nextPageData.leads)) {
                nextPageLeads = nextPageData.leads;
              } else if (nextPageData?.data?.leads && Array.isArray(nextPageData.data.leads)) {
                nextPageLeads = nextPageData.data.leads;
              } else if (nextPageData?.leads && Array.isArray(nextPageData.leads)) {
                nextPageLeads = nextPageData.leads;
              }
              
              if (nextPageLeads.length === 0) break;
              
              allLeads = [...allLeads, ...nextPageLeads];
              currentOffset += nextPageLeads.length;
              
              if (allLeads.length >= totalCount) break;
            } catch (e) {
              console.error("Error fetching next page:", e);
              break;
            }
          }
          
          leadsList = allLeads;
          console.log(`Total leads after pagination: ${leadsList.length}`);
        }

        // Filter out projects (leads that have been converted to projects)
        // Check multiple possible field names and values, plus project IDs
        const nonProjectLeads = leadsList.filter(lead => {
          const leadId = String(lead.id || lead.pk || lead.uuid || "");
          
          // Check if this lead ID is in the projects list
          const isInProjectsList = projectIds.size > 0 && projectIds.has(leadId);
          
          // Check various field names for is_project flag
          const hasProjectFlag = 
            lead.is_project === true || 
            lead.is_project === 1 ||
            lead.is_project === "true" ||
            lead.is_project === "1" ||
            lead.isProject === true ||
            lead.isProject === 1 ||
            lead.isProject === "true" ||
            lead.isProject === "1" ||
            lead.is_project === "True" ||
            lead.isProject === "True";
          
          const isProject = isInProjectsList || hasProjectFlag;
          
          if (isProject) {
            console.log(`Filtering out project: Lead ID ${leadId}, is_project: ${lead.is_project || lead.isProject}, in projects list: ${isInProjectsList}`);
          }
          
          return !isProject;
        });

        const actualLeadCount = nonProjectLeads.length;
        console.log(`=== FINAL LEAD COUNT CALCULATION ===`);
        console.log(`Total items from API: ${leadsList.length}`);
        console.log(`Projects excluded: ${leadsList.length - nonProjectLeads.length}`);
        console.log(`✅ Actual leads count (excluding projects): ${actualLeadCount}`);

        // Calculate lead status breakdown from actual leads (excluding projects)
        const statusBreakdown = new Map();
        nonProjectLeads.forEach(lead => {
          // Extract status name from various possible field names
          let statusName = null;
          
          if (lead.status && typeof lead.status === "object") {
            statusName = lead.status.name || lead.status.status_name || lead.status.label || null;
          } else if (lead.status_label) {
            statusName = lead.status_label;
          } else if (lead.statusName) {
            statusName = lead.statusName;
          } else if (lead.status_name) {
            statusName = lead.status_name;
          } else if (typeof lead.status === "string") {
            statusName = lead.status;
          }
          
          if (statusName) {
            const normalizedStatusName = String(statusName).trim();
            const currentCount = statusBreakdown.get(normalizedStatusName) || 0;
            statusBreakdown.set(normalizedStatusName, currentCount + 1);
          }
        });
        
        // Convert map to array format matching API response structure
        const calculatedLeadStatuses = Array.from(statusBreakdown.entries()).map(([statusName, count]) => ({
          status_name: statusName,
          name: statusName,
          status__name: statusName,
          count: count,
          status_id: null, // We don't have status IDs from leads, but that's okay for display
        }));
        
        console.log(`=== CALCULATED STATUS BREAKDOWN FROM ACTUAL LEADS ===`);
        console.log(`Total statuses found: ${calculatedLeadStatuses.length}`);
        calculatedLeadStatuses.forEach(s => {
          console.log(`  - Status: "${s.status_name}", Count: ${s.count}`);
        });

        // Update statusData with the accurate count and calculated status breakdown
        setStatusData(prev => {
          if (prev) {
            return {
              ...prev,
              total_leads_count: actualLeadCount,
              lead_statuses: calculatedLeadStatuses, // Use calculated breakdown from actual leads
            };
          } else {
            // If statusData doesn't exist yet, create it with count and calculated breakdown
            return {
              lead_statuses: calculatedLeadStatuses,
              employees: [],
              statuses: calculatedLeadStatuses.map((s) => ({
                id: s.status_id,
                name: s.status_name,
                count: s.count,
              })),
              total_leads_count: actualLeadCount,
              always_active: { count: 0 },
            };
          }
        });
      } catch (err) {
        console.error("Failed to fetch leads count:", err);
        // Don't update if there's an error, keep existing data
      }
    };

    fetchLeadsCount();
  }, []); // Run once on mount

  // Note: Status breakdown is now calculated from actual leads in fetchLeadsCount
  // No need to fetch from API endpoint anymore

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
                // Filter out projects using comprehensive check
                if (isProject(lead)) {
                  return false;
                }
                
                // Also check status name for converted patterns (backup check)
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