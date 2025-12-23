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
} from "@mui/material";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Topbar from "../components/global/Topbar";
import { colors } from "../design-system/tokens";
import { FaLinkedin } from "react-icons/fa";
import VisibilityIcon from "@mui/icons-material/Visibility";
import LeadDetailsModal from "../components/Leads/LeadDetailsModal";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import apiRequest from "../components/services/api";

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
  "assignedTo",
  "followUpAt",
  "followupStatus",
];
const tableHeaderCellStyles = {
  whiteSpace: "nowrap", // correct value
  fontWeight: 700,
};

const tableBodyCellStyles = {
  maxWidth: 150, // adjust based on preference
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export default function AllLeads() {
  const [leads, setLeads] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [anchorEl, setAnchorEl] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    return JSON.parse(localStorage.getItem("leadColumns")) || DEFAULT_COLUMNS;
  });
  const [selectedLead, setSelectedLead] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Lead actions menu
  const [actionAnchorEl, setActionAnchorEl] = useState(null);
  const [menuLead, setMenuLead] = useState(null);

  const actionOpen = Boolean(actionAnchorEl);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const data = await apiRequest("/api/leads/");
        // Handle different response formats
        if (data && Array.isArray(data.leads)) {
          setLeads(data.leads);
        } else if (data && Array.isArray(data)) {
          setLeads(data);
        } else {
          setLeads([]);
        }
      } catch (err) {
        console.error("Failed to fetch leads:", err);
        alert("Failed to load leads");
        setLeads([]);
      }
    };

    fetchLeads();
  }, []);

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

  const navigate = useNavigate();

  const getEmployeeName = (assignedTo) => {
    if (!assignedTo || assignedTo === "None") return "None";

    const employees = JSON.parse(localStorage.getItem("employees")) || [];

    const emp = employees.find((e) => String(e.id) === String(assignedTo));

    return emp ? `${emp.firstName} ${emp.lastName}` : "None";
  };

  const handleDeleteLead = async (id) => {
    if (!confirm("Delete this lead?")) return;
    try {
      await apiRequest(`/api/leads/${id}`, { method: "DELETE" });
      setLeads(leads.filter((l) => String(l.id) !== String(id)));
    } catch (err) {
      console.error("Failed to delete lead:", err);
      alert("Failed to delete lead. Please try again.");
    }
  };

  const handleExportLeadsCSV = () => {
    if (!leads.length) {
      alert("No leads to export");
      return;
    }
    const keys = ALL_COLUMNS.map((c) => c.key);
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

  const handleConvertToProject = async (lead) => {
    try {
      // Only send fields your backend expects
      const newProject = {
        title: lead.title || `${lead.firstName} ${lead.lastName}`,
        status: lead.status,
        description: lead.description || "",
        assignedTo: lead.assignedTo || null,
        startDate: new Date().toISOString(),
        endDate: null, // if backend expects it
      };

      const projectResponse = await apiRequest("/api/projects/", {
        method: "POST",
        body: JSON.stringify(newProject),
        headers: { "Content-Type": "application/json" },
      });

      console.log("Project created:", projectResponse);

      // Delete the lead after successful creation
      await apiRequest(`/api/leads/${lead.id}/`, { method: "DELETE" });
      setLeads(leads.filter((l) => l.id !== lead.id));

      alert(
        `Lead "${
          lead.title || lead.firstName
        }" converted to project successfully!`
      );
      navigate(`/management/projects`);
    } catch (err) {
      console.error("Failed to convert lead:", err);
      alert("Failed to convert lead: " + err.message);
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

  // ===== FILTER LOGIC =====
  const filteredLeads = leads.filter((l) => {
    const qLower = q.trim().toLowerCase();

    if (statusFilter !== "All") {
      if (statusFilter === "None" && l.status && l.status !== "None")
        return false;
      if (statusFilter !== "None" && l.status !== statusFilter) return false;
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
      <Topbar>
        <Typography variant="h5" fontWeight="bold">
          All Leads
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
          <Button variant="outlined" onClick={handleOpenCustomize}>
            Customize Columns
          </Button>
        </Box>
      </Topbar>

      {/* Customize Columns Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseCustomize}
      >
        {ALL_COLUMNS.map((col) => (
          <MenuItem key={col.key}>
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
            <MenuItem value="In Progress">In Progress</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
            <MenuItem value="Rejected">Rejected</MenuItem>
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
                <TableCell sx={tableBodyCellStyles}>Lead Title</TableCell>
              )}

              {visibleColumns.includes("linkedIn") && (
                <TableCell sx={tableBodyCellStyles}>LinkedIn</TableCell>
              )}
              {visibleColumns.includes("status") && (
                <TableCell sx={tableBodyCellStyles}>Status</TableCell>
              )}
              {visibleColumns.includes("assignedTo") && (
                <TableCell sx={tableBodyCellStyles}>Assigned To</TableCell>
              )}
              {visibleColumns.includes("followUpAt") && (
                <TableCell sx={tableBodyCellStyles}>Follow-up At</TableCell>
              )}
              {visibleColumns.includes("followupStatus") && (
                <TableCell sx={tableBodyCellStyles}>Follow-up Status</TableCell>
              )}
              {visibleColumns.includes("source") && (
                <TableCell sx={tableBodyCellStyles}>Source</TableCell>
              )}
              {visibleColumns.includes("description") && (
                <TableCell sx={{ tableBodyCellStyles }}>Description</TableCell>
              )}
              {visibleColumns.includes("company") && (
                <TableCell sx={tableBodyCellStyles}>Company</TableCell>
              )}
              {visibleColumns.includes("firstName") && (
                <TableCell sx={tableBodyCellStyles}>First Name</TableCell>
              )}
              {visibleColumns.includes("lastName") && (
                <TableCell sx={tableBodyCellStyles}>Last Name</TableCell>
              )}
              {visibleColumns.includes("email") && (
                <TableCell sx={tableBodyCellStyles}>Email</TableCell>
              )}
              {visibleColumns.includes("phone") && (
                <TableCell sx={tableBodyCellStyles}>Phone</TableCell>
              )}
              {visibleColumns.includes("positionTitle") && (
                <TableCell sx={tableBodyCellStyles}>Position Title</TableCell>
              )}

              <TableCell sx={{ ...tableBodyCellStyles, textAlign: "center" }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 1} align="center">
                  No leads found.
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => {
                console.log(lead);
                return (
                  <TableRow key={lead.id}>
                    {visibleColumns.includes("title") && (
                      <TableCell>{lead.title}</TableCell>
                    )}

                    {visibleColumns.includes("linkedIn") && (
                      <TableCell>
                        {lead.linkedIn ? (
                          <a
                            href={lead.linkedIn}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: "none", color: "#0A66C2" }}
                          >
                            <FaLinkedin size={24} />
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    )}

                    {visibleColumns.includes("status") && (
                      <TableCell>
                        <Chip
                          label={lead.status || "None"}
                          sx={getChipStyles(lead.status)}
                          size="small"
                        />
                      </TableCell>
                    )}

                    {visibleColumns.includes("assignedTo") && (
                      <TableCell>{getEmployeeName(lead.assignedTo)}</TableCell>
                    )}

                    {visibleColumns.includes("followUpAt") && (
                      <TableCell>
                        {lead.followUpAt
                          ? new Date(lead.followUpAt).toLocaleDateString()
                          : "-"}
                      </TableCell>
                    )}

                    {visibleColumns.includes("followupStatus") && (
                      <TableCell>{lead.followupStatus || "-"}</TableCell>
                    )}

                    {visibleColumns.includes("source") && (
                      <TableCell>{lead.source || "-"}</TableCell>
                    )}

                    {visibleColumns.includes("description") && (
                      <TableCell>
                        {lead.description.length > 50
                          ? lead.description.slice(0, 50) + "..."
                          : lead.description}
                      </TableCell>
                    )}

                    {visibleColumns.includes("company") && (
                      <TableCell>{lead.company || "-"}</TableCell>
                    )}

                    {visibleColumns.includes("firstName") && (
                      <TableCell>{lead.firstName || "-"}</TableCell>
                    )}

                    {visibleColumns.includes("lastName") && (
                      <TableCell>{lead.lastName || "-"}</TableCell>
                    )}

                    {visibleColumns.includes("email") && (
                      <TableCell>{lead.email || "-"}</TableCell>
                    )}

                    {visibleColumns.includes("phone") && (
                      <TableCell>{lead.phone || "-"}</TableCell>
                    )}

                    {visibleColumns.includes("positionTitle") && (
                      <TableCell>{lead.positionTitle || "-"}</TableCell>
                    )}

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
            navigate(`/edit-lead/${menuLead.id}`);
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
            handleDeleteLead(menuLead.id);
            handleActionMenuClose();
          }}
          sx={{ color: "error.main" }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      <LeadDetailsModal
        open={isModalOpen}
        onClose={handleCloseModal}
        lead={selectedLead}
        getEmployeeName={getEmployeeName}
      />
    </Box>
  );
}
