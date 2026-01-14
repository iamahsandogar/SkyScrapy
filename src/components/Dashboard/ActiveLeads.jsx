import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useTheme } from "../../contexts/ThemeContext";
import { tokens } from "../../design-system/tokens/colors.js";
import apiRequest from "../services/api";
import { getCachedLeadData } from "../../utils/prefetchData";
import {
  normalizeLeadsPayload,
  resolveTextValue,
  getLeadTitle,
  getFollowUpTimestamp,
  formatFollowUpLabel,
  normalizeDateValue,
} from "./leadUtils";

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
      statusObj.label ||
      statusObj.title ||
      statusObj.status ||
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
    lead.statusObj ??
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
    lead.follow_up_status ?? lead.followupStatus ?? lead.followUpStatus ?? null;
  const normalized = normalizeText(followUpValue);
  return normalized === "" ? "none" : normalized;
};

function ActiveLeads({ onLoadingChange }) {
  const { mode } = useTheme();
  const themeColors = tokens(mode);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [statuses, setStatuses] = useState([]);

  const cardStyles = {
    flex: 1,
    minWidth: "280px",
    borderRadius: "12px",
    padding: 3,
    backgroundColor:
      mode === "dark" ? themeColors.primary[600] : themeColors.bg[100],
    border: "none",
    cursor: "pointer",
  };

  const titleColor = themeColors.grey[100];
  const accentColor = themeColors.grey[100];
  const mutedText =
    mode === "dark" ? themeColors.grey[200] : themeColors.grey[600];

  const resolveStatusText = (lead) => {
    const rawStatus =
      lead.status ||
      lead.status_label ||
      lead.statusName ||
      lead.statusText ||
      lead.status_value ||
      lead.lead_status ||
      lead.statusObj ||
      lead.status_obj ||
      lead.statusData;

    if (rawStatus && typeof rawStatus === "object") {
      return (
        resolveTextValue(
          rawStatus.name ||
            rawStatus.label ||
            rawStatus.title ||
            rawStatus.status ||
            rawStatus.value ||
            rawStatus.key
        ) || ""
      );
    }

    return resolveTextValue(rawStatus) || "";
  };

  const resolveFollowUpStatusText = (lead) => {
    return (
      resolveTextValue(
        lead.follow_up_status || lead.followupStatus || lead.followUpStatus
      ) || ""
    );
  };

  const matchStatusValue = (lead, targetPhrase) => {
    const statusLabel = resolveLeadStatusLabel(lead, statuses);
    const normalized = normalizeStatusKey(statusLabel);
    if (!normalized) return false;
    return normalized.includes(targetPhrase);
  };

  const isPendingOrInProgress = (lead) => {
    const normalizedFollowUp = normalizeStatusKey(
      resolveFollowUpStatusText(lead)
    );
    const pendingMatch =
      matchStatusValue(lead, "pending") ||
      normalizedFollowUp.includes("pending");
    const inProgressMatch =
      matchStatusValue(lead, "in progress") ||
      matchStatusValue(lead, "inprogress") ||
      normalizedFollowUp.includes("in progress") ||
      normalizedFollowUp.includes("inprogress");

    return pendingMatch || inProgressMatch;
  };

  const upcomingLeads = useMemo(() => {
    return leads
      .map((lead) => ({
        lead,
        dueDate: normalizeDateValue(getFollowUpTimestamp(lead)),
        isActiveStatus: isPendingOrInProgress(lead),
      }))
      .filter(({ isActiveStatus }) => isActiveStatus)
      .sort((a, b) => {
        const timeA = a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const timeB = b.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        if (timeA === timeB) {
          const idA = a.lead.id ?? a.lead.pk ?? 0;
          const idB = b.lead.id ?? b.lead.pk ?? 0;
          return Number(idA) - Number(idB);
        }
        return timeA - timeB;
      })
      .map(({ lead }) => lead);
  }, [leads, statuses]);

  const fetchLeads = useCallback(async () => {
    setLoadingLeads(true);
    setFetchError("");
    try {
      const response = await apiRequest("/api/leads/?page_size=200");
      setLeads(normalizeLeadsPayload(response));
    } catch (error) {
      console.error("Failed to load leads", error);
      setFetchError(error?.message || "Unable to load leads right now.");
    } finally {
      setLoadingLeads(false);
    }
  }, []);

  useEffect(() => {
    const fetchStatuses = async () => {
      // Try cache first
      const cachedData = getCachedLeadData();
      if (cachedData?.statuses) {
        setStatuses(cachedData.statuses);
      }
      
      try {
        // Single API call to get both statuses and sources
        const response = await apiRequest("/ui/options/");
        let statusesList = [];
        
        if (response?.statuses && Array.isArray(response.statuses)) {
          statusesList = response.statuses;
        } else if (response?.data?.statuses && Array.isArray(response.data.statuses)) {
          statusesList = response.data.statuses;
        }
        
        if (statusesList.length) {
          setStatuses(statusesList);
        }
      } catch (error) {
        console.error("Failed to load statuses for ActiveLeads", error);
      }
    };

    void fetchStatuses();
  }, []);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    if (typeof onLoadingChange === "function") {
      onLoadingChange(loadingLeads);
    }
  }, [loadingLeads, onLoadingChange]);

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => setDialogOpen(false);

  const previewLead = upcomingLeads[0];
  const followUpLabel = formatFollowUpLabel(getFollowUpTimestamp(previewLead));

  return (
    <>
      <Box
        sx={cardStyles}
        role="button"
        tabIndex={0}
        onClick={handleOpenDialog}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="p" fontWeight="bold" color={titleColor}>
            Active Leads
          </Typography>

          <Typography
            color={accentColor}
            fontSize="12px"
            sx={{ whiteSpace: "nowrap" }}
          >
            {upcomingLeads.length} upcoming
          </Typography>
        </Box>

        <Typography
          variant="h4"
          mt={2}
          color={titleColor}
          sx={{ whiteSpace: "nowrap" }}
        >
          {previewLead
            ? getLeadTitle(previewLead)
            : "No upcoming follow-ups yet"}
        </Typography>

        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mt={2}
        >
          <Typography sx={{ color: accentColor, textDecoration: "underline" }}>
            View Upcoming Follow-ups
          </Typography>

          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "3px",
              backgroundColor:
                mode === "dark" ? themeColors.grey[100] : themeColors.grey[900],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AddIcon
              fontSize="small"
              sx={{
                color:
                  mode === "dark"
                    ? themeColors.grey[900]
                    : themeColors.grey[100],
              }}
            />
          </Box>
        </Box>
        <Typography variant="caption" color={mutedText} mt={1} display="block">
          {previewLead
            ? followUpLabel
            : "Leads with future follow-up dates will appear here."}
        </Typography>
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Upcoming Follow-ups</DialogTitle>
        <DialogContent dividers>
          {loadingLeads ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={24} color="inherit" />
            </Box>
          ) : fetchError ? (
            <Typography color="error">{fetchError}</Typography>
          ) : !upcomingLeads.length ? (
            <Typography>
              No upcoming follow-ups are scheduled right now.
            </Typography>
          ) : (
            <List disablePadding>
              {upcomingLeads.map((lead) => {
                const statusText =
                  resolveLeadStatusLabel(lead, statuses) ||
                  resolveTextValue(
                    lead.status || lead.status_label || lead.statusName
                  );
                const followUpText = resolveTextValue(
                  lead.follow_up_status ||
                    lead.followupStatus ||
                    lead.followUpStatus
                );
                const followUpDate = formatFollowUpLabel(
                  getFollowUpTimestamp(lead)
                );
                return (
                  <React.Fragment
                    key={
                      lead.id ??
                      lead.uuid ??
                      lead.lead_id ??
                      lead.pk ??
                      getLeadTitle(lead)
                    }
                  >
                    <ListItem disableGutters>
                      <ListItemText
                        primary={
                          <Typography fontWeight={600} color={titleColor}>
                            {getLeadTitle(lead)}
                          </Typography>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" color={mutedText}>
                              Status: {statusText || "Completed"} · Follow-up:{" "}
                              {followUpText || "Done"}
                            </Typography>
                            <Typography variant="caption" color={mutedText}>
                              {followUpDate}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default ActiveLeads;
