import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, Typography, Box, Paper } from "@mui/material";
import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer } from "recharts";
import apiRequest from "../services/api";
import { getCachedLeadData } from "../../utils/prefetchData";
import { getColors } from "../../design-system/tokens";
import { useTheme } from "../../contexts/ThemeContext";

const normalizeText = (value) => {
  if (value === null || value === undefined) return "";
  return value.toString().replace(/\s+/g, " ").trim().toLowerCase();
};

const parseStatusesPayload = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.statuses)) return payload.statuses;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.statuses)) return payload.data.statuses;
  return [];
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

const StatusTooltip = ({ active, payload, total = 0, colors }) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  if (!entry) return null;

  return (
    <Paper
      elevation={3}
      sx={{
        px: 2,
        py: 1,
        borderRadius: 2,
        bgcolor: colors.grey[100],
      }}
    >
      <Typography fontWeight={600} sx={{ color: colors.grey[900] }}>
        {entry.label}
      </Typography>
      <Typography variant="body2" sx={{ color: colors.grey[600] }}>
        {entry.count} of {total} leads · {entry.percent}%
      </Typography>
    </Paper>
  );
};

export default function ChartBox({ onLoadingChange }) {
  const { mode } = useTheme();
  const colors = getColors(mode);
  const isDark = mode === "dark";
  const headingColor = isDark ? colors.grey[100] : colors.primary[200];
  const subTextColor = isDark ? colors.grey[200] : colors.primary[200];
  const cardBackground = isDark ? colors.primary[600] : colors.bg[100];
  const CARD_CONFIG = [
    {
      key: "completed",
      label: "Completed",
      color: colors.greenAccent[500],
      up: true,
    },
    {
      key: "in_progress",
      label: "In Progress",
      color: colors.blueAccent[600],
      up: true,
    },
    {
      key: "pending",
      label: "Pending",
      color: colors.yellowAccent[500],
      up: false,
    },
    {
      key: "rejected",
      label: "Rejected",
      color: colors.redAccent[600],
      up: false,
    },
  ];

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState([]);

  useEffect(() => {
    const fetchLeads = async () => {
      const cachedData = getCachedLeadData();
      if (cachedData?.leads) {
        setLeads(Array.isArray(cachedData.leads) ? cachedData.leads : []);
        setLoading(false);
        const cacheAge = Date.now() - (cachedData.timestamp || 0);
        if (cacheAge > 30000) {
          try {
            const response = await apiRequest("/api/leads/");
            let leadsList = [];
            if (response && Array.isArray(response.leads)) {
              leadsList = response.leads;
            } else if (Array.isArray(response)) {
              leadsList = response;
            }
            if (leadsList.length > 0) {
              setLeads(leadsList);
            }
          } catch (err) {
            console.error("Failed to refresh leads:", err);
          }
        }
        return;
      }

      try {
        setLoading(true);
        const response = await apiRequest("/api/leads/");
        if (response && Array.isArray(response.leads)) {
          setLeads(response.leads);
        } else if (Array.isArray(response)) {
          setLeads(response);
        } else {
          setLeads([]);
        }
      } catch (err) {
        console.error("Failed to fetch leads:", err);
        setLeads([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  useEffect(() => {
    if (typeof onLoadingChange === "function") {
      onLoadingChange(loading);
    }
  }, [loading, onLoadingChange]);

  useEffect(() => {
    const fetchStatuses = async () => {
      const cachedData = getCachedLeadData();
      if (cachedData?.statuses) {
        setStatuses(cachedData.statuses);
      }
      try {
        const response = await apiRequest("/ui/options/statuses/");
        const parsed = parseStatusesPayload(response);
        if (parsed.length > 0) {
          setStatuses(parsed);
        }
      } catch (error) {
        console.error("Failed to fetch statuses for cards:", error);
      }
    };

    fetchStatuses();
  }, []);

  const matchStatusValue = (lead, targetPhrase) => {
    const statusLabel = resolveLeadStatusLabel(lead, statuses);
    const normalized = normalizeStatusKey(statusLabel);
    if (!normalized) return false;
    return normalized.includes(targetPhrase);
  };

  const activeFollowUpStatuses = ["pending", "done", "none"];
  const doneOrNoneStatuses = ["done", "none"];

  const cardStats = useMemo(() => {
    const safeTotal = leads.length > 0 ? leads.length : 1;
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

    return CARD_CONFIG.map((card) => {
      const filterFn = matchers[card.key] ?? (() => false);
      const count = leads.filter(filterFn).length;
      const percent = Math.round((count / safeTotal) * 100);
      return { ...card, count, percent };
    });
  }, [leads, statuses]);

  const totalLeads = leads.length;
  const chartData = cardStats.map(({ key, label, color, count, percent }) => ({
    key,
    label,
    color,
    value: count,
    percent,
  }));

  return (
    <Card
      sx={{
        boxShadow: "none",
        borderRadius: "12px",
        padding: 4,
        backgroundColor: cardBackground,
        width: "100%",
      }}
    >
      <CardContent
        sx={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        <Typography fontWeight="bold">Lead Status Breakdown</Typography>

        <Box
          mt={2}
          sx={{
            display: "flex",
            gap: 3,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ flex: 1, minHeight: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="label"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={<StatusTooltip total={totalLeads} colors={colors} />}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>

          <Box sx={{ width: { xs: "100%", sm: 260 } }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Status Percentages
            </Typography>
            <Box display="flex" flexDirection="column" gap={1.5}>
              {chartData.map(({ key, label, percent, color }) => (
                <Box
                  key={key}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        bgcolor: color,
                      }}
                    />
                    <Typography sx={{ fontSize: "15px", color: headingColor }}>
                      {label}
                    </Typography>
                  </Box>
                  <Typography fontWeight={600} sx={{ color: subTextColor }}>
                    {percent}%
                  </Typography>
                </Box>
              ))}
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: subTextColor,
                mt: 2,
                display: "block",
                fontSize: 13,
              }}
            >
              Tracking {totalLeads} lead{totalLeads === 1 ? "" : "s"}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
