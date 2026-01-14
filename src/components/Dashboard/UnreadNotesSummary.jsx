import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import apiRequest from "../services/api";
import { colors } from "../../design-system/tokens";

const normalizeLeadId = (lead) => {
  if (!lead) return null;
  return lead.id ?? lead.pk ?? lead.uuid ?? lead.lead_id ?? null;
};

const toArray = (maybeArray) => {
  if (!maybeArray) return [];
  if (Array.isArray(maybeArray)) return maybeArray;
  if (Array.isArray(maybeArray.results)) return maybeArray.results;
  if (Array.isArray(maybeArray.data)) return maybeArray.data;
  return [];
};

const buildLeadLabel = (lead = {}) => {
  if (lead.title) return lead.title;
  if (lead.name) return lead.name;
  if (lead.company_name || lead.company)
    return lead.company_name || lead.company;
  if (lead.email) return lead.email;
  return "Untitled lead";
};

const normalizeNoteId = (noteOrId) => {
  if (!noteOrId) return null;
  if (typeof noteOrId === "object") {
    return (
      noteOrId.id ||
      noteOrId.pk ||
      noteOrId.uuid ||
      noteOrId.note_id ||
      noteOrId.noteId ||
      null
    );
  }
  return noteOrId;
};

const extractNoteMessage = (note) => {
  if (!note) return "";
  return (
    note.message ||
    note.note ||
    note.body ||
    note.text ||
    note.description ||
    "New message waiting"
  );
};

