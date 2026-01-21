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
import { useEffect, useState } from "react";
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
  const [actionLoading, setActionLoading] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

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

  // Load projects from API
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await apiRequest("/api/leads/projects/");
        const list = data?.projects || data?.results || data || [];
        setProjects(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Failed to load projects:", err);
        notifyError("Failed to load projects");
        setProjects([]);
      }
    };
    fetchProjects();
  }, []);

  const getEmployeeName = (assignedTo) => {
    if (!assignedTo && assignedTo !== 0) return "None";
    if (typeof assignedTo === "object") {
      const first = assignedTo.firstName || assignedTo.first_name || assignedTo.name || "";
      const last = assignedTo.lastName || assignedTo.last_name || "";
      const name = `${first} ${last}`.trim();
      if (name) return name;
      // Try nested user object
      const user = assignedTo.user || assignedTo.user_details;
      if (user) return `${user.first_name || user.firstName || ""} ${user.last_name || user.lastName || ""}`.trim() || "None";
    }
    // If it's an id or string, return as-is
    return String(assignedTo);
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

  const filteredProjects = projects.filter((p) => {
    const qLower = q.trim().toLowerCase();
    if (statusFilter !== "All" && p.status !== statusFilter) return false;
    if (!qLower) return true;
    // Search across many fields for parity with AllLeads
    return (
      (getProjectFieldValue(p, "title") || "").toLowerCase().includes(qLower) ||
      (getProjectFieldValue(p, "company") || "").toLowerCase().includes(qLower) ||
      (getProjectFieldValue(p, "firstName") || "").toLowerCase().includes(qLower) ||
      (getProjectFieldValue(p, "lastName") || "").toLowerCase().includes(qLower) ||
      (getProjectFieldValue(p, "email") || "").toLowerCase().includes(qLower)
    );
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
        <FormControl size="small">
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="None">None</MenuItem>
            <MenuItem value="In Progress">In Progress</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
            <MenuItem value="Rejected">Rejected</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Projects Table */}
      <Typography variant="h6" mt={2} mb={1}>
        Projects
      </Typography>
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
            {filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 2} align="center">
                  No projects found.
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
