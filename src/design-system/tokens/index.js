import { tokens } from "./colors.js";
import typography from "./typography.js";

// This will be dynamically set by ThemeContext
// For backward compatibility, export a function that takes mode
export const getColors = (mode = "light") => tokens(mode);

// Default export for backward compatibility (will use light mode)
const colors = tokens("light");

export { colors, typography };
