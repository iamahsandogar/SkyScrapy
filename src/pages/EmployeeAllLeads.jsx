import {
  Box,
  Backdrop,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Paper,
  TextField,
  IconButton,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
} from "@mui/material";

import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Topbar from "../components/global/Topbar";
import { colors } from "../design-system/tokens";
import { FaLinkedin, FaComment } from "react-icons/fa";
import VisibilityIcon from "@mui/icons-material/Visibility";
import LeadDetailsModal from "../components/Leads/LeadDetailsModal";
import LeadNotesChat from "../components/Leads/LeadNotesChat";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import apiRequest from "../components/services/api";
import {
  getCachedLeadData,
  addLeadToCache,
  prefetchLeadData,
  removeLeadFromCache,
} from "../utils/prefetchData";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DotLoader from "../components/global/DotLoader";

// const getChipStyles = (status) => {
//   switch (status) {
//     case "Completed":
//       return {
//         backgroundColor: colors.greenAccent[800],
//         color: colors.greenAccent[400],
//         border: `1px solid ${colors.greenAccent[400]}`,
//       };
//     case "Pending":
//       return {
//         backgroundColor: colors.yellowAccent[800],
//         color: colors.yellowAccent[400],
//         border: `1px solid ${colors.yellowAccent[400]}`,
//       };
//     case "Rejected":
//       return {
//         backgroundColor: colors.redAccent[800],
//         color: colors.redAccent[400],
//         border: `1px solid ${colors.redAccent[400]}`,
//       };
//     case "In Progress":
//       return {
//         backgroundColor: colors.blueAccent[800],
//         color: colors.blueAccent[400],
//         border: `1px solid ${colors.blueAccent[400]}`,
//       };
//     default:
//       return {
//         backgroundColor: colors.grey[800],
//         color: colors.grey[400],
//         border: `1px solid ${colors.grey[400]}`,
//       };
//   }
// };

const ALL_COLUMNS = [
  { key: "title", label: "Lead Title" },
  { key: "linkedIn", label: "LinkedIn" },
  { key: "status", label: "Status" },
  { key: "assignedTo", label: "Assigned To" },
  { key: "followUpAt", label: "Follow-up At" },
  { key: "followupStatus", label: "Follow-up Status" },
  { key: "source", label: "Source" },
  { key: "description", label: "Description" },
  { key: "company", label: "Company" },
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "positionTitle", label: "Position Title" },
];

const DEFAULT_COLUMNS = [
  "title",
  "linkedIn",
  "status",
  "sources",
  "assignedTo",
  "followUpAt",
  "followupStatus",
];

const resolveLeadId = (lead) => {
  if (!lead) return null;
  return lead.id ?? lead.pk ?? lead.uuid ?? lead.lead_id ?? lead.leadId ?? null;
};

const tableHeaderCellStyles = {
  whiteSpace: "nowrap",
  fontWeight: 700,
};

// const tableBodyCellStyles = {
//   maxWidth: 150,
//   overflow: "hidden",
//   textOverflow: "ellipsis",
//   whiteSpace: "nowrap",
// };

