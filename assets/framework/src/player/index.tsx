import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

// Side-effect imports: content registers on import, so a bundle that renders
// the composition without them throws "No content registered" at first paint.
import "../content/circle-incenter";
import "./styles.css";

const host = document.getElementById("root");
if (!host) throw new Error("缺少 #root");
createRoot(host).render(<App />);
