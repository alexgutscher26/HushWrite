"use client";
import React from "react";
import { ProjectPreview } from "@webprodigies/flute/preview";
import { sceneModules } from "./catalog";
// Host-owned development flag: no process, Vite or Electron globals in this adapter.
export function FluteProjectPreview({ children, enabled, active, ...props }) {
  if (!enabled) return children;
  return <ProjectPreview {...props} projectId="6fc6c509-a6c9-4bbe-bace-d3b2746ef255" enabled={enabled} active={active} sceneModules={sceneModules}>{children}</ProjectPreview>;
}
