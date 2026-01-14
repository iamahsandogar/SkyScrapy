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
} from "@mui/material";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import { useTheme } from "../../contexts/ThemeContext";
import { tokens } from "../../design-system/tokens/colors.js";
import apiRequest from "../services/api";
import { getCachedLeadData } from "../../utils/prefetchData";
import {
  normalizeLeadsPayload,
  getLeadTitle,
  getFollowUpTimestamp,
  normalizeDateValue,
  resolveTextValue,
} from "./leadUtils";

const normalizeReminders = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.reminders)) return payload.reminders;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.reminders)) return payload.data.reminders;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
};

const parseDueDate = (reminder) => {
  if (!reminder) return null;
  const possible =
    reminder.due ||
    reminder.due_date ||
    reminder.dueDate ||
    reminder.dueAt ||
    reminder.due_at ||
    reminder.follow_up_at ||
    reminder.followUpAt ||
    reminder.followupAt ||
    reminder.reminder_date ||
    reminder.scheduled_for ||
    reminder.date ||
    reminder.datetime ||
    reminder.timestamp;
  if (!possible) return null;
  const parsed = new Date(possible);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateLabel = (value) => {
  if (!value) return "Date not set";
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTimeLabel = (value) => {
  if (!value) return "";
  return value.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
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
    lead.status ||
    lead.status_id ||
    lead.statusId ||
    lead.lead_status ||
    lead.status_obj ||
    lead.statusData ||
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

const resolveReminderTitle = (reminder) => {
  if (!reminder) return "Untitled Reminder";
  return (
    reminder.title ||
    reminder.name ||
    reminder.label ||
    reminder.task ||
    reminder.description ||
    reminder.reminder_title ||
    reminder.leadTitle ||
    reminder.full_name ||
    reminder.fullName ||
    "Untitled Reminder"
  );
};

function UpcomingReminders({ onLoadingChange }) {
  const { mode } = useTheme();
  const themeColors = tokens(mode);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [fetchedOnce, setFetchedOnce] = useState(false);
  const [futureFollowUps, setFutureFollowUps] = useState([]);
  const [futureFollowUpsLoading, setFutureFollowUpsLoading] = useState(false);
  const [futureFollowUpsError, setFutureFollowUpsError] = useState("");
  const [futureFollowUpsFetched, setFutureFollowUpsFetched] = useState(false);
  const [statuses, setStatuses] = useState([]);

  const fetchFutureFollowUps = useCallback(async () => {
    if (futureFollowUpsFetched) return;
    setFutureFollowUpsLoading(true);
    setFutureFollowUpsError("");
    try {
      const response = await apiRequest("/api/leads/?page_size=200");
      const normalizedLeads = normalizeLeadsPayload(response);
      const now = Date.now();
      const upcoming = normalizedLeads
        .map((lead) => ({
          lead,
          followUp: normalizeDateValue(getFollowUpTimestamp(lead)),
        }))
        .filter(({ followUp }) => followUp && followUp.getTime() > now)
        .sort((a, b) => a.followUp.getTime() - b.followUp.getTime());

      setFutureFollowUps(upcoming);
      setFutureFollowUpsFetched(true);
    } catch (error) {
      console.error("Failed to load future follow-up leads", error);
      setFutureFollowUpsError(
        error?.message || "Unable to load future follow-ups right now."
      );
    } finally {
      setFutureFollowUpsLoading(false);
    }
  }, [futureFollowUpsFetched]);

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

  const upcomingReminders = useMemo(() => {
    const now = Date.now();
    return reminders
      .map((item) => ({
        ...item,
        dueDate: parseDueDate(item),
      }))
      .filter((item) => item.dueDate && item.dueDate.getTime() > now)
      .sort((a, b) => a.dueDate - b.dueDate);
  }, [reminders]);

  const fetchReminders = useCallback(async () => {
    setLoadingReminders(true);
    setFetchError("");
    try {
      const response = await apiRequest("/api/leads/reminders/?page_size=200");
      const normalized = normalizeReminders(response);
      setReminders(normalized);
      if (!normalized.length) {
        void fetchFutureFollowUps();
      }
      setFetchedOnce(true);
    } catch (error) {
      console.error("Failed to load reminders", error);
      setFetchError(error?.message || "Unable to load reminders right now.");
      if (!futureFollowUpsFetched) {
        void fetchFutureFollowUps();
      }
    } finally {
      setLoadingReminders(false);
    }
  }, [fetchFutureFollowUps]);

  useEffect(() => {
    void fetchReminders();
  }, [fetchReminders]);

  useEffect(() => {
    let isMounted = true;
    const loadStatuses = async () => {
      const cached = getCachedLeadData();
      if (isMounted && cached?.statuses?.length) {
        setStatuses(cached.statuses);
      }
      try {
        // Single API call to get both statuses and sources
        const response = await apiRequest("/ui/options/");
        if (!isMounted) return;
        
        let statusesList = [];
        if (response?.statuses && Array.isArray(response.statuses)) {
          statusesList = response.statuses;
        } else if (response?.data?.statuses && Array.isArray(response.data.statuses)) {
          statusesList = response.data.statuses;
        }
        
        if (statusesList.length) {
          setStatuses(statusesList);
        }
      } catch (err) {
        console.error("Failed to load statuses for reminders", err);
      }
    };

    loadStatuses();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof onLoadingChange === "function") {
      onLoadingChange(loadingReminders || futureFollowUpsLoading);
    }
  }, [loadingReminders, futureFollowUpsLoading, onLoadingChange]);

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => setDialogOpen(false);

  const reminderLabel = upcomingReminders.length
    ? `${upcomingReminders.length} upcoming reminder${
        upcomingReminders.length > 1 ? "s" : ""
      }`
    : futureFollowUps.length
    ? `${futureFollowUps.length} upcoming follow-up lead${
        futureFollowUps.length > 1 ? "s" : ""
      }`
    : futureFollowUpsLoading
    ? "Loading upcoming follow-ups"
    : "No upcoming reminders";

  const previewLabel = upcomingReminders[0]
    ? resolveReminderTitle(upcomingReminders[0])
    : futureFollowUps[0]
    ? getLeadTitle(futureFollowUps[0].lead)
    : "No reminders yet";

  const previewStatusLabel = useMemo(() => {
    const reminderLead =
      upcomingReminders[0]?.lead || upcomingReminders[0] || null;
    if (reminderLead) {
      const resolved = resolveLeadStatusLabel(reminderLead, statuses);
      if (resolved) return resolved;
      const fallbackText = resolveTextValue(
        reminderLead.status_label ||
          reminderLead.statusName ||
          reminderLead.status
      );
      if (fallbackText) return fallbackText;
    }

    const firstFallbackLead = futureFollowUps[0]?.lead;
    if (firstFallbackLead) {
      const resolvedFallback = resolveLeadStatusLabel(firstFallbackLead, statuses);
      if (resolvedFallback) return resolvedFallback;
      const fallbackText = resolveTextValue(
        firstFallbackLead.status_label ||
          firstFallbackLead.statusName ||
          firstFallbackLead.status
      );
      if (fallbackText) return fallbackText;
    }

    return "";
  }, [futureFollowUps, statuses, upcomingReminders]);

  const previewStatusBadge = previewStatusLabel
    ? `Status: ${previewStatusLabel}`
    : "";

  const hasReminderItems = upcomingReminders.length > 0;
  const shouldUseFallback = !hasReminderItems;
  const fallbackHasItems = futureFollowUps.length > 0;
  const showSpinner =
    loadingReminders || (shouldUseFallback && futureFollowUpsLoading);
  const showFallbackList =
    shouldUseFallback && !futureFollowUpsLoading && fallbackHasItems;
  const showFallbackError =
    shouldUseFallback && futureFollowUpsError && !futureFollowUpsLoading;
  const showFetchError =
    Boolean(fetchError) &&
    !showFallbackList &&
    !showFallbackError &&
    !showSpinner;

  return (
    <>
      <Box
        sx={cardStyles}
        role="button"
        tabIndex={0}
        onClick={handleOpenDialog}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography
            variant="p"
            fontWeight="bold"
            color={titleColor}
            sx={{ whiteSpace: "nowrap" }}
          >
            {reminderLabel}
          </Typography>
          {previewStatusBadge && (
            <Typography
              variant="caption"
              color={accentColor}
              fontSize="12px"
              sx={{ whiteSpace: "nowrap" }}
            >
              {previewStatusBadge}
            </Typography>
          )}
        </Box>

        <Typography
          variant="h4"
          mt={2}
          color={titleColor}
          sx={{ whiteSpace: "nowrap" }}
        >
          {previewLabel}
        </Typography>

        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mt={2}
        >
          <Typography
            sx={{
              color: accentColor,
              textDecoration: "underline",
              cursor: "pointer",
            }}
            onClick={(event) => {
              event.stopPropagation();
              handleOpenDialog();
            }}
          >
            View all
          </Typography>

          <Box
            borderRadius="3px"
            p={1}
            display="flex"
            alignItems="center"
            justifyContent="center"
            sx={{
              backgroundColor:
                mode === "dark" ? themeColors.grey[100] : themeColors.grey[900],
              color:
                mode === "dark" ? themeColors.grey[900] : themeColors.grey[100],
            }}
          >
            <ShoppingBagRoundedIcon fontSize="small" />
          </Box>
        </Box>
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Upcoming Reminders</DialogTitle>
        <DialogContent dividers>
          {showSpinner ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={24} />
            </Box>
          ) : showFetchError ? (
            <Typography color="error">{fetchError}</Typography>
          ) : hasReminderItems ? (
            <List disablePadding>
              {upcomingReminders.map((reminder) => (
                <ListItem
                  key={
                    reminder.id ??
                    reminder.uuid ??
                    reminder.lead_id ??
                    reminder.dueKey
                  }
                  divider
                  disableGutters
                >
                  <ListItemText
                    primary={
                      <Typography fontWeight={600}>
                        {resolveReminderTitle(reminder)}
                      </Typography>
                    }
                    secondary={`${formatDateLabel(
                      reminder.dueDate
                    )} · ${formatTimeLabel(reminder.dueDate)}`}
                    sx={{ color: mutedText }}
                  />
                </ListItem>
              ))}
            </List>
          ) : showFallbackList ? (
            <List disablePadding>
              {futureFollowUps.map(({ lead, followUp }) => (
                <ListItem
                  key={
                    lead.id ??
                    lead.uuid ??
                    lead.lead_id ??
                    lead.pk ??
                    followUp?.getTime()
                  }
                  divider
                  disableGutters
                >
                  <ListItemText
                    primary={
                      <Typography fontWeight={600}>
                        {getLeadTitle(lead)}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color={mutedText}>
                          Status: {" "}
                          {resolveLeadStatusLabel(lead, statuses) ||
                            resolveTextValue(
                              lead.status_label || lead.statusName || lead.status
                            ) ||
                            "Upcoming follow-up"}
                        </Typography>
                        <Typography variant="caption" color={mutedText}>
                          {formatDateLabel(followUp)} ·{" "}
                          {formatTimeLabel(followUp)}
                        </Typography>
                      </>
                    }
                    sx={{ color: mutedText }}
                  />
                </ListItem>
              ))}
            </List>
          ) : showFallbackError ? (
            <Typography color="error">{futureFollowUpsError}</Typography>
          ) : (
            <Typography>
              {futureFollowUpsError ||
                "No upcoming follow-ups are scheduled for the future."}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default UpcomingReminders;
