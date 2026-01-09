import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Button,
  Paper,
  Chip,
  CircularProgress,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import apiRequest from "../services/api";
import { colors } from "../../design-system/tokens";

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

const toArray = (maybeArray) => {
  if (!maybeArray) return [];
  if (Array.isArray(maybeArray)) return maybeArray;
  if (Array.isArray(maybeArray.notes)) return maybeArray.notes;
  if (Array.isArray(maybeArray.data)) return maybeArray.data;
  if (Array.isArray(maybeArray.results)) return maybeArray.results;
  return [];
};

const formatTimestamp = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const date = parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const time = parsed.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} · ${time}`;
};

const getAuthorName = (note) => {
  const fallback = note?.created_by || note?.author || note?.sender || note?.user;
  if (fallback) {
    if (typeof fallback === "string") return fallback;
    const { first_name, last_name, username, name } = fallback;
    const builtName = [first_name, last_name, name, username]
      .filter(Boolean)
      .join(" ");
    if (builtName) return builtName;
  }

  if (note?.author_name) return note.author_name;
  if (note?.sender_name) return note.sender_name;
  if (note?.name) return note.name;
  return "Team";
};

const deriveRoleLabel = (note, currentUserId) => {
  const roleValue =
    note?.role ||
    note?.sender_role ||
    note?.created_by?.role ||
    note?.created_by?.role_name ||
    note?.created_by?.roleLabel;

  if (typeof roleValue === "string") {
    const lowercase = roleValue.toLowerCase();
    if (lowercase.includes("manager")) return "Manager";
    if (lowercase.includes("employee")) return "Employee";
  }

  if (typeof roleValue === "number") {
    if (roleValue === 0 || roleValue === 1) return "Manager";
    if (roleValue === 2) return "Employee";
  }

  const noteAuthorId = normalizeNoteId(note?.created_by || note);
  if (noteAuthorId && currentUserId && String(noteAuthorId) === String(currentUserId)) {
    return "You";
  }

  return "Employee";
};

export default function LeadNotesChat({ leadId }) {
  const [notes, setNotes] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [marking, setMarking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  const currentUserId = useMemo(() => {
    try {
      const stored = localStorage.getItem("user");
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      return parsed?.id || parsed?.pk || parsed?.uuid || null;
    } catch {
      return null;
    }
  }, []);

  const decoratedNotes = useCallback((rawNotes, unreadIds) => {
    return rawNotes.map((note) => ({
      ...note,
      _isUnread: unreadIds.includes(String(normalizeNoteId(note))),
    }));
  }, []);

  const fetchNotes = useCallback(async () => {
    if (!leadId) {
      setNotes([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [allResponse, unreadResponse] = await Promise.all([
        apiRequest(`/api/leads/${leadId}/notes/`).catch(() => []),
        apiRequest(`/api/leads/${leadId}/notes/unread/`).catch(() => []),
      ]);

      const allNotes = toArray(allResponse);
      const unreadNotes = toArray(unreadResponse);
      const unreadIds = unreadNotes
        .map((note) => normalizeNoteId(note))
        .filter(Boolean)
        .map((value) => String(value));

      setNotes(decoratedNotes(allNotes, unreadIds));
      setUnreadCount(unreadIds.length);
    } catch (err) {
      console.error("Failed to load notes", err);
      setError("We could not load notes at this time.");
    } finally {
      setLoading(false);
    }
  }, [decoratedNotes, leadId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [notes]);

  const handleSendMessage = async () => {
    if (sending || !leadId || !message.trim()) return;
    setSending(true);
    setError("");
    try {
      await apiRequest(`/api/leads/${leadId}/notes/`, {
        method: "POST",
        body: JSON.stringify({ message: message.trim() }),
      });
      setMessage("");
      await fetchNotes();
    } catch (err) {
      console.error("Failed to send message", err);
      setError("Unable to create note right now.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleMarkAsRead = async (note) => {
    const noteId = normalizeNoteId(note);
    if (!leadId || !noteId) return;
    try {
      await apiRequest(`/api/leads/${leadId}/notes/${noteId}/read/`, {
        method: "POST",
      });
      setNotes((prev) =>
        prev.map((entry) =>
          String(normalizeNoteId(entry)) === String(noteId)
            ? { ...entry, _isUnread: false }
            : entry
        )
      );
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch (err) {
      console.error("Failed to mark note as read", err);
      setError("Could not mark the note as read.");
    }
  };

  const handleMarkAllRead = async () => {
    if (!leadId) return;
    const unreadIds = notes
      .filter((note) => note._isUnread)
      .map((note) => normalizeNoteId(note))
      .filter(Boolean);
    if (!unreadIds.length) return;

    setMarking(true);
    setError("");

    try {
      await Promise.all(
        unreadIds.map((id) =>
          apiRequest(`/api/leads/${leadId}/notes/${id}/read/`, {
            method: "POST",
          }).catch(() => null)
        )
      );
      await fetchNotes();
    } catch (err) {
      console.error("Failed to mark all notes as read", err);
      setError("Could not mark every note as read.");
    } finally {
      setMarking(false);
    }
  };

  if (!leadId) {
    return (
      <Paper
        elevation={0}
        sx={{
          background: "rgba(10,13,24,0.75)",
          border: `1px solid ${colors.grey[700]}`,
          p: 2,
          borderRadius: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Select a lead to open the shared notes.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box
      sx={{
        fontFamily: "Space Grotesk, system-ui, sans-serif",
        mt: 2,
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
        mb={1}
      >
        <Typography variant="h6" fontWeight={700} letterSpacing={0.5}>
          Notes
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          {unreadCount > 0 ? (
            <Chip
              label={`${unreadCount} unread`}
              size="small"
              color="warning"
              sx={{ borderRadius: 2, fontWeight: 600 }}
            />
          ) : (
            <Typography variant="caption" color="text.secondary">
              All notes read
            </Typography>
          )}
          {unreadCount > 0 && (
            <Button
              size="small"
              variant="outlined"
              onClick={handleMarkAllRead}
              disabled={marking}
            >
              {marking ? "Marking" : "Mark all read"}
            </Button>
          )}
        </Box>
      </Box>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${colors.blueAccent[600]}`,
          background:
            "linear-gradient(180deg, rgba(5, 8, 20, 0.95), rgba(12, 48, 97, 0.8))",
          p: 2,
          maxHeight: 320,
          overflowY: "auto",
        }}
        ref={scrollRef}
      >
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={24} color="inherit" />
          </Box>
        ) : notes.length === 0 ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            flexDirection="column"
            gap={1}
            py={4}
          >
            <Typography variant="body2" color="text.secondary">
              No notes yet. Craft the first message to capture context.
            </Typography>
          </Box>
        ) : (
          notes.map((note, index) => {
            const noteId = normalizeNoteId(note);
            const isCurrentUser =
              noteId && currentUserId
                ? String(noteId) === String(currentUserId)
                : false;
            const authorLabel = getAuthorName(note);
            const roleLabel = deriveRoleLabel(note, currentUserId);
            const bubbleColor = isCurrentUser
              ? colors.greenAccent[900]
              : colors.blueAccent[900];
            const bubbleKey =
              noteId || `${authorLabel}-${note.created_at || note.createdAt || index}`;

            return (
              <Box
                key={bubbleKey}
                display="flex"
                justifyContent={isCurrentUser ? "flex-end" : "flex-start"}
                sx={{ mb: 1 }}
              >
                <Box
                  sx={{
                    maxWidth: "75%",
                    backgroundColor: bubbleColor,
                    color: colors.grey[100],
                    borderRadius: 3,
                    px: 2,
                    py: 1.5,
                    boxShadow: "0 12px 20px rgba(5, 30, 60, 0.3)",
                    position: "relative",
                  }}
                >
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    mb={0.5}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 600, letterSpacing: 0.5 }}
                      >
                        {authorLabel}
                      </Typography>
                      <Chip
                        label={roleLabel}
                        size="small"
                        variant="filled"
                        color="info"
                        sx={{
                          height: 20,
                          borderRadius: 1.5,
                          fontSize: 10,
                          fontWeight: 600,
                          backgroundColor: "rgba(255,255,255,0.12)",
                        }}
                      />
                    </Box>
                    <Typography variant="caption" color="grey.400">
                      {formatTimestamp(note.created_at || note.createdAt)}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: "pre-line" }}
                  >
                    {note.message || note.note || note.body || "-"}
                  </Typography>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mt={1}
                  >
                    {note._isUnread && (
                      <Chip
                        label="Unread"
                        size="small"
                        sx={{
                          backgroundColor: "rgba(255, 193, 7, 0.25)",
                          color: "rgba(255, 193, 7, 0.95)",
                          fontWeight: 600,
                        }}
                      />
                    )}
                    {note._isUnread && (
                      <IconButton
                        size="small"
                        onClick={() => handleMarkAsRead(note)}
                        sx={{
                          color: "rgba(255,255,255,0.8)",
                        }}
                        aria-label="Mark note as read"
                      >
                        <CheckCircleOutlineIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })
        )}
      </Paper>

      <Box
        mt={2}
        display="flex"
        alignItems="flex-end"
        gap={1}
        sx={{ fontFamily: "inherit" }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={3}
          placeholder="Share an update with the manager or employee"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          size="small"
          InputProps={{
            sx: {
              borderRadius: 2,
              backgroundColor: "rgba(255,255,255,0.08)",
              color: colors.grey[100],
              fontFamily: "inherit",
            },
          }}
        />
        <IconButton
          color="primary"
          disabled={!message.trim() || sending}
          onClick={handleSendMessage}
          sx={{
            backgroundColor: colors.blueAccent[500],
            color: colors.grey[100],
            borderRadius: 2,
            mt: 0.5,
            height: 40,
            width: 40,
            "&:hover": {
              backgroundColor: colors.blueAccent[400],
            },
          }}
          aria-label="Send note"
        >
          <SendIcon />
        </IconButton>
      </Box>

      {error && (
        <Typography variant="caption" color="error" mt={1}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
