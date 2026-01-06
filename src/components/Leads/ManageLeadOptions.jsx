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
import { getCachedLeadData } from "../../utils/prefetchData";

// Module-level flag to prevent duplicate API calls in React StrictMode
let isFetching = false;

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
     Uses cached data first for instant loading, then refreshes
  -------------------------------------*/
  useEffect(() => {
    // Prevent duplicate API calls in React StrictMode (development)
    if (isFetching) {
      console.log("Skipping duplicate fetch - already in progress");
      return;
    }
    
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    // Prevent duplicate calls
    if (isFetching) {
      return;
    }
    
    // Try cached data first for instant loading
    const cachedData = getCachedLeadData();
    if (cachedData && (cachedData.statuses || cachedData.sources)) {
      console.log("Using cached statuses and sources for instant loading");
      // Set data immediately without showing loading state
      setData({
        status: cachedData.statuses || [],
        source: cachedData.sources || [],
      });
      // Don't set loading to true - data is already available
      
      // Refresh in background to ensure data is up-to-date
      // Don't wait for it - user can see cached data immediately
      // Pass false to prevent showing loading state since we already have data
      refreshDataInBackground(false);
      return;
    }
    
    // No cache available, fetch fresh data
    // Pass true to show loading state since we don't have cached data
    await refreshDataInBackground(true);
  };

  const refreshDataInBackground = async (showLoading = true) => {
    // Prevent duplicate calls
    if (isFetching) {
      return;
    }
    
    try {
      isFetching = true;
      // Only show loading if explicitly requested (i.e., no cached data available)
      if (showLoading) {
        setLoading(true);
      }

      const [statuses, sources] = await Promise.all([
        apiRequest("/ui/options/statuses/"),
        apiRequest("/ui/options/sources/"),
      ]);

      // Parse statuses
      let statusesList = [];
      if (Array.isArray(statuses)) {
        statusesList = statuses;
      } else if (statuses?.statuses) {
        statusesList = statuses.statuses;
      } else if (statuses?.data) {
        statusesList = Array.isArray(statuses.data)
          ? statuses.data
          : statuses.data?.statuses || [];
      }

      // Parse sources
      let sourcesList = [];
      if (Array.isArray(sources)) {
        sourcesList = sources;
      } else if (sources?.sources) {
        sourcesList = sources.sources;
      } else if (sources?.data) {
        sourcesList = Array.isArray(sources.data)
          ? sources.data
          : sources.data?.sources || [];
      }

      setData({
        status: statusesList,
        source: sourcesList,
      });

      // Update cache with fresh data
      const currentCache = getCachedLeadData();
      if (currentCache) {
        currentCache.statuses = statusesList;
        currentCache.sources = sourcesList;
        currentCache.timestamp = Date.now();
        localStorage.setItem("leadDataCache", JSON.stringify(currentCache));
      } else {
        // Create new cache entry if none exists
        const newCache = {
          statuses: statusesList,
          sources: sourcesList,
          employees: [],
          leads: [],
          timestamp: Date.now(),
        };
        localStorage.setItem("leadDataCache", JSON.stringify(newCache));
      }
    } catch (error) {
      console.error("Failed to load options", error);
      alert("Failed to load lead options");
    } finally {
      setLoading(false);
      // Reset flag after a short delay to allow React StrictMode remount
      setTimeout(() => {
        isFetching = false;
      }, 100);
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
     DELETE STATUS / SOURCE
  -------------------------------------*/
  const deleteItem = async (item) => {
    // Get the primary key from the item
    const pk = typeof item === "object" ? item.id || item.pk : null;

    if (!pk) {
      alert("Cannot delete: Item missing ID");
      return;
    }

    // Confirm deletion
    if (
      !window.confirm(
        `Are you sure you want to delete "${
          typeof item === "string" ? item : item.name
        }"?`
      )
    ) {
      return;
    }

    try {
      const endpoint =
        type === "status"
          ? `/ui/options/statuses/${pk}/delete/`
          : `/ui/options/sources/${pk}/delete/`;

      await apiRequest(endpoint, {
        method: "POST",
      });

      fetchOptions(); // refresh list
    } catch (error) {
      console.error("Delete failed", error);
      alert(error.message || "Failed to delete");
    }
  };

  /* ------------------------------------
     EDIT (DISABLED - NO API)
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
    <Paper sx={{ p: 3, borderRadius: 3, boxShadow: "none" }}>
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

          <IconButton
            onClick={() => deleteItem(item)}
            color="error"
            disabled={loading}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ))}
    </Paper>
  );
}
