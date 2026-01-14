import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from "@mui/material";
import { useTheme } from "../../contexts/ThemeContext";
import { tokens } from "../../design-system/tokens/colors.js";
import apiRequest from "../services/api";

const toArray = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
};

const resolveNotePreview = (note) => {
  if (!note) return "Untitled note";
  return (
    note.note ||
    note.text ||
    note.message ||
    note.body ||
    note.note_text ||
    "Untitled note"
  );
};

const resolveNoteDate = (note) => {
  const dateValue = note?.created_at || note?.timestamp || note?.date;
  if (!dateValue) return "";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const resolveLeadLabel = (lead = {}) => {
  if (lead.title) return lead.title;
  if (lead.name) return lead.name;
  if (lead.company_name || lead.company)
    return lead.company_name || lead.company;
  if (lead.email) return lead.email;
  return "Untitled lead";
};

const extractSummaryInfo = (entry) => {
  if (!entry) return null;
  const lastNote =
    entry.last_note ??
    entry.lastNote ??
    entry.last_message ??
    entry.lastMessage ??
    (Array.isArray(entry.notes) ? entry.notes[entry.notes.length - 1] : null) ??
    (Array.isArray(entry.unreadNotes)
      ? entry.unreadNotes[entry.unreadNotes.length - 1]
      : null);
  const preview = lastNote ? resolveNotePreview(lastNote) : entry.preview;
  const date = lastNote ? resolveNoteDate(lastNote) : "";
  const lead = entry.lead || entry.lead_detail || entry.leadInfo || entry.lead;
  const title = entry.title || (lead && resolveLeadLabel(lead)) || "Lead";
  const unreadCount =
    entry.unread_count ??
    entry.unreadCount ??
    entry.note_count ??
    entry.unread ??
    entry.total_unread ??
    entry.notes?.length ??
    entry.unreadNotes?.length ??
    0;
  return {
    id:
      entry.id ??
      entry.summary_id ??
      entry.lead_id ??
      entry.leadId ??
      entry?.lead?.id,
    title,
    unreadCount,
    preview,
    date,
  };
};

function UnreadNotes({ leadId }) {
  const { mode } = useTheme();
  const colors = tokens(mode);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const handleError = (message) => {
      if (cancelled) return;
      setError(message);
      setItems([]);
    };

    const normalizeLeadNotes = (payload) =>
      toArray(payload).map((note) => ({ type: "note", data: note }));

    const normalizeSummaryEntries = (payload) =>
      toArray(payload)
        .map(extractSummaryInfo)
        .filter(Boolean)
        .map((summary) => ({ type: "summary", data: summary }));

    const fetchForLead = async () => {
      if (!leadId) {
        // If no leadId, return empty array (API requires lead_id)
        return [];
      }
      
      // API endpoint: GET /api/leads/<lead_id>/notes/unread/
      const payload = await apiRequest(`/api/leads/${leadId}/notes/unread/`);
      return normalizeLeadNotes(payload);
    };

    void fetchForLead()
      .then((results) => {
        if (cancelled) return;
        setItems(results);
      })
      .catch((err) => {
        handleError(err?.message || "Unable to load unread notes.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [leadId]);

  const headingColor = useMemo(
    () => (mode === "dark" ? colors.grey[100] : colors.grey[900]),
    [mode, colors.grey]
  );
  const backgroundColor =
    mode === "dark" ? colors.primary[600] : colors.bg[100];

  const leadMode = leadId ? "note" : "summary";
  const hasItems = items.length > 0;

  return (
    <Box
      display="flex"
      flexDirection="column"
      gap={2}
      bgcolor={backgroundColor}
      borderRadius="12px"
      padding={3}
      width="100%"
    >
      <Typography variant="p" fontWeight="bold" color={headingColor}>
        Unread Notes
      </Typography>

      {loading ? (
        <Box display="flex" alignItems="center" gap={1}>
          <CircularProgress size={16} color="inherit" />
          <Typography color={headingColor}>Loading unread notes…</Typography>
        </Box>
      ) : error ? (
        <Typography color={colors.redAccent[100] || colors.redAccent[400]}>
          {error}
        </Typography>
      ) : !hasItems ? (
        <Typography color={headingColor}>
          {leadMode === "note" ? "No unread notes" : "No unread summaries yet"}
        </Typography>
      ) : (
        <List disablePadding sx={{ width: "100%" }}>
          {items.map((item) => {
            if (item.type === "note") {
              return (
                <ListItem
                  key={
                    item.data.id ??
                    item.data.uuid ??
                    item.data.note_id ??
                    item.data?.pk ??
                    item.data?.timestamp
                  }
                  disableGutters
                  sx={{ paddingY: 0.5 }}
                >
                  <ListItemText
                    primary={
                      <Typography fontWeight={600} color={headingColor}>
                        {resolveNotePreview(item.data)}
                      </Typography>
                    }
                    secondary={resolveNoteDate(item.data)}
                    secondaryTypographyProps={{ color: colors.grey[400] }}
                  />
                </ListItem>
              );
            }
            const { data } = item;
            return (
              <ListItem
                key={data.id ?? data.title}
                disableGutters
                sx={{ paddingY: 0.5 }}
              >
                <ListItemText
                  primary={
                    <Typography fontWeight={600} color={headingColor}>
                      {data.title} ({data.unreadCount} unread)
                    </Typography>
                  }
                  secondary={data.preview || data.date}
                  secondaryTypographyProps={{ color: colors.grey[400] }}
                />
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );
}

export default UnreadNotes;
