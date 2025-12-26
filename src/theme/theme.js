import { createTheme } from "@mui/material/styles";
import { tokens } from "../design-system/tokens/colors";

export const getTheme = (mode) => {
  const colors = tokens(mode);

  return createTheme({
    palette: {
      mode: mode,
      primary: {
        main: colors.blueAccent[500],
        light: colors.blueAccent[300],
        dark: colors.blueAccent[700],
      },
      secondary: {
        main: colors.greenAccent[500],
        light: colors.greenAccent[300],
        dark: colors.greenAccent[700],
      },
      error: {
        main: colors.redAccent[500],
        light: colors.redAccent[300],
        dark: colors.redAccent[700],
      },
      warning: {
        main: colors.yellowAccent[500],
        light: colors.yellowAccent[300],
        dark: colors.yellowAccent[700],
      },
      success: {
        main: colors.greenAccent[500],
        light: colors.greenAccent[300],
        dark: colors.greenAccent[700],
      },
      background: {
        default: mode === "dark" ? colors.primary[500] : colors.bg[100],
        paper: mode === "dark" ? colors.primary[600] : colors.bg[100],
      },
      text: {
        primary: mode === "dark" ? colors.grey[100] : colors.grey[100],
        secondary: mode === "dark" ? colors.grey[300] : colors.grey[600],
      },
    },
    typography: {
      fontFamily: ["Roboto", "sans-serif"].join(","),
      fontSize: 12,
      h1: {
        fontFamily: ["Roboto", "sans-serif"].join(","),
        fontSize: 40,
        fontWeight: 600,
        color: mode === "dark" ? colors.grey[100] : colors.grey[100],
      },
      h2: {
        fontFamily: ["Roboto", "sans-serif"].join(","),
        fontSize: 32,
        fontWeight: 600,
        color: mode === "dark" ? colors.grey[100] : colors.grey[100],
      },
      h3: {
        fontFamily: ["Roboto", "sans-serif"].join(","),
        fontSize: 24,
        fontWeight: 600,
        color: mode === "dark" ? colors.grey[100] : colors.grey[100],
      },
      h4: {
        fontFamily: ["Roboto", "sans-serif"].join(","),
        fontSize: 20,
        fontWeight: 600,
        color: mode === "dark" ? colors.grey[100] : colors.grey[100],
      },
      h5: {
        fontFamily: ["Roboto", "sans-serif"].join(","),
        fontSize: 16,
        fontWeight: 600,
        color: mode === "dark" ? colors.grey[100] : colors.grey[100],
      },
      h6: {
        fontFamily: ["Roboto", "sans-serif"].join(","),
        fontSize: 14,
        fontWeight: 600,
        color: mode === "dark" ? colors.grey[100] : colors.grey[100],
      },
      body1: {
        color: mode === "dark" ? colors.grey[100] : colors.grey[100],
      },
      body2: {
        color: mode === "dark" ? colors.grey[300] : colors.grey[600],
      },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor:
              mode === "dark" ? colors.primary[600] : colors.bg[100],
            color: mode === "dark" ? colors.grey[100] : colors.grey[100],
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              backgroundColor:
                mode === "dark" ? colors.primary[700] : colors.bg[100],
              color: mode === "dark" ? colors.grey[100] : colors.grey[100],
              "& fieldset": {
                borderColor:
                  mode === "dark" ? colors.grey[700] : colors.grey[300],
              },
              "&:hover fieldset": {
                borderColor:
                  mode === "dark" ? colors.grey[600] : colors.grey[400],
              },
              "&.Mui-focused fieldset": {
                borderColor: colors.blueAccent[500],
              },
            },
            "& .MuiInputLabel-root": {
              color: mode === "dark" ? colors.grey[300] : colors.grey[700],
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
          },
        },
      },
    },
  });
};

