import "@fontsource/vazirmatn/arabic-400.css";
import "@fontsource/vazirmatn/arabic-600.css";
import "@fontsource/vazirmatn/arabic-700.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./style.css";

const root = document.documentElement;
const initialLang = localStorage.getItem("lanora.language") === "fa" ? "fa" : "en";
const initialTheme = localStorage.getItem("lanora.theme") === "light" ? "light" : "dark";
root.lang = initialLang;
root.dir = "ltr";
root.dataset.theme = initialTheme;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
