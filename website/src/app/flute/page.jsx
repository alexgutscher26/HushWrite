import React from "react";
import { notFound } from "next/navigation";
import FluteStudio from "../../../src/flute/Studio";
export default function FlutePage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <><meta name="flute-project" content="33f71dc6-adb0-4cdb-a4f1-0cb5b650c48f" /><FluteStudio /></>;
}
