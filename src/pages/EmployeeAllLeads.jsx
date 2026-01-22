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
  DialogActions,
  Switch,
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
import EditLeadModal from "../components/Leads/EditLeadModal";
import FollowUpCell from "../components/Leads/FollowUpCell";
import { useNotification } from "../contexts/NotificationContext";
import {
  getCachedLeadData,
  addLeadToCache,
  prefetchLeadData,
  removeLeadFromCache,
} from "../utils/prefetchData";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";


const getChipStyles = (status) => {
  switch (status) {
    case "Completed":
      return {
        backgroundColor: colors.greenAccent[800],
        color: colors.greenAccent[400],
        border: `1px solid ${colors.greenAccent[400]}`,
      };
    case "Pending":
      return {
        backgroundColor: colors.yellowAccent[800],
        color: colors.yellowAccent[400],
        border: `1px solid ${colors.yellowAccent[400]}`,
      };
    case "Rejected":
      return {
        backgroundColor: colors.redAccent[800],
        color: colors.redAccent[400],
        border: `1px solid ${colors.redAccent[400]}`,
      };
    case "In Progress":
      return {
        backgroundColor: colors.blueAccent[800],
        color: colors.blueAccent[400],
        border: `1px solid ${colors.blueAccent[400]}`,
      };
    default:
      return {
        backgroundColor: colors.grey[800],
        color: colors.grey[400],
        border: `1px solid ${colors.grey[400]}`,
      };
  }
};

const ALL_COLUMNS = [
  { key: "title", label: "Lead Title" },
  { key: "linkedIn", label: "LinkedIn" },
  { key: "status", label: "Status" },
  { key: "assignedTo", label: "Assigned To" },
  { key: "followUpAt", label: "Follow-up At" },
  { key: "followupStatus", label: "Follow-up Status" },
  { key: "isActive", label: "Active" },
  { key: "source", label: "Source" },
  { key: "lifecycle", label: "Lifecycle" },
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
  "assignedTo",
  "followUpAt",
  "followupStatus",
  "isActive",
];

const resolveLeadId = (lead) => {
  if (!lead) return null;
  return lead.id ?? lead.pk ?? lead.uuid ?? lead.lead_id ?? lead.leadId ?? null;
};

const tableHeaderCellStyles = {
  whiteSpace: "normal",
  overflowWrap: "anywhere",
  fontWeight: 700,
};

