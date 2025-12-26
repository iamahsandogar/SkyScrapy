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
} from "@mui/material";
import { useEffect, useState } from "react";
import Topbar from "../global/Topbar";
import { colors } from "../../design-system/tokens";
import apiRequest from "../services/api";
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

  /* ------------------------------------
     FETCH EMPLOYEES FROM BACKEND
  -------------------------------------*/
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
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

  /* ------------------------------------
     TOGGLE ACTIVE STATUS
  -------------------------------------*/
  const toggleStatus = async (employee) => {
    const pk = employee.id 
    
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
    const pk = employee.id 
    
    if (!pk) {
      alert("Cannot delete: Employee missing ID");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this employee?"))
      return;

    try {
      await apiRequest(`/ui/employees/${pk}/delete/`, {
        method: "POST",
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
        <Typography variant="h5" fontWeight="bold">
          Employee Management
        </Typography>
      </Topbar>

      <Paper sx={{ p: 2, borderRadius: 3, mt: 2 }}>
        {loading && (
          <Typography color="text.secondary" sx={{ p: 2 }}>
            Loading employees...
          </Typography>
        )}

        {!loading && employees.length === 0 && (
          <Typography color="text.secondary" sx={{ p: 2 }}>
            No employees found.
          </Typography>
        )}

        {!loading && employees.length > 0 && (
          <Table>
            <TableHead>
              <TableRow sx={{}}>
                <TableCell>
                  <b>Employee Details</b>
                </TableCell>
                <TableCell>
                  <b>Email Address</b>
                </TableCell>
                <TableCell>
                  <b>Status</b>
                </TableCell>
                <TableCell>
                  <b>Actions</b>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id || emp.pk || emp.uuid}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar>
                        {emp.firstName?.[0] || emp.first_name?.[0] || "?"}
                      </Avatar>
                      {emp.firstName || emp.first_name} {emp.lastName || emp.last_name}
                    </Box>
                  </TableCell>

                  <TableCell>{emp.email}</TableCell>

                  <TableCell>
                    <Chip
                      label={emp.status || (emp.is_active ? "Active" : "Deactivated")}
                      sx={{
                        backgroundColor:
                          (emp.status === "Active" || emp.is_active)
                            ? colors.greenAccent[900] 
                            : colors.grey[900],
                            color:
                            (emp.status === "Active" || emp.is_active)
                              ? colors.greenAccent[400]
                              : colors.grey[500],
                        fontWeight: "bold",
                      }}
                    />
                  </TableCell>

                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => toggleStatus(emp)}
                        disabled={loading}
                        sx={{
                          ...getActionButtonStyles(
                            (emp.status === "Active" || emp.is_active) ? "deactivate" : "activate"
                          ),
                          textTransform: "none",
                          fontWeight: "bold",
                          borderRadius: 1,
                          boxShadow: "none",
                        }}
                      >
                        {(emp.status === "Active" || emp.is_active) ? "Deactivate" : "Activate"}
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
        )}
      </Paper>
    </>
  );
}
