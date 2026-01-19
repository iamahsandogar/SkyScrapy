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
  Divider,
} from "@mui/material";
import TodayIcon from "@mui/icons-material/Today";
import { useTheme } from "../../contexts/ThemeContext";
import { tokens } from "../../design-system/tokens/colors.js";
import {
  resolveTextValue,
  getLeadTitle,
  getFollowUpTimestamp,
  formatFollowUpLabel,
  normalizeDateValue,
} from "./leadUtils";

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

function DueTodayLeads({ data }) {
  const { mode } = useTheme();
  const themeColors = tokens(mode);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Extract data from props (from /api/common/dashboard/)
  const remindersData = data?.reminders || {};
  const statuses = data?.statuses || [];

  // Get due today leads
  const dueTodayLeads = useMemo(() => {
    const leads = remindersData.due_today?.leads || [];
    return leads
      .map((lead) => ({
        lead,
        dueDate: normalizeDateValue(getFollowUpTimestamp(lead)),
      }))
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

  const previewLead = dueTodayLeads[0];
  const followUpLabel = formatFollowUpLabel(getFollowUpTimestamp(previewLead));

  return (
    <>
      <Box
        sx={{ ...cardStyles, maxHeight: 190 }}
        role="button"
        tabIndex={0}
        onClick={handleOpenDialog}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="p" fontWeight="bold" color={titleColor}>
            Due Today Leads
          </Typography>

          <Typography
            color={accentColor}
            fontSize="12px"
            sx={{ whiteSpace: "nowrap" }}
          >
            {dueTodayLeads.length} due today
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
            : "No leads due today"}
        </Typography>

        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mt={2}
        >
          <Typography sx={{ color: accentColor, textDecoration: "underline" }}>
            View All Due Today
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
            <TodayIcon
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
            : "Leads with follow-ups due today will appear here."}
        </Typography>
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Due Today Leads</DialogTitle>
        <DialogContent dividers>
          {!dueTodayLeads.length ? (
            <Typography>
              No leads are due today.
            </Typography>
          ) : (
            <List disablePadding>
              {dueTodayLeads.map((lead) => {
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
                              Status: {statusText || "N/A"} · Follow-up:{" "}
                              {followUpText || "N/A"}
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

export default DueTodayLeads;
