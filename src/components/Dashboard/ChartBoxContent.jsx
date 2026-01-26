import { useMemo } from "react";
import { Card, CardContent, Typography, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from "@mui/material";
import { getColors } from "../../design-system/tokens";
import { useTheme } from "../../contexts/ThemeContext";

export default function ChartBoxContent({ data }) {
  const { mode } = useTheme();
  const colors = getColors(mode);
  const isDark = mode === "dark";
  const headingColor = isDark ? colors.primary[100] : colors.primary[100];
  const subTextColor = isDark ? colors.grey[200] : colors.primary[200];
  const cardBackground = isDark ? colors.primary[500] : colors.bg[100];
  const tableHeaderBg = isDark ? colors.primary[600] : colors.blueAccent[500];
  const tableRowBg = isDark ? colors.primary[500] : colors.bg[100];
  const borderColor = isDark ? colors.grey[700] : colors.grey[300];
  const rowTextColor = isDark ? headingColor : "#000000"; // Black in light mode
  const rowSubTextColor = isDark ? subTextColor : "#000000"; // Black in light mode

  // Extract data from props (from /api/common/dashboard/)
  const leadStatuses = data?.lead_statuses || [];
  const totalLeadsCount = data?.total_leads_count || 0;

  // Prepare table data with status name, count, and percentage
const tableData = useMemo(() => {
  if (!leadStatuses || leadStatuses.length === 0) return [];

  const safeTotal = totalLeadsCount > 0 ? totalLeadsCount : 1;

  return leadStatuses
    .map((status) => {
      const statusName =
        status.status__name ||
        status.status_name ||
        status.name ||
        "Unknown";

      const count = Number(status.count) || 0;
      const percentage = Math.round((count / safeTotal) * 100);

      return {
        name: statusName,
        count,
        percentage,
      };
    })
    .sort((a, b) => b.count - a.count);
}, [leadStatuses, totalLeadsCount]);


  // Check if data is still loading
  const isLoading = data === null || data === undefined;

  if (isLoading) {
    return (
      <Card
        sx={{
          boxShadow: "none",
          borderRadius: "12px",
          padding: 4,
          backgroundColor: cardBackground,
          width: "100%",
          height: "390px",
        }}
      >
        <CardContent
          sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
        >
          <Typography fontWeight="bold" mb={2}>Lead Status Breakdown</Typography>
          <Typography sx={{ color: subTextColor }}>...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        boxShadow: "none",
        borderRadius: "12px",
        padding: 4,
        backgroundColor: cardBackground,
        width: "100%",
        height: "390px",
      }}
    >
      <CardContent
        sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: 'stretch' }}
      >
        <Typography fontWeight="bold" mb={2}>Lead Status Breakdown</Typography>

        {tableData.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              color: subTextColor,
            }}
          >
            <Typography>No status data available</Typography>
          </Box>
        ) : (
          <TableContainer
            component={Paper}
            sx={{
              backgroundColor: "transparent",
              boxShadow: "none",
              borderRadius: "8px",
              width: "100%",
              flex: 1,
              overflowY: "auto",
              overflowX: "auto",
            }}
          >
            <Table sx={{ width: '100%', tableLayout: 'auto' }}>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      color: headingColor,
                      backgroundColor: tableHeaderBg,
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                      borderBottom: `1px solid ${borderColor}`,
                    }}
                  >
                    Status Name
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 700,
                      color: headingColor,
                      backgroundColor: tableHeaderBg,
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                      borderBottom: `1px solid ${borderColor}`,
                    }}
                  >
                    Count
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 700,
                      color: headingColor,
                      backgroundColor: tableHeaderBg,
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                      borderBottom: `1px solid ${borderColor}`,
                    }}
                  >
                    Percentage
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tableData.map((row, index) => (
                  <TableRow
                    key={row.name}
                    sx={{
                      backgroundColor: index % 2 === 0 ? tableRowBg : (isDark ? colors.primary[600] : colors.grey[50]),
                      "&:hover": {
                        backgroundColor: isDark ? colors.blueAccent[500] : colors.grey[800],
                      },
                      borderBottom: `1px solid ${borderColor}`,
                    }}
                  >
                    <TableCell
                      sx={{
                        color: rowTextColor,
                        borderBottom: `1px solid ${borderColor}`,
                      }}
                    >
                      {row.name}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: rowTextColor,
                        fontWeight: 600,
                        borderBottom: `1px solid ${borderColor}`,
                      }}
                    >
                      {row.count}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: rowSubTextColor,
                        fontWeight: 600,
                        borderBottom: `1px solid ${borderColor}`,
                      }}
                    >
                      {row.percentage}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Typography
          variant="caption"
          sx={{
            color: subTextColor,
            mt: 2,
            display: "block",
            fontSize: 13,
          }}
        >
          Tracking {totalLeadsCount} lead{totalLeadsCount === 1 ? "" : "s"}
        </Typography>
      </CardContent>
    </Card>
  );
}
