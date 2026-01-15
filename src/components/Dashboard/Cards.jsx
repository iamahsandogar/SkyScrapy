import { Box, Paper, Typography } from "@mui/material";
import { getColors } from "../../design-system/tokens";
import { useTheme } from "../../contexts/ThemeContext";

const normalizeText = (value) => {
  if (value === null || value === undefined) return "";
  return value.toString().replace(/\s+/g, " ").trim().toLowerCase();
};

const extractStatusName = (statusObj) => {
  if (!statusObj) return "";
  if (typeof statusObj === "string") return statusObj;
  if (typeof statusObj === "object" && statusObj !== null) {
    return (
      statusObj.name ||
      statusObj.status ||
      statusObj.status_name ||
      statusObj.label ||
      statusObj.title ||
      statusObj.value ||
      statusObj.key ||
      ""
    );
  }
  return "";
};

const resolveLeadStatusLabel = (lead, statuses) => {
  if (!lead) return "";
  const candidateStatus =
    lead.status ??
    lead.status_id ??
    lead.statusId ??
    lead.lead_status ??
    lead.status_obj ??
    lead.statusData ??
    null;

  if (typeof candidateStatus === "object" && candidateStatus !== null) {
    const resolved = extractStatusName(candidateStatus);
    if (resolved) return resolved;
  }

  if (candidateStatus === null || candidateStatus === undefined) return "";

  if (typeof candidateStatus === "string" && isNaN(candidateStatus)) {
    return candidateStatus;
  }

  const normalizedId =
    typeof candidateStatus === "string"
      ? parseInt(candidateStatus, 10)
      : candidateStatus;

  if (normalizedId === null || normalizedId === undefined) return "";

  const match = (statuses || []).find((statusObj) => {
    if (!statusObj || typeof statusObj !== "object") return false;
    const possibleIds = [
      statusObj.id,
      statusObj.pk,
      statusObj.uuid,
      statusObj.status_id,
      statusObj.value,
      statusObj.key,
    ];
    return possibleIds.some(
      (idCandidate) =>
        idCandidate !== undefined &&
        idCandidate !== null &&
        String(idCandidate) === String(normalizedId)
    );
  });

  if (match) {
    const resolved = extractStatusName(match);
    if (resolved) return resolved;
  }

  return String(normalizedId);
};

const normalizeStatusKey = (value) =>
  normalizeText(value).replace(/[-_]+/g, " ");

const getFollowUpStatusLabel = (lead) => {
  const followUpValue =
    lead.follow_up_status ??
    lead.followupStatus ??
    lead.followUpStatus ??
    lead.followup_status ??
    null;
  const normalized = normalizeText(followUpValue);
  return normalized === "" ? "none" : normalized;
};

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
  const leads = data?.leads || [];
  const employees = data?.employees || [];
  const statuses = data?.statuses || [];
  const loading = !data;

  const total = leads.length || 1; // avoid divide-by-zero

  const activeFollowUpStatuses = ["pending", "done", "none"];
  const doneOrNoneStatuses = ["done", "none"];

  const matchStatusValue = (lead, targetPhrase) => {
    const statusLabel = resolveLeadStatusLabel(lead, statuses);
    const normalized = normalizeStatusKey(statusLabel);
    if (!normalized) return false;
    return normalized.includes(targetPhrase);
  };

  const matchers = {
    completed: (lead) => {
      const followUp = getFollowUpStatusLabel(lead);
      return (
        matchStatusValue(lead, "completed") &&
        doneOrNoneStatuses.includes(followUp)
      );
    },
    in_progress: (lead) => {
      const followUp = getFollowUpStatusLabel(lead);
      return (
        matchStatusValue(lead, "in progress") &&
        activeFollowUpStatuses.includes(followUp)
      );
    },
    pending: (lead) => {
      const followUp = getFollowUpStatusLabel(lead);
      return (
        matchStatusValue(lead, "pending") &&
        activeFollowUpStatuses.includes(followUp)
      );
    },
    rejected: (lead) => {
      const followUp = getFollowUpStatusLabel(lead);
      return (
        matchStatusValue(lead, "rejected") &&
        doneOrNoneStatuses.includes(followUp)
      );
    },
  };

  const countByCard = (key) =>
    leads.filter(matchers[key] ?? (() => false)).length;
  const getPercent = (key) => Math.round((countByCard(key) / total) * 100);

  const completedCount = countByCard("completed");
  const pendingCount = countByCard("pending");
  const completedPercent = getPercent("completed");
  const pendingPercent = getPercent("pending");

  const rejectedCount = countByCard("rejected");
  const rejectedPercent = getPercent("rejected");

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
      value: leads.length,
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
      ? [rejectedCard, ...metricCardsBase.slice(1)]
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
