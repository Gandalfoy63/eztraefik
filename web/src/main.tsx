// Docs: docs/04 - Architecture/Frontend.md
// Reference: docs/00 - Downloaded Docs/React/reference/createRoot.md
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./fonts.css";
import "./styles.css";
import "./app.css";
import { App } from "./app/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
