import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import apiRequest from "../services/api";
import { DndContext, closestCorners } from "@dnd-kit/core";
import KanbanColumn from "./KanbanColumn";
const STORAGE_KEY = "kanban-board";
const EMPTY_BOARD = {
  Pending: [],
  "In Progress": [],
  Upcoming: [],
  Done: [],
};
function KanbanBoard() {
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : EMPTY_BOARD;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  }, [columns]);

  const handleDragEnd = ({ active, over }) => {
    if (!over) return;

    const fromColumn = Object.keys(columns).find((col) =>
      columns[col].some((card) => card.id === active.id)
    );

    const toColumn = over.data.current?.column;

    if (!fromColumn || !toColumn || fromColumn === toColumn) return;

    const movedCard = columns[fromColumn].find((card) => card.id === active.id);

    setColumns((prev) => ({
      ...prev,
      [fromColumn]: prev[fromColumn].filter((c) => c.id !== active.id),
      [toColumn]: [...prev[toColumn], movedCard],
    }));
  };
  return (
    <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <Box display="flex" gap={2} p={2}>
        {Object.keys(columns).map((column) => (
          <KanbanColumn
            key={column}
            title={column}
            cards={columns[column]}
            setColumns={setColumns}
          />
        ))}
      </Box>
    </DndContext>
  );
}

export default KanbanBoard;
