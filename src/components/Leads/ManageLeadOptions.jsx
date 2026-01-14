import {
  Backdrop,
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
import DotLoader from "../global/DotLoader";
import { useNotification } from "../../contexts/NotificationContext.jsx";

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
  const [optionsLoaderOpen, setOptionsLoaderOpen] = useState(true);

  const { notifyError } = useNotification();

  const getOptionFieldName = (optionType) =>
    optionType === "status" ? "statuses" : "sources";

  /* ------------------------------------
     FETCH STATUS & SOURCE FROM BACKEND
     Uses cached data first for instant loading, then refreshes
  -------------------------------------*/
  useEffect(() => {
    fetchOptions(true);
  }, []);

  const fetchOptions = async (showGlobalLoader = false) => {
    if (showGlobalLoader) {
      setOptionsLoaderOpen(true);
    }

    const cachedData = getCachedLeadData();
    if (cachedData && (cachedData.statuses || cachedData.sources)) {
      console.log("Using cached statuses and sources for instant loading");
      setData({
        status: cachedData.statuses || [],
        source: cachedData.sources || [],
      });
      const fetched = await refreshDataInBackground(false, () => {
        if (showGlobalLoader) {
          setOptionsLoaderOpen(false);
        }
      });
      if (!fetched && showGlobalLoader) {
        setOptionsLoaderOpen(false);
      }
      return;
    }

    const fetched = await refreshDataInBackground(true, () => {
      if (showGlobalLoader) {
        setOptionsLoaderOpen(false);
      }
    });
    if (!fetched && showGlobalLoader) {
      setOptionsLoaderOpen(false);
    }
  };

  const refreshDataInBackground = async (
    showLoading = true,
    onFetchComplete
  ) => {
    // Prevent duplicate calls
    if (isFetching) {
      return false;
    }

    try {
      isFetching = true;
      // Only show loading if explicitly requested (i.e., no cached data available)
      if (showLoading) {
        setLoading(true);
      }

      // Single API call to get both statuses and sources
      const response = await apiRequest("/ui/options/");
      console.log("=== /ui/options/ API RESPONSE ===", response);

      // Parse response - extract statuses and sources
      let statusesList = [];
      let sourcesList = [];

      if (response) {
        // Extract statuses
        if (Array.isArray(response.statuses)) {
          statusesList = response.statuses;
        } else if (response?.data?.statuses && Array.isArray(response.data.statuses)) {
          statusesList = response.data.statuses;
        }

        // Extract sources
        if (Array.isArray(response.sources)) {
          sourcesList = response.sources;
        } else if (response?.data?.sources && Array.isArray(response.data.sources)) {
          sourcesList = response.data.sources;
        }
      }

      console.log("Extracted statuses:", statusesList.length);
      console.log("Extracted sources:", sourcesList.length);

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
      notifyError("Failed to load lead options");
    } finally {
      setLoading(false);
      if (typeof onFetchComplete === "function") {
        onFetchComplete();
      }
      // Reset flag after a short delay to allow React StrictMode remount
      setTimeout(() => {
        isFetching = false;
      }, 100);
    }

    return true;
  };

  const reloadOptionsWithOverlay = async () => {
    setOptionsLoaderOpen(true);
    const fetched = await refreshDataInBackground(true);
    setOptionsLoaderOpen(false);
    return fetched;
  };

  /* ------------------------------------
     ADD STATUS / SOURCE
  -------------------------------------*/
  const addItem = async () => {
    const trimmedValue = newValue.trim();
    if (!trimmedValue) return;

    try {
      const endpoint =
        type === "status"
          ? "/ui/options/statuses/create/"
          : "/ui/options/sources/create/";

      const response = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify({
          name: trimmedValue,
        }),
      });

      setNewValue("");
      await reloadOptionsWithOverlay();
    } catch (error) {
      console.error("Add failed", error);
      notifyError(error.message || "Failed to add");
    }
  };

  /* ------------------------------------
     DELETE STATUS / SOURCE
  -------------------------------------*/
  const deleteItem = async (item) => {
    // Get the primary key from the item
    const pk = typeof item === "object" ? item.id || item.pk : null;

    if (!pk) {
      notifyError("Cannot delete: Item missing ID");
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
        method: "DELETE",
      });

      await reloadOptionsWithOverlay();
    } catch (error) {
      console.error("Delete failed", error);
      notifyError(error.message || "Failed to delete");
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
    <>
      <Backdrop
        open={optionsLoaderOpen}
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer,
          flexDirection: "column",
          gap: 1,
        }}
      >
        <DotLoader size={48} color="#0A66C2" />
        <Typography variant="body2">Loading statuses & sources...</Typography>
      </Backdrop>
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
    </>
  );
}
