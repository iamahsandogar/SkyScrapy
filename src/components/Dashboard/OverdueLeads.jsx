import React, { useMemo, useState } from "react";
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
} from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";
import { useTheme } from "../../contexts/ThemeContext";
import { tokens } from "../../design-system/tokens/colors.js";
import {
  getLeadTitle,
  getFollowUpTimestamp,
  normalizeDateValue,
  resolveTextValue,
  formatFollowUpLabel,
} from "./leadUtils";

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

function OverdueLeads({ data }) {
  const { mode } = useTheme();
  const themeColors = tokens(mode);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Extract data from props (from /api/common/dashboard/)
  const statuses = useMemo(() => data?.statuses || [], [data?.statuses]);
  const remindersData = useMemo(() => data?.reminders || {}, [data?.reminders]);

  // Get overdue leads
  const overdueLeads = useMemo(() => {
    const leads = remindersData.overdue?.leads || [];
    return leads
      .map((lead) => ({
        lead,
        followUp: normalizeDateValue(getFollowUpTimestamp(lead)),
      }))
      .filter(({ followUp }) => followUp)
      .sort((a, b) => (a.followUp?.getTime() || 0) - (b.followUp?.getTime() || 0));
  }, [remindersData]);

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

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => setDialogOpen(false);

  const reminderLabel = overdueLeads.length
    ? `${overdueLeads.length} overdue lead${overdueLeads.length > 1 ? "s" : ""}`
    : "No overdue leads";

  const previewLabel = overdueLeads[0]
    ? getLeadTitle(overdueLeads[0].lead)
    : "No overdue leads yet";

  const previewStatusLabel = useMemo(() => {
    const firstLead = overdueLeads[0]?.lead;
    if (firstLead) {
      const resolved = resolveLeadStatusLabel(firstLead, statuses);
      if (resolved) return resolved;
      const fallbackText = resolveTextValue(
        firstLead.status_label ||
          firstLead.statusName ||
          firstLead.status
      );
      if (fallbackText) return fallbackText;
    }
    return "";
  }, [overdueLeads, statuses]);

  const previewStatusBadge = previewStatusLabel
    ? `Status: ${previewStatusLabel}`
    : "";

  const previewFollowUp = overdueLeads[0]
    ? formatFollowUpLabel(getFollowUpTimestamp(overdueLeads[0].lead))
    : "";

  return (
    <>
      <Box
        sx={{ ...cardStyles, maxHeight: 190 }}
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
            <WarningIcon fontSize="small" />
          </Box>
        </Box>
        {previewFollowUp && (
          <Typography variant="caption" color={mutedText} mt={1} display="block">
            {previewFollowUp}
          </Typography>
        )}
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Overdue Leads</DialogTitle>
        <DialogContent dividers>
          {!overdueLeads.length ? (
            <Typography>
              No overdue leads at this time.
            </Typography>
          ) : (
            <List disablePadding>
              {overdueLeads.map(({ lead, followUp }) => (
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
                          Status:{" "}
                          {resolveLeadStatusLabel(lead, statuses) ||
                            resolveTextValue(
                              lead.status_label || lead.statusName || lead.status
                            ) ||
                            "N/A"}
                        </Typography>
                        <Typography variant="caption" color={mutedText}>
                          {formatDateLabel(followUp)} · {formatTimeLabel(followUp)}
                        </Typography>
                      </>
                    }
                    sx={{ color: mutedText }}
                  />
                </ListItem>
              ))}
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

export default OverdueLeads;
