import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Avatar,
  Button,
  Chip,
  TableContainer,
} from "@mui/material";
import { useEffect, useState } from "react";
import Topbar from "../global/Topbar";
import { colors } from "../../design-system/tokens";
import apiRequest from "../services/api";
import { getCachedLeadData } from "../../utils/prefetchData";
import DotLoader from "../global/DotLoader";

const parseLeadPayload = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.leads)) return payload.leads;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.leads)) return payload.data.leads;
  return [];
};

const extractLeadAssignedId = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "object") {
    const idKeys = ["id", "pk", "uuid", "user_id", "assigned_to", "owner_id"];
    for (const key of idKeys) {
      if (value[key] !== undefined && value[key] !== null) {
        return value[key];
      }
    }

    const nestedKeys = ["user", "owner", "employee", "profile"];
    for (const key of nestedKeys) {
      if (value[key]) {
        const nested = extractLeadAssignedId(value[key]);
        if (nested !== null) {
          return nested;
        }
      }
    }
  }
  return null;
};
const getActionButtonStyles = (action) => {
  switch (action) {
    case "activate":
      return {
        backgroundColor: colors.greenAccent[800],
        borderRadius: 1,
        color: colors.grey[100],
        border: `1px solid ${colors.greenAccent[400]}`,
        "&:hover": {
          backgroundColor: colors.greenAccent[700],
        },
      };

    case "deactivate":
      return {
        backgroundColor: colors.yellowAccent[800],
        color: colors.grey[100],
        border: `1px solid ${colors.yellowAccent[400]}`,
        "&:hover": {
          backgroundColor: colors.yellowAccent[700],
        },
      };

    case "delete":
      return {
        backgroundColor: colors.redAccent[700],
        color: colors.grey[100],
        border: `1px solid ${colors.redAccent[500]}`,
        "&:hover": {
          backgroundColor: colors.redAccent[800],
        },
      };

    default:
      return {
        backgroundColor: colors.grey[600],
        color: colors.grey[100],
      };
  }
};

