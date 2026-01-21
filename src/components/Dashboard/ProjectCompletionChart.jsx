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
import apiRequest from "../services/api";

export default function ProjectCompletionTable() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchAndCompute = async () => {
      try {
        const data = await apiRequest("/api/leads/projects/");
        const projects = data?.projects || data?.results || data || [];

        const getEmployeeName = (assigned) => {
          if (!assigned && assigned !== 0) return null;
          if (typeof assigned === "object") {
            const first = assigned.firstName || assigned.first_name || assigned.name || "";
            const last = assigned.lastName || assigned.last_name || "";
            const name = `${first} ${last}`.trim();
            return name || null;
          }
          return String(assigned);
        };

        const counts = {};
        (Array.isArray(projects) ? projects : []).forEach((proj) => {
          const status = proj.status || proj.project_status || "";
          if (String(status).toLowerCase().includes("completed")) {
            const name = getEmployeeName(proj.assigned_to || proj.assignedTo || proj.assignedToId || proj.assigned_to_id);
            if (name) counts[name] = (counts[name] || 0) + 1;
          }
        });

        const tableData = Object.entries(counts)
          .map(([assignedTo, count]) => ({ assignedTo, count }))
          .sort((a, b) => b.count - a.count);

        setData(tableData);
      } catch (err) {
        console.error("Failed to load projects for completion chart:", err);
        setData([]);
      }
    };

    fetchAndCompute();
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
                width: "fit-content",
                maxWidth: "100%",
                display: "inline-block",
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
