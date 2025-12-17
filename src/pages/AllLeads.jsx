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

  const navigate = useNavigate();

  useEffect(() => {
    setLeads(JSON.parse(localStorage.getItem("leads")) || []);
  }, []);

  const handleDeleteLead = (id) => {
    if (!confirm("Delete this lead?")) return;
    const next = leads.filter((l) => String(l.id) !== String(id));
    localStorage.setItem("leads", JSON.stringify(next));
    setLeads(next);
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

  const handleConvertToProject = (lead) => {
    const newProject = {
      id: Date.now(),
      title: lead.title || `${lead.firstName} ${lead.lastName}`,
      status: lead.status,
      description: lead.description || "",
      assignedTo: lead.assignedTo || "",
      startDate: new Date().toISOString(),
      endDate: "",
    };

    const savedProjects = JSON.parse(localStorage.getItem("projects")) || [];
    savedProjects.push(newProject);
    localStorage.setItem("projects", JSON.stringify(savedProjects));

    const remainingLeads = leads.filter((l) => l.id !== lead.id);
    localStorage.setItem("leads", JSON.stringify(remainingLeads));
    setLeads(remainingLeads);

    alert(
      `Lead "${
        lead.title || lead.firstName
      }" converted to project successfully!`
    );
    navigate(`/management/projects`);
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
                <TableCell sx={tableBodyCellStyles}>Description</TableCell>
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
              filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                  {visibleColumns.includes("title") && (
                    <TableCell>
                      <Typography fontWeight={700}>
                        {lead.title || `${lead.firstName} ${lead.lastName}`}
                      </Typography>
                      <Typography fontSize={12} color="text.secondary">
                        {lead.company} • {lead.email}
                      </Typography>
                    </TableCell>
                  )}

                  {visibleColumns.includes("linkedIn") && (
                    <TableCell>
                      {lead.linkedIn ? (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => window.open(lead.linkedIn, "_blank")}
                        >
                          LinkedIn
                        </Button>
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
                    <TableCell>{lead.assignedTo || "-"}</TableCell>
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
                    <TableCell>{lead.description || "-"}</TableCell>
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
                    <Box display="flex" gap={1}>
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/edit-lead/${lead.id}`)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteLead(lead.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleConvertToProject(lead)}
                      >
                        <AssignmentTurnedInIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
