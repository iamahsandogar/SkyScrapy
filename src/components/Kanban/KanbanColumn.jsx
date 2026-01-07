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
        transition: "background-color 0.2s",
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
