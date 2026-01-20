import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Menu
} from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Topbar from "../global/Topbar";
import VisibilityIcon from "@mui/icons-material/Visibility";
import MoreHorizonIcon from "@mui/icons-material/MoreHoriz";
import UndoIcon from "@mui/icons-material/Undo";
import ProjectDetailsModal from "./ProjectDetailsModal";
import apiRequest from "../services/api";
import { useNotification } from "../../contexts/NotificationContext";
import ConfirmationDialog from "../global/ConfirmationDialog";

export default function AllProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedProject, setSelectedProject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuProject, setMenuProject] = useState(null);
  const [confirmRevertDialog, setConfirmRevertDialog] = useState({ open: false, project: null });
  const { notifySuccess, notifyError } = useNotification();
  const navigate = useNavigate();

  const open = Boolean(anchorEl);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      console.log("Fetching projects from /api/leads/projects/...");
      const data = await apiRequest("/api/leads/projects/");
      console.log("Projects API Response:", data);

      let projectsList = [];
      if (Array.isArray(data)) {
        projectsList = data;
      } else if (data && Array.isArray(data.results)) {
        projectsList = data.results;
      } else if (data && Array.isArray(data.data)) {
        projectsList = data.data;
      } else if (data && Array.isArray(data.projects)) {
        projectsList = data.projects;
      } else if (data && Array.isArray(data.leads)) {
        projectsList = data.leads;
      }
      
      console.log("Parsed projects list:", projectsList);
      setProjects(projectsList);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      notifyError("Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

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

  const handleRevertToLead = (project) => {
    setConfirmRevertDialog({ open: true, project });
    handleMenuClose();
  };

  const executeRevertToLead = async () => {
    const project = confirmRevertDialog.project;
    if (!project) return;
    
    try {
      await apiRequest(`/api/leads/${project.id}/convert-to-project/`, {
        method: "POST",
        body: JSON.stringify({ is_project: false }),
      });
      notifySuccess("Project reverted to lead successfully");
      // Remove from list immediately
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      // No need to call fetchProjects() as we just removed it
      
      // Redirect to All Leads page
      navigate("/all-leads");
    } catch (err) {
      console.error("Failed to revert project:", err);
      if (err.status === 400) {
        notifyError("Project already reverted or invalid request");
      } else if (err.status === 403) {
        notifyError("You are not authorized to perform this action");
      } else {
        notifyError("Failed to revert project");
      }
    } finally {
        setConfirmRevertDialog({ open: false, project: null });
    }
  };

  // Helper to safely get assigned user name
  const getAssignedName = (project) => {
    if (!project.assigned_to) return "None";
    // Check if assigned_to is an object with user details
    if (typeof project.assigned_to === 'object') {
        if (project.assigned_to.user_details) {
            const { first_name, last_name, email } = project.assigned_to.user_details;
            return `${first_name} ${last_name}`.trim() || email || "Unknown";
        }
        if (project.assigned_to.first_name || project.assigned_to.last_name) {
             return `${project.assigned_to.first_name} ${project.assigned_to.last_name}`.trim();
        }
        return project.assigned_to.email || "Unknown";
    }
    return project.assigned_to; // If it's just an ID or string
  };

  const filteredProjects = projects.filter((p) => {
    const qLower = q.trim().toLowerCase();
    const pStatus = (typeof p.status === 'object' && p.status) ? p.status.name : p.status;
    if (statusFilter !== "All" && pStatus !== statusFilter) return false;
    if (!qLower) return true;
    const title = p.title || "";
    const assigned = getAssignedName(p);
    return (
      title.toLowerCase().includes(qLower) ||
      assigned.toLowerCase().includes(qLower)
    );
  });

  return (
    <Box>
      <Topbar>
        <Typography variant="h5" fontWeight="bold">
          All Projects
        </Typography>
      </Topbar>

      {/* Search & Filter */}
      <Box display="flex" gap={2} mt={2} mb={2}>
        <TextField
          placeholder="Search by title or assigned..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          size="small"
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="All">All</MenuItem>
            {/* We might need to fetch statuses or just hardcode common ones */}
            <MenuItem value="New">New</MenuItem>
            <MenuItem value="In Progress">In Progress</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
             <MenuItem value="Pending">Pending</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Projects Table */}
      <TableContainer
        component={Paper}
        sx={{ borderRadius: "12px", boxShadow: "none" }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Project Title</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Assigned To</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
                <TableRow>
                    <TableCell colSpan={4} align="center">
                        <CircularProgress />
                    </TableCell>
                </TableRow>
            ) : filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No projects found.
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((proj) => (
                <TableRow key={proj.id}>
                  <TableCell>
                    <Typography fontWeight={700}>{proj.title}</Typography>
                  </TableCell>
                  <TableCell>
                    {proj.description && proj.description.length > 50
                      ? proj.description.slice(0, 50) + "..."
                      : proj.description || "-"}
                  </TableCell>
                  <TableCell>{getAssignedName(proj)}</TableCell>

                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, proj)}
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
              handleRevertToLead(menuProject);
            }}
            sx={{ color: "warning.main" }}
          >
            <UndoIcon fontSize="small" sx={{ mr: 1 }} />
            Revert to Lead
          </MenuItem>
        </Menu>
      </TableContainer>
      <ProjectDetailsModal
        open={isModalOpen}
        onClose={handleCloseModal}
        project={selectedProject}
        getEmployeeName={getAssignedName}
      />
      <ConfirmationDialog
        open={confirmRevertDialog.open}
        title="Revert to Lead"
        content={`Are you sure you want to revert "${confirmRevertDialog.project?.title}" to a lead?`}
        onConfirm={executeRevertToLead}
        onCancel={() => setConfirmRevertDialog({ open: false, project: null })}
        confirmText="Revert"
        confirmColor="warning"
      />
    </Box>
  );
}