export default function EmployeeAllLeads() {
  const location = useLocation();
  const [leads, setLeads] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [anchorEl, setAnchorEl] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    return JSON.parse(localStorage.getItem("leadColumns")) || DEFAULT_COLUMNS;
  });
  const [selectedLead, setSelectedLead] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesDialogLead, setNotesDialogLead] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [statusesLoading, setStatusesLoading] = useState(true);
  const [actionAnchorEl, setActionAnchorEl] = useState(null);
  const [menuLead, setMenuLead] = useState(null);
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [deleteDialog, setDeleteDialog] = useState({ open: false, lead: null });
  // Track individual dropdown loading states
  const [statusUpdatingLeadId, setStatusUpdatingLeadId] = useState(null);
  const [followUpUpdatingLeadId, setFollowUpUpdatingLeadId] = useState(null);

  const actionOpen = Boolean(actionAnchorEl);
  const rowRefs = useRef({});
  const highlightTimer = useRef(null);
  const [highlightedLeadId, setHighlightedLeadId] = useState(null);
  const focusLeadId = useMemo(() => {
    const stateLeadId = location.state?.focusLeadId;
    if (stateLeadId) return String(stateLeadId);
    const params = new URLSearchParams(location.search);
    const searchId = params.get("focusLeadId");
    return searchId ? String(searchId) : null;
  }, [location.key, location.search]);
  const isPageDataLoading = leadsLoading || statusesLoading;

  useLayoutEffect(() => {
    if (!focusLeadId) return;
    const target = rowRefs.current[String(focusLeadId)];
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedLeadId(String(focusLeadId));
    if (highlightTimer.current) {
      clearTimeout(highlightTimer.current);
    }
    highlightTimer.current = setTimeout(() => {
      setHighlightedLeadId(null);
      highlightTimer.current = null;
    }, 4000);
    return () => {
      if (highlightTimer.current) {
        clearTimeout(highlightTimer.current);
        highlightTimer.current = null;
      }
    };
  }, [focusLeadId, leads]);

  // Get current user info on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      const userId = userData.id || userData.pk || userData.uuid;
      setCurrentUserId(userId);
    }
  }, []);

  // Fetch statuses from the single /api/leads response - use cache first
  useEffect(() => {
    const fetchStatuses = async () => {
      setStatusesLoading(true);
      try {
        // Try cached data first for instant loading
        const cachedData = getCachedLeadData();

        if (cachedData?.statuses) {
          console.log("Using cached statuses for instant loading");
          setStatuses(cachedData.statuses);
        }

        // If no cache, statuses will be loaded from the /api/leads response in fetchLeads
      } catch (error) {
        console.error("Failed to fetch statuses:", error);
      } finally {
        setStatusesLoading(false);
      }
    };

    void fetchStatuses();
  }, []);

  // Fetch leads - use cache first, then API
  useEffect(() => {
    const fetchLeads = async () => {
      setLeadsLoading(true);
      try {
        // Get current user to filter leads
        const storedUser = localStorage.getItem("user");
        let employeeId = null;

        if (storedUser) {
          const userData = JSON.parse(storedUser);
          employeeId = userData.id || userData.pk || userData.uuid;
        }

        if (!employeeId) {
          console.error("⚠️ Employee ID is missing! Cannot fetch leads.");
          return;
        }

        // Helper function to filter leads assigned to this employee
        const filterLeadsByEmployee = (leadsList) => {
          console.log("=== EMPLOYEE FILTERING DEBUG ===");
          console.log("Employee ID:", employeeId);
          console.log("Total leads to filter:", leadsList.length);

          const filtered = leadsList.filter((lead) => {
            // Try multiple field name variations
            let assignedTo =
              lead.assigned_to ||
              lead.assignedTo ||
              lead.assigned_to_id ||
              lead.assignedToId;

            // Handle case where assigned_to might be an object with nested structure
            // API returns: assigned_to.user_details.id (user ID) or assigned_to.id (profile ID)
            if (
              assignedTo &&
              typeof assignedTo === "object" &&
              assignedTo !== null
            ) {
              // CRITICAL: Check user_details.id first (this is the actual user ID)
              // The API structure is: assigned_to.user_details.id
              if (assignedTo.user_details && assignedTo.user_details.id) {
                assignedTo = assignedTo.user_details.id;
                console.log("Extracted user ID from user_details:", assignedTo);
              } else {
                // Fallback to other possible ID fields
                assignedTo =
                  assignedTo.id ||
                  assignedTo.pk ||
                  assignedTo.uuid ||
                  assignedTo.user_id ||
                  assignedTo.userId ||
                  assignedTo.profile_id ||
                  assignedTo.profileId;
              }

              // If still an object or null, log for debugging
              if (
                !assignedTo ||
                (typeof assignedTo === "object" && assignedTo !== null)
              ) {
                console.warn(
                  "Could not extract ID from assigned_to object:",
                  lead.assigned_to
                );
                console.warn(
                  "Object keys:",
                  Object.keys(lead.assigned_to || {})
                );
                if (lead.assigned_to && lead.assigned_to.user_details) {
                  console.warn("user_details:", lead.assigned_to.user_details);
                }
                return false;
              }
            }

            // If assigned_to is null/undefined, this lead won't match - skip it
            if (!assignedTo && assignedTo !== 0) {
              return false;
            }

            // Convert both to strings for comparison (handles number/string mismatches and UUIDs)
            const assignedToStr = String(assignedTo).trim();
            const employeeIdStr = String(employeeId).trim();

            // Compare as strings (UUIDs are strings)
            const matches = assignedToStr === employeeIdStr;

            // Debug all leads to see what's happening
            console.log("Lead check:", {
              leadId: lead.id,
              leadTitle: lead.title,
              assigned_to_original: lead.assigned_to,
              assigned_to_is_object: typeof lead.assigned_to === "object",
              user_details_id: lead.assigned_to?.user_details?.id,
              extractedAssignedTo: assignedTo,
              extractedAssignedToStr: assignedToStr,
              employeeIdStr: employeeIdStr,
              matches: matches,
            });

            return matches;
          });

          console.log(`=== FILTERING RESULT ===`);
          console.log(
            `Filtered leads: ${filtered.length} out of ${leadsList.length} total`
          );

          if (filtered.length === 0 && leadsList.length > 0) {
            console.warn("⚠️ NO LEADS MATCHED! Employee ID:", employeeId);
            console.warn(
              "Sample leads from API:",
              leadsList.slice(0, 5).map((l) => ({
                id: l.id,
                title: l.title,
                assigned_to: l.assigned_to,
                assignedTo: l.assignedTo,
                assigned_to_type: typeof l.assigned_to,
              }))
            );
          }

          return filtered;
        };

        // Try cached data first - use it without making API call
        const cachedData = getCachedLeadData();
        if (cachedData?.leads) {
          console.log("=== USING CACHED LEADS ===");
          console.log("Cached leads count:", cachedData.leads.length);

          // Also set statuses from cache if available
          if (cachedData.statuses) {
            setStatuses(cachedData.statuses);
          }

          const filteredLeads = filterLeadsByEmployee(cachedData.leads);
          console.log(
            "Filtered leads count after filtering:",
            filteredLeads.length
          );
          setLeads(filteredLeads);
          return;
        }

        // No cache, wait a bit to see if prefetch completes (avoid race condition)
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Check cache again after short delay
        const cachedDataAfterDelay = getCachedLeadData();
        if (cachedDataAfterDelay?.leads) {
          console.log("Cache available after delay, using it");
          const leadsList = cachedDataAfterDelay.leads;
          if (Array.isArray(leadsList)) {
            // Also set statuses from cache if available
            if (cachedDataAfterDelay.statuses) {
              setStatuses(cachedDataAfterDelay.statuses);
            }

            const filteredLeads = filterLeadsByEmployee(leadsList);
            setLeads(filteredLeads);
          }
          return;
        }

        // Still no cache, fetch fresh from API
        console.log("Fetching leads from API...");
        const data = await apiRequest("/api/leads/");
        console.log("=== API RESPONSE RAW ===", data);

        // Handle different response formats
        let leadsList = [];
        if (data && Array.isArray(data.leads)) {
          leadsList = data.leads;
          console.log("Using data.leads array");
        } else if (data && Array.isArray(data)) {
          leadsList = data;
          console.log("Using direct array");
        } else if (data?.data) {
          if (Array.isArray(data.data)) {
            leadsList = data.data;
            console.log("Using data.data array");
          } else if (data.data?.leads && Array.isArray(data.data.leads)) {
            leadsList = data.data.leads;
            console.log("Using data.data.leads array");
          }
        } else {
          console.warn(
            "Could not parse leads from API response. Full response:",
            data
          );
        }

        // Extract statuses from the API response
        let statusesList = [];

        if (data?.statuses && Array.isArray(data.statuses)) {
          statusesList = data.statuses;
          console.log(
            "Extracted statuses from API response:",
            statusesList.length
          );
          setStatuses(statusesList);
        }

        console.log("=== PARSED LEADS LIST ===");
        console.log("Total leads count:", leadsList.length);

        // Filter leads to show only those assigned to this employee
        const filteredLeads = filterLeadsByEmployee(leadsList);
        console.log("=== AFTER FILTERING ===");
        console.log("Filtered leads count:", filteredLeads.length);
        console.log("Original leads count:", leadsList.length);

        setLeads(filteredLeads);

        // Update cache with fresh leads data and statuses (store all leads, filter on display)
        const currentCache = getCachedLeadData();
        if (currentCache) {
          currentCache.leads = leadsList;
          currentCache.statuses = statusesList;
          currentCache.timestamp = Date.now();
          localStorage.setItem("leadDataCache", JSON.stringify(currentCache));
        } else {
          // Create new cache entry if none exists
          const newCache = {
            statuses: statusesList,
            sources: data?.sources || [],
            employees: data?.users || [],
            leads: leadsList,
            timestamp: Date.now(),
          };
          localStorage.setItem("leadDataCache", JSON.stringify(newCache));
        }
      } catch (err) {
        console.error("Failed to fetch leads:", err);
        alert("Failed to load leads");
        setLeads([]);
      } finally {
        setLeadsLoading(false);
      }
    };

    void fetchLeads();
  }, [location.pathname, currentUserId]);

  // Handler to update lead status
  const handleStatusChange = async (lead, newStatusId) => {
    const leadId = lead.id;
    setStatusUpdatingLeadId(leadId);
    try {

      // Get the current lead data to preserve all fields
      const currentLead = leads.find((l) => l.id === leadId);
      if (!currentLead) {
        console.error("Lead not found:", leadId);
        return;
      }

      // Prepare payload with all lead fields, updating only status
      // Note: Status is independent of follow_up_at and follow_up_status
      const payload = {
        title: currentLead.title || "",
        status: newStatusId || null,
        source: currentLead.source || "",
        description: currentLead.description || "",
        company_name: currentLead.company_name || "",
        contact_first_name: currentLead.contact_first_name || "",
        contact_last_name: currentLead.contact_last_name || "",
        contact_email: currentLead.contact_email || "",
        contact_phone: currentLead.contact_phone || "",
        contact_position_title: currentLead.contact_position_title || "",
        contact_linkedin_url: currentLead.contact_linkedin_url || "",
        // Only include follow_up_at and follow_up_status if they have valid values
        // Status is independent of follow_up_at and follow_up_status, so we only include them if they exist
        ...((currentLead.follow_up_at || currentLead.followUpAt) &&
        (currentLead.follow_up_at || currentLead.followUpAt) !== null &&
        (currentLead.follow_up_at || currentLead.followUpAt) !== ""
          ? {
              follow_up_at: currentLead.follow_up_at || currentLead.followUpAt,
            }
          : {}),
        ...((currentLead.follow_up_status || currentLead.followupStatus) &&
        (currentLead.follow_up_status || currentLead.followupStatus) !== null &&
        (currentLead.follow_up_status || currentLead.followupStatus) !== ""
          ? {
              follow_up_status:
                currentLead.follow_up_status || currentLead.followupStatus,
            }
          : {}),
      };

      // Update via API
      await apiRequest(`/api/leads/${leadId}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      // Update local state
      const updatedLead = {
        ...currentLead,
        status: newStatusId || null,
      };

      setLeads((prevLeads) => {
        const leadIndex = prevLeads.findIndex((l) => l.id === leadId);
        if (leadIndex >= 0) {
          const newLeads = [...prevLeads];
          newLeads[leadIndex] = updatedLead;
          return newLeads;
        }
        return prevLeads;
      });

      // Update cache so Kanban board reflects changes
      addLeadToCache(updatedLead);
    } catch (error) {
      console.error("Failed to update lead status:", error);
      alert("Failed to update lead status");
    } finally {
      setStatusUpdatingLeadId(null);
    }
  };

  // Handler to update follow-up status
  const handleFollowUpStatusChange = async (lead, newFollowUpStatus) => {
    const leadId = lead.id;
    setFollowUpUpdatingLeadId(leadId);
    try {

      // Handle "None" - convert to null for API
      const statusValue =
        newFollowUpStatus === "" ||
        newFollowUpStatus === null ||
        newFollowUpStatus === undefined
          ? null
          : newFollowUpStatus;

      // Always use the dedicated follow-up-status endpoint (even for "None"/null)
      await apiRequest(`/api/leads/${leadId}/follow-up-status/`, {
        method: "PATCH",
        body: JSON.stringify({
          follow_up_status: statusValue,
        }),
      });

      // Update local state - use empty string for display purposes when null
      const displayValue = statusValue === null ? "" : statusValue;
      const updatedLead = {
        ...lead,
        follow_up_status: displayValue,
        followupStatus: displayValue,
      };

      setLeads((prevLeads) => {
        const leadIndex = prevLeads.findIndex((l) => l.id === leadId);
        if (leadIndex >= 0) {
          const newLeads = [...prevLeads];
          newLeads[leadIndex] = updatedLead;
          return newLeads;
        }
        return prevLeads;
      });

      // Update cache so Kanban board reflects changes
      addLeadToCache(updatedLead);
    } catch (error) {
      console.error("Failed to update follow-up status:", error);
      console.error("Error details:", {
        leadId: lead.id,
        newFollowUpStatus: newFollowUpStatus,
        errorMessage: error?.message,
        errorResponse: error?.response,
      });
      alert(
        `Failed to update follow-up status: ${
          error?.message || "Unknown error"
        }`
      );
    } finally {
      setFollowUpUpdatingLeadId(null);
    }
  };

  // Function to get status name from ID
  const getStatusName = (statusId) => {
    // Handle null, undefined, or empty values
    if (statusId === null || statusId === undefined || statusId === "") {
      return "None";
    }

    // If statuses array is not loaded yet, return a placeholder
    if (!statuses || statuses.length === 0) {
      console.warn("Statuses array not loaded yet, statusId:", statusId);
      return "Loading...";
    }

    // If it's already a string and looks like a name (not just a number), return it
    if (typeof statusId === "string" && isNaN(statusId)) {
      return statusId;
    }

    // Convert to number for comparison
    const statusIdNum =
      typeof statusId === "string" ? parseInt(statusId, 10) : statusId;

    // Find status by ID - handle various object structures
    const statusObj = statuses.find((s) => {
      // Handle different status object structures
      if (typeof s === "string") {
        return false;
      }

      if (typeof s === "object" && s !== null) {
        // Try multiple possible ID fields
        const id = s.id || s.pk || s.uuid || s.status_id;
        if (id !== undefined && id !== null) {
          const idNum = typeof id === "string" ? parseInt(id, 10) : id;
          return idNum === statusIdNum || String(idNum) === String(statusIdNum);
        }
      }

      return false;
    });

    if (statusObj) {
      // Extract name from various possible structures
      if (typeof statusObj === "string") {
        return statusObj;
      }

      if (typeof statusObj === "object" && statusObj !== null) {
        // Try multiple possible name fields
        return (
          statusObj.name ||
          statusObj.status ||
          statusObj.status_name ||
          statusObj.label ||
          statusObj.title ||
          String(statusIdNum)
        ); // Fallback to ID if no name found
      }
    }

    // If not found, return the ID as string (fallback)
    return String(statusIdNum);
  };

  const handleActionMenuOpen = (event, lead) => {
    setActionAnchorEl(event.currentTarget);
    setMenuLead(lead);
  };

  const handleActionMenuClose = () => {
    setActionAnchorEl(null);
    setMenuLead(null);
  };

  const handleViewLead = (lead) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedLead(null);
    setIsModalOpen(false);
  };

  const closeNotesDialog = () => {
    setNotesDialogOpen(false);
    setNotesDialogLead(null);
  };

  const openNotesDialog = (lead) => {
    setNotesDialogLead(lead);
    setNotesDialogOpen(true);
  };

  const getLeadIdForNotes = (lead) => {
    if (!lead) return null;
    return lead.id ?? lead.pk ?? lead.uuid ?? lead.lead_id ?? null;
  };

  const navigate = useNavigate();

  const warmUpLeadForm = () => {
    prefetchLeadData({ includeLeads: false });
  };

  const handleOpenCreateLead = () => {
    warmUpLeadForm();
    navigate("/create-lead");
  };

  const handleNavigateToEditLead = (leadId) => {
    if (!leadId) return;
    warmUpLeadForm();
    navigate(`/edit-lead/${leadId}`);
  };

  // Helper function to get lead field value handling both camelCase and snake_case
  const getLeadFieldValue = (lead, fieldKey) => {
    switch (fieldKey) {
      case "title":
        return lead.title || "";
      case "linkedIn":
        return lead.contact_linkedin_url || lead.linkedIn || "";
      case "status":
        return getStatusName(lead.status);
      case "assignedTo":
        // For employees, assigned_to should always be themselves
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          const firstName = userData.first_name || userData.firstName || "";
          const lastName = userData.last_name || userData.lastName || "";
          return `${firstName} ${lastName}`.trim() || "Me";
        }
        return "Me";
      case "followUpAt":
        // follow_up_at now contains combined date and time as ISO datetime string
        const followUpDateTime = lead.follow_up_at || lead.followUpAt;
        if (followUpDateTime) {
          // Parse as datetime and show both date and time
          const dateTime = new Date(followUpDateTime);
          const dateStr = dateTime.toLocaleDateString();
          const timeStr = dateTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true, // 12-hour format with AM/PM
          });
          return `${dateStr} ${timeStr}`;
        }
        return "";
      case "followUpTime":
        const followUpTime = lead.follow_up_time || lead.followUpTime;
        if (followUpTime) {
          if (typeof followUpTime === "string") {
            return followUpTime;
          }
          return new Date(followUpTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
        }
        return "";
      case "followupStatus":
        return lead.follow_up_status || lead.followupStatus || "";
      case "source":
        return lead.source || "";
      case "description":
        return lead.description || "";
      case "company":
        return lead.company_name || lead.company || "";
      case "firstName":
        return lead.contact_first_name || lead.firstName || "";
      case "lastName":
        return lead.contact_last_name || lead.lastName || "";
      case "email":
        return lead.contact_email || lead.email || "";
      case "phone":
        return lead.contact_phone || lead.phone || "";
      case "positionTitle":
        return lead.contact_position_title || lead.positionTitle || "";
      default:
        return "";
    }
  };

  const getEmployeeName = (assignedTo) => {
    // Handle null, undefined, empty string, or "None"
    if (!assignedTo && assignedTo !== 0) {
      return "None";
    }

    // If assigned_to is an object with user_details, extract name directly from it
    if (typeof assignedTo === "object" && assignedTo !== null) {
      // Check if user_details exists with first_name and last_name
      if (assignedTo.user_details) {
        const firstName =
          assignedTo.user_details.first_name ||
          assignedTo.user_details.firstName ||
          "";
        const lastName =
          assignedTo.user_details.last_name ||
          assignedTo.user_details.lastName ||
          "";
        const name = `${firstName} ${lastName}`.trim();
        if (name) {
          return name;
        }
      }
    }

    // Fallback: For employees, assigned_to should always be themselves
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      const firstName = userData.first_name || userData.firstName || "";
      const lastName = userData.last_name || userData.lastName || "";
      return `${firstName} ${lastName}`.trim() || "Me";
    }
    return "Me";
  };

  const handleDeleteLead = async (id) => {
    try {
      await apiRequest(`/api/leads/${id}`, { method: "DELETE" });
      setLeads(leads.filter((l) => String(l.id) !== String(id)));
      removeLeadFromCache(id);
      setDeleteDialog({ open: false, lead: null });
    } catch (err) {
      console.error("Failed to delete lead:", err);
      alert("Failed to delete lead. Please try again.");
    }
  };

  const openDeleteDialog = (lead) => {
    setDeleteDialog({ open: true, lead });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ open: false, lead: null });
  };

  const confirmDeleteLead = () => {
    if (!deleteDialog.lead) return;
    handleDeleteLead(deleteDialog.lead.id);
  };

  // const handleExportLeadsCSV = () => {
  //   if (!leads.length) {
  //     alert("No leads to export");
  //     return;
  //   }

  //   // Export ALL columns regardless of customization
  //   const csvColumns = ALL_COLUMNS.map((col) => ({
  //     key: col.key,
  //     label: col.label,
  //   }));

  //   // Create header row
  //   const headers = csvColumns.map((col) => col.label);
  //   const headerRow = headers.join(",");

  //   // Create data rows using the same helper function as the table
  //   const dataRows = leads.map((lead) => {
  //     return csvColumns
  //       .map((col) => {
  //         const value = getLeadFieldValue(lead, col.key);
  //         // Escape quotes and wrap in quotes for CSV
  //         return `"${String(value || "").replace(/"/g, '""')}"`;
  //       })
  //       .join(",");
  //   });

  //   // Combine header and data rows
  //   const csvContent = [headerRow, ...dataRows].join("\n");

  //   // Create and download CSV file
  //   const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  //   const url = URL.createObjectURL(blob);
  //   const a = document.createElement("a");
  //   a.href = url;
  //   a.download = `leads_${new Date().toISOString().split("T")[0]}.csv`;
  //   a.click();
  //   URL.revokeObjectURL(url);
  // };

  const handleConvertToProject = async (lead) => {
    try {
      console.log("Converting lead to project:", lead);

      // Map lead fields to project fields
      const leadTitle =
        lead.title ||
        (lead.contact_first_name && lead.contact_last_name
          ? `${lead.contact_first_name} ${lead.contact_last_name}`
          : lead.firstName && lead.lastName
          ? `${lead.firstName} ${lead.lastName}`
          : "Untitled Project");

      const leadDescription = lead.description || "";
      const leadAssignedTo = lead.assigned_to || lead.assignedTo || null;
      const leadStatus = lead.status || null;

      // Only send fields your backend expects
      const newProject = {
        title: leadTitle,
        status: leadStatus,
        description: leadDescription,
        assigned_to: leadAssignedTo,
        start_date: new Date().toISOString().split("T")[0],
        end_date: null,
      };

      console.log("Project payload:", newProject);

      const projectResponse = await apiRequest("/api/projects/", {
        method: "POST",
        body: JSON.stringify(newProject),
      });

      console.log("Project created:", projectResponse);

      // Delete the lead after successful creation
      await apiRequest(`/api/leads/${lead.id}/`, { method: "DELETE" });
      setLeads(leads.filter((l) => l.id !== lead.id));
      removeLeadFromCache(lead);

      alert(`Lead "${leadTitle}" converted to project successfully!`);
      navigate(`/management/projects`);
    } catch (err) {
      console.error("Failed to convert lead:", err);
      alert("Failed to convert lead: " + (err.message || "Unknown error"));
    }
  };

  const handleOpenCustomize = (e) => setAnchorEl(e.currentTarget);
  const handleCloseCustomize = () => setAnchorEl(null);

  const toggleColumn = (key) => {
    const updated = visibleColumns.includes(key)
      ? visibleColumns.filter((c) => c !== key)
      : [...visibleColumns, key];
    setVisibleColumns(updated);
    localStorage.setItem("leadColumns", JSON.stringify(updated));
  };

  const handleResetColumns = () => {
    setVisibleColumns(DEFAULT_COLUMNS);
    localStorage.setItem("leadColumns", JSON.stringify(DEFAULT_COLUMNS));
  };

  const handleClearColumns = () => {
    setVisibleColumns([]);
    localStorage.setItem("leadColumns", JSON.stringify([]));
  };

  // Filter logic
  const filteredLeads = leads.filter((l) => {
    const qLower = q.trim().toLowerCase();

    if (statusFilter !== "All") {
      const leadStatusName = getStatusName(l.status);
      if (
        statusFilter === "None" &&
        leadStatusName &&
        leadStatusName !== "None"
      )
        return false;
      if (statusFilter !== "None" && leadStatusName !== statusFilter)
        return false;
    }

    if (!qLower) return true;

    // All searchable fields
    const fieldsToSearch = [
      l.title || "",
      l.firstName || "",
      l.lastName || "",
      l.email || "",
      l.phone || "",
      l.company || "",
      l.positionTitle || "",
      l.source || "",
      l.description || "",
      l.followUpAt ? new Date(l.followUpAt).toLocaleDateString() : "",
      l.followupStatus || "",
      l.assignedTo || "",
      l.linkedIn || "",
    ];

    return fieldsToSearch.some((field) =>
      field.toString().toLowerCase().includes(qLower)
    );
  });

  return (
    <Box>
      <Backdrop
        open={isPageDataLoading}
        sx={{
          zIndex: 1200,
          color: "#fff",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <DotLoader size={40} color="#007bffff" />
        <Typography variant="body2" sx={{ textAlign: "center" }}>
          Loading leads data...
        </Typography>
      </Backdrop>
      <Backdrop
        open={actionLoading}
        sx={{ zIndex: 1300, color: "#fff", flexDirection: "column", gap: 1 }}
      >
        <DotLoader size={40} color="#007bffff" />
        {actionMessage && (
          <Typography variant="body2" sx={{ textAlign: "center" }}>
            {actionMessage}
          </Typography>
        )}
      </Backdrop>
      <Topbar>
        <Typography variant="h5" fontWeight="bold">
          All Leads
        </Typography>
        {/* Desktop Buttons */}
        <Box sx={{ display: { xs: "none", md: "flex" } }} gap={2}>
          {/* <Button
            variant="outlined"
            startIcon={<CloudDownloadIcon />}
            onClick={handleExportLeadsCSV}
          >
            Export Leads CSV
          </Button> */}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateLead}
          >
            Add New Lead
          </Button>
          <Button variant="outlined" onClick={handleOpenCustomize}>
            Customize Columns
          </Button>
        </Box>

        {/* Mobile 3-dot menu */}
        <Box sx={{ display: { xs: "flex", md: "none" } }}>
          <IconButton onClick={(e) => setMobileMenuAnchorEl(e.currentTarget)}>
            <MoreVertIcon />
          </IconButton>

          <Menu
            anchorEl={mobileMenuAnchorEl}
            open={Boolean(mobileMenuAnchorEl)}
            onClose={() => setMobileMenuAnchorEl(null)}
            PaperProps={{ sx: { minWidth: 200, p: 1 } }}
          >
            {/* <MenuItem>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<CloudDownloadIcon />}
                onClick={() => {
                  handleExportLeadsCSV();
                  setMobileMenuAnchorEl(null);
                }}
              >
                Export Leads CSV
              </Button>
            </MenuItem> */}

            <MenuItem>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  handleOpenCreateLead();
                  setMobileMenuAnchorEl(null);
                }}
              >
                Add New Lead
              </Button>
            </MenuItem>

            <MenuItem>
              <Button
                fullWidth
                variant="outlined"
                onClick={(e) => {
                  handleOpenCustomize(e);
                  setMobileMenuAnchorEl(null);
                }}
              >
                Customize Columns
              </Button>
            </MenuItem>
          </Menu>
        </Box>
      </Topbar>

      {/* Customize Columns Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseCustomize}
        PaperProps={{ sx: { minWidth: 240 } }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          px={2}
          py={1}
          gap={1}
        >
          <Button size="small" variant="outlined" onClick={handleResetColumns}>
            Reset
          </Button>

          <Button
            size="small"
            color="error"
            variant="outlined"
            onClick={handleClearColumns}
          >
            Clear
          </Button>
        </Box>

        <Box sx={{ borderTop: "1px solid #eee", my: 1 }} />

        {ALL_COLUMNS.map((col) => (
          <MenuItem key={col.key} dense>
            <FormControlLabel
              control={
                <Checkbox
                  checked={visibleColumns.includes(col.key)}
                  onChange={() => toggleColumn(col.key)}
                />
              }
              label={col.label}
            />
          </MenuItem>
        ))}
      </Menu>

      {/* Search & Filter */}
      <Box display="flex" gap={2} mt={2} mb={2}>
        <TextField
          placeholder="Search by title, name, email, company, source, description, or date..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          size="small"
        />
        <FormControl size="small">
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="None">None</MenuItem>
            {statuses.map((status, index) => {
              // Handle different status structures
              const statusName =
                typeof status === "string"
                  ? status
                  : status.name ||
                    status.label ||
                    status.status_name ||
                    String(status.id || status.pk || index);

              return (
                <MenuItem
                  key={status.id || status.pk || statusName || index}
                  value={statusName}
                >
                  {statusName}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      </Box>

      {/* Leads Table */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: "12px",
          boxShadow: "none",
          overflowX: "scroll",
          maxWidth: "100%",
        }}
      >
        <Table
          aria-label="basic table"
          sx={{
            tableLayout: "auto",
          }}
        >
          <TableHead>
            <TableRow>
              {visibleColumns.includes("title") && (
                <TableCell sx={tableHeaderCellStyles}>Lead Title</TableCell>
              )}

              {visibleColumns.includes("linkedIn") && (
                <TableCell sx={tableHeaderCellStyles}>LinkedIn</TableCell>
              )}
              {visibleColumns.includes("status") && (
                <TableCell sx={tableHeaderCellStyles}>Status</TableCell>
              )}
              {visibleColumns.includes("assignedTo") && (
                <TableCell sx={tableHeaderCellStyles}>Assigned To</TableCell>
              )}
              {visibleColumns.includes("followUpAt") && (
                <TableCell sx={tableHeaderCellStyles}>Follow-up At</TableCell>
              )}
              {visibleColumns.includes("followupStatus") && (
                <TableCell sx={tableHeaderCellStyles}>
                  Follow-up Status
                </TableCell>
              )}
              {visibleColumns.includes("source") && (
                <TableCell sx={tableHeaderCellStyles}>Source</TableCell>
              )}
              {visibleColumns.includes("description") && (
                <TableCell sx={tableHeaderCellStyles}>Description</TableCell>
              )}
              {visibleColumns.includes("company") && (
                <TableCell sx={tableHeaderCellStyles}>Company</TableCell>
              )}
              {visibleColumns.includes("firstName") && (
                <TableCell sx={tableHeaderCellStyles}>First Name</TableCell>
              )}
              {visibleColumns.includes("lastName") && (
                <TableCell sx={tableHeaderCellStyles}>Last Name</TableCell>
              )}
              {visibleColumns.includes("email") && (
                <TableCell sx={tableHeaderCellStyles}>Email</TableCell>
              )}
              {visibleColumns.includes("phone") && (
                <TableCell sx={tableHeaderCellStyles}>Phone</TableCell>
              )}
              {visibleColumns.includes("positionTitle") && (
                <TableCell sx={tableHeaderCellStyles}>Position Title</TableCell>
              )}

              <TableCell sx={{ ...tableHeaderCellStyles, textAlign: "center" }}>
                Notes
              </TableCell>
              <TableCell sx={{ ...tableHeaderCellStyles, textAlign: "center" }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 2} align="center">
                  No leads found.
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead, leadIndex) => {
                const currentLeadId = resolveLeadId(lead);
                const normalizedLeadId = currentLeadId
                  ? String(currentLeadId)
                  : null;
                const rowKey =
                  currentLeadId ||
                  lead.id ||
                  lead.pk ||
                  lead.uuid ||
                  lead.lead_id ||
                  `lead-${leadIndex}`;
                const isHighlighted =
                  Boolean(normalizedLeadId && highlightedLeadId) &&
                  normalizedLeadId === highlightedLeadId;
                const attachRowRef = normalizedLeadId
                  ? (node) => {
                      if (node) {
                        rowRefs.current[normalizedLeadId] = node;
                      } else {
                        delete rowRefs.current[normalizedLeadId];
                      }
                    }
                  : undefined;
                return (
                  <TableRow
                    key={rowKey}
                    ref={attachRowRef}
                    sx={{
                      ...(isHighlighted && {
                        backgroundColor: colors.bg[200],
                        transition: "background-color 0.4s ease",
                      }),
                    }}
                  >
                    {visibleColumns.includes("title") && (
                      <TableCell>
                        {getLeadFieldValue(lead, "title") || "-"}
                      </TableCell>
                    )}

                    {visibleColumns.includes("linkedIn") && (
                      <TableCell>
                        {(() => {
                          const linkedInUrl =
                            lead.contact_linkedin_url || lead.linkedIn;
                          return linkedInUrl ? (
                            <a
                              href={linkedInUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                textDecoration: "none",
                                color: "#0A66C2",
                              }}
                            >
                              <FaLinkedin size={24} />
                            </a>
                          ) : (
                            "-"
                          );
                        })()}
                      </TableCell>
                    )}

                    {visibleColumns.includes("status") && (
                      <TableCell>
                        <Box sx={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                          <Select
                            value={(() => {
                              // Get the status ID from the lead
                              // Status cannot be None, so if empty, use first available status
                              const statusId = lead.status;
                              if (
                                statusId === null ||
                                statusId === undefined ||
                                statusId === ""
                              ) {
                                // If no status, default to first available status
                                if (statuses.length > 0) {
                                  const firstStatus = statuses[0];
                                  return typeof firstStatus === "object" &&
                                    firstStatus !== null
                                    ? firstStatus.id || firstStatus.pk
                                    : firstStatus;
                                }
                                return "";
                              }
                              // If status is an object, extract the ID
                              if (
                                typeof statusId === "object" &&
                                statusId !== null
                              ) {
                                return statusId.id || statusId.pk || "";
                              }
                              return String(statusId);
                            })()}
                            onChange={(e) => {
                              // Convert to integer - status cannot be null/empty
                              const selectedId = parseInt(e.target.value, 10);
                              if (!isNaN(selectedId)) {
                                handleStatusChange(lead, selectedId);
                              }
                            }}
                            size="small"
                            disabled={statusUpdatingLeadId === lead.id}
                            sx={{
                              minWidth: 120,
                              height: 32,
                              "& .MuiSelect-select": {
                                padding: "4px 8px",
                                fontSize: "0.875rem",
                              },
                            }}
                            MenuProps={{
                              PaperProps: {
                                style: {
                                  maxHeight: 300,
                                },
                              },
                            }}
                          >
                            {statuses.map((status, index) => {
                              // Handle different status structures - match CreateLead form logic
                              const statusId =
                                typeof status === "object" && status !== null
                                  ? status.id || status.pk
                                  : status;
                              const statusName =
                                typeof status === "string"
                                  ? status
                                  : status.name ||
                                    status.label ||
                                    status.status_name ||
                                    String(statusId);
                              const key = statusId || index;

                              return (
                                <MenuItem key={key} value={statusId}>
                                  {statusName}
                                </MenuItem>
                              );
                            })}
                          </Select>
                          {statusUpdatingLeadId === lead.id && (
                            <CircularProgress
                              size={16}
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      </TableCell>
                    )}

                    {visibleColumns.includes("assignedTo") && (
                      <TableCell>
                        {getLeadFieldValue(lead, "assignedTo") || "None"}
                      </TableCell>
                    )}

                    {visibleColumns.includes("followUpAt") && (
                      <TableCell>
                        {getLeadFieldValue(lead, "followUpAt") || "-"}
                      </TableCell>
                    )}

                    {visibleColumns.includes("followupStatus") && (
                      <TableCell>
                        <Box sx={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                          <Select
                            value={(() => {
                              // Explicitly handle null/undefined/empty values for "None"
                              const status =
                                lead.follow_up_status || lead.followupStatus;
                              return status === null ||
                                status === undefined ||
                                status === ""
                                ? ""
                                : status;
                            })()}
                            onChange={(e) => {
                              // Explicitly handle "None" selection (empty string)
                              // This ensures "None" is easily mutable
                              const selectedValue =
                                e.target.value === "" ? "" : e.target.value;
                              handleFollowUpStatusChange(lead, selectedValue);
                            }}
                            size="small"
                            disabled={followUpUpdatingLeadId === lead.id}
                            sx={{
                              minWidth: 120,
                              height: 32,
                              "& .MuiSelect-select": {
                                padding: "4px 8px",
                                fontSize: "0.875rem",
                              },
                            }}
                            MenuProps={{
                              PaperProps: {
                                style: {
                                  maxHeight: 300,
                                },
                              },
                            }}
                            SelectProps={{
                              displayEmpty: true,
                              renderValue: (val) => {
                                // Show "None" for empty/null/undefined values
                                if (
                                  val === "" ||
                                  val === null ||
                                  val === undefined
                                ) {
                                  return "None";
                                }
                                return val;
                              },
                            }}
                          >
                            <MenuItem value="">
                              <em>None</em>
                            </MenuItem>
                            <MenuItem value="done">done</MenuItem>
                            <MenuItem value="pending">pending</MenuItem>
                          </Select>
                          {followUpUpdatingLeadId === lead.id && (
                            <CircularProgress
                              size={16}
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      </TableCell>
                    )}

                    {visibleColumns.includes("source") && (
                      <TableCell>
                        {getLeadFieldValue(lead, "source") || "-"}
                      </TableCell>
                    )}

                    {visibleColumns.includes("description") && (
                      <TableCell>
                        {(() => {
                          const desc = getLeadFieldValue(lead, "description");
                          return desc && desc.length > 50
                            ? desc.slice(0, 50) + "..."
                            : desc || "-";
                        })()}
                      </TableCell>
                    )}

                    {visibleColumns.includes("company") && (
                      <TableCell>
                        {getLeadFieldValue(lead, "company") || "-"}
                      </TableCell>
                    )}

                    {visibleColumns.includes("firstName") && (
                      <TableCell>
                        {getLeadFieldValue(lead, "firstName") || "-"}
                      </TableCell>
                    )}

                    {visibleColumns.includes("lastName") && (
                      <TableCell>
                        {getLeadFieldValue(lead, "lastName") || "-"}
                      </TableCell>
                    )}

                    {visibleColumns.includes("email") && (
                      <TableCell>
                        {getLeadFieldValue(lead, "email") || "-"}
                      </TableCell>
                    )}

                    {visibleColumns.includes("phone") && (
                      <TableCell>
                        {getLeadFieldValue(lead, "phone") || "-"}
                      </TableCell>
                    )}

                    {visibleColumns.includes("positionTitle") && (
                      <TableCell>
                        {getLeadFieldValue(lead, "positionTitle") || "-"}
                      </TableCell>
                    )}

                    <TableCell align="center">
                      <IconButton
                        size="small"
                        aria-label="Open lead notes"
                        onClick={() => openNotesDialog(lead)}
                        sx={{
                          color: "#1d57ccff",
                          transition: "transform 0.2s ease",
                          "&:hover": { transform: "scale(1.1)" },
                        }}
                      >
                        <FaComment size={18} />
                      </IconButton>
                    </TableCell>

                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={(e) => handleActionMenuOpen(e, lead)}
                      >
                        <MoreHorizIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Menu
        anchorEl={actionAnchorEl}
        open={actionOpen}
        onClose={handleActionMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem
          onClick={() => {
            handleViewLead(menuLead);
            handleActionMenuClose();
          }}
        >
          <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
          View
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleNavigateToEditLead(menuLead?.id);
            handleActionMenuClose();
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>

        {/* <MenuItem
          onClick={() => {
            handleConvertToProject(menuLead);
            handleActionMenuClose();
          }}
        >
          <AssignmentTurnedInIcon fontSize="small" sx={{ mr: 1 }} />
          Convert to Project
        </MenuItem> */}

        <MenuItem
          onClick={() => {
            openDeleteDialog(menuLead);
            handleActionMenuClose();
          }}
          sx={{ color: "error.main" }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
      <Dialog open={deleteDialog.open} onClose={closeDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteDialog.lead
              ? `Are you sure you want to delete "${
                  deleteDialog.lead.title || "this lead"
                }"?`
              : "Are you sure you want to delete this lead?"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Cancel</Button>
          <Button
            onClick={confirmDeleteLead}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={notesDialogOpen}
        onClose={closeNotesDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{notesDialogLead?.title || "Lead Notes"}</DialogTitle>
        <DialogContent dividers>
          <LeadNotesChat
            leadId={getLeadIdForNotes(notesDialogLead) || undefined}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeNotesDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      <LeadDetailsModal
        open={isModalOpen}
        onClose={handleCloseModal}
        lead={selectedLead}
        getEmployeeName={getEmployeeName}
        getStatusName={getStatusName}
      />
    </Box>
  );
}
