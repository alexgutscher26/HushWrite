/**
 * SOURCE OF TRUTH KEYWORDS: sidebar-entry, SidebarWindow, nav-selected,
 *   sidebar.html, detached-rail
 * WHAT:  The detached navigation rail's entry point — the floating window that
 *        sits to the left of the dashboard.
 * WHY:   Its own window, and therefore its own Vite entry, because the GAP
 *        between the rail and the main panel has to be genuinely transparent to
 *        show the desktop through it. A single window cannot do that: its
 *        vibrancy is one rectangle covering the whole frame, so the gap would
 *        render as glass rather than as a hole.
 *
 *        The window is a CHILD of the dashboard (NSWindow addChildWindow), so
 *        macOS moves, orders, minimises and hides it with its parent. Nothing
 *        here tracks the parent's position; anything we wrote ourselves would
 *        drift on move and flicker on resize.
 *
 *        Navigation travels one way, rail to dashboard, over `nav-selected`.
 *        The rail keeps its own highlight optimistically rather than waiting
 *        for an echo, because it is the only thing in the app that changes the
 *        route — so the two cannot disagree in normal use.
 * WHERE: Loaded by sidebar.html, which bootstrap opens and attaches.
 */

import { useEffect, useState } from "react";
import { emitTo, listen } from "@tauri-apps/api/event";
import { SidebarWindow } from "@/app/sidebar";
import { NAV_SELECTED } from "@/lib/window-events";
import "@/styles/global.css";
import { createRoot } from "react-dom/client";

/** The dashboard window's label, as declared in tauri.conf.json. */
const DASHBOARD_LABEL = "dashboard";

function SidebarEntry() {
  const [route, setRoute] = useState("dictation");

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<{ route: string }>("nav-route-sync", (event) => {
      if (event.payload?.route) {
        setRoute(event.payload.route);
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleSelect = (next: string) => {
    if (next !== "invite" && next !== "help") {
      setRoute(next);
    }
    void emitTo(DASHBOARD_LABEL, NAV_SELECTED, { route: next });
  };

  return <SidebarWindow activeRoute={route} onSelect={handleSelect} />;
}

const container = document.getElementById("root");
if (!container) throw new Error("sidebar.html is missing its #root element.");

createRoot(container).render(<SidebarEntry />);
