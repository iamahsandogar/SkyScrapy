import { Box, Typography, Button } from "@mui/material";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import AddIcon from "@mui/icons-material/Add";
import KanbanCard from "./KanbanCard";

export default function KanbanColumn({ title, cards, setColumns }) {
  const addCard = () => {
    const titleText = prompt("Card title");
    if (!titleText) return;

    setColumns((prev) => ({
      ...prev,
      [title]: [
        ...prev[title],
        {
          id: crypto.randomUUID(),
          title: titleText,
          priority: "Low",
          due: "",
          description: "",
          checklist: [],
        },
      ],
    }));
  };

  return (
    <Box width={300} bgcolor="#f5f6f8" p={2} borderRadius={3}>
      <Typography variant="h6" mb={1}>
        {title}
      </Typography>

      <SortableContext
        items={cards.map((card) => card.id)}
        strategy={verticalListSortingStrategy}
      >
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            column={title}
            setColumns={setColumns}
          />
        ))}
      </SortableContext>

      <Button
        fullWidth
        startIcon={<AddIcon />}
        sx={{ mt: 1 }}
        onClick={addCard}
      >
        Add Card
      </Button>
    </Box>
  );
}
