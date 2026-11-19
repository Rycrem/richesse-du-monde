import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { Options } from "./Options";
import "./styles.css";
import "./themes.css";
import { applyTheme, loadTheme } from "./theme";

applyTheme(loadTheme());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Options />
  </StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => void navigator.serviceWorker.register("/sw.js"));
}
