import { useState } from "react";
import { Card, Typography, Chip } from "@mui/material";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import CardModal from "./CardModal";

export default function KanbanCard({ card, column, setColumns }) {
  const [open, setOpen] = useState(false);

  const { setNodeRef, attributes, listeners, transform, transition } =
    useSortable({
      id: card.id,
      data: { column },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const updateCard = (updatedCard) => {
    setColumns((prev) => ({
      ...prev,
      [column]: prev[column].map((c) =>
        c.id === updatedCard.id ? updatedCard : c
      ),
    }));
  };

  return (
    <>
      <Card
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={() => setOpen(true)}
        sx={{ mb: 1.2, p: 1.5, cursor: "pointer" }}
        style={style}
      >
        <Typography fontWeight={600}>{card.title}</Typography>
        <Chip size="small" label={card.priority} sx={{ mt: 0.5 }} />
      </Card>

      <CardModal
        open={open}
        onClose={() => setOpen(false)}
        card={card}
        onSave={updateCard}
      />
    </>
  );
}
