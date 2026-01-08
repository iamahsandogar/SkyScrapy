import { Box, Typography } from "@mui/material";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import KanbanCard from "./KanbanCard";

export default function KanbanColumn({ title, leads, onMarkAsDone, setColumns, getStatusName }) {
  const { setNodeRef, isOver } = useDroppable({
    id: title,
    data: {
      column: title,
    },
  });

  return (
    <Box
      ref={setNodeRef}
      width={300}
      bgcolor={isOver ? "#e3f2fd" : "#f5f6f8"}
      p={2}
      borderRadius={3}
      sx={{
        minHeight: 400,
        maxHeight: "calc(100vh - 100px)",
        overflowY: "auto",
        transition: "all 0.3s ease-in-out",
        border: isOver ? "2px dashed #2196f3" : "2px solid transparent",
        transform: isOver ? "scale(1.02)" : "scale(1)",
        boxShadow: isOver ? 4 : 1,
      }}
    >
      <Typography variant="h6" mb={2} fontWeight={600}>
        {title} ({leads.length})
      </Typography>

      <SortableContext
        items={leads.map((lead) => lead.id)}
        strategy={verticalListSortingStrategy}
      >
        {leads.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
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
