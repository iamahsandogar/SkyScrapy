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
  FormControlLabel,
  Checkbox,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
} from "@mui/material";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import AddIcon from "@mui/icons-material/Add";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import { useEffect, useState, useMemo } from "react";
import apiRequest from "../services/api";
import { useNotification } from "../../contexts/NotificationContext.jsx";
import { useNavigate } from "react-router-dom";
import Topbar from "../global/Topbar";
import { colors } from "../../design-system/tokens";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import ProjectDetailsModal from "./ProjectDetailsModal";
import LeadNotesChat from "../Leads/LeadNotesChat";
import { FaComment, FaLinkedin } from "react-icons/fa";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import MoreHorizonIcon from "@mui/icons-material/MoreHoriz";
import Menu from "@mui/material/Menu";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

const getChipStyles = (status) => {
  switch (status) {
    case "Completed":
      return {
        backgroundColor: colors.greenAccent[700],
        color: colors.greenAccent[300],
        border: `1px solid ${colors.greenAccent[400]}`,
      };
    case "Pending":
      return {
        backgroundColor: colors.yellowAccent[700],
        color: colors.yellowAccent[300],
        border: `1px solid ${colors.yellowAccent[400]}`,
      };
    case "Rejected":
      return {
        backgroundColor: colors.redAccent[700],
        color: colors.redAccent[300],
        border: `1px solid ${colors.redAccent[400]}`,
      };
    case "In Progress":
      return {
        backgroundColor: colors.blueAccent[700],
        color: colors.blueAccent[300],
        border: `1px solid ${colors.blueAccent[400]}`,
      };
    default:
      return {
        backgroundColor: colors.grey[700],
        color: colors.grey[300],
        border: `1px solid ${colors.grey[400]}`,
      };
  }
};

