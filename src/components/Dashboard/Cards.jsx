import { Box, Paper, Typography } from "@mui/material";
import { getColors } from "../../design-system/tokens";
import { useTheme } from "../../contexts/ThemeContext";

const normalizeText = (value) => {
  if (value === null || value === undefined) return "";
  return value.toString().replace(/\s+/g, " ").trim().toLowerCase();
};

const normalizeStatusKey = (value) =>
  normalizeText(value).replace(/[-_]+/g, " ");

export default function Cards({ data, mode = "admin" }) {
  const dashboardMode = mode;
  const themeContext = useTheme();
  const colorMode =
    themeContext?.mode ?? themeContext?.palette?.mode ?? "light";
  const themeColors = getColors(colorMode);
  const isDarkTheme = colorMode === "dark";

  const headingColor = isDarkTheme
    ? themeColors.primary[100]
    : themeColors.primary[200];
  const subTextColor = isDarkTheme
    ? themeColors.primary[100]
    : themeColors.primary[200];
  const cardBackgroundColor = isDarkTheme
    ? themeColors.primary[500]
    : themeColors.bg[100];

  // Extract data from props (from /api/common/dashboard/)
  const employees = data?.employees || [];
  const leadStatuses = data?.lead_statuses || [];
  const totalLeadsCount = data?.total_leads_count || 0;
  const loading = !data;

  // Helper to get count from lead_statuses by status name
  const getStatusCount = (statusName) => {
    const normalizedTarget = normalizeStatusKey(statusName);
    const found = leadStatuses.find(s => 
      normalizeStatusKey(s.status_name).includes(normalizedTarget)
    );
    return found?.count || 0;
  };

  const total = totalLeadsCount || 1; // avoid divide-by-zero

  // Get counts directly from lead_statuses API response
  const completedCount = getStatusCount("completed");
  const pendingCount = getStatusCount("pending");
  const rejectedCount = getStatusCount("rejected");

  const completedPercent = Math.round((completedCount / total) * 100);
  const pendingPercent = Math.round((pendingCount / total) * 100);
  const rejectedPercent = Math.round((rejectedCount / total) * 100);

  const metricCardsBase = [
    {
      key: "employees",
      label: "Total Employees",
      value: employees.length,
      loading: loading,
      accentGroup: "blueAccent",
      caption: "Active team members",
    },
    {
      key: "leads",
      label: "Total Leads",
      value: totalLeadsCount,
      loading: loading,
      accentGroup: "purpleAccent",
      caption: "Leads in the pipeline",
    },
    {
      key: "completed",
      label: "Completed Leads",
      value: completedCount,
      loading: loading,
      accentGroup: "greenAccent",
      caption: `${completedPercent}% of total leads`,
    },
    {
      key: "pending",
      label: "Pending Leads",
      value: pendingCount,
      loading: loading,
      accentGroup: "yellowAccent",
      caption: `${pendingPercent}% awaiting action`,
    },
  ];

  const rejectedCard = {
    key: "rejected",
    label: "Rejected Leads",
    value: rejectedCount,
    loading: loading,
    accentGroup: "redAccent",
    caption: `${rejectedPercent}% of total leads`,
  };

  const metricCards =
    dashboardMode === "employee"
      ? [...metricCardsBase.slice(1), rejectedCard]  // Total Leads first, Rejected last (skip employees card)
      : metricCardsBase;

  return (
    <Box>
      <Box display="flex" gap={2} mt={2} flexWrap="wrap">
        {metricCards.map((card) => {
          const palette = themeColors[card.accentGroup] ?? themeColors.grey;
          const valueColor =
            palette?.[card.valueShade ?? 500] ??
            palette?.[500] ??
            (isDarkTheme ? themeColors.grey[100] : themeColors.grey[900]);
          const backgroundColor = cardBackgroundColor;
          return (
            <Paper
              key={card.key}
              sx={{
                flex: 1,
                minWidth: 240,
                minHeight: 120,
                p: 3,
                borderRadius: 3,
                boxShadow: "none",
                backgroundColor,
              }}
            >
              <Box display="flex" flexDirection="column" gap={1}>
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  sx={{ color: headingColor }}
                >
                  {card.label}
                </Typography>

                <Typography
                  variant="h3"
                  fontWeight={700}
                  sx={{ color: valueColor, lineHeight: 1.1 }}
                >
                  {card.loading ? "…" : card.value}
                </Typography>

                <Typography variant="body2" sx={{ color: subTextColor }}>
                  {card.loading ? "Updating…" : card.caption}
                </Typography>
              </Box>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}
