import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  MenuItem,
} from "@mui/material";
import { useState } from "react";

export default function CardModal({ open, onClose, card, onSave }) {
  const [form, setForm] = useState(card);

  const save = () => {
    onSave(form);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Card</DialogTitle>

      <DialogContent>
        <TextField
          label="Title"
          fullWidth
          sx={{ mt: 1 }}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        <TextField
          select
          label="Priority"
          fullWidth
          sx={{ mt: 2 }}
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
        >
          <MenuItem value="High">High</MenuItem>
          <MenuItem value="Medium">Medium</MenuItem>
          <MenuItem value="Low">Low</MenuItem>
        </TextField>

        <TextField
          label="Due Date"
          fullWidth
          sx={{ mt: 2 }}
          value={form.due}
          onChange={(e) => setForm({ ...form, due: e.target.value })}
        />

        <TextField
          label="Description"
          multiline
          minRows={4}
          fullWidth
          sx={{ mt: 2 }}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <Button variant="contained" sx={{ mt: 3 }} onClick={save}>
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
}
