import type React from "react";
import { AbsoluteFill } from "remotion";
import { safe916 } from "../brand/theme";

// Review aid only: shades where platform UI covers a 9:16 frame. Never ship with it on.
export const SafeZoneOverlay: React.FC = () => {
  const shade = "rgba(0,120,255,0.22)";
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: safe916.top, background: shade }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: safe916.bottom, bottom: 0, background: shade }} />
      <div style={{ position: "absolute", left: 0, width: safe916.left, top: safe916.top, height: safe916.bottom - safe916.top, background: shade }} />
      <div style={{ position: "absolute", left: safe916.right, right: 0, top: safe916.top, height: safe916.bottom - safe916.top, background: shade }} />
      <div
        style={{
          position: "absolute",
          left: safe916.left,
          top: safe916.top,
          width: safe916.right - safe916.left,
          height: safe916.bottom - safe916.top,
          outline: "3px dashed rgba(0,120,255,0.9)",
        }}
      />
    </AbsoluteFill>
  );
};
