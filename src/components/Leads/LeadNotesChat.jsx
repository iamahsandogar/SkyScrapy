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
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import apiRequest from "../services/api";
import { useTheme } from "../../contexts/ThemeContext";
import { tokens } from "../../design-system/tokens/colors.js";
import { colors } from "../../design-system/tokens/index.js";

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

const extractEntityId = (entity) => {
  if (!entity) return null;
  if (typeof entity === "string" || typeof entity === "number") return entity;

  const idFields = [
    "id",
    "pk",
    "uuid",
    "user_id",
    "author_id",
    "created_by_id",
    "sender_id",
  ];
  for (const field of idFields) {
    if (entity[field]) {
      return entity[field];
    }
  }

  const nestedFields = [
    "user",
    "author",
    "created_by",
    "sender",
    "owner",
    "profile",
  ];
  for (const field of nestedFields) {
    if (entity[field]) {
      const nested = extractEntityId(entity[field]);
      if (nested) return nested;
    }
  }

  return null;
};

const buildEntityDisplayName = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  const nameParts = [
    entity.first_name || entity.firstName,
    entity.last_name || entity.lastName,
    entity.full_name || entity.fullName,
    entity.display_name || entity.displayName,
    entity.name,
    entity.title,
    entity.username,
    entity.email,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean);
  if (nameParts.length) {
    return nameParts.join(" ");
  }
  const nested = [
    entity.user_details,
    entity.profile,
    entity.user,
    entity.owner,
    entity.employee,
    entity.author,
    entity.sender,
    entity.created_by,
    entity.creator,
  ];
  for (const candidate of nested) {
    const nestedName = buildEntityDisplayName(candidate);
    if (nestedName) return nestedName;
  }
  return "";
};

const searchForAnyName = (source, visited = new Set()) => {
  if (!source || typeof source !== "object") return "";
  if (visited.has(source)) return "";
  visited.add(source);
  const priority = [
    "name",
    "full_name",
    "fullName",
    "display_name",
    "displayName",
    "title",
    "label",
    "username",
    "first_name",
    "firstName",
    "last_name",
    "lastName",
  ];
  for (const key of priority) {
    if (source[key]) {
      return String(source[key]).trim();
    }
  }
  for (const value of Object.values(source)) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "object") {
      const nested = searchForAnyName(value, visited);
      if (nested) return nested;
    }
  }
  return "";
};