const tableBodyCellStyles = {
  maxWidth: 150,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export default function EmployeeAllLeads() {
  const location = useLocation();
  const [leads, setLeads] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [assignedFilter, setAssignedFilter] = useState("All");
  const [followUpFilter, setFollowUpFilter] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const stored = JSON.parse(localStorage.getItem("leadColumns")) || DEFAULT_COLUMNS;
    return stored.includes("isActive") ? stored : [...stored, "isActive"]; // ensure toggle column shows
  });
  const tableMinWidth = Math.max(visibleColumns.length * 200, 1000);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesDialogLead, setNotesDialogLead] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [lifecycles, setLifecycles] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [statusesLoading, setStatusesLoading] = useState(true);
  const [assignedUpdatingLeadId, setAssignedUpdatingLeadId] = useState(null);
  const [lifecycleUpdatingLeadId, setLifecycleUpdatingLeadId] = useState(null);
  const [actionAnchorEl, setActionAnchorEl] = useState(null);
  const [menuLead, setMenuLead] = useState(null);
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [editDialog, setEditDialog] = useState({ open: false, leadId: null, lead: null });
  const [activeTogglingLeadId, setActiveTogglingLeadId] = useState(null);
  const { notifySuccess, notifyError } = useNotification();

  const actionOpen = Boolean(actionAnchorEl);
  const rowRefs = useRef({});
  const highlightTimer = useRef(null);
  const apiCallMadeRef = useRef({ pathname: null, userId: null, called: false });
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

  // Statuses will be loaded from the leads API response

  // Fetch leads - use cache first, then API (ONLY CALL ONCE per page/user)
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
        setLeadsLoading(false);
        return;
      }

      // Ensure API is called only once per mount
      const currentPath = location.pathname;
      const hasPathChanged = apiCallMadeRef.current.pathname !== currentPath;
      const hasUserChanged = apiCallMadeRef.current.userId !== employeeId;
      
      // Only prevent duplicate calls if path and user haven't changed AND we've already called
      if (apiCallMadeRef.current.called && !hasPathChanged && !hasUserChanged) {
        console.log("API call already made for this page/user, skipping duplicate call");
        setLeadsLoading(false);
        setStatusesLoading(false);
        return;
      }

      // Mark as called BEFORE making the API call to prevent race conditions
      apiCallMadeRef.current.pathname = currentPath;
      apiCallMadeRef.current.userId = employeeId;
      apiCallMadeRef.current.called = true;

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
              console.warn("Object keys:", Object.keys(lead.assigned_to || {}));
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

      // Try cached data first for instant display
      const cachedData = getCachedLeadData();
      const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes
      const cacheAge = cachedData?.timestamp ? Date.now() - cachedData.timestamp : Infinity;
      const isCacheFresh = cacheAge < CACHE_MAX_AGE;

      if (cachedData?.leads && isCacheFresh) {
        console.log("=== USING CACHED DATA (FRESH) - SKIPPING API CALL ===");
        console.log("Cached leads count:", cachedData.leads.length);
        console.log("Cache age:", Math.round(cacheAge / 1000), "seconds");
        
        // Set statuses from cache
        if (cachedData.statuses) {
          setStatuses(cachedData.statuses);
        }
        setStatusesLoading(false);
        
        const filteredLeads = filterLeadsByEmployee(cachedData.leads);
        console.log(
          "Filtered leads count after filtering:",
          filteredLeads.length
        );
        setLeads(filteredLeads);
        setLeadsLoading(false);
        apiCallMadeRef.current.called = true; // Mark as done, using cache
        return; // Use cache, don't make API call
      }

      // Cache is stale or missing, fetch fresh data from API (ONLY API CALL - gets leads, statuses, employees, sources)
      if (cachedData?.leads && !isCacheFresh) {
        console.log("=== CACHE IS STALE, USING FOR INSTANT DISPLAY THEN FETCHING FRESH ===");
        console.log("Cache age:", Math.round(cacheAge / 1000), "seconds");
        
        // Set statuses from stale cache for instant display
        if (cachedData.statuses) {
          setStatuses(cachedData.statuses);
        }
        setStatusesLoading(false);
        
        const filteredLeads = filterLeadsByEmployee(cachedData.leads);
        setLeads(filteredLeads);
        setLeadsLoading(false);
        // Continue to fetch fresh data below
      }

      // Mark that we're making the API call
      apiCallMadeRef.current.called = true;
      console.log("Fetching fresh data from /api/leads/ API (SINGLE API CALL for all data)...");
      const data = await apiRequest("/api/leads/");
      console.log("=== API RESPONSE RAW ===", data);

      // Handle different response formats for leads
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

      // Extract statuses from the leads API response
      let statusesList = [];
      if (data?.statuses && Array.isArray(data.statuses)) {
        statusesList = data.statuses;
        console.log("Extracted statuses from leads API response:", statusesList.length);
      } else if (data?.data?.statuses && Array.isArray(data.data.statuses)) {
        statusesList = data.data.statuses;
        console.log("Extracted statuses from data.statuses:", statusesList.length);
      } else if (cachedData?.statuses) {
        // Fallback to cached statuses if not in API response
        statusesList = cachedData.statuses;
        console.log("Using cached statuses as fallback");
      }

      // Extract employees/users from the leads API response
      let employeesList = [];
      if (data?.users && Array.isArray(data.users)) {
        employeesList = data.users;
        console.log("Extracted users from leads API response:", employeesList.length);
      } else if (data?.employees && Array.isArray(data.employees)) {
        employeesList = data.employees;
        console.log("Extracted employees from leads API response:", employeesList.length);
      } else if (data?.data?.users && Array.isArray(data.data.users)) {
        employeesList = data.data.users;
        console.log("Extracted users from data.users:", employeesList.length);
      } else if (data?.data?.employees && Array.isArray(data.data.employees)) {
        employeesList = data.data.employees;
        console.log("Extracted employees from data.employees:", employeesList.length);
      }

      // Extract sources from the leads API response
      let sourcesList = [];
      if (data?.sources && Array.isArray(data.sources)) {
        sourcesList = data.sources;
        console.log("Extracted sources from leads API response:", sourcesList.length);
      } else if (data?.data?.sources && Array.isArray(data.data.sources)) {
        sourcesList = data.data.sources;
        console.log("Extracted sources from data.sources:", sourcesList.length);
      }

      // Extract lifecycles from the leads API response
      let lifecyclesList = [];
      if (data?.lifecycles && Array.isArray(data.lifecycles)) {
        lifecyclesList = data.lifecycles;
        console.log("Extracted lifecycles from leads API response:", lifecyclesList.length);
      } else if (data?.data?.lifecycles && Array.isArray(data.data.lifecycles)) {
        lifecyclesList = data.data.lifecycles;
        console.log("Extracted lifecycles from data.lifecycles:", lifecyclesList.length);
      }

      // Set statuses and lifecycles from API response
      if (statusesList.length > 0) {
        setStatuses(statusesList);
      }
      if (lifecyclesList.length > 0) {
        setLifecycles(lifecyclesList);
      }
      setStatusesLoading(false);

      console.log("=== PARSED LEADS LIST ===");
      console.log("Total leads count:", leadsList.length);

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

      // Filter leads to show only those assigned to this employee
      const filteredLeads = filterLeadsByEmployee(normalizedLeadsList);
      console.log("=== AFTER FILTERING ===");
      console.log("Filtered leads count:", filteredLeads.length);
      console.log("Original leads count:", leadsList.length);

      setLeads(filteredLeads);

      // No cache updates - data always comes from API
      } catch (err) {
        console.error("Failed to fetch leads:", err);
        alert("Failed to load leads");
        setLeads([]);
      } finally {
        setLeadsLoading(false);
        setStatusesLoading(false);
      }
    };

    void fetchLeads();

    // Reset the ref when component unmounts or key dependencies change
    return () => {
      // Reset ref when pathname or user changes to allow new API call
      if (location.pathname !== apiCallMadeRef.current.pathname || 
          currentUserId !== apiCallMadeRef.current.userId) {
        apiCallMadeRef.current = { pathname: null, userId: null, called: false };
      }
    };
  }, [location.pathname, currentUserId]);

  // Use ref to store currentUserId so event listener always has latest value
  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Refetch leads from API when needed (no cache usage)
  // Note: This component always fetches fresh data from API, no cache dependencies

  // Handler to update lead status
  const handleStatusChange = async (lead, newStatusId) => {
    setActionLoading(true);
    setActionMessage("Updating status...");
    try {
      const leadId = lead.id;

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
      setActionLoading(false);
      setActionMessage("");
    }
  };

  // Handler to update lifecycle
  const handleLifecycleChange = async (lead, newLifecycleId) => {
    setLifecycleUpdatingLeadId(lead.id);
    setActionLoading(true);
    setActionMessage("Updating lifecycle...");
    try {
      const leadId = lead.id;

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

        // Update local state with merged data
        setLeads((prevLeads) => {
          const leadIndex = prevLeads.findIndex((l) => l.id === leadId);
          if (leadIndex >= 0) {
            const newLeads = [...prevLeads];
            newLeads[leadIndex] = mergedLead;
            return newLeads;
          }
          return prevLeads;
        });
      } else {
        // If API response is empty, just update the lifecycle field locally
        setLeads((prevLeads) => {
          const leadIndex = prevLeads.findIndex((l) => l.id === leadId);
          if (leadIndex >= 0) {
            const newLeads = [...prevLeads];
            newLeads[leadIndex] = {
              ...currentLead,
              lifecycle: lifecycleIdValue || null,
              lifecycle_id: lifecycleIdValue || null,
              lifecycleId: lifecycleIdValue || null,
            };
            return newLeads;
          }
          return prevLeads;
        });
      }

      notifySuccess("Lead lifecycle updated successfully");
    } catch (error) {
      console.error("Failed to update lead lifecycle:", error);
      notifyError("Failed to update lead lifecycle");
    } finally {
      setLifecycleUpdatingLeadId(null);
      setActionLoading(false);
      setActionMessage("");
    }
  };

  // Handler to update follow-up status
  const handleFollowUpStatusChange = async (lead, newFollowUpStatus) => {
    setActionLoading(true);
    setActionMessage("Updating follow-up status...");
    try {
      const leadId = lead.id;

      // Handle "None" - try null instead of empty string if API doesn't accept empty strings
      const statusValue =
        newFollowUpStatus === "" ||
        newFollowUpStatus === null ||
        newFollowUpStatus === undefined
          ? null
          : newFollowUpStatus;

      // If setting to "None" (null), use PUT endpoint with full lead data
      // Otherwise use PATCH endpoint for follow-up-status
      if (statusValue === null) {
        // Get the current lead data to preserve all fields
        const currentLead = leads.find((l) => l.id === leadId);
        if (!currentLead) {
          console.error("Lead not found:", leadId);
          return;
        }

        // Use PUT endpoint to update the lead with null follow_up_status
        const payload = {
          title: currentLead.title || "",
          status: currentLead.status || null,
          source: currentLead.source || "",
          description: currentLead.description || "",
          company_name: currentLead.company_name || "",
          contact_first_name: currentLead.contact_first_name || "",
          contact_last_name: currentLead.contact_last_name || "",
          contact_email: currentLead.contact_email || "",
          contact_phone: currentLead.contact_phone || "",
          contact_position_title: currentLead.contact_position_title || "",
          contact_linkedin_url: currentLead.contact_linkedin_url || "",
          follow_up_at:
            currentLead.follow_up_at || currentLead.followUpAt || null,
          follow_up_status: null, // Explicitly set to null for "None"
        };

        await apiRequest(`/api/leads/${leadId}/`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        // Use the dedicated follow-up-status endpoint for non-null values
        await apiRequest(`/api/leads/${leadId}/follow-up-status/`, {
          method: "PATCH",
          body: JSON.stringify({
            follow_up_status: statusValue,
          }),
        });
      }

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
      setActionLoading(false);
      setActionMessage("");
    }
  };

  // Handler to toggle lead active status
  const handleToggleActive = async (lead) => {
    const leadId = lead.id || lead.pk || lead.uuid;
    if (!leadId) return;

    const currentActive =
      lead.is_always_active ?? lead.always_active ?? false;
    const nextActive = !currentActive;

    setActiveTogglingLeadId(leadId);
    setActionLoading(true);
    setActionMessage("Updating active status...");
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

      alert(`Lead ${newActiveStatus ? "activated" : "deactivated"} successfully`);
    } catch (error) {
      console.error("Failed to toggle lead active status:", error);
      alert("Failed to update lead status");
    } finally {
      setActiveTogglingLeadId(null);
      setActionLoading(false);
      setActionMessage("");
    }
  };

  // Function to get status name from ID
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

  const openEditDialog = (lead) => {
    const leadId = resolveLeadId(lead);
    if (!leadId) return;
    setEditDialog({ open: true, leadId, lead });
  };

  const closeEditDialog = () => setEditDialog({ open: false, leadId: null, lead: null });

  // Helper function to check if a user is an admin
  const isAdminUser = (user) => {
    if (!user || typeof user !== "object") return false;
    return (
      user.is_admin ||
      user.is_staff ||
      user.is_superuser ||
      user.isAdmin ||
      user.isStaff ||
      user.isSuperuser ||
      user.role === 0 ||
      user.role === "0" ||
      user.role === "admin" ||
      user.role === "Admin"
    );
  };

  // Helper function to extract assigned user ID from lead
  const getAssignedUserId = (lead) => {
    let assignedTo =
      lead.assigned_to ||
      lead.assignedTo ||
      lead.assigned_to_id ||
      lead.assignedToId;

    if (assignedTo && typeof assignedTo === "object" && assignedTo !== null) {
      // Check user_details.id first (this is the actual user ID)
      if (assignedTo.user_details && assignedTo.user_details.id) {
        return assignedTo.user_details.id;
      }
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

    return assignedTo;
  };

  // Helper function to check if a lead is assigned to the current employee
  const isLeadAssignedToCurrentEmployee = (lead) => {
    if (!currentUserId) return false;
    
    const assignedUserId = getAssignedUserId(lead);
    if (!assignedUserId) return false;

    // Convert both to strings for comparison
    const assignedToStr = String(assignedUserId).trim();
    const employeeIdStr = String(currentUserId).trim();

    return assignedToStr === employeeIdStr;
  };

  // Helper function to check if a lead is assigned to an admin
  const isLeadAssignedToAdmin = (lead) => {
    const assignedTo = lead.assigned_to || lead.assignedTo;
    
    if (!assignedTo) return false;
    
    // If assigned_to is an object, check if it has admin properties
    if (typeof assignedTo === "object" && assignedTo !== null) {
      return isAdminUser(assignedTo) || isAdminUser(assignedTo.user_details || assignedTo.userDetails || assignedTo.user);
    }
    
    return false;
  };

  const handleLeadUpdated = (updatedLead) => {
    if (!updatedLead) return;
    const updatedId = resolveLeadId(updatedLead);
    if (!updatedId) return;

    // Check if the updated lead is still assigned to the current employee
    const stillAssignedToEmployee = isLeadAssignedToCurrentEmployee(updatedLead);
    const assignedToAdmin = isLeadAssignedToAdmin(updatedLead);

    // If assigned to admin or not assigned to current employee, remove it from the list
    if (assignedToAdmin || !stillAssignedToEmployee) {
      console.log("Lead assigned to admin or different user, removing from employee view:", updatedId);
      setLeads((prev) =>
        prev.filter((lead) => resolveLeadId(lead) !== updatedId)
      );
    } else {
      // Still assigned to current employee, update it
      setLeads((prev) =>
        prev.map((lead) =>
          resolveLeadId(lead) === updatedId ? { ...lead, ...updatedLead } : lead
        )
      );
    }

    // Update cache
    addLeadToCache(updatedLead);
  };

  const handleNavigateToEditLead = (lead) => {
    openEditDialog(lead);
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

      // Try to find in employees array from cache
      const cachedData = getCachedLeadData();
      const employees = cachedData?.employees || [];
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

    // If assignedTo is just an ID (string or number), try to find in employees array from cache
    const assignedToId = assignedTo;
    const cachedData = getCachedLeadData();
    const employees = cachedData?.employees || [];
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

  // Helper to extract an ID from assigned_to structures
  const getEmployeeIdValue = (assignedTo) => {
    if (assignedTo === null || assignedTo === undefined || assignedTo === "") return "";
    if (typeof assignedTo === "object") {
      if (assignedTo.id) return assignedTo.id;
      if (assignedTo.pk) return assignedTo.pk;
      if (assignedTo.uuid) return assignedTo.uuid;
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

  const buildEmployeeLabel = (emp) => {
    if (emp && typeof emp === "object") {
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
      const name = `${firstName} ${lastName}`.trim();
      if (name) return name;
    }
    const id = getEmployeeIdValue(emp);
    return id ? `User ${id}` : "Unknown";
  };

  const handleDeleteLead = async (id) => {
    if (!confirm("Delete this lead?")) return;
    try {
      await apiRequest(`/api/leads/${id}`, { method: "DELETE" });
      setLeads(leads.filter((l) => String(l.id) !== String(id)));
      removeLeadFromCache(id);
    } catch (err) {
      console.error("Failed to delete lead:", err);
      alert("Failed to delete lead. Please try again.");
    }
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


  const assignedFilterOptions = useMemo(() => {
    const options = new Map();
    options.set("All", { value: "All", label: "All" });

    leads.forEach((lead) => {
      const name = getEmployeeName(lead.assigned_to || lead.assignedTo);
      if (name && name !== "None") {
        options.set(name, { value: name, label: name });
      }
    });

    // Also add all employees/admins from cache to ensure admins are included
    const cachedData = getCachedLeadData();
    const employees = cachedData?.employees || [];
    employees.forEach((emp) => {
      const firstName = emp.firstName || emp.first_name || "";
      const lastName = emp.lastName || emp.last_name || "";
      const name = `${firstName} ${lastName}`.trim();
      if (name) {
        options.set(name, { value: name, label: name });
      }
    });

    return Array.from(options.values());
  }, [leads]);

  // Build select options for assignment dropdown (include admins)
  const assignedSelectOptions = useMemo(() => {
    const opts = [];
    const seenIds = new Set();

    const cachedData = getCachedLeadData();
    const employeesFromCache = cachedData?.employees || [];

    // Include employees/admins from cache
    employeesFromCache.forEach((emp) => {
      const id = getEmployeeIdValue(emp);
      if (!id || seenIds.has(String(id))) return;
      seenIds.add(String(id));
      opts.push({ value: String(id), label: buildEmployeeLabel(emp) });
    });

    // Include assigned users from current leads (fallback if not in cache)
    leads.forEach((lead) => {
      const emp = lead.assigned_to || lead.assignedTo;
      const id = getEmployeeIdValue(emp);
      if (!id || seenIds.has(String(id))) return;
      seenIds.add(String(id));
      opts.push({ value: String(id), label: buildEmployeeLabel(emp) });
    });

    return opts;
  }, [leads]);


  // Filter logic
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
        const assignedName = getEmployeeName(lead.assigned_to || lead.assignedTo);
        if (assignedFilter === "None") {
          if (assignedName !== "None") {
            return false;
          }
        } else {
          if (assignedName !== assignedFilter) {
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
  }, [leads, statusFilter, assignedFilter, followUpFilter, q, statuses]);

  // Assign handler (employee can assign to self or admin)
  const handleAssignedChange = async (lead, newAssignedId) => {
    const leadId = resolveLeadId(lead);
    if (!leadId) return;
    setAssignedUpdatingLeadId(leadId);
    try {
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

      let updatedLead = null;
      if (response && typeof response === "object") {
        if (response.lead) {
          updatedLead = response.lead;
        } else if (response.data) {
          updatedLead = response.data.lead || response.data;
        } else {
          updatedLead = { ...lead, ...response };
        }
      } else {
        updatedLead = {
          ...lead,
          assigned_to: payload.assigned_to,
          assignedTo: payload.assigned_to,
        };
      }

      updatedLead = { ...lead, ...updatedLead };

      // If assigned to admin or not assigned to this employee, remove from list
      const assignedToAdmin = isLeadAssignedToAdmin(updatedLead);
      const stillAssignedToEmployee = isLeadAssignedToCurrentEmployee(updatedLead);

      setLeads((prev) =>
        assignedToAdmin || !stillAssignedToEmployee
          ? prev.filter((l) => resolveLeadId(l) !== resolveLeadId(updatedLead))
          : prev.map((l) =>
              resolveLeadId(l) === resolveLeadId(updatedLead) ? { ...l, ...updatedLead } : l
            )
      );

      // Update cache / notify
      addLeadToCache(updatedLead);
    } catch (err) {
      console.error("Failed to assign lead:", err);
      alert("Failed to assign lead. Please try a different user.");
    } finally {
      setAssignedUpdatingLeadId(null);
    }
  };
  

  return (
    <Box>
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
          placeholder="Search by title, name, email, company, source, lifecycle, description, or date..."
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
              <MenuItem
                key={status.id ?? status.pk ?? status.uuid}
                value={status.id ?? status.pk ?? status.uuid}
              >
                {status.name || status.status_name || status.label}
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
          <Button
            size="small"
            variant="outlined"
            color="primary"
            onClick={() => setFollowUpFilter(null)}
            sx={{ height: 40,
              color: "primary",
              fontWeight: "bold"}}
          >
            Reset All
          </Button>
        </Box>
      </Box>

      {/* Leads Table */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: "12px",
          boxShadow: "none",
          width: "100%",
          px: { xs: 2, md: 3 },
          overflowX: "auto",
          maxHeight: "calc(100vh - 240px)",
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
                <TableCell sx={tableHeaderCellStyles}>Lead Lifecycle</TableCell>
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
              {visibleColumns.includes("isActive") && (
                <TableCell
                  sx={{ ...tableHeaderCellStyles, textAlign: "center" }}
                >
                  Active
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
            {leadsLoading || statusesLoading ? (
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
                            disabled={lifecycleUpdatingLeadId === lead.id || actionLoading}
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
                      <TableCell>
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
                          disabled={
                            assignedUpdatingLeadId === resolveLeadId(lead)
                          }
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
                      </TableCell>
                    )}

                    {visibleColumns.includes("followUpAt") && (
                      <TableCell>
                        <FollowUpCell
                          lead={lead}
                          onUpdate={(updatedLead) => {
                            setLeads((prevLeads) =>
                              prevLeads.map((l) =>
                                l.id === lead.id ? { ...l, ...updatedLead } : l
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
                      </TableCell>
                    )}

                    {visibleColumns.includes("isActive") && (
                      <TableCell align="center">
                        <Switch
                          checked={
                            lead.is_always_active || lead.always_active || false
                          }
                          onChange={() => handleToggleActive(lead)}
                          disabled={
                            activeTogglingLeadId ===
                            (lead.id || lead.pk || lead.uuid)
                          }
                          size="small"
                          color="primary"
                        />
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
            handleDeleteLead(menuLead.id);
            handleActionMenuClose();
          }}
          sx={{ color: "error.main" }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

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

      <EditLeadModal
        open={editDialog.open}
        leadId={editDialog.leadId}
        lead={editDialog.lead}
        onClose={closeEditDialog}
        onSuccess={handleLeadUpdated}
      />

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
