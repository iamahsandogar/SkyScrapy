import { Box, Typography } from "@mui/material";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import KanbanCard from "./KanbanCard";
import KanbanCardSkeleton from "./KanbanCardSkeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { tokens } from "../../design-system/tokens/colors.js";

export default function KanbanColumn({
  title,
  leads,
  onMarkAsDone,
  onRevert,
  setColumns,
  getStatusName,
  loading = false,
  loadingCardId = null,
}) {
  const { mode } = useTheme();
  const themeColors = tokens(mode);
  const isDark = mode === "dark";

  const isDoneColumn = title === "Done";
  const { setNodeRef, isOver } = useDroppable({
    id: title,
    data: {
      column: title,
    },
  });
  const highlightActive = isDoneColumn && isOver;

  // Define heading color based on column title and theme
  const getHeadingColor = () => {
    if (isDark) {
      switch (title) {
        case "Overdue":
          return themeColors.redAccent[400] || "#e2726e";
        case "Due Today":
          return themeColors.yellowAccent[400] || "#ffe066";
        case "Upcoming":
          return themeColors.blueAccent[400] || "#868dfb";
        case "Done":
          return themeColors.greenAccent[400] || "#70d8bd";
        default:
          return themeColors.grey[100] || "#e0e0e0";
      }
    } else {
      // Light mode
      switch (title) {
        case "Overdue":
          return themeColors.redAccent[600] || "#af3f3b";
        case "Due Today":
          return themeColors.yellowAccent[600] || "#e6bf00";
        case "Upcoming":
          return themeColors.blueAccent[600] || "#535ac8";
        case "Done":
          return themeColors.greenAccent[600] || "#3da58a";
        default:
          return themeColors.grey[900] || "#141414";
      }
    }
  };

  const headingColor = getHeadingColor();

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
      <Typography 
        variant="h6" 
        mb={2} 
        fontWeight={600} 
        sx={{
          position: 'sticky', 
          top: 0, 
          bgcolor: '#f5f6f8', 
          zIndex: 10, 
          pt: 1,
          color: headingColor
        }}
      >
        {title} ({leads.length})
      </Typography>

      <SortableContext
        items={leads.map((lead) => lead.id)}
        strategy={verticalListSortingStrategy}
      >
        {loading ? (
          // Show skeleton cards while loading
          <>
            <KanbanCardSkeleton />
            <KanbanCardSkeleton />
            <KanbanCardSkeleton />
          </>
        ) : leads.length === 0 ? (
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
              onRevert={onRevert}
              setColumns={setColumns}
              getStatusName={getStatusName}
              isLoading={loadingCardId === lead.id}
            />
          ))
        )}
      </SortableContext>
    </Box>
  );
}
