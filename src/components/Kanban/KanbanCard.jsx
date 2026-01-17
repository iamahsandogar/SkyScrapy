import { Box, Card, Typography, Chip, Button, CircularProgress } from "@mui/material";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import UndoIcon from "@mui/icons-material/Undo";
import dayjs from "dayjs";
import { colors } from "../../design-system/tokens";

export default function KanbanCard({
  lead,
  column,
  onMarkAsDone,
  onRevert,
  getStatusName,
  isDragging = false,
  isLoading = false,
}) {
  // Disable dragging if the card is in the Done column
  const isDisabled = column === "Done";

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: lead.id,
    data: { column },
    disabled: isDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition, // No transition during drag for smooth movement
    opacity: isSortableDragging ? 0.5 : 1, // Make original card semi-transparent while dragging
  };
const getAssignedToName = (lead) => {
  const assigned = lead.assigned_to || lead.assignedTo;

  if (!assigned) return "";

  // Case: assigned_to is an object
  if (typeof assigned === "object") {
    const user =
      assigned.user_details ||
      assigned.userDetails ||
      assigned.user ||
      assigned;

    const first = user.first_name || user.firstName || "";
    const last = user.last_name || user.lastName || "";

    return `${first} ${last}`.trim();
  }

  // Case: assigned_to is just an ID
  return "Assigned";
};

  // Format follow-up date
  const formatFollowUpDate = (dateTime) => {
    if (!dateTime) return "No date";
    const date = dayjs(dateTime);
    if (!date.isValid()) return "Invalid date";
    return date.format("MMM D, YYYY h:mm A");
  };

  // Use the getStatusName prop if provided, otherwise use a fallback
  const resolveStatusLabel = (lead) => {
    const status =
      lead.status ??
      lead.status_id ??
      lead.statusId ??
      lead.lead_status ??
      lead.status_obj ??
      lead.statusObj ??
      lead.statusData ??
      null;

    if (!status) return "";

    // Case 1: status object
    if (typeof status === "object") {
      return (
        status.name ||
        status.label ||
        status.title ||
        status.value ||
        status.key ||
        ""
      );
    }

    // Case 2: status is already a string (not numeric)
    if (typeof status === "string" && isNaN(status)) {
      return status;
    }

    // Case 3: fallback to getStatusName (if available)
    if (getStatusName) {
      const resolved = getStatusName(status);
      if (resolved && resolved !== "Loading...") {
        return resolved;
      }
    }

    // Final fallback
    return "";
  };

  const handleDoneClick = (e) => {
    e.stopPropagation(); // Prevent card click event
    if (onMarkAsDone && !isLoading) {
      onMarkAsDone(lead);
    }
  };

  const handleRevertClick = (e) => {
    e.stopPropagation(); // Prevent card click event
    if (onRevert && !isLoading) {
      onRevert(lead);
    }
  };

  return (
    <Card
      ref={setNodeRef}
      {...(!isDisabled ? { ...attributes, ...listeners } : {})}
      sx={{
        mb: 1.5,
        p: 1.5,
        cursor: isDisabled ? "default" : "grab",
        "&:active": {
          cursor: isDisabled ? "default" : "grabbing",
        },
        opacity: isLoading ? 0.7 : isDisabled ? 0.8 : isDragging ? 1 : style.opacity,
        transform: isDragging ? "rotate(3deg) scale(1.05)" : style.transform,
        transition: isDragging ? "none" : style.transition,
        boxShadow: isSortableDragging || isDragging ? 8 : 2,
        "&:hover": {
          boxShadow: isDisabled ? 2 : 4,
          transform:
            isDisabled || isSortableDragging || isDragging
              ? "none"
              : "translateY(-2px)",
          transition: "all 0.2s ease-in-out",
        },
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
        position: "relative",
        zIndex: isSortableDragging ? 1000 : isDragging ? 2000 : 1,
        pointerEvents: isDragging || isLoading ? "none" : "auto",
      }}
    >
      {/* Loading overlay for individual card */}
      {isLoading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            borderRadius: "inherit",
            zIndex: 10,
          }}
        >
          <CircularProgress size={24} />
        </Box>
      )}
      
        <Typography fontWeight={600} variant="subtitle1" noWrap>
          {lead.title || "Untitled Lead"}
        </Typography>

      {getAssignedToName(lead) && (
        <Typography
          variant="caption"
          sx={{
            whiteSpace: "nowrap",
            fontWeight: 500,
            color: colors.blueAccent[500],
            fontSize: "0.76rem",
          }}
        >
          👤 {getAssignedToName(lead)}
        </Typography>
      )}

      {lead.follow_up_at && (
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ mb: 0.5 }}
        >
          📅 {formatFollowUpDate(lead.follow_up_at)}
        </Typography>
      )}

      {resolveStatusLabel(lead) && (
        <Chip
          size="small"
          label={resolveStatusLabel(lead)}
          sx={{ mt: 0.5, mb: 0.5 }}
          color="primary"
          variant="outlined"
        />
      )}

      {lead.follow_up_status && lead.follow_up_status !== "done" && (
        <Chip
          size="small"
          label={lead.follow_up_status}
          sx={{ mt: 0.5, mb: 0.5, ml: 0.5 }}
          color="warning"
          variant="outlined"
        />
      )}

      {/* Show Done button for Overdue, Due Today, and Upcoming columns */}
      {column !== "Done" && (
        <Button
          fullWidth
          variant="contained"
          size="small"
          startIcon={<CheckCircleIcon />}
          onClick={handleDoneClick}
          disabled={isLoading}
          sx={{
            mt: 1,
            textTransform: "none",
            bgcolor: "#4caf50",
            "&:hover": {
              bgcolor: "#45a049",
            },
          }}
        >
          Done
        </Button>
      )}

      {/* Show Revert button for Done column */}
      {column === "Done" && (
        <Button
          fullWidth
          variant="outlined"
          size="small"
          startIcon={<UndoIcon />}
          onClick={handleRevertClick}
          disabled={isLoading}
          sx={{
            mt: 1,
            textTransform: "none",
            borderColor: "#ff9800",
            color: "#ff9800",
            "&:hover": {
              borderColor: "#f57c00",
              bgcolor: "rgba(255, 152, 0, 0.08)",
            },
          }}
        >
          Revert
        </Button>
      )}
    </Card>
  );
}
