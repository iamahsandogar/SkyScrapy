# Light/Dark Mode Implementation Guide

## Overview
This project now supports Light and Dark mode themes throughout the entire application. The theme preference is saved to localStorage and persists across sessions. All Material-UI components automatically adapt to the theme, and custom components have been updated to use theme-aware colors.

## Implementation Summary

### ✅ Core Implementation (Complete)
- Theme Context and Provider created
- Material-UI Theme configuration set up
- Theme toggle buttons added (Topbar & Login)
- Key components updated (Sidebar, Topbar, Layout, Login)
- Color tokens updated for dark mode
- Theme persistence via localStorage

### ⚠️ Components That May Need Updates
Some components still use hardcoded `colors` from tokens. These will work but may not adapt to theme changes. To make them theme-aware, update them to use `useTheme()` and `getColors(mode)`.

## Files Created/Modified

### 1. **New Files Created**

#### `src/contexts/ThemeContext.jsx`
- **Purpose**: Manages theme state (light/dark mode)
- **Features**:
  - Provides `useTheme()` hook for accessing theme state
  - Saves theme preference to localStorage
  - Provides `toggleTheme()` function to switch between modes
- **Usage**: Wrap your app with `<ThemeProvider>`

#### `src/theme/theme.js`
- **Purpose**: Material-UI theme configuration
- **Features**:
  - Creates Material-UI theme based on mode (light/dark)
  - Configures colors, typography, and component styles
  - Ensures proper text contrast in both modes
- **Exports**: `getTheme(mode)` function

### 2. **Modified Files**

#### `src/main.jsx`
- **Changes**:
  - Wrapped app with `ThemeProvider` (custom context)
  - Wrapped app with `MUIThemeProvider` (Material-UI theme)
  - Added `CssBaseline` for consistent styling
  - Created `AppWithTheme` component to access theme context

#### `src/design-system/tokens/index.js`
- **Changes**:
  - Added `getColors(mode)` function for theme-aware color access
  - Maintains backward compatibility with default `colors` export

#### `src/design-system/tokens/colors.js`
- **Changes**:
  - Added `bg` colors for dark mode
  - Dark mode now has proper background colors

#### `src/components/global/Topbar.jsx`
- **Changes**:
  - Added theme toggle button (sun/moon icon)
  - Updated to use theme-aware colors
  - Background and border colors adapt to theme

#### `src/components/global/Sidebar.jsx`
- **Changes**:
  - Updated to use `useTheme()` hook
  - Background and border colors adapt to theme

#### `src/components/global/SidebarMenu.jsx`
- **Changes**:
  - Updated all color references to be theme-aware
  - Text colors adapt for readability
  - User profile section colors adapt to theme
  - Logout button maintains red accent in both modes

#### `src/components/Layout.jsx`
- **Changes**:
  - Background color adapts to theme
  - Uses theme-aware colors

#### `src/components/Login/Login.jsx`
- **Changes**:
  - Added theme toggle button (top-right corner)
  - Background and paper colors adapt to theme
  - Text colors adapt for readability
  - Button colors use theme-aware blue accent

## How to Use Theme in Components

### Basic Usage

```jsx
import { useTheme } from "../contexts/ThemeContext";
import { getColors } from "../../design-system/tokens";

function MyComponent() {
  const { mode, toggleTheme } = useTheme();
  const colors = getColors(mode);

  return (
    <Box
      sx={{
        backgroundColor: mode === "dark" ? colors.primary[600] : colors.bg[100],
        color: mode === "dark" ? colors.grey[100] : colors.grey[900],
      }}
    >
      {/* Your content */}
    </Box>
  );
}
```

### Using Material-UI Theme

Material-UI components automatically use theme colors:

```jsx
import { useTheme as useMUITheme } from "@mui/material";

function MyComponent() {
  const theme = useMUITheme();
  
  return (
    <Box
      sx={{
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
      }}
    >
      {/* Your content */}
    </Box>
  );
}
```

## Theme Toggle Locations

1. **Topbar**: Theme toggle button appears in the top-right corner of all pages with Topbar
2. **Login Page**: Theme toggle button appears in the top-right corner

## Color Guidelines

### Light Mode
- Background: `colors.bg[100]` or `colors.bg[500]`
- Text Primary: `colors.grey[900]`
- Text Secondary: `colors.grey[700]`
- Borders: `colors.grey[300]`

### Dark Mode
- Background: `colors.primary[500]` or `colors.primary[600]`
- Text Primary: `colors.grey[100]`
- Text Secondary: `colors.grey[300]`
- Borders: `colors.grey[700]`

## Components That May Need Updates

The following components use direct color references and may benefit from theme updates:
- `src/pages/AllLeads.jsx` - Uses `colors` for chip styles
- `src/components/Projects/AllProjects.jsx` - Uses `colors` for chip styles
- `src/components/Dashboard/*.jsx` - Various dashboard components
- `src/components/Projects/ProjectDetailsModal.jsx` - Uses `colors` for chips

**Note**: Material-UI components (Paper, Typography, TextField, Button, etc.) automatically adapt to the theme, so many components will work without changes.

### How to Update Components

1. Import theme hooks:
```jsx
import { useTheme } from "../../contexts/ThemeContext";
import { getColors } from "../../design-system/tokens";
```

2. Get theme values:
```jsx
const { mode } = useTheme();
const colors = getColors(mode);
```

3. Replace hardcoded colors:
```jsx
// Before
backgroundColor: colors.bg[100]

// After
backgroundColor: mode === "dark" ? colors.primary[600] : colors.bg[100]
```

4. For functions that return styles, pass mode:
```jsx
const getChipStyles = (status, mode) => {
  const colors = getColors(mode);
  // Use colors in your styles
};
```

## Testing

1. Click the theme toggle button in Topbar or Login page
2. Verify all components change colors appropriately
3. Refresh the page - theme preference should persist
4. Check text readability in both modes
5. Verify all interactive elements are visible and usable

## Notes

- Theme preference is saved to `localStorage` with key `"themeMode"`
- Default theme is "light" if no preference is saved
- All Material-UI components automatically adapt to theme
- Custom components need manual updates to use theme-aware colors

