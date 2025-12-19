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
  Card,
  CardContent,
} from "@mui/material";
import { useEffect, useState } from "react";
import { colors } from "../../design-system/tokens";

export default function ProjectCompletionTable() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const projects = JSON.parse(localStorage.getItem("projects")) || [];
    const employees = JSON.parse(localStorage.getItem("employees")) || [];

    const getEmployeeName = (id) => {
      const emp = employees.find((e) => String(e.id) === String(id));
      return emp ? `${emp.firstName} ${emp.lastName}` : null;
    };

    const counts = {};
    projects.forEach((proj) => {
      if (proj.status === "Completed") {
        const name = getEmployeeName(proj.assignedTo);
        if (name) counts[name] = (counts[name] || 0) + 1;
      }
    });

    const tableData = Object.entries(counts)
      .map(([assignedTo, count]) => ({ assignedTo, count }))
      .sort((a, b) => b.count - a.count);

    setData(tableData);
  }, []);

  if (data.length === 0) {
    return (
      <Box mt={2}>
        <Typography>No completed projects available.</Typography>
      </Box>
    );
  }

  const getRowColor = (index) => {
    const colors = ["#FDE2E2", "#E0F7FA", "#FFF3E0", "#E8F5E9", "#F3E5F5"];
    return colors[index % colors.length];
  };

  return (
    <Card
      sx={{
        borderRadius: "12px",
        padding: 4,
        backgroundColor: "#fff",
        height: "350px",
        boxShadow: "none",
      }}
    >
      <CardContent
        sx={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        {/* Title */}
        <Typography fontWeight="bold">Project Completion Chart</Typography>

        {/* Scrollable table area (SAME as Ongoing Projects) */}
        <Box
          spacing={2}
          mt={2}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <TableContainer
            sx={{
              maxHeight: "135px", // shows header + top 3 rows
              overflowY: "auto",
            }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      backgroundColor: "#1976d2",
                      color: "#fff",
                      fontWeight: "bold",
                    }}
                  >
                    Rank #
                  </TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: "#1976d2",
                      color: "#fff",
                      fontWeight: "bold",
                    }}
                  >
                    Assigned To
                  </TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: "#1976d2",
                      color: "#fff",
                      fontWeight: "bold",
                    }}
                  >
                    Projects Completed
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.map((row, index) => (
                  <TableRow
                    key={index}
                    sx={{ backgroundColor: getRowColor(index) }}
                  >
                    <TableCell
                      sx={{
                        textAlign: "center",
                        color: colors.blueAccent[100],
                        fontWeight: "bold",
                      }}
                    >
                      {index + 1}
                    </TableCell>
                    <TableCell>{row.assignedTo}</TableCell>
                    <TableCell sx={{ textAlign: "center" }}>
                      {row.count}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Optional bottom spacing (keeps symmetry) */}
        <Box mt={2} />
      </CardContent>
    </Card>
  );
}
