import {
  Box,
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
  Switch,
  useTheme,
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
import { useNotification } from "../contexts/NotificationContext.jsx";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditLeadModal from "../components/Leads/EditLeadModal";
import FollowUpCell from "../components/Leads/FollowUpCell";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
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
  { key: "status", label: "Lead Status" },
  { key: "assignedTo", label: "Assigned To" },
  { key: "followUpAt", label: "Follow-up At" },
  { key: "followupStatus", label: "Follow-up Status" },
  { key: "source", label: "Source" },
  { key: "lifecycle", label: "Lead Lifecycle" },
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
  "source",
  "lifecycle",
  "assignedTo",
  "followUpAt",
  "followupStatus",
];

// const tableBodyCellStyles = {
//   maxWidth: 150, // adjust based on preference
//   overflow: "hidden",
//   textOverflow: "ellipsis",
//   whiteSpace: "nowrap",
// };

// const parseEmployeesPayload = (payload) => {
//   if (!payload) return [];
//   if (Array.isArray(payload)) return payload;
//   if (Array.isArray(payload.employees)) return payload.employees;
//   if (Array.isArray(payload.data)) return payload.data;
//   return [];
// };

const resolveLeadId = (lead) => {
  if (!lead) return null;
  return lead.id ?? lead.pk ?? lead.uuid ?? lead.lead_id ?? lead.leadId ?? null;
};

