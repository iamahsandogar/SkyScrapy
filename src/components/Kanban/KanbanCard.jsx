import { Card, Typography, Chip, Button } from "@mui/material";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import dayjs from "dayjs";

export default function KanbanCard({ lead, column, onMarkAsDone, setColumns, getStatusName }) {
  // Disable dragging if the card is in the Done column
  const isDisabled = column === "Done";
  
  const { setNodeRef, attributes, listeners, transform, transition } = useSortable({
    id: lead.id,
    data: { column },
    disabled: isDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Format follow-up date
  const formatFollowUpDate = (dateTime) => {
    if (!dateTime) return "No date";
    const date = dayjs(dateTime);
    if (!date.isValid()) return "Invalid date";
    return date.format("MMM D, YYYY h:mm A");
  };

  // Use the getStatusName prop if provided, otherwise use a fallback
  const displayStatusName = (status) => {
    if (getStatusName) {
      return getStatusName(status);
    }
    if (!status) return "No Status";
    if (typeof status === "string") return status;
    if (typeof status === "object" && status.name) return status.name;
    return `Status ${status}`;
  };

  const handleDoneClick = (e) => {
    e.stopPropagation(); // Prevent card click event
    if (onMarkAsDone) {
      onMarkAsDone(lead);
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
        opacity: isDisabled ? 0.8 : 1,
      }}
      style={style}
    >
      <Typography fontWeight={600} variant="subtitle1" sx={{ mb: 0.5 }}>
        {lead.title || "Untitled Lead"}
      </Typography>

      {lead.follow_up_at && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
          📅 {formatFollowUpDate(lead.follow_up_at)}
        </Typography>
      )}

      {lead.status && (
        <Chip
          size="small"
          label={displayStatusName(lead.status)}
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
    </Card>
  );
}
