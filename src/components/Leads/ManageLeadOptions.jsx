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
import apiRequest from "../services/api";

export default function ManageLeadOptions() {
  const [data, setData] = useState({
    status: [],
    source: [],
  });

  const [type, setType] = useState("status");
  const [newValue, setNewValue] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(false);

  /* ------------------------------------
     FETCH STATUS & SOURCE FROM BACKEND
  -------------------------------------*/
  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      setLoading(true);

      const [statuses, sources] = await Promise.all([
        apiRequest("/ui/options/statuses/"),
        apiRequest("/ui/options/sources/"),
      ]);

      setData({
        status: statuses?.statuses || [],
        source: sources?.sources || [],
      });
    } catch (error) {
      console.error("Failed to load options", error);
      alert("Failed to load lead options");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------
     ADD STATUS / SOURCE
  -------------------------------------*/
  const addItem = async () => {
    if (!newValue.trim()) return;

    try {
      const endpoint =
        type === "status"
          ? "/ui/options/statuses/create/"
          : "/ui/options/sources/create/";

      await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify({
          name: newValue.trim(),
        }),
      });

      setNewValue("");
      fetchOptions(); // refresh list
    } catch (error) {
      console.error("Add failed", error);
      alert(error.message || "Failed to add");
    }
  };

  /* ------------------------------------
     EDIT / DELETE (DISABLED - NO API)
  -------------------------------------*/
  const startEdit = (index, value) => {
    setEditIndex(index);
    setEditValue(value);
  };

  const cancelEdit = () => {
    setEditIndex(null);
    setEditValue("");
  };

  /* ------------------------------------
     UI
  -------------------------------------*/
  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight="bold" mb={2}>
        Lead Status & Source Settings
      </Typography>

      {/* SWITCH */}
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

      {/* ADD */}
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

      {/* LOADING */}
      {loading && <Typography color="text.secondary">Loading...</Typography>}

      {/* LIST */}
      {data[type].map((item, index) => (
        <Box key={index} display="flex" alignItems="center" gap={2} mb={1}>
          <Typography flex={1}>
            {typeof item === "string" ? item : item.name}
          </Typography>

          {/* Disabled until backend supports update/delete */}
          <IconButton disabled>
            <EditIcon />
          </IconButton>
          <IconButton disabled>
            <DeleteIcon />
          </IconButton>
        </Box>
      ))}
    </Paper>
  );
}