export default function AllLeads() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const tableHeaderCellStyles = {
    fontWeight: "bold",
    whiteSpace: "normal",
    position: "sticky",
    top: 0,
    zIndex: 2,
    backgroundColor: isDarkMode ? "#000000" : colors.primary[400],
    color: isDarkMode ? "#ffffff" : undefined,
  };

  const location = useLocation();
  const [leads, setLeads] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [assignedFilter, setAssignedFilter] = useState("All");
  const [followUpFilter, setFollowUpFilter] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const stored = JSON.parse(localStorage.getItem("leadColumns")) || DEFAULT_COLUMNS;
    return stored;
  });
  const tableMinWidth = Math.max(visibleColumns.length * 200, 1000);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesDialogLead, setNotesDialogLead] = useState(null);
  const [statuses, setStatuses] = useState([]); // Store statuses for mapping
  const [employees, setEmployees] = useState([]); // Store employees for mapping
  const [lifecycles, setLifecycles] = useState([]); // Store lifecycles for mapping
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  // Only show loading spinner if there is no cache
  const [isPageLoading, setIsPageLoading] = useState(false);
  // Track API call to prevent duplicates
  const apiCallMadeRef = useRef({ pathname: null, called: false, inProgress: false });
  // Lead actions menu
  const [actionAnchorEl, setActionAnchorEl] = useState(null);
  const [menuLead, setMenuLead] = useState(null);
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, lead: null });
  const [editDialog, setEditDialog] = useState({ open: false, leadId: null, lead: null });
  // Track individual dropdown loading states
  const [statusUpdatingLeadId, setStatusUpdatingLeadId] = useState(null);
  const [followUpUpdatingLeadId, setFollowUpUpdatingLeadId] = useState(null);
  const [lifecycleUpdatingLeadId, setLifecycleUpdatingLeadId] = useState(null);
  const [activeTogglingLeadId, setActiveTogglingLeadId] = useState(null);
  const [assignedUpdatingLeadId, setAssignedUpdatingLeadId] = useState(null);
  const [followUpAtUpdatingLeadId, setFollowUpAtUpdatingLeadId] = useState(null);

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
  // src/pages/AllLeads.jsx

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

  // Fetch leads on mount and location change
  useEffect(() => {
    const fetchLeads = async () => {
      setIsPageLoading(true);
      // Get current user to filter leads
      let currentUserId = null;
      let isCurrentUserAdmin = false;
      const storedUser = localStorage.getItem("user");
      const user = storedUser ? JSON.parse(storedUser) : null;

      const isAdmin =
        user?.is_staff ||
        user?.is_admin ||
        user?.is_superuser ||
        user?.role === 0 ||
        user?.role === "0";

      if (storedUser) {
        const userData = JSON.parse(storedUser);
        currentUserId = userData.id || userData.pk || userData.uuid;
        isCurrentUserAdmin =
          userData.is_staff ||
          userData.is_admin ||
          userData.is_superuser ||
          userData.role === 0 ||
          userData.role === "0";
      }

      // Helper function to filter leads based on user role
      const filterLeadsByUser = (leadsList) => {
        console.log("Filtering leads - Total leads:", leadsList.length);
        console.log("Current user ID:", currentUserId);
        console.log("Is Admin:", isCurrentUserAdmin);

        if (isCurrentUserAdmin) {
          // Admin sees all leads
          console.log("Admin user - showing all leads");
          return leadsList;
        } else {
          // Employee sees only their own leads (where assigned_to matches their ID)
          console.log("=== EMPLOYEE FILTERING DEBUG ===");
          console.log("Employee ID:", currentUserId);
          console.log("Employee ID type:", typeof currentUserId);
          console.log("Total leads to filter:", leadsList.length);

          if (!currentUserId) {
            console.error("⚠️ Employee ID is missing! Cannot filter leads.");
            return [];
          }

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
            }

            // If assigned_to is null/undefined, this lead won't match - skip it
            if (!assignedTo && assignedTo !== 0) {
              return false;
            }

            // Convert both to strings for comparison (handles number/string mismatches)
            const assignedToStr = String(assignedTo).trim();
            const currentUserIdStr = String(currentUserId).trim();

            // Also try comparing as numbers if both are numeric
            let matches = assignedToStr === currentUserIdStr;

            // If string comparison fails, try numeric comparison
            if (!matches) {
              const assignedToNum = Number(assignedTo);
              const currentUserIdNum = Number(currentUserId);
              if (!isNaN(assignedToNum) && !isNaN(currentUserIdNum)) {
                matches = assignedToNum === currentUserIdNum;
              }
            }

            // Debug all leads to see what's happening
            console.log("Lead check:", {
              leadId: lead.id,
              leadTitle: lead.title,
              assigned_to: lead.assigned_to,
              assignedTo: lead.assignedTo,
              extractedAssignedTo: assignedTo,
              assignedToStr: assignedToStr,
              currentUserIdStr: currentUserIdStr,
              matches: matches,
              assignedToType: typeof assignedTo,
              currentUserIdType: typeof currentUserId,
            });

            return matches;
          });

          console.log(`=== FILTERING RESULT ===`);
          console.log(
            `Filtered leads: ${filtered.length} out of ${leadsList.length} total`
          );

          if (filtered.length === 0 && leadsList.length > 0) {
            console.warn("⚠️ NO LEADS MATCHED! Employee ID:", currentUserId);
            console.warn(
              "Sample leads from API:",
              leadsList.slice(0, 5).map((l) => ({
                id: l.id,
                title: l.title,
                assigned_to: l.assigned_to,
                assignedTo: l.assignedTo,
                assigned_to_type: typeof l.assigned_to,
                allKeys: Object.keys(l).filter((k) =>
                  k.toLowerCase().includes("assign")
                ),
              }))
            );
          }

          return filtered;
        }
      };

      // Always fetch fresh data from /api/leads API
      setIsPageLoading(true);
      try {
        console.log("Fetching fresh leads from /api/leads/ API...");
        const data = await apiRequest("/api/leads/");
        console.log("=== API RESPONSE RAW ===", data);
        
        // Handle different response formats
        let leadsList = [];
        if (data && Array.isArray(data.leads)) {
          leadsList = data.leads;
        } else if (data && Array.isArray(data)) {
          leadsList = data;
        } else if (data?.data) {
          if (Array.isArray(data.data)) {
            leadsList = data.data;
          } else if (data.data?.leads && Array.isArray(data.data.leads)) {
            leadsList = data.data.leads;
          }
        }
        
        console.log(`=== FETCHED LEADS ===`);
        console.log(`Total leads fetched: ${leadsList.length}`);
        console.log(`API Response count field: ${data?.count || 'not provided'}`);
        console.log(`API Response limit field: ${data?.limit || 'not provided'}`);
        console.log(`API Response offset field: ${data?.offset || 'not provided'}`);
        console.log("Lead IDs from API:", leadsList.map(l => l.id));
        
        // Check if API is paginating and we need to fetch more
        const totalCount = data?.count || null;
        const apiLimit = data?.limit || null;
        const apiOffset = data?.offset || 0;
        
        // If count is provided and it's more than what we got, fetch remaining pages
        if (totalCount !== null && leadsList.length < totalCount) {
          console.log(`⚠️ API is paginating: Got ${leadsList.length} of ${totalCount} leads. Fetching remaining...`);
          let allLeads = [...leadsList];
          let currentOffset = leadsList.length;
          const fetchLimit = 1000; // Use large limit for remaining pages
          
          while (allLeads.length < totalCount) {
            try {
              const nextPageUrl = `/api/leads/?limit=${fetchLimit}&offset=${currentOffset}`;
              console.log(`Fetching next page: offset=${currentOffset}`);
              const nextPageData = await apiRequest(nextPageUrl);
              
              let nextPageLeads = [];
              if (nextPageData && Array.isArray(nextPageData.leads)) {
                nextPageLeads = nextPageData.leads;
              } else if (nextPageData?.data?.leads && Array.isArray(nextPageData.data.leads)) {
                nextPageLeads = nextPageData.data.leads;
              } else if (nextPageData?.leads && Array.isArray(nextPageData.leads)) {
                nextPageLeads = nextPageData.leads;
              }
              
              if (nextPageLeads.length === 0) {
                console.log("No more leads in next page, stopping");
                break;
              }
              
              allLeads = [...allLeads, ...nextPageLeads];
              currentOffset += nextPageLeads.length;
              
              console.log(`Fetched ${nextPageLeads.length} more leads. Total now: ${allLeads.length}`);
              
              // Safety check
              if (allLeads.length >= totalCount) break;
            } catch (e) {
              console.error("Error fetching next page:", e);
              break;
            }
          }
          
          leadsList = allLeads;
          console.log(`=== FINAL LEADS COUNT ===`);
          console.log(`Total leads after pagination: ${leadsList.length}`);
          console.log("All lead IDs:", leadsList.map(l => l.id));
        }

        // Extract statuses, users (employees), and lifecycles from the API response
        let statusesList = [];
        let usersList = [];
        let lifecyclesList = [];

        if (data?.statuses && Array.isArray(data.statuses)) {
          statusesList = data.statuses;
          setStatuses(statusesList);
        }

        if (data?.users && Array.isArray(data.users)) {
          usersList = data.users;
          setEmployees(usersList);
        }

        if (data?.lifecycles && Array.isArray(data.lifecycles)) {
          lifecyclesList = data.lifecycles;
          setLifecycles(lifecyclesList);
        } else if (data?.data?.lifecycles && Array.isArray(data.data.lifecycles)) {
          lifecyclesList = data.data.lifecycles;
          setLifecycles(lifecyclesList);
        }

        // Normalize lifecycle field (in case API returns object vs string)
        const normalizeLifecycleField = (item) => {
          try {
            const v = item.lifecycle ?? item.lifecycle_obj ?? item.lifecycleObj ?? item.lifecycle_id ?? item.lifecycleId;
            if (!v && v !== 0) {
              return { ...item, lifecycle: item.lifecycle ?? "" };
            }
            if (typeof v === "string") return { ...item, lifecycle: v };
            if (typeof v === "object" && v !== null) {
              const name = v.name || v.label || v.title || v.lifecycle || String(v.id || v.pk || v.uuid || "");
              return { ...item, lifecycle: name };
            }
            return { ...item, lifecycle: String(v) };
          } catch (e) {
            return { ...item, lifecycle: item.lifecycle ?? "" };
          }
        };

        const normalizedLeadsList = leadsList.map(normalizeLifecycleField);

        // Filter leads based on user role
        const filteredLeads = filterLeadsByUser(normalizedLeadsList);

        setLeads(filteredLeads);
        setIsPageLoading(false);
        apiCallMadeRef.current.inProgress = false;

      } catch (err) {
        console.error("Failed to fetch leads:", err);
        notifyError("Failed to load leads");
        setLeads([]);
        setIsPageLoading(false);
        apiCallMadeRef.current.inProgress = false;
        // Reset called flag on error to allow retry
        apiCallMadeRef.current.called = false;
      }
    };

    fetchLeads();
  }, [location.pathname]); // Refresh when navigating to this page

  // Listen for leads added to the cache (e.g., local conversions) and update UI
  useEffect(() => {
    const handleCacheUpdate = (event) => {
      try {
        const detail = event?.detail || {};
        const newLead = detail.lead;
        if (!newLead) return;

        const resolved = resolveLeadId(newLead) || newLead.id || `local-${Date.now()}`;
        const normalized = { ...newLead, id: resolved };

        setLeads((prev) => {
          const exists = prev.some((l) => String(resolveLeadId(l)) === String(resolved));
          if (exists) {
            return prev.map((l) => (String(resolveLeadId(l)) === String(resolved) ? { ...l, ...normalized } : l));
          }
          return [normalized, ...prev];
        });
      } catch (e) {
        console.error("Error handling leadCacheUpdated event:", e);
      }
    };

    window.addEventListener("leadCacheUpdated", handleCacheUpdate);
    return () => window.removeEventListener("leadCacheUpdated", handleCacheUpdate);
  }, []);

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
      notifySuccess("Lead status updated successfully", { autoClose: 5000 });
    } catch (error) {
      console.error("Failed to update lead status:", error);
      notifyError("Failed to update lead status", { autoClose: 5000 });
    } finally {
      setStatusUpdatingLeadId(null);
    }
  };

  // Handler to update lifecycle
  const handleLifecycleChange = async (lead, newLifecycleId) => {
    const leadId = lead.id;
    setLifecycleUpdatingLeadId(leadId);
    try {
      // Get the current lead data to preserve all fields
      const currentLead = leads.find((l) => l.id === leadId);
      if (!currentLead) {
        console.error("Lead not found:", leadId);
        return;
      }

      // Convert lifecycle ID to integer (API expects pk value, not name or dict)
      let lifecycleIdValue = null;
      if (newLifecycleId && newLifecycleId !== "" && newLifecycleId !== "None") {
        // Convert to integer if it's a number string
        const parsedId = typeof newLifecycleId === "string" && !isNaN(parseInt(newLifecycleId, 10))
          ? parseInt(newLifecycleId, 10)
          : newLifecycleId;
        lifecycleIdValue = parsedId;
      }

      // Prepare payload with all lead fields, updating only lifecycle
      const payload = {
        title: currentLead.title || "",
        status: (() => {
          // Ensure status is sent as ID, not object
          const st = currentLead.status;
          if (typeof st === "object" && st !== null) {
            return st.id || st.pk || st.uuid || null;
          }
          return st || null;
        })(),
        source: currentLead.source || "",
        description: currentLead.description || "",
        company_name: currentLead.company_name || "",
        contact_first_name: currentLead.contact_first_name || "",
        contact_last_name: currentLead.contact_last_name || "",
        contact_email: currentLead.contact_email || "",
        contact_phone: currentLead.contact_phone || "",
        contact_position_title: currentLead.contact_position_title || "",
        contact_linkedin_url: currentLead.contact_linkedin_url || "",
        lifecycle: lifecycleIdValue || null,
      };

      // Update via API
      await apiRequest(`/api/leads/${leadId}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      // Fetch updated lead from API to get the latest data
      const updatedLeadResponse = await apiRequest(`/api/leads/${leadId}/`);
      const apiUpdatedLead = updatedLeadResponse?.data || updatedLeadResponse;

      if (apiUpdatedLead) {
        // Merge API response with current lead to preserve all fields
        // This ensures we don't lose any data that might not be in the API response
        const mergedLead = {
          ...currentLead,
          ...apiUpdatedLead,
          // Ensure lifecycle is set correctly
          lifecycle: lifecycleIdValue || null,
          lifecycle_id: lifecycleIdValue || null,
          lifecycleId: lifecycleIdValue || null,
        };

        // Normalize lifecycle field to ensure consistent format
        const normalizeLifecycleField = (item) => {
          try {
            const v = item.lifecycle ?? item.lifecycle_obj ?? item.lifecycleObj ?? item.lifecycle_id ?? item.lifecycleId;
            if (!v && v !== 0) {
              return { ...item, lifecycle: item.lifecycle ?? "" };
            }
            if (typeof v === "string") return { ...item, lifecycle: v };
            if (typeof v === "object" && v !== null) {
              const name = v.name || v.label || v.title || v.lifecycle || String(v.id || v.pk || v.uuid || "");
              return { ...item, lifecycle: name };
            }
            return { ...item, lifecycle: String(v) };
          } catch (e) {
            return { ...item, lifecycle: item.lifecycle ?? "" };
          }
        };

        const normalizedLead = normalizeLifecycleField(mergedLead);

        // Update local state with merged data
        setLeads((prevLeads) => {
          const leadIndex = prevLeads.findIndex((l) => l.id === leadId);
          if (leadIndex >= 0) {
            const newLeads = [...prevLeads];
            newLeads[leadIndex] = normalizedLead;
            return newLeads;
          }
          return prevLeads;
        });

        // Update cache so other components reflect changes
        addLeadToCache(normalizedLead);
      } else {
        // If API response is empty, just update the lifecycle field locally
        const updatedLead = {
          ...currentLead,
          lifecycle: lifecycleIdValue || null,
          lifecycle_id: lifecycleIdValue || null,
          lifecycleId: lifecycleIdValue || null,
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
        addLeadToCache(updatedLead);
      }

      notifySuccess("Lead lifecycle updated successfully", { autoClose: 5000 });
    } catch (error) {
      console.error("Failed to update lead lifecycle:", error);
      notifyError("Failed to update lead lifecycle", { autoClose: 5000 });
    } finally {
      setLifecycleUpdatingLeadId(null);
    }
  };

  // Handler to update follow-up status
  const handleFollowUpStatusChange = async (lead, newFollowUpStatus) => {
    const leadId = lead.id;
    setFollowUpUpdatingLeadId(leadId);
    try {

      // Handle "None" - convert to empty string for API
      const statusValue =
        newFollowUpStatus === "" ||
          newFollowUpStatus === null ||
          newFollowUpStatus === undefined
          ? ""
          : newFollowUpStatus;

      // Validate: If Follow_up_status is provided, Follow_up_at must be present
      const hasStatus = statusValue !== "" && statusValue !== null && statusValue !== undefined;
      const hasFollowUpAt = lead.follow_up_at || lead.followUpAt;
      
      if (hasStatus && !hasFollowUpAt) {
        notifyError("Follow_up_at is required when Follow_up_status is provided.");
        setFollowUpUpdatingLeadId(null);
        return;
      }

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

      notifySuccess("Follow-up status updated successfully", { autoClose: 5000 });
    } catch (error) {
      console.error("Failed to update follow-up status:", error);
      console.error("Error details:", {
        leadId: lead.id,
        newFollowUpStatus: newFollowUpStatus,
        errorMessage: error?.message,
        errorResponse: error?.response,
      });
      notifyError(
        `Failed to update follow-up status: ${error?.message || "Unknown error"
        }`,
        { autoClose: 5000 },
      );
    } finally {
      setFollowUpUpdatingLeadId(null);
    }
  };

  // Handler to update assigned_to
  const handleAssignedChange = async (lead, newAssignedId) => {
    const leadId = lead.id;
    setAssignedUpdatingLeadId(leadId);
    try {
      // Minimal payload per requirement: only call assign endpoint
      const payload = {
        assigned_to:
          newAssignedId === "" || newAssignedId === null || newAssignedId === undefined
            ? null
            : newAssignedId,
      };

      const response = await apiRequest(`/api/leads/${leadId}/assign/`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Use the API response if available (it should contain the full lead object with proper assigned_to structure)
      // Otherwise, construct from current lead
      let updatedLead = null;
      if (response && typeof response === 'object') {
        // Handle different response formats
        if (response.lead) {
          updatedLead = response.lead;
        } else if (response.data) {
          updatedLead = response.data.lead || response.data;
        } else {
          updatedLead = { ...lead, ...response };
        }
      } else {
        // Fallback: construct from current lead (assigned_to will be just an ID)
        updatedLead = {
          ...lead,
          assigned_to: payload.assigned_to,
          assignedTo: payload.assigned_to,
        };
      }

      // Ensure we have all fields from currentLead merged in
      updatedLead = { ...lead, ...updatedLead };

      setLeads((prevLeads) =>
        prevLeads.map((l) => (l.id === leadId ? { ...l, ...updatedLead } : l))
      );

      notifySuccess("Lead assignment updated", { autoClose: 5000 });
    } catch (error) {
      console.error("Failed to update assignment:", error);
      notifyError("Failed to update assignment", { autoClose: 5000 });
    } finally {
      setAssignedUpdatingLeadId(null);
    }
  };

  // Handler to update follow_up_at
  const handleFollowUpAtChange = async (lead, newDateTime) => {
    const leadId = lead.id;
    setFollowUpAtUpdatingLeadId(leadId);
    try {
      // Get the current lead data to preserve all fields
      let currentLead = leads.find((l) => l.id === leadId) || lead;

      // Ensure we have reminder settings
      if (currentLead.send_reminder_email === undefined) {
        try {
          const freshLead = await apiRequest(`/api/leads/${leadId}/`);
          const leadData = freshLead.data || freshLead;
          // Merge to ensure we have the reminder fields
          currentLead = { ...currentLead, ...leadData };
        } catch (e) {
          console.warn("Failed to fetch fresh lead details for reminder check", e);
        }
      }

      // Validate: Follow-up date/time should not be in the past
      if (newDateTime && newDateTime !== "" && newDateTime !== null && newDateTime !== undefined) {
        const followUpDateTime = dayjs(newDateTime);
        if (followUpDateTime.isBefore(dayjs(), 'minute')) {
          notifyError("Followupat should not be in past.");
          setFollowUpAtUpdatingLeadId(null);
          return;
        }
      }

      const followUpValue =
        newDateTime === "" || newDateTime === null || newDateTime === undefined
          ? null
          : new Date(newDateTime).toISOString();

      // Prepare payload with all required lead fields, updating only follow_up_at
      const payload = {
        title: currentLead.title || "",
        source: currentLead.source || "",
        description: currentLead.description || "",
        company_name: currentLead.company_name || "",
        contact_first_name: currentLead.contact_first_name || "",
        contact_last_name: currentLead.contact_last_name || "",
        contact_email: currentLead.contact_email || "",
        contact_phone: currentLead.contact_phone || "",
        contact_position_title: currentLead.contact_position_title || "",
        contact_linkedin_url: currentLead.contact_linkedin_url || "",
        ...((currentLead.follow_up_status || currentLead.followupStatus) &&
          (currentLead.follow_up_status || currentLead.followupStatus) !== null &&
          (currentLead.follow_up_status || currentLead.followupStatus) !== ""
          ? { follow_up_status: currentLead.follow_up_status || currentLead.followupStatus }
          : {}),
      };

      // Only include follow_up_at if we have a value
      if (followUpValue) {
        payload.follow_up_at = followUpValue;
      }

      await apiRequest(`/api/leads/${leadId}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      // Schedule follow-up
      const followUpPayload = currentLead.send_reminder_email
        ? {
          follow_up_at: followUpValue,
          send_reminder_email: true,
          reminder_time_offset: currentLead.reminder_time_offset,
        }
        : {
          send_reminder_email: false,
          reminder_time_offset: null,
          follow_up_at: followUpValue,
        };

      try {
        await apiRequest(`/api/leads/${leadId}/schedule-follow-up/`, {
          method: "POST",
          body: JSON.stringify(followUpPayload),
        });
        console.log("Schedule follow-up called successfully");
      } catch (error) {
        console.error("Failed to schedule follow-up:", error);
        notifyError("Lead saved, but failed to schedule follow-up.");
      }

      const updatedLead = {
        ...currentLead,
        follow_up_at: followUpValue,
        followUpAt: followUpValue,
      };

      setLeads((prevLeads) =>
        prevLeads.map((l) => (l.id === leadId ? { ...l, ...updatedLead } : l))
      );

      addLeadToCache(updatedLead);
      notifySuccess("Follow-up date updated", { autoClose: 5000 });
    } catch (error) {
      console.error("Failed to update follow-up at:", error);
      notifyError("Failed to update follow-up date", { autoClose: 5000 });
    } finally {
      setFollowUpAtUpdatingLeadId(null);
    }
  };

  // Function to get lifecycle name from ID
  const getLifecycleName = (lifecycleId) => {
    // Handle null, undefined, or empty values
    if (lifecycleId === null || lifecycleId === undefined || lifecycleId === "") {
      return "None";
    }

    // If lifecycles array is not loaded yet, return a placeholder
    if (!lifecycles || lifecycles.length === 0) {
      console.warn("Lifecycles array not loaded yet, lifecycleId:", lifecycleId);
      return "Loading...";
    }

    // If it's already a string and looks like a name (not just a number), return it
    if (typeof lifecycleId === "string" && isNaN(lifecycleId)) {
      return lifecycleId;
    }

    // Extract ID if it's an object
    let idToFind = lifecycleId;
    if (typeof lifecycleId === "object" && lifecycleId !== null) {
      idToFind = lifecycleId.id || lifecycleId.pk || lifecycleId.uuid || lifecycleId;
    }

    // Convert to string for comparison
    const idStr = String(idToFind);

    // Find matching lifecycle in the array
    const foundLifecycle = lifecycles.find((lc) => {
      const lcId = lc.id || lc.pk || lc.uuid;
      return String(lcId) === idStr;
    });

    if (foundLifecycle) {
      return foundLifecycle.name || foundLifecycle.label || foundLifecycle.title || foundLifecycle.lifecycle || "Unknown";
    }

    // If not found, return the ID as string
    return String(idToFind);
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
        // If status is just a string, we can't match by ID
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

    // If not found, log for debugging and return the ID as string (fallback)
    console.warn(
      "Status not found for ID:",
      statusId,
      "Available statuses:",
      statuses
    );
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

  const navigate = useNavigate();
  const { notifyError, notifySuccess } = useNotification();

  const warmUpLeadForm = () => {
    prefetchLeadData({ includeLeads: false });
  };

  const openEditDialog = (lead) => {
    const leadId = resolveLeadId(lead);
    if (!leadId) return;
    setEditDialog({ open: true, leadId, lead });
  };

  const closeEditDialog = () => setEditDialog({ open: false, leadId: null, lead: null });

  const handleLeadUpdated = (updatedLead) => {
    if (!updatedLead) return;
    const updatedId = resolveLeadId(updatedLead);
    if (!updatedId) return;
    setLeads((prev) =>
      prev.map((lead) =>
        resolveLeadId(lead) === updatedId ? { ...lead, ...updatedLead } : lead
      )
    );
  };

  const handleOpenCreateLead = () => {
    warmUpLeadForm();
    navigate("/create-lead");
  };

  const handleNavigateToEditLead = (lead) => {
    openEditDialog(lead);
  };

  // Handler to toggle lead active status
  const handleToggleActive = async (lead) => {
    const leadId = lead.id || lead.pk || lead.uuid;
    if (!leadId) return;

    const currentActive =
      lead.is_always_active ?? lead.always_active ?? false;
    const nextActive = !currentActive;

    setActiveTogglingLeadId(leadId);
    try {
      const response = await apiRequest(`/api/leads/${leadId}/always-active/`, {
        method: "PATCH",
        body: JSON.stringify({ always_active: nextActive }),
      });

      // Update lead in local state
      const newActiveStatus =
        response?.is_always_active ??
        response?.always_active ??
        nextActive;
      setLeads((prevLeads) =>
        prevLeads.map((l) =>
          (l.id || l.pk || l.uuid) === leadId
            ? { ...l, is_always_active: newActiveStatus, always_active: newActiveStatus }
            : l
        )
      );

      // Update cache
      const updatedLead = { ...lead, is_always_active: newActiveStatus, always_active: newActiveStatus };
      addLeadToCache(updatedLead);

      notifySuccess(`Lead ${newActiveStatus ? "activated" : "deactivated"} successfully, {autoClose: 5000}`);
    } catch (error) {
      console.error("Failed to toggle lead active status:", error);
      notifyError("Failed to update lead status", { autoClose: 5000 });
    } finally {
      setActiveTogglingLeadId(null);
    }
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
        return getEmployeeName(lead.assigned_to || lead.assignedTo);
      case "followUpAt":
        // follow_up_at now contains combined date and time as ISO datetime string
        const followUpDateTime = lead.follow_up_at || lead.followUpAt;
        if (followUpDateTime) {
          // Parse as datetime and show both date and time in a proper format
          const dateTime = new Date(followUpDateTime);
          const dateStr = dateTime.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
          const timeStr = dateTime.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true, // 12-hour format with AM/PM
          });
          return `${dateStr}, ${timeStr}`;
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
      case "lifecycle":
        {
          const v = lead.lifecycle ?? lead.lifecycle_obj ?? lead.lifecycleObj ?? lead.lifecycle_id ?? lead.lifecycleId;
          if (!v && v !== 0) return "";
          if (typeof v === "string") return v;
          if (typeof v === "object" && v !== null) {
            return v.name || v.label || v.title || v.lifecycle || String(v.id || v.pk || v.uuid || "");
          }
          return String(v);
        }
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

  const getLeadIdForNotes = (lead) => {
    if (!lead) return null;
    return lead.id ?? lead.pk ?? lead.uuid ?? lead.lead_id ?? null;
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

      // Fallback: try to extract ID for lookup
      const assignedToId =
        assignedTo.id || assignedTo.pk || assignedTo.uuid || null;
      if (!assignedToId) {
        return "None";
      }

      // Try to find in employees array (for backward compatibility)
      if (employees && employees.length > 0) {
        const assignedToIdStr = String(assignedToId);
        const emp = employees.find((e) => {
          const empId = e.id || e.pk || e.uuid;
          if (!empId) return false;
          const empIdStr = String(empId);
          return empIdStr === assignedToIdStr;
        });

        if (emp) {
          const firstName = emp.firstName || emp.first_name || "";
          const lastName = emp.lastName || emp.last_name || "";
          const name = `${firstName} ${lastName}`.trim();
          if (name) {
            return name;
          }
        }
      }

      // If no user_details and not found in employees, return "None"
      return "None";
    }

    // If assignedTo is just an ID (string or number), try to find in employees array
    const assignedToId = assignedTo;
    if (employees && employees.length > 0) {
      const assignedToIdStr = String(assignedToId);
      const emp = employees.find((e) => {
        const empId = e.id || e.pk || e.uuid;
        if (!empId) return false;
        const empIdStr = String(empId);
        return empIdStr === assignedToIdStr;
      });

      if (emp) {
        const firstName = emp.firstName || emp.first_name || "";
        const lastName = emp.lastName || emp.last_name || "";
        const name = `${firstName} ${lastName}`.trim();
        return name || "None";
      }
    }

    // If not found, return "None"
    return "None";
  };

  // Helper to extract employee ID from various structures
  const getEmployeeIdValue = (assignedTo) => {
    if (assignedTo === null || assignedTo === undefined || assignedTo === "") return "";
    if (typeof assignedTo === "object") {
      // Prefer profile identifiers (id/pk/uuid) first
      if (assignedTo.id) return assignedTo.id;
      if (assignedTo.pk) return assignedTo.pk;
      if (assignedTo.uuid) return assignedTo.uuid;
      // Then check user_details/user ids
      if (assignedTo.user_details && assignedTo.user_details.id) {
        return assignedTo.user_details.id;
      }
      if (assignedTo.user && assignedTo.user.id) {
        return assignedTo.user.id;
      }
      return (
        assignedTo.user_id ||
        assignedTo.userId ||
        assignedTo.profile_id ||
        assignedTo.profileId ||
        ""
      );
    }
    return assignedTo;
  };

  // Helper to format datetime for datetime-local input
  const formatDateTimeLocal = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzOffset)
      .toISOString()
      .slice(0, 16);
    return localISOTime;
  };

  // Build select options for assigned employee dropdown
  const assignedSelectOptions = useMemo(() => {
    const opts = [];
    const seenIds = new Set();
    const deactivatedIds = new Set();

    employees.forEach((emp, idx) => {
      // Extract ID - could be nested in user_details
      const id = getEmployeeIdValue(emp);

      // Check if employee is deactivated
      // We assume active if fields are missing, but if explicit inactive status/flag exists, we skip
      const status = emp.status || (emp.user_details && emp.user_details.status);
      const isActive = emp.is_active !== undefined ? emp.is_active : (emp.user_details && emp.user_details.is_active);
      const isDeactivated = (status && status !== "Active") || isActive === false;

      if (isDeactivated) {
        if (id) deactivatedIds.add(String(id));
        return;
      }

      if (!id || seenIds.has(String(id))) return;
      seenIds.add(String(id));

      // Extract name - check user_details first, then direct properties
      const userDetails = emp.user_details || emp.userDetails || emp.user || {};
      const firstName =
        userDetails.first_name ||
        userDetails.firstName ||
        emp.first_name ||
        emp.firstName ||
        emp.name ||
        "";
      const lastName =
        userDetails.last_name ||
        userDetails.lastName ||
        emp.last_name ||
        emp.lastName ||
        "";
      const fullName = `${firstName} ${lastName}`.trim();
      const label = fullName || `Employee ${idx + 1}`;

      opts.push({ value: id, label });
    });

    // Ensure currently assigned IDs that may not be in employees array are present
    leads.forEach((lead) => {
      const assignedTo = lead.assigned_to || lead.assignedTo;
      const id = getEmployeeIdValue(assignedTo);
      
      // If we know this ID belongs to a deactivated user, do not add it to options
      if (id && deactivatedIds.has(String(id))) return;

      // Check if the assigned object itself indicates deactivation
      if (assignedTo && typeof assignedTo === 'object') {
        const status = assignedTo.status || (assignedTo.user_details && assignedTo.user_details.status);
        const isActive = assignedTo.is_active !== undefined ? assignedTo.is_active : (assignedTo.user_details && assignedTo.user_details.is_active);
        
        if ((status && status !== "Active") || isActive === false) {
            if (id) deactivatedIds.add(String(id));
            return;
        }
      }

      if (id && !seenIds.has(String(id))) {
        seenIds.add(String(id));
        opts.push({ value: id, label: getEmployeeName(assignedTo) });
      }
    });

    return opts;
  }, [employees, leads]);

  const handleDeleteLead = async (id) => {
    setIsDeleting(true);
    try {
      await apiRequest(`/api/leads/${id}`, { method: "DELETE" });
      setLeads(leads.filter((l) => String(l.id) !== String(id)));
      removeLeadFromCache(id);
      setDeleteDialog({ open: false, lead: null });
      notifySuccess("Lead deleted successfully", { autoClose: 5000 });
    } catch (err) {
      console.error("Failed to delete lead:", err);
      notifyError("Failed to delete lead. Please try again.", { autoClose: 5000 });
    } finally {
      setIsDeleting(false);
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

  const handleExportLeadsCSV = () => {
    if (!leads.length) {
      notifyError("No leads to export");
      return;
    }

    // Export ALL columns regardless of customization
    // Map all column keys to CSV column definitions with proper labels
    const csvColumns = ALL_COLUMNS.map((col) => ({
      key: col.key,
      label: col.label,
    }));

    // Create header row
    const headers = csvColumns.map((col) => col.label);
    const headerRow = headers.join(",");

    // Create data rows using the same helper function as the table
    // Export all leads (not just filtered ones) to get complete data
    const dataRows = leads.map((lead) => {
      return csvColumns
        .map((col) => {
          const value = getLeadFieldValue(lead, col.key);
          // Escape quotes and wrap in quotes for CSV
          return `"${String(value || "").replace(/"/g, '""')}"`;
        })
        .join(",");
    });

    // Combine header and data rows
    const csvContent = [headerRow, ...dataRows].join("\n");

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConvertToProject = async (lead) => {
    if (!lead) return;
    const leadId = resolveLeadId(lead);
    if (!leadId) {
      notifyError("Invalid lead selected");
      return;
    }

    setActionLoading(true);
    try {
      await apiRequest(`/api/leads/${leadId}/convert-to-project/`, {
        method: "POST",
        body: JSON.stringify({ is_project: true }),
      });

      // Remove converted lead from list and cache
      setLeads((prev) => prev.filter((l) => String(resolveLeadId(l)) !== String(leadId)));
      removeLeadFromCache(lead);

      notifySuccess("Lead converted to project successfully", { autoClose: 5000 });
    } catch (err) {
      console.error("Convert to project failed:", err);
      const status = err?.status;
      if (status === 403) {
        notifyError("You do not have permission to convert this lead", { autoClose: 5000 });
      } else if (status === 400) {
        notifyError(err.message || "Invalid request for conversion", { autoClose: 5000 });
      } else {
        notifyError(err.message || "Failed to convert lead to project", { autoClose: 5000 });
      }
    } finally {
      setActionLoading(false);
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


    const assignedFilterOptions = useMemo(() => {
      const options = new Map();
      options.set("All", { value: "All", label: "All" });
      const deactivatedNames = new Set();

      // Add employees from the employees array
      if (employees && employees.length > 0) {
        employees.forEach((emp) => {
          const firstName = emp.firstName || emp.first_name || "";
          const lastName = emp.lastName || emp.last_name || "";
          const name = `${firstName} ${lastName}`.trim();

          const status = emp.status || (emp.user_details && emp.user_details.status);
          const isActive = emp.is_active !== undefined ? emp.is_active : (emp.user_details && emp.user_details.is_active);
          const isDeactivated = (status && status !== "Active") || isActive === false;
          if (isDeactivated) {
             if (name) deactivatedNames.add(name);
             return;
          }

          if (name) {
            options.set(name, { value: name, label: name });
          }
        });
      }

      // Also add from leads (in case some employees are not in the employees array)
      leads.forEach((lead) => {
        const assignedTo = lead.assigned_to || lead.assignedTo;
        const name = getEmployeeName(assignedTo);

        if (name && deactivatedNames.has(name)) return;

        // Check for deactivation on the assigned object
        if (assignedTo && typeof assignedTo === 'object') {
             const status = assignedTo.status || (assignedTo.user_details && assignedTo.user_details.status);
             const isActive = assignedTo.is_active !== undefined ? assignedTo.is_active : (assignedTo.user_details && assignedTo.user_details.is_active);
             
             if ((status && status !== "Active") || isActive === false) {
                if (name) deactivatedNames.add(name);
                return;
             }
        }

        if (name && name !== "None") {
          options.set(name, { value: name, label: name });
        }
      });

      return Array.from(options.values());
    }, [leads, employees]);

    // ===== FILTER LOGIC =====
    const filteredLeads = useMemo(() => {
      return leads.filter((lead) => {
        // STATUS FILTER
        if (statusFilter !== "ALL") {
          const leadStatusId =
            typeof lead.status === "object"
              ? lead.status?.id
              : lead.status;
  
          if (String(leadStatusId) !== String(statusFilter)) {
            return false;
          }
        }
  
        // ASSIGNED TO FILTER
        if (assignedFilter !== "All") {
          const leadAssignedName = getEmployeeName(lead.assigned_to || lead.assignedTo);
          if (assignedFilter === "None") {
            if (leadAssignedName !== "None") {
              return false;
            }
          } else {
            if (leadAssignedName !== assignedFilter) {
              return false;
            }
          }
        }
  
        // FOLLOW-UP AT FILTER
        if (followUpFilter) {
          const rawFollowUp = lead.follow_up_at || lead.followUpAt;
          if (!rawFollowUp) {
            return false;
          }
          const leadDateObj = dayjs(rawFollowUp);
          const filterDateObj = dayjs(followUpFilter);
          if (!leadDateObj.isValid() || !filterDateObj.isValid()) {
            return false;
          }
          const leadDate = leadDateObj.format("YYYY-MM-DD");
          const filterDate = filterDateObj.format("YYYY-MM-DD");
          if (leadDate !== filterDate) {
            return false;
          }
        }
  
        // SEARCH FILTER
        if (q) {
          const searchTerm = q.toLowerCase().trim();
          if (!searchTerm) return true;

          // Search in title
          const title = (lead.title || "").toLowerCase();
          // Search in email
          const email = ((lead.contact_email || lead.email) || "").toLowerCase();
          // Search in AssignedTo name
          const assignedToName = getEmployeeName(lead.assigned_to || lead.assignedTo).toLowerCase();
          // Search in status name
          const statusName = getStatusName(lead.status).toLowerCase();
          // Search in lifecycle name
          const lifecycleName = (() => {
            const v = lead.lifecycle ?? lead.lifecycle_obj ?? lead.lifecycleObj ?? lead.lifecycle_id ?? lead.lifecycleId;
            if (!v && v !== 0) return "";
            if (typeof v === "string") return v.toLowerCase();
            if (typeof v === "object" && v !== null) {
              return (v.name || v.label || v.title || v.lifecycle || String(v.id || v.pk || v.uuid || "")).toLowerCase();
            }
            return String(v).toLowerCase();
          })();

          // Check if search term matches any of these fields
          if (
            !title.includes(searchTerm) &&
            !email.includes(searchTerm) &&
            !assignedToName.includes(searchTerm) &&
            !statusName.includes(searchTerm) &&
            !lifecycleName.includes(searchTerm)
          ) {
            return false;
          }
        }
  
        return true;
      });
    }, [leads, statusFilter, assignedFilter, followUpFilter, q, statuses, employees]);
  

    return (
      <Box>
        <Topbar>
          <Typography variant="h5" fontWeight="bold">
            All Leads
          </Typography>
          {/* Desktop Buttons */}
          <Box sx={{ display: { xs: "none", md: "flex" } }} gap={2}>
            <Button
              variant="outlined"
              startIcon={<CloudDownloadIcon />}
              onClick={handleExportLeadsCSV}
            >
              Export Leads CSV
            </Button>
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
              PaperProps={{ sx: { minWidth: 200, p: 1 } }} // optional padding for better spacing
            >
              {/* Export Leads CSV */}
              <MenuItem>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<CloudDownloadIcon />}
                  onClick={() => {
                    handleExportLeadsCSV();
                    setMobileMenuAnchorEl(null); // close menu
                  }}
                >
                  Export Leads CSV
                </Button>
              </MenuItem>

              {/* Add New Lead */}
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

              {/* Customize Columns */}
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
          {/* Actions */}
          <Box
            display="flex"
            justifyContent="space-between"
            px={2}
            py={1}
            gap={1}
          >
            <Button
              size="small"
              variant="outlined"
              onClick={handleResetColumns}
            >
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

          {/* Column Checkboxes */}
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
        <Box display="flex" gap={2} mt={2} mb={2} alignItems="center" flexWrap="wrap">
          <TextField
            placeholder="Search by title, name, email, company, assigned to, source, lifecycle, description, or date..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            size="small"
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="ALL">All</MenuItem>

              {statuses.map((status) => (
                <MenuItem key={status.id} value={status.id}>
                  {status.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Assigned To</InputLabel>
            <Select
              label="Assigned To"
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
            >
              {assignedFilterOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box display="flex" gap={1} alignItems="center">
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Follow-up At"
                value={followUpFilter ? dayjs(followUpFilter) : null}
                onChange={(newValue) => setFollowUpFilter(newValue)}
                slotProps={{
                  textField: {
                    size: "small",
                    sx: { minWidth: 180 },
                  },
                }}
              />
            </LocalizationProvider>
            {/* <Button
              size="small"
              variant={followUpFilter ? "outlined" : "contained"}
              onClick={() => setFollowUpFilter(null)}
              sx={{ minWidth: 60, height: 40 }}
            >
              All
            </Button> */}
          </Box>
          <Button
            size="small"
            variant="outlined"
            color="primary"
            onClick={() => {
              setQ("");
              setStatusFilter("ALL");
              setAssignedFilter("All");
              setFollowUpFilter(null);
            }}
            sx={{ 
              minWidth: 80, 
              height: 40,
              fontWeight: "bold"
            }}
          >
            Reset All
          </Button>
        </Box>

        {/* Leads Table */}
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: "12px",
            boxShadow: "none",
            width: "100%",
            overflowX: "auto",
            maxHeight: "calc(100vh - 120px)",
          }}
        >
          <Table
            stickyHeader
            aria-label="basic table"
            sx={{
              tableLayout: "fixed",
              width: "100%",
              minWidth: tableMinWidth,
              "& td, & th": { whiteSpace: "normal", overflowWrap: "anywhere" },
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
                  <TableCell sx={tableHeaderCellStyles}>Lead Status</TableCell>
                )}
                {visibleColumns.includes("lifecycle") && (
                  <TableCell sx={tableHeaderCellStyles}>
                    Lead Lifecycle
                  </TableCell>
                )}
                {visibleColumns.includes("assignedTo") && (
                  <TableCell sx={{ ...tableHeaderCellStyles, minWidth: 220 }}>
                    Assigned To
                  </TableCell>
                )}
                {visibleColumns.includes("followUpAt") && (
                  <TableCell sx={{ ...tableHeaderCellStyles, minWidth: 180 }}>
                    Follow-up At
                  </TableCell>
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
                  <TableCell sx={tableHeaderCellStyles}>
                    Position Title
                  </TableCell>
                )}

                <TableCell
                  sx={{ ...tableHeaderCellStyles, textAlign: "center" }}
                >
                  Notes
                </TableCell>
                <TableCell
                  sx={{
                    ...tableHeaderCellStyles,
                    textAlign: "center",
                    width: 72,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    lineHeight: 1,
                    padding: "8px",
                  }}
                >
                  Actions
                </TableCell>{" "}
              </TableRow>
            </TableHead>

            <TableBody>
              {isPageLoading ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length + 2} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={40} />
                    <Typography variant="body2" sx={{ mt: 2 }}>
                      Loading leads from API...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredLeads.length === 0 ? (
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
                  // Debug: Log lead data to understand structure
                  if (lead.assigned_to || lead.assignedTo) {
                    console.log("Lead assigned_to data:", {
                      leadId: lead.id,
                      assigned_to: lead.assigned_to,
                      assignedTo: lead.assignedTo,
                      employeesCount: employees.length,
                      employees: employees.map((e) => ({
                        id: e.id || e.pk || e.uuid,
                        name: `${e.firstName || e.first_name} ${
                          e.lastName || e.last_name
                        }`,
                      })),
                    });
                  }
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
                          <Box
                            sx={{
                              position: "relative",
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
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
                              <CircularProgress size={16} sx={{ ml: 1 }} />
                            )}
                          </Box>
                        </TableCell>
                      )}

                      {visibleColumns.includes("lifecycle") && (
                        <TableCell>
                          <Box
                            sx={{
                              position: "relative",
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
                            <Select
                              value={(() => {
                                const lifecycleValue = lead.lifecycle ?? lead.lifecycle_obj ?? lead.lifecycleObj ?? lead.lifecycle_id ?? lead.lifecycleId;
                                if (!lifecycleValue && lifecycleValue !== 0) {
                                  return "";
                                }
                                // If it's an object, get the ID
                                if (typeof lifecycleValue === "object" && lifecycleValue !== null) {
                                  return lifecycleValue.id || lifecycleValue.pk || lifecycleValue.uuid || "";
                                }
                                // If it's a string or number, try to find matching lifecycle by ID
                                const foundLifecycle = lifecycles.find((lc) => {
                                  const lcId = lc.id || lc.pk || lc.uuid;
                                  const lcName = (lc.name || lc.label || lc.title || lc.lifecycle || "").toLowerCase();
                                  const valueStr = String(lifecycleValue).toLowerCase();
                                  return String(lcId) === String(lifecycleValue) || lcName === valueStr;
                                });
                                if (foundLifecycle) {
                                  return foundLifecycle.id || foundLifecycle.pk || foundLifecycle.uuid || "";
                                }
                                // If not found, return the value as-is (might be an ID)
                                return String(lifecycleValue);
                              })()}
                              onChange={(e) => {
                                const selectedValue = e.target.value;
                                handleLifecycleChange(lead, selectedValue);
                              }}
                              size="small"
                              disabled={lifecycleUpdatingLeadId === lead.id}
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
                              <MenuItem value="">None</MenuItem>
                              {lifecycles.map((lc, index) => {
                                const lcId = lc.id || lc.pk || lc.uuid || index;
                                const lcName = lc.name || lc.label || lc.title || lc.lifecycle || `Lifecycle ${index + 1}`;
                                return (
                                  <MenuItem key={lcId} value={lcId}>
                                    {lcName}
                                  </MenuItem>
                                );
                              })}
                            </Select>
                            {lifecycleUpdatingLeadId === lead.id && (
                              <CircularProgress size={16} sx={{ ml: 1 }} />
                            )}
                          </Box>
                        </TableCell>
                      )}

                      {visibleColumns.includes("assignedTo") && (
                        <TableCell sx={{ minWidth: 220, pr: 2 }}>
                          <Box
                            sx={{
                              position: "relative",
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
                            <Select
                              value={(() => {
                                const id = getEmployeeIdValue(
                                  lead.assigned_to || lead.assignedTo
                                );
                                return id === null || id === undefined
                                  ? ""
                                  : String(id);
                              })()}
                              onChange={(e) =>
                                handleAssignedChange(lead, e.target.value)
                              }
                              size="small"
                              disabled={assignedUpdatingLeadId === lead.id}
                              sx={{
                                minWidth: 160,
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
                              {assignedSelectOptions.map((option) => (
                                <MenuItem
                                  key={option.value || "none"}
                                  value={option.value}
                                >
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                            {assignedUpdatingLeadId === lead.id && (
                              <CircularProgress size={16} sx={{ ml: 1 }} />
                            )}
                          </Box>
                        </TableCell>
                      )}

                      {visibleColumns.includes("followUpAt") && (
                        <TableCell sx={{ minWidth: 180 }}>
                          <FollowUpCell
                            lead={lead}
                            onUpdate={(updatedLead) => {
                              setLeads((prevLeads) =>
                                prevLeads.map((l) =>
                                  l.id === lead.id
                                    ? { ...l, ...updatedLead }
                                    : l
                                )
                              );
                              addLeadToCache(updatedLead);
                            }}
                            notifySuccess={notifySuccess}
                            notifyError={notifyError}
                          />
                        </TableCell>
                      )}

                      {visibleColumns.includes("followupStatus") && (
                        <TableCell>
                          <Box
                            sx={{
                              position: "relative",
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
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
                              <MenuItem value="done">done</MenuItem>
                              <MenuItem value="pending">pending</MenuItem>
                            </Select>
                            {followUpUpdatingLeadId === lead.id && (
                              <CircularProgress size={16} sx={{ ml: 1 }} />
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
                          onClick={() => {
                            setNotesDialogLead(lead);
                            setNotesDialogOpen(true);
                          }}
                          sx={{
                            color: "#1d57ccff",
                            transition: "transform 0.2s ease",
                            "&:hover": { transform: "scale(1.1)" },
                          }}
                        >
                          <FaComment size={18} />
                        </IconButton>
                      </TableCell>

                      <TableCell align="center" sx={{ width: 72, px: 1 }}>
                        <IconButton
                          size="small"
                          onClick={(e) => handleActionMenuOpen(e, lead)}
                          sx={{ display: "flex", justifyContent: "center" }}
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
              handleNavigateToEditLead(menuLead);
              handleActionMenuClose();
            }}
          >
            <EditIcon fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem>

          <MenuItem
            onClick={() => {
              handleConvertToProject(menuLead);
              handleActionMenuClose();
            }}
          >
            <AssignmentTurnedInIcon fontSize="small" sx={{ mr: 1 }} />
            Convert to Project
          </MenuItem>

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
            <Button onClick={closeDeleteDialog} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteLead}
              color="error"
              variant="contained"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogActions>
        </Dialog>

        <EditLeadModal
          open={editDialog.open}
          leadId={editDialog.leadId}
          lead={editDialog.lead}
          onClose={closeEditDialog}
          onSuccess={handleLeadUpdated}
        />

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
          getLifecycleName={getLifecycleName}
        />
      </Box>
    );
  }
