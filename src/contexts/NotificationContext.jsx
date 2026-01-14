import { createContext, useCallback, useContext, useState } from "react";
import { Alert, Snackbar } from "@mui/material";

const NotificationContext = createContext({
  notifySuccess: () => {},
  notifyError: () => {},
});

export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback((message, severity) => {
    if (message == null) return;
    setNotification({
      key: Date.now(),
      message: String(message),
      severity,
    });
  }, []);

  const notifySuccess = useCallback(
    (message) => showNotification(message, "success"),
    [showNotification]
  );

  const notifyError = useCallback(
    (message) => showNotification(message, "error"),
    [showNotification]
  );

  const handleClose = useCallback(() => {
    setNotification(null);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifySuccess, notifyError }}>
      {children}
      <Snackbar
        key={notification?.key}
        open={Boolean(notification)}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ mt: 2 }}
      >
        <Alert
          onClose={handleClose}
          severity={notification?.severity || "info"}
          sx={{ width: "100%" }}
          variant="filled"
        >
          {notification?.message || "Notification"}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
