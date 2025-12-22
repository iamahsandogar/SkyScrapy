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
} from "@mui/material";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Topbar from "../global/Topbar";
import { colors } from "../../design-system/tokens";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ProjectDetailsModal from "./ProjectDetailsModal";
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
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const navigate = useNavigate();
  const [selectedProject, setSelectedProject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuProject, setMenuProject] = useState(null);

  const open = Boolean(anchorEl);

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

  // Load leads and projects from localStorage
  useEffect(() => {
    setLeads(JSON.parse(localStorage.getItem("leads")) || []);
    setProjects(JSON.parse(localStorage.getItem("projects")) || []);
  }, []);

  const getEmployeeName = (assignedTo) => {
    if (!assignedTo || assignedTo === "None") return "None";

    const employees = JSON.parse(localStorage.getItem("employees")) || [];

    const emp = employees.find((e) => String(e.id) === String(assignedTo));

    return emp ? `${emp.firstName} ${emp.lastName}` : "None";
  };

  // Delete project
  const handleDeleteProject = (id) => {
    if (!confirm("Delete this project?")) return;
    const next = projects.filter((p) => String(p.id) !== String(id));
    localStorage.setItem("projects", JSON.stringify(next));
    setProjects(next);
  };

  // Export leads CSV
  const handleExportLeadsCSV = () => {
    if (!leads.length) {
      alert("No leads to export");
      return;
    }
    const keys = [
      "id",
      "title",
      "status",
      "source",
      "description",
      "followUpAt",
      "followupStatus",
      "assignedTo",
      "company",
      "firstName",
      "lastName",
      "email",
      "phone",
      "positionTitle",
      "linkedIn",
    ];
    const rows = [keys.join(",")].concat(
      leads.map((l) =>
        keys
          .map((k) => `"${(l[k] || "").toString().replace(/"/g, '""')}"`)
          .join(",")
      )
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Convert lead to project
  const handleConvertToProject = (lead) => {
    const newProject = {
      id: Date.now(),
      title: lead.title || `${lead.firstName} ${lead.lastName}`,
      status: "Pending",
      description: lead.description || "",
      assignedTo: lead.assignedTo || "",
      startDate: new Date().toISOString(),
      endDate: "",
    };

    const updatedProjects = [...projects, newProject];
    localStorage.setItem("projects", JSON.stringify(updatedProjects));
    setProjects(updatedProjects);

    const remainingLeads = leads.filter((l) => l.id !== lead.id);
    localStorage.setItem("leads", JSON.stringify(remainingLeads));
    setLeads(remainingLeads);

    alert(
      `Lead "${
        lead.title || lead.firstName
      }" converted to project successfully!`
    );
    navigate(`/edit-project/${newProject.id}`);
  };

  const filteredLeads = leads.filter((l) => {
    const qLower = q.trim().toLowerCase();
    if (statusFilter !== "All") {
      if (statusFilter === "None" && l.status && l.status !== "None")
        return false;
      if (statusFilter !== "None" && l.status !== statusFilter) return false;
    }
    if (!qLower) return true;
    return (
      (l.title || "").toLowerCase().includes(qLower) ||
      (l.firstName || "").toLowerCase().includes(qLower) ||
      (l.lastName || "").toLowerCase().includes(qLower) ||
      (l.email || "").toLowerCase().includes(qLower) ||
      (l.company || "").toLowerCase().includes(qLower) ||
      (l.followUpAt
        ? new Date(l.followUpAt).toLocaleDateString().includes(qLower)
        : false)
    );
  });

  const filteredProjects = projects.filter((p) => {
    const qLower = q.trim().toLowerCase();
    if (statusFilter !== "All" && p.status !== statusFilter) return false;
    if (!qLower) return true;
    return (
      (p.title || "").toLowerCase().includes(qLower) ||
      (p.assignedTo || "").toLowerCase().includes(qLower)
    );
  });

  return (
    <Box>
      <Topbar>
        <Typography variant="h5" fontWeight="bold">
          All Leads & Projects
        </Typography>
        <Box display="flex" gap={2}>
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
            onClick={() => navigate("/create-lead")}
          >
            Add New Lead
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
            {filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
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
                    {proj.description.length > 50
                      ? proj.description.slice(0, 50) + "..."
                      : proj.description}
                  </TableCell>
                  <TableCell>{getEmployeeName(proj.assignedTo)}</TableCell>

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

          {/* <MenuItem
            onClick={() => {
              navigate(`/edit-project/${menuProject.id}`);
              handleMenuClose();
            }}
          >
            <EditIcon fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem> */}

          <MenuItem
            onClick={() => {
              handleDeleteProject(menuProject.id);
              handleMenuClose();
            }}
            sx={{ color: "error.main" }}
          >
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </Menu>
      </TableContainer>
      <ProjectDetailsModal
        open={isModalOpen}
        onClose={handleCloseModal}
        project={selectedProject}
        getEmployeeName={getEmployeeName}
      />
    </Box>
  );
}