export default function AllProjects() {
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [assignedFilter, setAssignedFilter] = useState("All");
  const [followUpFilter, setFollowUpFilter] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [employees, setEmployees] = useState([]);

  const ALL_COLUMNS = [
    { key: "title", label: "Lead Title" },
    { key: "linkedIn", label: "LinkedIn" },
    { key: "status", label: "Lead Status" },
    { key: "assignedTo", label: "Assigned To" },
    { key: "followUpAt", label: "Follow-up At" },
    { key: "followupStatus", label: "Follow-up Status" },
    { key: "isActive", label: "Active" },
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
    "isActive",
  ];

  const [colAnchorEl, setColAnchorEl] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("projectColumns")) || null;
      return Array.isArray(stored) && stored.length
        ? stored.includes("isActive")
          ? stored
          : [...stored, "isActive"]
        : DEFAULT_COLUMNS;
    } catch (e) {
      return DEFAULT_COLUMNS;
    }
  });
  const tableMinWidth = Math.max(visibleColumns.length * 200, 1000);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesDialogProject, setNotesDialogProject] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, project: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuProject, setMenuProject] = useState(null);

  const open = Boolean(anchorEl);
  const colOpen = Boolean(colAnchorEl);

  const handleMenuOpen = (event, project) => {
    setAnchorEl(event.currentTarget);
    setMenuProject(project);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuProject(null);
  };

  const handleViewProject = (project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedProject(null);
    setIsModalOpen(false);
  };

  const { notifyError, notifySuccess } = useNotification();

  // Load projects from API (no cache)
  useEffect(() => {
    const fetchProjects = async () => {
      setProjectsLoading(true);
      try {
        const data = await apiRequest("/api/leads/projects/");
        console.log("=== PROJECTS API RESPONSE ===", data);
        const list = data?.projects || data?.results || data || [];
        console.log("=== PARSED PROJECTS LIST ===", list);
        console.log("=== PROJECTS COUNT ===", Array.isArray(list) ? list.length : 0);
        setProjects(Array.isArray(list) ? list : []);

        // Extract statuses and employees from the API response
        if (data?.statuses && Array.isArray(data.statuses)) {
          setStatuses(data.statuses);
        }
        if (data?.users && Array.isArray(data.users)) {
          setEmployees(data.users);
        } else if (data?.employees && Array.isArray(data.employees)) {
          setEmployees(data.employees);
        }
      } catch (err) {
        console.error("Failed to load projects:", err);
        notifyError("Failed to load projects");
        setProjects([]);
        setProjectsLoading(false);
      } finally {
        setProjectsLoading(false);
      }
    };
    fetchProjects();
  }, []);

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

      // Try to find in employees array
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

  // Convert project back to lead (admin-only action handled by backend)
  const handleConvertToLead = async (project) => {
    const id = project?.id || project?.pk || project?.uuid;
    if (!id) return;
    setActionLoading(true);
    try {
      await apiRequest(`/api/leads/${id}/convert-to-project/`, {
        method: "POST",
        body: JSON.stringify({ is_project: false }),
      });
      setProjects((prev) => prev.filter((p) => String(p.id) !== String(id)));
      notifySuccess("Project converted to lead successfully");
    } catch (err) {
      console.error("Convert to lead failed:", err);
      const status = err?.status;
      if (status === 403) notifyError("You do not have permission to convert this project");
      else if (status === 400) notifyError(err.message || "Invalid request for conversion");
      else notifyError(err.message || "Failed to convert project to lead");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProject = async (id) => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await apiRequest(`/api/leads/${id}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => String(p.id) !== String(id)));
      setDeleteDialog({ open: false, project: null });
      notifySuccess("Project deleted successfully");
    } catch (err) {
      console.error("Failed to delete project:", err);
      notifyError("Failed to delete project. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Column customization handlers
  const handleOpenCustomize = (e) => setColAnchorEl(e.currentTarget);
  const handleCloseCustomize = () => setColAnchorEl(null);

  const toggleColumn = (key) => {
    const updated = visibleColumns.includes(key)
      ? visibleColumns.filter((c) => c !== key)
      : [...visibleColumns, key];
    setVisibleColumns(updated);
    localStorage.setItem("projectColumns", JSON.stringify(updated));
  };

  const handleResetColumns = () => {
    setVisibleColumns(DEFAULT_COLUMNS);
    localStorage.setItem("projectColumns", JSON.stringify(DEFAULT_COLUMNS));
  };

  const handleClearColumns = () => {
    setVisibleColumns([]);
    localStorage.setItem("projectColumns", JSON.stringify([]));
  };

  // Export projects CSV
  const handleExportProjectsCSV = () => {
    if (!projects.length) {
      notifyError("No projects to export");
      return;
    }

    const csvColumns = ALL_COLUMNS.map((col) => ({ key: col.key, label: col.label }));
    const headers = csvColumns.map((c) => c.label);
    const rows = projects.map((p) => {
      return csvColumns
        .map((col) => `"${String(getProjectFieldValue(p, col.key) || "").replace(/"/g, '""')}"`)
        .join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `projects_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getProjectFieldValue = (proj, fieldKey) => {
    if (!proj) return "";
    const formatDateTime = (value) => {
      if (!value) return "";
      try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return String(value);
        const dateStr = d.toLocaleDateString("en-US", { year: "numeric", month: "numeric", day: "numeric" });
        const timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
        return `${dateStr}, ${timeStr}`;
      } catch (e) {
        return String(value);
      }
    };
    switch (fieldKey) {
      case "title":
        return proj.title || proj.name || "";
      case "linkedIn":
        return proj.contact_linkedin_url || proj.linkedIn || "";
      case "status":
        const st = proj.status;
        if (typeof st === "object" && st !== null) {
          return st.name || st.label || st.status || st.title || String(st.id);
        }
        return st || "";
      case "assignedTo":
        return getEmployeeName(proj.assigned_to || proj.assignedTo);
      case "followUpAt":
        return formatDateTime(proj.follow_up_at || proj.followUpAt) || "";
      case "followupStatus":
        return proj.follow_up_status || proj.followupStatus || "";
      case "isActive":
        return proj.is_active ?? proj.isActive ?? false;
      case "source":
        return proj.source || "";
      case "lifecycle":
        {
          const v = proj.lifecycle ?? proj.lifecycle_obj ?? proj.lifecycleObj ?? proj.lifecycle_id ?? proj.lifecycleId;
          if (!v && v !== 0) return "";
          if (typeof v === "string") return v;
          if (typeof v === "object" && v !== null) {
            return v.name || v.label || v.title || v.lifecycle || String(v.id || v.pk || v.uuid || "");
          }
          return String(v);
        }
      case "description":
        return proj.description || "";
      case "company":
        return proj.company_name || proj.company || "";
      case "firstName":
        return proj.contact_first_name || proj.firstName || "";
      case "lastName":
        return proj.contact_last_name || proj.lastName || "";
      case "email":
        return proj.contact_email || proj.email || "";
      case "phone":
        return proj.contact_phone || proj.phone || "";
      case "positionTitle":
        return proj.contact_position_title || proj.positionTitle || "";
      default:
        return "";
    }
  };

  // (no local lead->project flow on Projects page)

  const assignedFilterOptions = useMemo(() => {
    const options = new Map();
    options.set("All", { value: "All", label: "All" });

    // Add employees from the employees array
    if (employees && employees.length > 0) {
      employees.forEach((emp) => {
        const firstName = emp.firstName || emp.first_name || "";
        const lastName = emp.lastName || emp.last_name || "";
        const name = `${firstName} ${lastName}`.trim();
        if (name) {
          options.set(name, { value: name, label: name });
        }
      });
    }

    // Also add from projects (in case some employees are not in the employees array)
    projects.forEach((proj) => {
      const name = getEmployeeName(proj.assigned_to || proj.assignedTo);
      if (name && name !== "None") {
        options.set(name, { value: name, label: name });
      }
    });

    return Array.from(options.values());
  }, [projects, employees]);

  const filteredProjects = projects.filter((p) => {
    const qLower = q.trim().toLowerCase();
    
    // STATUS FILTER
    if (statusFilter !== "ALL") {
      let projectStatusId = null;
      
      // Extract status ID from project
      if (typeof p.status === "object" && p.status !== null) {
        projectStatusId = p.status.id || p.status.pk || p.status.uuid || p.status.status_id;
      } else if (p.status !== null && p.status !== undefined && p.status !== "") {
        projectStatusId = p.status;
      }
      
      // If project has no status and filter is not "None", exclude it
      if (projectStatusId === null || projectStatusId === undefined) {
        return false;
      }
      
      // Compare status IDs (handle both string and number comparisons)
      const projectStatusIdStr = String(projectStatusId).trim();
      const filterStatusIdStr = String(statusFilter).trim();
      
      if (projectStatusIdStr !== filterStatusIdStr) {
        // Also try numeric comparison in case one is string and other is number
        const projectStatusIdNum = Number(projectStatusId);
        const filterStatusIdNum = Number(statusFilter);
        if (!isNaN(projectStatusIdNum) && !isNaN(filterStatusIdNum) && projectStatusIdNum === filterStatusIdNum) {
          // Numeric match found, allow it
        } else {
          return false;
        }
      }
    }

    // ASSIGNED TO FILTER
    if (assignedFilter !== "All") {
      const projectAssignedName = getEmployeeName(p.assigned_to || p.assignedTo);
      if (assignedFilter === "None") {
        if (projectAssignedName !== "None") {
          return false;
        }
      } else {
        if (projectAssignedName !== assignedFilter) {
          return false;
        }
      }
    }
    
    // FOLLOW-UP AT FILTER
    if (followUpFilter) {
      const rawFollowUp = p.follow_up_at || p.followUpAt;
      if (!rawFollowUp) {
        return false;
      }
      const projectDateObj = dayjs(rawFollowUp);
      const filterDateObj = dayjs(followUpFilter);
      if (!projectDateObj.isValid() || !filterDateObj.isValid()) {
        return false;
      }
      const projectDate = projectDateObj.format("YYYY-MM-DD");
      const filterDate = filterDateObj.format("YYYY-MM-DD");
      if (projectDate !== filterDate) {
        return false;
      }
    }
    
    // SEARCH FILTER
    if (q) {
      const searchTerm = q.toLowerCase().trim();
      if (!searchTerm) return true;

      // Search in title
      const title = (getProjectFieldValue(p, "title") || "").toLowerCase();
      // Search in email
      const email = (getProjectFieldValue(p, "email") || "").toLowerCase();
      // Search in AssignedTo name
      const assignedToName = getEmployeeName(p.assigned_to || p.assignedTo).toLowerCase();
      // Search in status name
      const statusName = (() => {
        const st = p.status;
        if (typeof st === "object" && st !== null) {
          return (st.name || st.label || st.status || st.title || String(st.id) || "").toLowerCase();
        }
        // If status is an ID, find the status name from statuses array
        if (statuses && statuses.length > 0) {
          const statusId = typeof st === "string" ? parseInt(st, 10) : st;
          const statusObj = statuses.find((s) => {
            const id = s.id || s.pk || s.uuid;
            return id !== undefined && id !== null && (String(id) === String(statusId) || Number(id) === Number(statusId));
          });
          if (statusObj) {
            return (statusObj.name || statusObj.status || statusObj.status_name || statusObj.label || "").toLowerCase();
          }
        }
        return (st || "").toString().toLowerCase();
      })();
      // Search in lifecycle name
      const lifecycleName = (() => {
        const v = p.lifecycle ?? p.lifecycle_obj ?? p.lifecycleObj ?? p.lifecycle_id ?? p.lifecycleId;
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
    
    // If all filters pass, include this project
    return true;
  });
  

  return (
    <Box>
      <Topbar>
        <Typography variant="h5" fontWeight="bold">
          All Projects
        </Typography>
        <Box sx={{ display: { xs: "none", md: "flex" } }} gap={2}>
          <Button
            variant="outlined"
            startIcon={<CloudDownloadIcon />}
            onClick={handleExportProjectsCSV}
          >
            Export Projects CSV
          </Button>
          <Button variant="outlined" onClick={handleOpenCustomize}>
            Customize Columns
          </Button>
        </Box>
      </Topbar>

      {/* Search & Filter */}
      <Box display="flex" gap={2} mt={2} mb={2}>
        <TextField
          placeholder="Search by title, name, or assigned..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          size="small"
        />
        {/* <FormControl size="small" sx={{ minWidth: 180 }}>
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
        </FormControl> */}

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
            sx={{minWidth: 80, 
              height: 40,
              color: "primary",
              fontWeight: "bold" }}
          >
            Reset All
          </Button>
        </Box>
      </Box>

      {/* Projects Table */}
      
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
          sx={{
            tableLayout: "fixed",
            width: "100%",
            minWidth: tableMinWidth,
            "& td, & th": { whiteSpace: "normal", overflowWrap: "anywhere" },
          }}
        >
          <TableHead>
            <TableRow>
              {ALL_COLUMNS.map((col) =>
                visibleColumns.includes(col.key) ? (
                  <TableCell
                    key={col.key}
                    sx={{
                      fontWeight: 700,
                      ...(col.key === "assignedTo"
                        ? { minWidth: 220, pr: 2 }
                        : {}),
                      ...(col.key === "followUpAt" ? { minWidth: 180 } : {}),
                    }}
                  >
                    {col.label}
                  </TableCell>
                ) : null
              )}
              <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>
                Notes
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 700,
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
            {projectsLoading ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 2} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={40} />
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    Loading projects from API...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredProjects.length === 0 && projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 2} align="center">
                  No projects found.
                </TableCell>
              </TableRow>
            ) : filteredProjects.length === 0 && projects.length > 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 2} align="center">
                  No projects match the current filters. ({projects.length} total projects)
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((proj) => (
                <TableRow key={proj.id}>
                  {ALL_COLUMNS.map((col) =>
                    visibleColumns.includes(col.key) ? (
                      <TableCell
                        key={col.key}
                        sx={{
                          ...(col.key === "assignedTo"
                            ? { minWidth: 220, pr: 2 }
                            : {}),
                          ...(col.key === "followUpAt"
                            ? { minWidth: 180 }
                            : {}),
                        }}
                      >
                        {col.key === "linkedIn"
                          ? (() => {
                              const url = getProjectFieldValue(
                                proj,
                                "linkedIn"
                              );
                              return url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
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
                            })()
                          : col.key === "description"
                          ? (() => {
                              const d =
                                getProjectFieldValue(proj, "description") || "";
                              return d.length > 50
                                ? d.slice(0, 50) + "..."
                                : d || "-";
                            })()
                          : col.key === "isActive"
                          ? getProjectFieldValue(proj, "isActive")
                            ? "Yes"
                            : "No"
                          : getProjectFieldValue(proj, col.key) || "-"}
                      </TableCell>
                    ) : null
                  )}

                  <TableCell align="center">
                    <IconButton
                      size="small"
                      aria-label="Open project notes"
                      onClick={() => {
                        setNotesDialogProject(proj);
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
                      onClick={(e) => handleMenuOpen(e, proj)}
                      sx={{ display: "flex", justifyContent: "center" }}
                    >
                      <MoreHorizonIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
        >
          <MenuItem
            onClick={() => {
              handleViewProject(menuProject);
              handleMenuClose();
            }}
          >
            <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
            View
          </MenuItem>

          <MenuItem
            onClick={() => {
              handleConvertToLead(menuProject);
              handleMenuClose();
            }}
          >
            <AssignmentTurnedInIcon fontSize="small" sx={{ mr: 1 }} />
            Convert to Lead
          </MenuItem>

          <MenuItem
            onClick={() => {
              setDeleteDialog({ open: true, project: menuProject });
              handleMenuClose();
            }}
            sx={{ color: "error.main" }}
          >
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </Menu>
        {/* Customize Columns Menu */}
        <Menu
          anchorEl={colAnchorEl}
          open={colOpen}
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
      </TableContainer>
      <Dialog
        open={notesDialogOpen}
        onClose={() => {
          setNotesDialogOpen(false);
          setNotesDialogProject(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {notesDialogProject?.title || "Project Notes"}
        </DialogTitle>
        <DialogContent dividers>
          <LeadNotesChat
            leadId={
              notesDialogProject?.id ||
              notesDialogProject?.pk ||
              notesDialogProject?.uuid ||
              undefined
            }
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setNotesDialogOpen(false);
              setNotesDialogProject(null);
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, project: null })}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          Are you sure you want to delete "
          {deleteDialog.project?.title || "this project"}"?
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialog({ open: false, project: null })}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              const id =
                deleteDialog.project?.id ||
                deleteDialog.project?.pk ||
                deleteDialog.project?.uuid;
              await handleDeleteProject(id);
            }}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              "Delete"
            )}
          </Button>
        </DialogActions>
      </Dialog>
      <ProjectDetailsModal
        open={isModalOpen}
        onClose={handleCloseModal}
        project={selectedProject}
        getEmployeeName={getEmployeeName}
      />
    </Box>
  );
}
