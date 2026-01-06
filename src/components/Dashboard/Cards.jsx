import { useEffect, useState } from "react";
import { Box, Paper, Typography, Chip } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import apiRequest from "../services/api";
import { getCachedLeadData } from "../../utils/prefetchData";
import { colors } from "../../design-system/tokens";
import { useTheme } from "../../contexts/ThemeContext";

const CARD_CONFIG = [
  { label: "Completed", color: colors.greenAccent[500], up: true },
  { label: "Pending", color: colors.yellowAccent[500], up: false },
  { label: "In Progress", color: colors.blueAccent[600], up: true },
  { label: "Rejected", color: colors.redAccent[600], up: false },
];

export default function Cards() {
  const theme = useTheme();
  // support both custom ThemeContext and MUI theme
  const mode = theme?.mode ?? theme?.palette?.mode ?? "light";
  const isDark = mode === "dark";

  const headingColor = isDark ? colors.grey[100] : colors.grey[100];
  const subTextColor = isDark ? colors.grey[100] : colors.grey[100];

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLeads = async () => {
      // Try cached data first
      const cachedData = getCachedLeadData();
      if (cachedData?.leads) {
        console.log("Using cached leads for dashboard cards");
        const leadsList = cachedData.leads;
        if (Array.isArray(leadsList)) {
          setLeads(leadsList);
        }
        setLoading(false);
        
        // Only refresh if cache is older than 30 seconds (to avoid duplicate calls right after login)
        const cacheAge = Date.now() - cachedData.timestamp;
        if (cacheAge > 30000) {
          // Refresh in background
          try {
            const data = await apiRequest("/api/leads/");
            let leadsList = [];
            if (data && Array.isArray(data.leads)) {
              leadsList = data.leads;
            } else if (Array.isArray(data)) {
              leadsList = data;
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
      
      // No cache, fetch fresh
      try {
        setLoading(true);
        const data = await apiRequest("/api/leads/");
        if (data && Array.isArray(data.leads)) {
          setLeads(data.leads);
        } else if (Array.isArray(data)) {
          setLeads(data);
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

  const total = leads.length || 1; // avoid divide-by-zero
  const countByStatus = (status) =>
    leads.filter(
      (l) =>
        String(l.status ?? "")
          .toLowerCase()
          .trim() === status.toLowerCase()
    ).length;

  const getPercent = (status) =>
    Math.round((countByStatus(status) / total) * 100);

  return (
    <Box>
      <Box display="flex" gap={2} mt={2} flexWrap="wrap">
        {CARD_CONFIG.map(({ label, color, up }) => {
          const percent = getPercent(label);
          const Arrow = up ? ArrowUpwardIcon : ArrowDownwardIcon;
          return (
            <Paper
              key={label}
              sx={{
                flex: 1,
                minWidth: 220,
                minHeight: 100,
                p: 3,
                borderRadius: 3,
                boxShadow: "none",
                ...(isDark ? { backgroundColor: colors.primary[900] } : {}),
              }}
            >
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="stretch"
                gap={1}
              >
                {/* LEFT CONTENT (Title + Leads) */}
                <Box display="flex" flexDirection="column">
                  <Typography
                    variant="subtitle1"
                    fontWeight={700}
                    sx={{ color: headingColor }}
                  >
                    {label}
                  </Typography>

                  <Box display="flex" alignItems="center" mt={1} gap={1}>
                    <Arrow sx={{ color }} fontSize="small" />
                    <Typography variant="body2" sx={{ color: subTextColor }}>
                      {loading
                        ? "Calculating…"
                        : `${countByStatus(label)} of ${leads.length} leads`}
                    </Typography>
                  </Box>
                </Box>

                {/* PERCENTAGE BOX */}
                <Box
                  sx={{
                    bgcolor: color,
                    color: isDark ? "#000" : colors.grey[100],
                    fontWeight: 700,
                    px: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 2,
                    minWidth: 60,
                  }}
                >
                  {percent}%
                </Box>
              </Box>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}
