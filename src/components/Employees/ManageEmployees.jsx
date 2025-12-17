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
const getActionButtonStyles = (action) => {
  switch (action) {
    case "activate":
      return {
        backgroundColor: colors.greenAccent[800],
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

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("employees")) || [];
    setEmployees(data);
  }, []);

  const updateStorage = (data) => {
    localStorage.setItem("employees", JSON.stringify(data));
    setEmployees(data);
  };

  const toggleStatus = (id, currentStatus) => {
    const action = currentStatus === "Active" ? "deactivate" : "activate";

    if (!window.confirm(`Are you sure you want to ${action} this employee?`))
      return;

    const updated = employees.map((emp) =>
      emp.id === id
        ? {
            ...emp,
            status: currentStatus === "Active" ? "Deactivated" : "Active",
          }
        : emp
    );

    updateStorage(updated);
  };

  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this employee?"))
      return;

    const updated = employees.filter((emp) => emp.id !== id);
    updateStorage(updated);
  };

  return (
    <>
      <Topbar>
        <Typography variant="h5" fontWeight="bold">
          Employee Management
        </Typography>
      </Topbar>

      <Paper sx={{ p: 2, borderRadius: 3, mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#dbeafe" }}>
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
              <TableRow key={emp.id}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar>{emp.firstName[0]}</Avatar>
                    {emp.firstName} {emp.lastName}
                  </Box>
                </TableCell>

                <TableCell>{emp.email}</TableCell>

                <TableCell>
                  <Chip
                    label={emp.status}
                    color={emp.status === "Active" ? "success" : "default"}
                  />
                </TableCell>

                <TableCell>
                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => toggleStatus(emp.id, emp.status)}
                      sx={{
                        ...getActionButtonStyles(
                          emp.status === "Active" ? "deactivate" : "activate"
                        ),
                        textTransform: "none",
                        fontWeight: "bold",
                        borderRadius: 1,
                      }}
                    >
                      {emp.status === "Active" ? "Deactivate" : "Activate"}
                    </Button>

                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleDelete(emp.id)}
                      sx={{
                        ...getActionButtonStyles("delete"),
                        textTransform: "none",
                        fontWeight: "bold",
                        borderRadius: 1,
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
      </Paper>
    </>
  );
}
