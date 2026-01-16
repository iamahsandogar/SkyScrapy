import { Box, Typography } from "@mui/material";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import KanbanCard from "./KanbanCard";

export default function KanbanColumn({
  title,
  leads,
  onMarkAsDone,
  setColumns,
  getStatusName,
}) {
  const isDoneColumn = title === "Done";
  const { setNodeRef, isOver } = useDroppable({
    id: title,
    data: {
      column: title,
    },
  });
  const highlightActive = isDoneColumn && isOver;

  return (
    <Box
      ref={setNodeRef}
      bgcolor="#f5f6f8"
      px={{ xs: 1.5, md: 2 }}
      borderRadius={3}
      sx={{
        width: "100%",
        minHeight: { xs: 320, md: 400 },
        maxHeight: { xs: "none", lg: "calc(100vh - 160px)" },
        overflowY: "auto",
        transition: "all 0.3s ease-in-out",
        border: highlightActive
          ? "2px dashed #2196f3"
          : "2px solid transparent",
        transform: highlightActive ? "scale(1.02)" : "scale(1)",
      }}
    >
      <Typography variant="h6" mb={2} fontWeight={600} sx={{position: 'sticky', top: 0, bgcolor: '#f5f6f8', zIndex: 10, pt: 1}}>
        {title} ({leads.length})
      </Typography>

      <SortableContext
        items={leads.map((lead) => lead.id)}
        strategy={verticalListSortingStrategy}
      >
        {leads.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center", py: 4 }}
          >
            No leads
          </Typography>
        ) : (
          leads.map((lead) => (
            <KanbanCard
              key={lead.id}
              lead={lead}
              column={title}
              onMarkAsDone={onMarkAsDone}
              setColumns={setColumns}
              getStatusName={getStatusName}
            />
          ))
        )}
      </SortableContext>
    </Box>
  );
}
