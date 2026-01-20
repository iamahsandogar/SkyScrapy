import {
  Backdrop,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  IconButton,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
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
    lifecycle: [],
  });

  const [type, setType] = useState("status");
  const [newValue, setNewValue] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [optionsLoaderOpen, setOptionsLoaderOpen] = useState(true);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    item: null,
    label: "",
  });

  const { notifyError } = useNotification();

  const getOptionFieldName = (optionType) => {
    if (optionType === "status") return "statuses";
    if (optionType === "source") return "sources";
    if (optionType === "lifecycle") return "lifecycles";
    return "sources";
  };

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
    if (cachedData && (cachedData.statuses || cachedData.sources || cachedData.lifecycles)) {
      console.log("Using cached statuses, sources, and lifecycles for instant loading");
      setData({
        status: cachedData.statuses || [],
        source: cachedData.sources || [],
        lifecycle: cachedData.lifecycles || [],
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

      // Parse response - extract statuses, sources, and lifecycles
      let statusesList = [];
      let sourcesList = [];
      let lifecyclesList = [];

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

        // Extract lifecycles
        if (Array.isArray(response.lifecycles)) {
          lifecyclesList = response.lifecycles;
        } else if (response?.data?.lifecycles && Array.isArray(response.data.lifecycles)) {
          lifecyclesList = response.data.lifecycles;
        }
      }

      console.log("Extracted statuses:", statusesList.length);
      console.log("Extracted sources:", sourcesList.length);
      console.log("Extracted lifecycles:", lifecyclesList.length);

      setData({
        status: statusesList,
        source: sourcesList,
        lifecycle: lifecyclesList,
      });

      // Update cache with fresh data
      const currentCache = getCachedLeadData();
      if (currentCache) {
        currentCache.statuses = statusesList;
        currentCache.sources = sourcesList;
        currentCache.lifecycles = lifecyclesList;
        currentCache.timestamp = Date.now();
        localStorage.setItem("leadDataCache", JSON.stringify(currentCache));
      } else {
        // Create new cache entry if none exists
        const newCache = {
          statuses: statusesList,
          sources: sourcesList,
          lifecycles: lifecyclesList,
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

  const showToast = (message, severity = "success") => {
    setToast({ open: true, message, severity });
  };

  const handleToastClose = (_event, reason) => {
    if (reason === "clickaway") return;
    setToast((prev) => ({ ...prev, open: false }));
  };

  /* ------------------------------------
     ADD STATUS / SOURCE
  -------------------------------------*/
  const addItem = async () => {
    const trimmedValue = newValue.trim();
    if (!trimmedValue) return;

    try {
      let endpoint = "/ui/options/sources/create/";
      if (type === "status") {
        endpoint = "/ui/options/statuses/create/";
      } else if (type === "lifecycle") {
        endpoint = "/ui/options/lifecycles/create/";
      }

      const response = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify({
          name: trimmedValue,
        }),
      });

      setNewValue("");
      await reloadOptionsWithOverlay();
      const typeLabel = type === "status" ? "Status" : type === "lifecycle" ? "Lifecycle" : "Source";
      showToast(`${typeLabel} added successfully`);
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

    try {
      let endpoint = `/ui/options/sources/${pk}/delete/`;
      if (type === "status") {
        endpoint = `/ui/options/statuses/${pk}/delete/`;
      } else if (type === "lifecycle") {
        endpoint = `/ui/options/lifecycles/${pk}/delete/`;
      }

      await apiRequest(endpoint, {
        method: "DELETE",
      });
      await reloadOptionsWithOverlay();
      await reloadOptionsWithOverlay();
      const typeLabel = type === "status" ? "Status" : type === "lifecycle" ? "Lifecycle" : "Source";
      showToast(`${typeLabel} deleted successfully`);
    } catch (error) {
      console.error("Delete failed", error);
      notifyError(error.message || "Failed to delete");
    }
  };

  const openDeleteConfirmation = (item) => {
    const label = typeof item === "string" ? item : item?.name || "this option";
    setDeleteDialog({ open: true, item, label });
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteDialog.item) return;
    await deleteItem(deleteDialog.item);
    setDeleteDialog({ open: false, item: null, label: "" });
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialog({ open: false, item: null, label: "" });
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
        <Typography variant="body2">Loading statuses, sources & lifecycles...</Typography>
      </Backdrop>
      <Paper sx={{ p: 3, borderRadius: 3, boxShadow: "none" }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          Lead Status, Source & Lifecycle Settings
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
          <Button
            variant={type === "lifecycle" ? "contained" : "outlined"}
            onClick={() => {
              setType("lifecycle");
              cancelEdit();
            }}
          >
            Lifecycle
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
              onClick={() => openDeleteConfirmation(item)}
              color="error"
              disabled={loading}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        ))}
      </Paper>
      <Dialog open={deleteDialog.open} onClose={handleDeleteDialogClose}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{deleteDialog.label}"?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button onClick={handleDeleteConfirmed} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={handleToastClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleToastClose}
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
}
