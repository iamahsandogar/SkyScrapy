import { useCallback, useMemo, useState } from "react";
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
import { tokens } from "../../design-system/tokens/colors.js";
import { useTheme } from "../../contexts/ThemeContext";
import { isProject } from "./leadUtils";

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

const getAssignedToName = (lead) => {
  if (!lead) return "";
  
  // 1. Check assigned_to object
  const assigned = lead.assigned_to || lead.assignedTo;
  if (assigned && typeof assigned === "object") {
    // Check user_details
    if (assigned.user_details?.name) return assigned.user_details.name;
    if (assigned.user_details?.username) return assigned.user_details.username;
    // Removed email fallback as per user request
    
    // Check direct properties
    if (assigned.name) return assigned.name;
    if (assigned.username) return assigned.username;
    // Removed email fallback as per user request
  }
  
  // 2. Check flat fields
  if (lead.assigned_to_name) return lead.assigned_to_name;
  if (lead.assignedToName) return lead.assignedToName;
  
  return "";
};

const buildLeadLabel = (lead = {}) => {
  // 1. Prioritize Lead Title (as per user request)
  if (lead.title) return lead.title;

  // 2. Try to construct full name from first/last name
  const firstName = lead.first_name || lead.firstName;
  const lastName = lead.last_name || lead.lastName;
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  if (fullName) return fullName;

  // 3. Try company
  if (lead.company_name || lead.company)
    return lead.company_name || lead.company;

  // 4. Try other name fields
  if (lead.name) return lead.name;
  
  // 5. Fallback to email if nothing else exists (better than "Untitled lead")
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
    
  // Get lead name
  let leadName = "Untitled lead";
  if (candidateTitle) {
    leadName = candidateTitle;
  } else if (mappedLead && mappedLead.name) {
    leadName = mappedLead.name;
  }
  
  // Get assigned to
  let assignedTo = "";
  if (mappedLead && mappedLead.assignedTo) {
    assignedTo = mappedLead.assignedTo;
  }
  
  // Format title
  let title = leadName;
  if (assignedTo) {
    title = `${leadName} (Assigned to: ${assignedTo})`;
  }
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

export default function UnreadNotesSummaryContent({ data }) {
  const navigate = useNavigate();
  const { mode } = useTheme();
  const colors = tokens(mode);

  // Check if data is still loading
  const isLoading = data === null || data === undefined;

  // Theme-aware colors
  const backgroundColor = mode === "dark" ? colors.primary[600] : colors.bg[100];
  const cardBackground = mode === "dark" ? colors.primary[500] : colors.bg[200];
  const borderColor = mode === "dark" ? colors.grey[600] : colors.grey[800];
  const headingColor = colors.grey[100];
  const textColor = mode === "dark" ? colors.grey[100] : colors.grey[200];
  const secondaryTextColor = mode === "dark" ? colors.grey[200] : colors.grey[600];
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [markedAsReadLeadIds, setMarkedAsReadLeadIds] = useState(new Set());

  // Extract unread notes from props (from /api/common/dashboard/)
  const unreadNotesData = data?.unread_notes;
  
  const rawNotes = useMemo(() => {
    if (isLoading || !unreadNotesData) return [];
    
    if (Array.isArray(unreadNotesData)) return unreadNotesData;
    if (Array.isArray(unreadNotesData.notes)) return unreadNotesData.notes;
    if (Array.isArray(unreadNotesData.results)) return unreadNotesData.results;
    if (Array.isArray(unreadNotesData.data)) return unreadNotesData.data;
    
    return [];
  }, [unreadNotesData, isLoading]);
  const remindersData = data?.reminders || {};
  
  // Build a map of lead IDs to lead info from reminders data (excluding projects)
  const leadInfoMap = useMemo(() => {
    if (isLoading) return new Map();
    const map = new Map();
    const allLeads = [
      ...(remindersData.overdue?.leads || []),
      ...(remindersData.due_today?.leads || []),
      ...(remindersData.upcoming?.leads || []),
      ...(remindersData.done?.leads || []),
    ];
    // Filter out projects before building the map
    allLeads
      .filter((lead) => !isProject(lead))
      .forEach(lead => {
        if (lead.id) {
          const name = buildLeadLabel(lead);
          const assignedTo = getAssignedToName(lead);
          map.set(String(lead.id), { name, assignedTo });
        }
      });
    return map;
  }, [remindersData, isLoading]);
  
  // Transform notes to the expected summary format
  const summaries = useMemo(() => {
    if (isLoading) return [];
    // Group notes by lead
    const leadNotesMap = new Map();
    
    rawNotes.forEach(note => {
      const leadId = note.lead || resolveNoteLeadId(note);
      if (!leadId) return;
      
      // Check if the lead in the note is a project
      const leadObject = note.lead && typeof note.lead === 'object' ? note.lead : null;
      if (leadObject && isProject(leadObject)) {
        return; // Skip projects
      }
      
      const leadKey = String(leadId);
      
      // Also check if lead is in leadInfoMap (which already filters projects)
      // If not in map and we don't have lead object, it might be a project
      if (!leadObject && !leadInfoMap.has(leadKey)) {
        return; // Skip if not found in filtered leadInfoMap
      }
      
      if (!leadNotesMap.has(leadKey)) {
        // Try to get info from leadInfoMap, then from note, then fallback
        let leadName = "Untitled lead";
        let assignedToName = "";
        
        // 1. Check if note has full lead object
        if (leadObject) {
           leadName = buildLeadLabel(leadObject);
           assignedToName = getAssignedToName(leadObject);
        } else {
           // 2. Fallback to map
           const info = leadInfoMap.get(leadKey);
           if (info) {
             leadName = info.name;
             assignedToName = info.assignedTo;
           } else {
             // 3. Fallback to flat fields
             leadName = note.lead_title || note.lead?.title || "Untitled lead";
           }
        }
        
        // Format final title: "Lead Name (Assigned to: Name)" or just "Lead Name"
        let finalTitle = leadName;
        if (assignedToName) {
           finalTitle = `${leadName} (Assigned to: ${assignedToName})`;
        }
        
        leadNotesMap.set(leadKey, {
          id: leadKey,
          title: finalTitle,
          unreadCount: 0,
          lastNote: null,
          notes: [],
        });
      }
      
      const summary = leadNotesMap.get(leadKey);
      summary.notes.push(note);
      if (!note.is_read) {
        summary.unreadCount += 1;
      }
      // Keep track of the latest note
      if (!summary.lastNote || new Date(note.created_at) > new Date(summary.lastNote.created_at)) {
        summary.lastNote = note;
      }
    });
    
    return Array.from(leadNotesMap.values())
      .filter(s => s.unreadCount > 0)
      .filter(s => !markedAsReadLeadIds.has(s.id));
  }, [rawNotes, leadInfoMap, markedAsReadLeadIds, isLoading]);

  const totalUnread = useMemo(() => {
    if (isLoading) return 0;
    return summaries.reduce(
      (total, item) => total + (item.unreadCount || item.unread_count || 0),
      0
    );
  }, [summaries, isLoading]);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setDialogError("");
    setSelectedSummary(null);
  }, []);

  const markNoteAsRead = useCallback(async (summary) => {
    if (!summary?.id) {
      throw new Error("Missing lead ID for marking notes as read.");
    }
    await apiRequest(`/api/leads/${summary.id}/notes/mark-read/`, {
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
      // Remove from local list immediately
      setMarkedAsReadLeadIds(prev => new Set([...prev, selectedSummary.id]));
      closeDialog();
    } catch (err) {
      console.error("Failed to mark note as read", err);
      setDialogError("Unable to mark this note as read right now.");
    } finally {
      setDialogLoading(false);
    }
  }, [closeDialog, markNoteAsRead, selectedSummary]);

  const handleGoToLead = useCallback(async () => {
    if (!selectedSummary) return;
    setDialogLoading(true);
    setDialogError("");
    try {
      await markNoteAsRead(selectedSummary);
      // Remove from local list immediately
      setMarkedAsReadLeadIds(prev => new Set([...prev, selectedSummary.id]));
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
  }, [closeDialog, markNoteAsRead, navigate, selectedSummary]);

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
        minWidth: "200px",
        maxHeight: 190,
        borderRadius: "12px",
        padding: 3,
        backgroundColor: backgroundColor,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        overflow: "hidden",
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" fontWeight={700} color={headingColor}>
          Unread Notes
        </Typography>
        <Chip
          label={isLoading ? "..." : (totalUnread ? `${totalUnread} unread` : "All read")}
          size="small"
          color={isLoading ? "default" : (totalUnread ? "warning" : "default")}
        />
      </Box>
      <Typography variant="caption" color={secondaryTextColor}>
        {isLoading ? "..." : "Highlights of unread conversations for recent leads."}
      </Typography>
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          minHeight: 0,
          overflowY: "auto",
        }}
      >
        {isLoading ? (
          <Typography variant="body2" color={secondaryTextColor}>
            ...
          </Typography>
        ) : !summaries.length ? (
          <Typography variant="body2" color={secondaryTextColor}>
            No unread notes right now.
          </Typography>
        ) : (
          summaries.map((item) => {
            const messagePreview = extractNoteMessage(
              item.lastNote || item.last_note
            );
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
                  border: `1px solid ${borderColor}`,
                  padding: 1.5,
                  backgroundColor: cardBackground,
                  cursor: "pointer",
                }}
              >
                <Box display="flex" justifyContent="space-between" gap={1}>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color={textColor}
                  >
                    {item.title}
                  </Typography>
                  <Chip
                    size="small"
                    label={`${item.unreadCount || item.unread_count} unread`}
                    color="warning"
                  />
                </Box>
                <Typography
                  variant="caption"
                  color={secondaryTextColor}
                  display="block"
                >
                  {messagePreview}
                </Typography>
              </Box>
            );
          })
        )}
      </Box>
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
            mb={2}
          >
            <Typography variant="subtitle2" color="text.secondary">
              Unread messages
            </Typography>
            <Chip
              label={`${dialogUnreadCount} unread`}
              size="small"
              color="warning"
            />
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {selectedSummary?.notes
              ?.filter((note) => !note.is_read)
              .map((note, index) => (
                <Box
                  key={note.id || note.pk || index}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: "action.hover",
                  }}
                >
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      {getNoteAuthorLabel(note)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getNoteTimestamp(note)}
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    {extractNoteMessage(note)}
                  </Typography>
                </Box>
              ))}
          </Box>
          {dialogError && (
            <Typography variant="caption" color="error" mt={1}>
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
