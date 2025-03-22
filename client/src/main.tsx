import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeTheme } from "./lib/themeUtils";

// Initialize theme based on user preferences
initializeTheme();

createRoot(document.getElementById("root")!).render(<App />);
