"use client";
import React from "react";
import { ProjectPreview } from "@webprodigies/flute/preview";
import { sceneModules } from "./catalog";
// Host-owned development flag: no process, Vite or Electron globals in this adapter.
export function FluteProjectPreview({ children, enabled, active, ...props }) {
  if (!enabled) return children;
  return <ProjectPreview {...props} projectId="33f71dc6-adb0-4cdb-a4f1-0cb5b650c48f" enabled={enabled} active={active} sceneModules={sceneModules}>{children}</ProjectPreview>;
}
