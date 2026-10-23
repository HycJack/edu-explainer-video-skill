import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

// Which problem to show. scripts/build-player.mjs passes it as a compile-time
// define, so each build is a static page for one content file; with no define
// (studio, a hand-rolled build) it falls back to the sample problem.
declare const __CONTENT_ID__: string | undefined;
const contentId =
  typeof __CONTENT_ID__ === "undefined" || !__CONTENT_ID__ ? "circle-incenter" : __CONTENT_ID__;

// Side-effect imports: content registers on import, so a bundle that renders
// the composition without them throws "No content registered" at first paint.
// One line per problem, and only the samples that ship in this checkout are
// listed: esbuild follows exactly what is named here, so the page bundle stays
// small and a fresh clone builds before any new problem is added.
import "../content/circle-incenter";
import "../content/conic-chord";
import "../content/cuboid-perpendicular";
import "./styles.css";

const host = document.getElementById("root");
if (!host) throw new Error("缺少 #root");
createRoot(host).render(<App contentId={contentId} />);