const getNoteAuthorId = (note) => {
  if (!note) return null;
  // Check author.user_details.id first (as per API response structure)
  if (note?.author?.user_details?.id) {
    return note.author.user_details.id;
  }
  if (note?.author?.user_details?.user_id) {
    return note.author.user_details.user_id;
  }
  // Fallback to other fields
  return (
    extractEntityId(note?.created_by) ||
    extractEntityId(note?.author) ||
    extractEntityId(note?.sender) ||
    extractEntityId(note?.user) ||
    extractEntityId(note?.owner) ||
    extractEntityId(note?.profile)
  );
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

const ADMIN_ROLE_KEYWORDS = [
  "admin",
  "manager",
  "superuser",
  "lead",
  "owner",
  "director",
  "founder",
  "founders",
  "boss",
];
const EMPLOYEE_ROLE_KEYWORDS = [
  "employee",
  "staff",
  "agent",
  "rep",
  "assistant",
  "associate",
  "consultant",
  "executive",
  "coordinator",
  "specialist",
];

const normalizeRoleToken = (value) => {
  if (value == null) return "";
  if (typeof value === "boolean") return "";
  if (typeof value === "string") return value.trim().toLowerCase();
  if (typeof value === "number") return String(value).trim();
  if (typeof value === "object") {
    return normalizeRoleToken(
      value.role ||
        value.role_name ||
        value.roleLabel ||
        value.role_label ||
        value.name ||
        value.label ||
        value.slug ||
        value.title ||
        value.type
    );
  }
  return "";
};

const gatherRoleTokens = (note) => {
  if (!note) return [];
  const tokens = [];
  const pushToken = (value) => {
    const normalized = normalizeRoleToken(value);
    if (normalized) {
      tokens.push(normalized);
    }
  };

  pushToken(note.role);
  pushToken(note.role_name);
  pushToken(note.roleLabel);
  pushToken(note.role_label);
  pushToken(note.sender_role);
  pushToken(note.sender_role_name);
  pushToken(note.user_role);
  pushToken(note.user_role_name);
  pushToken(note.user_type);
  pushToken(note.author?.role);
  pushToken(note.author?.role_name);
  pushToken(note.author?.role_label);
  pushToken(note.author?.roleLabel);
  pushToken(note.author?.position);
  pushToken(note.author?.type);
  pushToken(note.author?.title);
  pushToken(note.created_by?.role);
  pushToken(note.created_by?.role_name);
  pushToken(note.created_by?.role_label);
  pushToken(note.created_by?.roleLabel);
  pushToken(note.created_by?.position);
  pushToken(note.created_by?.designation);
  pushToken(note.created_by?.type);
  pushToken(note.sender?.role);
  pushToken(note.sender?.role_name);
  pushToken(note.sender?.role_label);
  pushToken(note.sender?.type);
  pushToken(note.sender?.position);
  pushToken(note.creator?.role);
  pushToken(note.creator?.role_name);
  pushToken(note.creator?.type);
  return tokens;
};

const hasRoleKeyword = (tokens, keywords) =>
  tokens.some((token) => keywords.some((keyword) => token.includes(keyword)));

const buildSimpleName = (parts) =>
  parts
    .filter((part) => part)
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join(" ");

const buildNameFromParts = (first, last) => buildSimpleName([first, last]);

const buildNameFromAuthorFields = (note) => {
  if (!note) return "";
  const firstName =
    note.author_first_name ||
    note.authorFirstName ||
    note.author?.first_name ||
    note.author?.firstName ||
    note.created_by?.first_name ||
    note.created_by?.firstName;
  const lastName =
    note.author_last_name ||
    note.authorLastName ||
    note.author?.last_name ||
    note.author?.lastName ||
    note.created_by?.last_name ||
    note.created_by?.lastName;
  return buildNameFromParts(firstName, lastName);
};

const getEmployeeDisplayName = (note) => {
  if (!note) return "";
  const directCandidate =
    note.employee_name ||
    note.creator_name ||
    note.author_name ||
    note.sender_name ||
    note.employee?.name ||
    note.employee?.full_name ||
    note.employee?.display_name ||
    note.employee?.label ||
    note.employee?.title ||
    note.assigned_to?.name ||
    note.assignedTo?.name ||
    note.assignee?.name ||
    note.owner?.name;
  if (directCandidate) return String(directCandidate).trim();
  const fallbackSources = [
    note.employee,
    note.assigned_to,
    note.assignedTo,
    note.assignee,
    note.owner,
    note.creator,
    note.author,
    note.sender,
    note.created_by,
  ];
  for (const source of fallbackSources) {
    const candidate = searchForAnyName(source);
    if (candidate) return candidate;
  }
  return "";
};

const getAuthorName = (note, currentUserId, currentUserName) => {
  const fallbackEntity =
    note?.created_by || note?.author || note?.sender || note?.user;

  const authorNameFromFields = buildNameFromAuthorFields(note);
  if (authorNameFromFields) return authorNameFromFields;
  const employeeName = getEmployeeDisplayName(note);
  if (employeeName) return employeeName;

  if (fallbackEntity) {
    if (typeof fallbackEntity === "string") return fallbackEntity;
    const builtName = buildEntityDisplayName(fallbackEntity);
    if (builtName) return builtName;
  }

  if (note?.author_name) return note.author_name;
  if (note?.sender_name) return note.sender_name;
  if (note?.name) return note.name;

  const authorId = getNoteAuthorId(note);
  if (
    authorId &&
    currentUserId &&
    String(authorId) === String(currentUserId) &&
    currentUserName
  ) {
    return currentUserName;
  }

  return "Team";
};

const deriveRoleLabel = (note, currentUserId) => {
  const noteAuthorId = getNoteAuthorId(note);
  if (
    noteAuthorId &&
    currentUserId &&
    String(noteAuthorId) === String(currentUserId)
  ) {
    return "You";
  }

  const tokens = gatherRoleTokens(note);
  const adminFlag =
    note?.created_by?.is_admin ||
    note?.created_by?.is_staff ||
    note?.created_by?.is_superuser ||
    note?.author?.is_admin ||
    note?.author?.is_staff ||
    note?.sender?.is_admin ||
    note?.sender?.is_staff ||
    note?.creator?.is_admin ||
    note?.creator?.is_staff;

  if (adminFlag || hasRoleKeyword(tokens, ADMIN_ROLE_KEYWORDS)) {
    return "Manager";
  }

  const employeeFlag =
    note?.created_by?.is_employee ||
    note?.author?.is_employee ||
    note?.sender?.is_employee ||
    note?.creator?.is_employee;

  if (employeeFlag || hasRoleKeyword(tokens, EMPLOYEE_ROLE_KEYWORDS)) {
    return "Employee";
  }

  return "Employee";
};

const getSpeakerTitle = (roleLabel) => {
  if (roleLabel === "Manager") return "Admin";
  if (roleLabel === "Employee") return "Employee";
  if (roleLabel === "You") return "You";
  return "Team";
};

export default function LeadNotesChat({ leadId }) {
  const [notes, setNotes] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [marking, setMarking] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  const currentUserInfo = useMemo(() => {
    try {
      const stored = localStorage.getItem("user");
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      // Get user ID directly from parsed.id (localStorage user object structure)
      const userId = parsed?.id || extractEntityId(parsed);
      return {
        id: userId,
        name: buildEntityDisplayName(parsed),
      };
    } catch {
      return null;
    }
  }, []);
  const currentUserId = currentUserInfo?.id || null;
  const currentUserName = currentUserInfo?.name || "";

  const { mode } = useTheme();
  const themeColors = tokens(mode);
  const isDark = mode === "dark";
  const chatBackground = isDark
    ? themeColors.primary[600]
    : themeColors.bg[100];
  // My messages (right side) - using green accent color
  const chatSenderBubble = isDark
    ? "#226ffe" // themeColors.greenAccent[600]
    : "#226ffe"; //themeColors.greenAccent[500];
  // Other messages (left side) - grey color
  const chatReceiverBubble = isDark
    ? "#aaa" //themeColors.grey[700]
    : "#eee"; //themeColors.grey[300];
  const chatBorderColor = isDark
    ? themeColors.grey[700]
    : themeColors.grey[300];
  const senderTextColor = isDark
    ? "#eee" //themeColors.grey[100]
    : themeColors.bg[100];
  const receiverTextColor = isDark
    ? "#222" //themeColors.grey[100]
    : "#333"; //themeColors.grey[900];
  const inputBackground = isDark
    ? themeColors.grey[900]
    : themeColors.grey[100];
  const inputTextColor = isDark ? themeColors.grey[100] : themeColors.grey[900];
  const sendButtonBackground = themeColors.blueAccent[500];
  const sendButtonHover = isDark
    ? themeColors.blueAccent[400]
    : themeColors.blueAccent[500];
  const sendButtonText = themeColors.bg[100];

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

  const handleDeleteNote = useCallback(
    async (note) => {
      const noteId = normalizeNoteId(note);
      if (!leadId || !noteId) return;
      setDeletingNoteId(noteId);
      setError("");
      try {
        await apiRequest(`/api/leads/${leadId}/notes/${noteId}/`, {
          method: "DELETE",
        });
        await fetchNotes();
      } catch (err) {
        console.error("Failed to delete note", err);
        setError("Could not delete the note.");
      } finally {
        setDeletingNoteId((prev) => (prev === noteId ? null : prev));
      }
    },
    [fetchNotes, leadId]
  );

  if (!leadId) {
    return (
      <Paper
        elevation={0}
        sx={{
          background: "rgba(10,13,24,0.75)",
          border: `1px solid ${chatBorderColor}`,
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
          border: `1px solid ${chatBorderColor}`,
          backgroundColor: chatBackground,
          p: 2,
          maxHeight: 360,
          overflowY: "auto",
        }}
        ref={scrollRef}
      >
        {loading ? (
          <Box display="flex" justifyContent="center">
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
            const authorId = getNoteAuthorId(note);
            const isCurrentUser =
              authorId && currentUserId
                ? String(authorId) === String(currentUserId)
                : false;
            const authorLabel = getAuthorName(
              note,
              currentUserId,
              currentUserName
            );
            const roleLabel = deriveRoleLabel(note, currentUserId);
            const speakerTitle = getSpeakerTitle(roleLabel);
            const speakerDisplay = authorLabel
              ? `${speakerTitle} · ${authorLabel}`
              : speakerTitle;
            const timestampLabel = formatTimestamp(
              note.created_at || note.createdAt
            );
            const bubbleBackground = isCurrentUser
              ? chatSenderBubble
              : chatReceiverBubble;
            const bubbleTextColor = isCurrentUser
              ? senderTextColor
              : receiverTextColor;

            const bubbleKey =
              noteId ||
              `${speakerDisplay}-${note.created_at || note.createdAt || index}`;

            const isDeletingThisNote =
              Boolean(deletingNoteId) && noteId
                ? String(deletingNoteId) === String(noteId)
                : false;

            const authorDetails = note?.author?.user_details;

            return (
              <Box
                key={bubbleKey}
                width="100%"
                display="flex"
                justifyContent={isCurrentUser ? "flex-end" : "flex-start"}
                sx={{ mb: 1 }}
              >
                <Box
                  sx={{
                    backgroundColor: bubbleBackground,
                    color: bubbleTextColor,
                    borderRadius: 2,
                    px: 1,
                    maxWidth: "75%",
                    minWidth: 180,
                  }}
                >
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={0.4}
                    mt={1}
                  >
                    <Typography variant="caption" fontWeight={700}>
                      {`${authorDetails?.first_name} ${authorDetails?.last_name}`}
                    </Typography>
                    {timestampLabel && (
                      <Typography
                        variant="caption"
                        sx={{
                          opacity: 0.9,
                          fontSize: "0.70rem",
                          paddingLeft: 2,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {timestampLabel}
                      </Typography>
                    )}
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      color: bubbleTextColor,
                      whiteSpace: "pre-line",
                      lineHeight: 1.5,
                    }}
                  >
                    {note.message || note.note || note.body || "-"}
                  </Typography>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mt={1}
                  >
                    {note._isUnread ? (
                      <Chip
                        label="Unread"
                        size="small"
                        sx={{
                          backgroundColor: "rgba(255, 255, 255, 0.25)",
                          color: bubbleTextColor,
                          fontWeight: 600,
                          borderRadius: 1.5,
                        }}
                      />
                    ) : (
                      <Box sx={{ width: 64 }} />
                    )}
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {note._isUnread && (
                        <IconButton
                          size="small"
                          onClick={() => handleMarkAsRead(note)}
                          sx={{
                            color: bubbleTextColor,
                          }}
                          aria-label="Mark note as read"
                        >
                          <CheckCircleOutlineIcon fontSize="small" />
                        </IconButton>
                      )}
                      {
                        // isCurrentUser && (
                        // <IconButton
                        //   size="small"
                        //   onClick={() => handleDeleteNote(note)}
                        //   disabled={isDeletingThisNote}
                        //   sx={{
                        //     color: bubbleTextColor,
                        //   }}
                        //   aria-label="Delete note"
                        // >
                        //   {isDeletingThisNote ? (
                        //     <CircularProgress size={16} color="inherit" />
                        //   ) : (
                        //     <DeleteOutlineIcon fontSize="small" />
                        //   )}
                        // </IconButton>
                        // )
                      }
                    </Box>
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
              backgroundColor: inputBackground,
              color: inputTextColor,
              fontFamily: "inherit",
            },
          }}
        />
        <IconButton
          color="primary"
          disabled={!message.trim() || sending}
          onClick={handleSendMessage}
          sx={{
            backgroundColor: sendButtonBackground,
            color: sendButtonText,
            borderRadius: 2,
            mt: 0.5,
            height: 40,
            width: 40,
            "&:hover": {
              backgroundColor: sendButtonHover,
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