const getNoteTimestamp = (note) => {
  if (!note) return "";
  const timestamp =
    note.created_at || note.createdAt || note.timestamp || note.sent_at;
  if (!timestamp) return "";
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getNoteAuthorLabel = (note) => {
  if (!note) return "Team";
  return (
    note.author_name ||
    note.sender_name ||
    note.created_by?.name ||
    note.name ||
    note.created_by?.email ||
    "Team"
  );
};

const resolveNoteLeadId = (note) => {
  if (!note) return null;
  return (
    note.lead_id ||
    note.lead?.id ||
    note.lead?.pk ||
    note.lead?.uuid ||
    note?.entity_id ||
    note?.lead_id_foreign ||
    null
  );
};

const entryHasOwnValue = (entry, key) => {
  return (
    entry &&
    Object.prototype.hasOwnProperty.call(entry, key) &&
    entry[key] != null
  );
};

const hasAggregatedFields = (entry) => {
  if (!entry) return false;
  const aggregatedKeys = [
    "unread_count",
    "unreadCount",
    "note_count",
    "total_unread",
    "unread",
    "last_note",
    "lastNote",
    "last_message",
    "lastMessage",
    "preview",
    "messagePreview",
    "notePreview",
  ];
  if (aggregatedKeys.some((key) => entryHasOwnValue(entry, key))) {
    return true;
  }
  if (Array.isArray(entry.notes)) return true;
  if (Array.isArray(entry.unreadNotes)) return true;
  return false;
};

const buildAggregatedSummaryFromEntry = (entry, leadMap) => {
  if (!entry) return null;
  const leadCandidate =
    entry.lead ||
    entry.lead_detail ||
    entry.leadDetails ||
    entry.lead_data ||
    entry.leadInfo ||
    null;
  const leadIdFallback =
    entry.lead_id ??
    entry.leadId ??
    entry.entity_id ??
    entry.lead_id_foreign ??
    entry.id ??
    entry.summary_id ??
    null;
  const leadId = normalizeLeadId(leadCandidate || { lead_id: leadIdFallback });
  if (!leadId) return null;
  const leadKey = String(leadId);
  const mappedLead = leadMap.get(leadKey);
  const candidateTitle =
    entry.title ||
    entry.name ||
    entry.lead_title ||
    entry.leadTitle ||
    entry.label ||
    entry.lead_label ||
    entry.leadLabel ||
    entry.lead?.title ||
    entry.lead?.name;
  const title =
    candidateTitle ||
    (mappedLead && buildLeadLabel(mappedLead)) ||
    "Untitled lead";
  const numericCount =
    entry.unread_count ??
    entry.unreadCount ??
    entry.note_count ??
    entry.notes?.length ??
    entry.unreadNotes?.length ??
    entry.total_unread ??
    entry.unread ??
    0;
  const parsedCount = Number(numericCount);
  const unreadCount = Number.isFinite(parsedCount) ? parsedCount : 0;
  const rawLastNote =
    entry.last_note ??
    entry.lastNote ??
    entry.last_message ??
    entry.lastMessage ??
    (Array.isArray(entry.notes) ? entry.notes[entry.notes.length - 1] : null) ??
    (Array.isArray(entry.unreadNotes)
      ? entry.unreadNotes[entry.unreadNotes.length - 1]
      : null);
  const previewMessage =
    entry.preview || entry.messagePreview || entry.notePreview;
  const lastNote =
    rawLastNote || (previewMessage ? { message: previewMessage } : null);
  return {
    id: leadKey,
    title,
    unreadCount,
    lastNote,
  };
};

const buildSummariesFromAggregatedData = (items, leadMap) => {
  if (!items.length || !items.some(hasAggregatedFields)) {
    return [];
  }
  return items
    .map((entry) => buildAggregatedSummaryFromEntry(entry, leadMap))
    .filter(Boolean);
};

export default function UnreadNotesSummary({ onLoadingChange }) {
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [dialogError, setDialogError] = useState("");

  const totalUnread = useMemo(() => {
    return summaries.reduce(
      (total, item) => total + (item.unreadCount || 0),
      0
    );
  }, [summaries]);

  const fetchLeadPool = useCallback(async () => {
    const leads = [];
    let nextUrl = "/api/leads/?page_size=30";
    const MAX_LEADS = 60;

    while (nextUrl && leads.length < MAX_LEADS) {
      try {
        const page = await apiRequest(nextUrl);
        const pageLeads = toArray(page);
        leads.push(...pageLeads);
        nextUrl = page?.next || null;
      } catch (err) {
        console.error("Failed to fetch leads for unread summary", err);
        nextUrl = null;
      }
    }

    return leads.slice(0, MAX_LEADS);
  }, []);

  const collectNoteSummaries = (notes, leadMap) => {
    const aggregated = new Map();
    const pickTimestamp = (note) => {
      const value =
        note.created_at || note.createdAt || note.sent_at || note.timestamp;
      return value ? new Date(value).getTime() : 0;
    };

    for (const note of notes) {
      const leadId = resolveNoteLeadId(note);
      if (!leadId) continue;
      const idKey = String(leadId);
      const existing = aggregated.get(idKey) || {
        id: idKey,
        title: "",
        unreadCount: 0,
        lastNote: null,
      };

      existing.unreadCount += 1;

      if (!existing.lastNote) {
        existing.lastNote = note;
      } else {
        const currentTs = pickTimestamp(existing.lastNote);
        const candidateTs = pickTimestamp(note);
        if (candidateTs > currentTs) {
          existing.lastNote = note;
        }
      }

      if (!existing.title) {
        const mappedLead = leadMap.get(idKey);
        if (mappedLead) {
          existing.title = buildLeadLabel(mappedLead);
        } else if (note.lead) {
          existing.title = buildLeadLabel(note.lead);
        }
      }

      aggregated.set(idKey, existing);
    }

    const results = [];
    aggregated.forEach((value) => {
      if (!value.title) {
        value.title = "Untitled lead";
      }
      results.push(value);
    });
    return results;
  };

  const loadSummaries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const leadList = await fetchLeadPool();
      const leadMap = new Map();
      leadList.forEach((lead) => {
        const leadId = normalizeLeadId(lead);
        if (leadId) {
          leadMap.set(String(leadId), lead);
        }
      });
      // Fetch unread notes for each lead (API only supports per-lead endpoint)
      const results = await Promise.all(
        leadList.map(async (lead) => {
          const leadId = normalizeLeadId(lead);
          if (!leadId) return null;
          
          try {
            const unreadResponse = await apiRequest(
              `/api/leads/${leadId}/notes/unread/`
            );
            const unreadList = toArray(unreadResponse);
            if (!unreadList.length) return null;
            
            const lastUnread = unreadList[unreadList.length - 1];
            return {
              id: leadId,
              title: buildLeadLabel(lead),
              unreadCount: unreadList.length,
              lastNote: lastUnread,
            };
          } catch (err) {
            // Silently skip leads with no unread notes or API errors
            return null;
          }
        })
      );
      
      const noteSummaries = results.filter(Boolean);
      setSummaries(noteSummaries);
    } catch (err) {
      console.error("Failed to load unread notes summary", err);
      setError("Unable to load unread notes right now.");
    } finally {
      setLoading(false);
    }
  }, [fetchLeadPool]);

  useEffect(() => {
    loadSummaries();
  }, [loadSummaries]);

  useEffect(() => {
    if (typeof onLoadingChange === "function") {
      onLoadingChange(loading);
    }
  }, [loading, onLoadingChange]);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setDialogError("");
    setSelectedSummary(null);
  }, []);

  const markNoteAsRead = useCallback(async (summary) => {
    const noteId = normalizeNoteId(summary?.lastNote);
    if (!summary?.id || !noteId) {
      throw new Error("Missing identifiers for marking note as read.");
    }
    await apiRequest(`/api/leads/${summary.id}/notes/${noteId}/read/`, {
      method: "POST",
    });
  }, []);

  const handleSummaryClick = useCallback((summary) => {
    if (!summary?.lastNote) return;
    setSelectedSummary(summary);
    setDialogError("");
    setDialogOpen(true);
  }, []);

  const handleMarkAsRead = useCallback(async () => {
    if (!selectedSummary) return;
    setDialogLoading(true);
    setDialogError("");
    try {
      await markNoteAsRead(selectedSummary);
      await loadSummaries();
      closeDialog();
    } catch (err) {
      console.error("Failed to mark note as read", err);
      setDialogError("Unable to mark this note as read right now.");
    } finally {
      setDialogLoading(false);
    }
  }, [closeDialog, loadSummaries, markNoteAsRead, selectedSummary]);

  const handleGoToLead = useCallback(async () => {
    if (!selectedSummary) return;
    setDialogLoading(true);
    setDialogError("");
    try {
      await markNoteAsRead(selectedSummary);
      await loadSummaries();
      closeDialog();
      const leadId = selectedSummary.id;
      navigate(`/all-leads?focusLeadId=${encodeURIComponent(leadId)}`, {
        state: { focusLeadId: leadId },
      });
    } catch (err) {
      console.error("Failed to open lead from unread note", err);
      setDialogError("Unable to open lead right now.");
    } finally {
      setDialogLoading(false);
    }
  }, [closeDialog, loadSummaries, markNoteAsRead, navigate, selectedSummary]);

  const dialogAuthor = useMemo(
    () => getNoteAuthorLabel(selectedSummary?.lastNote),
    [selectedSummary]
  );

  const dialogMessage = useMemo(
    () => extractNoteMessage(selectedSummary?.lastNote),
    [selectedSummary]
  );

  const dialogTimestamp = useMemo(
    () => getNoteTimestamp(selectedSummary?.lastNote),
    [selectedSummary]
  );

  const dialogUnreadCount = selectedSummary?.unreadCount || 0;

  const isCurrentSummaryReadable = Boolean(
    selectedSummary?.id && normalizeNoteId(selectedSummary.lastNote)
  );

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: "320px",
        borderRadius: "12px",
        padding: 3,
        backgroundColor: colors.bg[100],
        border: `1px solid ${colors.grey[900]}`,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" fontWeight={700}>
          Unread Notes
        </Typography>
        <Chip
          label={totalUnread ? `${totalUnread} unread` : "All read"}
          size="small"
          color={totalUnread ? "warning" : "default"}
        />
      </Box>
      <Typography variant="caption" color="text.secondary">
        Highlights of unread conversations for recent leads.
      </Typography>
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          overflowY: summaries.length ? "auto" : "hidden",
        }}
      >
        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Loading unread notes...
          </Typography>
        ) : error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : !summaries.length ? (
          <Typography variant="body2" color="text.secondary">
            No unread notes right now.
          </Typography>
        ) : (
          summaries.map((item) => {
            const messagePreview = extractNoteMessage(item.lastNote);
            return (
              <Box
                key={item.id}
                tabIndex={0}
                role="button"
                onClick={() => handleSummaryClick(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleSummaryClick(item);
                  }
                }}
                sx={{
                  borderRadius: "10px",
                  border: `1px solid ${colors.grey[800]}`,
                  padding: 1.5,
                  backgroundColor: colors.bg[200],
                  cursor: "pointer",
                }}
              >
                <Box display="flex" justifyContent="space-between" gap={1}>
                  <Typography variant="body2" fontWeight={600}>
                    {item.title}
                  </Typography>
                  <Chip
                    size="small"
                    label={`${item.unreadCount} unread`}
                    color="warning"
                  />
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  {messagePreview}
                </Typography>
              </Box>
            );
          })
        )}
      </Box>
      <Button
        size="small"
        variant="text"
        onClick={loadSummaries}
        disabled={loading}
        sx={{ alignSelf: "flex-end" }}
      >
        Refresh
      </Button>
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
        aria-labelledby="unread-note-dialog-title"
      >
        <DialogTitle id="unread-note-dialog-title">
          {selectedSummary?.title || "Unread note"}
        </DialogTitle>
        <DialogContent dividers>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mb={1}
          >
            <Typography variant="caption" color="text.secondary">
              {dialogAuthor}
              {dialogTimestamp ? ` · ${dialogTimestamp}` : ""}
            </Typography>
            <Chip
              label={`${dialogUnreadCount} unread`}
              size="small"
              color="warning"
            />
          </Box>
          <Typography variant="body1" paragraph>
            {dialogMessage || "No message content is available."}
          </Typography>
          {dialogError && (
            <Typography variant="caption" color="error">
              {dialogError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ gap: 1, flexWrap: "wrap" }}>
          <Button onClick={closeDialog} disabled={dialogLoading}>
            Close
          </Button>
          <Button
            onClick={handleMarkAsRead}
            disabled={!isCurrentSummaryReadable || dialogLoading}
          >
            Mark as read
          </Button>
          <Button
            variant="contained"
            onClick={handleGoToLead}
            disabled={!isCurrentSummaryReadable || dialogLoading}
          >
            Open lead
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
