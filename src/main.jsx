import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider as MUIThemeProvider, CssBaseline } from "@mui/material";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext.jsx";
import { getTheme } from "./theme/theme.js";
import "./index.css";

// Wrapper component to use theme context
function AppWithTheme() {
  const { mode } = useTheme();
  const theme = getTheme(mode);

  return (
    <MUIThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </MUIThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AppWithTheme />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