export default function ManageEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const tableCellStyle = { whiteSpace: "nowrap" };

  /* ------------------------------------
     FETCH EMPLOYEES FROM BACKEND
     Uses cached data first for instant loading
  -------------------------------------*/
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    // Try cached data first
    const cachedData = getCachedLeadData();

    if (cachedData?.employees) {
      console.log("Using cached employees for instant loading");
      setEmployees(cachedData.employees);
      setLoading(false);

      // Refresh in background
      try {
        const data = await apiRequest("/ui/employees/");
        const employeesList = data?.employees || data || [];
        setEmployees(employeesList);
      } catch (error) {
        console.error("Failed to refresh employees", error);
        // Keep using cached data if refresh fails
      }
      return;
    }

    // No cache, fetch fresh
    try {
      setLoading(true);
      const data = await apiRequest("/ui/employees/");
      setEmployees(data?.employees || data || []);
    } catch (error) {
      console.error("Failed to load employees", error);
      alert("Failed to load employees");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeesForLookup = () => {
    if (employees.length) return employees;
    const cached = getCachedLeadData();
    return cached?.employees ?? [];
  };

  const loadLeadsForLogging = async () => {
    const cached = getCachedLeadData();
    if (cached?.leads?.length) {
      return cached.leads;
    }

    try {
      const response = await apiRequest("/api/leads/?page_size=200");
      return parseLeadPayload(response);
    } catch (error) {
      console.error("Failed to load leads for logging", error);
      return [];
    }
  };

  const logLeadsForEmail = async (email) => {
    if (!email) return;
    const employeesList = getEmployeesForLookup();
    const employee = employeesList.find(
      (emp) => emp.email && emp.email.toLowerCase() === email.toLowerCase()
    );

    if (!employee) {
      console.warn(`No employee found with email ${email}`);
      return;
    }

    const employeeId = employee.id || employee.pk || employee.uuid;
    if (!employeeId) {
      console.warn("Employee has no identifier to match leads");
      return;
    }

    const leadsList = await loadLeadsForLogging();
    const assignedLeads = leadsList.filter((lead) => {
      const assignedTo =
        lead.assigned_to ??
        lead.assignedTo ??
        lead.assigned_to_id ??
        lead.assignedToId ??
        lead.owner ??
        lead.employee ??
        lead.assigned_user ??
        lead.assignedUser;
      const assignedId = extractLeadAssignedId(assignedTo);
      if (assignedId === null || assignedId === undefined) return false;
      return String(assignedId) === String(employeeId);
    });

    console.group(`Leads assigned to ${email}`);
    console.log(`Employee ID: ${employeeId}`);
    console.log(`Found ${assignedLeads.length} lead(s)`);
    console.table(
      assignedLeads.map((lead) => ({
        id: lead.id ?? lead.pk ?? lead.uuid,
        title: lead.title,
        company: lead.company_name || lead.company,
        follow_up_at: lead.follow_up_at || lead.followUpAt,
      })),
      ["id", "title", "company", "follow_up_at"]
    );
    console.groupEnd();
  };

  const getAvatarStyles = (emp) => {
    const isActive = emp.status === "Active" || emp.is_active;

    return {
      bgcolor: isActive ? colors.blueAccent[700] : colors.grey[700],
      color: colors.bg[100],
      fontWeight: "bold",
    };
  };

  /* ------------------------------------
     TOGGLE ACTIVE STATUS
  -------------------------------------*/
  const toggleStatus = async (employee) => {
    const pk = employee.id;

    if (!pk) {
      alert("Cannot toggle status: Employee missing ID");
      return;
    }

    const action = employee.status === "Active" ? "deactivate" : "activate";

    if (!window.confirm(`Are you sure you want to ${action} this employee?`))
      return;

    try {
      await apiRequest(`/ui/employees/${pk}/toggle-active/`, {
        method: "POST",
      });

      // Refresh the list after successful toggle
      fetchEmployees();
    } catch (error) {
      console.error("Toggle status failed", error);
      alert(error.message || "Failed to toggle employee status");
    }
  };

  /* ------------------------------------
     DELETE EMPLOYEE
  -------------------------------------*/
  const handleDelete = async (employee) => {
    const pk = employee.id;

    if (!pk) {
      alert("Cannot delete: Employee missing ID");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this employee?"))
      return;

    try {
      await apiRequest(`/ui/employees/${pk}/delete/`, {
        method: "POST",
        body: JSON.stringify({
          email: employee.email,
        }),
      });

      // Refresh the list after successful deletion
      fetchEmployees();
    } catch (error) {
      console.error("Delete failed", error);
      alert(error.message || "Failed to delete employee");
    }
  };

  return (
    <>
      <Topbar>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          width="100%"
        >
          <Typography variant="h5" fontWeight="bold">
            Employee Management
          </Typography>
        </Box>
      </Topbar>

      <Paper sx={{ p: 2, borderRadius: 3, mt: 2, boxShadow: "none" }}>
        {loading ? (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            gap={1}
            py={4}
          >
            <DotLoader size={48} color={colors.blueAccent[500]} />
            <Typography color="text.secondary">Loading employees...</Typography>
          </Box>
        ) : employees.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 2 }}>
            No employees found.
          </Typography>
        ) : (
          <Box sx={{ width: "100%", overflowX: "auto" }}>
            <TableContainer sx={{ minWidth: 800 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={tableCellStyle}>
                      <b>Employee Details</b>
                    </TableCell>
                    <TableCell sx={tableCellStyle}>
                      <b>Email Address</b>
                    </TableCell>
                    <TableCell sx={tableCellStyle}>
                      <b>Status</b>
                    </TableCell>
                    <TableCell sx={tableCellStyle}>
                      <b>Actions</b>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id || emp.pk || emp.uuid}>
                      <TableCell sx={tableCellStyle}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={getAvatarStyles(emp)}>
                            {emp.firstName?.[0] || emp.first_name?.[0] || "?"}
                          </Avatar>
                          {emp.firstName || emp.first_name}{" "}
                          {emp.lastName || emp.last_name}
                        </Box>
                      </TableCell>

                      <TableCell sx={tableCellStyle}>{emp.email}</TableCell>

                      <TableCell sx={tableCellStyle}>
                        <Chip
                          label={
                            emp.status ||
                            (emp.is_active ? "Active" : "Deactivated")
                          }
                          sx={{
                            backgroundColor:
                              emp.status === "Active" || emp.is_active
                                ? colors.greenAccent[900]
                                : colors.grey[900],
                            color:
                              emp.status === "Active" || emp.is_active
                                ? colors.greenAccent[400]
                                : colors.grey[500],
                            border: `1px solid ${
                              emp.status === "Active" || emp.is_active
                                ? colors.greenAccent[400]
                                : colors.grey[500]
                            }`,
                            fontWeight: "bold",
                          }}
                        />
                      </TableCell>

                      <TableCell sx={tableCellStyle}>
                        <Box display="flex" gap={1}>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => toggleStatus(emp)}
                            disabled={loading}
                            sx={{
                              ...getActionButtonStyles(
                                emp.status === "Active" || emp.is_active
                                  ? "deactivate"
                                  : "activate"
                              ),
                              textTransform: "none",
                              fontWeight: "bold",
                              borderRadius: 1,
                              boxShadow: "none",
                            }}
                          >
                            {emp.status === "Active" || emp.is_active
                              ? "Deactivate"
                              : "Activate"}
                          </Button>

                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleDelete(emp)}
                            disabled={loading}
                            sx={{
                              ...getActionButtonStyles("delete"),
                              textTransform: "none",
                              fontWeight: "bold",
                              borderRadius: 1,
                              boxShadow: "none",
                            }}
                          >
                            Delete
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>
    </>
  );
}
