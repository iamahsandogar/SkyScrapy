import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  IconButton,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useState } from "react";

const STORAGE_KEY = "leadMeta";

const defaultData = {
  status: ["Completed", "In Progress", "Pending", "Rejected"],
  source: ["Website Form", "Email", "Phone"],
};

export default function LeadMetaManager() {
  const [data, setData] = useState(defaultData);
  const [type, setType] = useState("status");
  const [newValue, setNewValue] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    } else {
      setData(saved);
    }
  }, []);

  const save = (updated) => {
    setData(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addItem = () => {
    if (!newValue.trim()) return;
    save({
      ...data,
      [type]: [...data[type], newValue.trim()],
    });
    setNewValue("");
  };

  const startEdit = (index, value) => {
    setEditIndex(index);
    setEditValue(value);
  };

  const cancelEdit = () => {
    setEditIndex(null);
    setEditValue("");
  };

  const saveEdit = () => {
    const updated = [...data[type]];
    updated[editIndex] = editValue.trim();
    save({ ...data, [type]: updated });
    cancelEdit();
  };

  const deleteItem = (index) => {
    const updated = data[type].filter((_, i) => i !== index);
    save({ ...data, [type]: updated });
  };

  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight="bold" mb={2}>
        Lead Status & Source Settings
      </Typography>

      {/* Switch */}
      <Box display="flex" gap={2} mb={2}>
        <Button
          variant={type === "status" ? "contained" : "outlined"}
          onClick={() => {
            setType("status");
            cancelEdit();
          }}
        >
          Status
        </Button>
        <Button
          variant={type === "source" ? "contained" : "outlined"}
          onClick={() => {
            setType("source");
            cancelEdit();
          }}
        >
          Source
        </Button>
      </Box>

      {/* Add */}
      <Box display="flex" gap={2} mb={3}>
        <TextField
          fullWidth
          label={`Add ${type}`}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
        />
        <Button variant="contained" onClick={addItem}>
          Add
        </Button>
      </Box>

      {/* List */}
      {data[type].map((item, index) => (
        <Box key={index} display="flex" alignItems="center" gap={2} mb={1}>
          {editIndex === index ? (
            <>
              <TextField
                fullWidth
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
              />
              <IconButton color="success" onClick={saveEdit}>
                <SaveIcon />
              </IconButton>
              <IconButton color="warning" onClick={cancelEdit}>
                <CloseIcon />
              </IconButton>
            </>
          ) : (
            <>
              <Typography flex={1}>{item}</Typography>
              <IconButton
                color="primary"
                onClick={() => startEdit(index, item)}
              >
                <EditIcon />
              </IconButton>
              <IconButton color="error" onClick={() => deleteItem(index)}>
                <DeleteIcon />
              </IconButton>
            </>
          )}
        </Box>
      ))}
    </Paper>
  );
}
