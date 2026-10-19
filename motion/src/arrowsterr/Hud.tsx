import { interpolate, useCurrentFrame } from "remotion";
import { color, font, radius, type } from "./brand";
import { cueEnd, sceneStart, type Scene } from "./timeline";
import { BrandChip, clamp, Delta, EASE, useIsVertical } from "./ui";

const STAGES: [Scene, string][] = [
  ["see", "See"],
  ["find", "Find"],
  ["plan", "Plan"],
  ["create", "Create"],
];

// Absolute frames where each stage hands over its visibility gain.
const KEYS = [
  [sceneStart("see"), 0],
  [sceneStart("see") + cueEnd("aw-s2"), 18],
  [sceneStart("find") + cueEnd("aw-f1"), 34],
  [sceneStart("plan") + cueEnd("aw-p2"), 47],
  [sceneStart("create") + cueEnd("aw-c3"), 60],
];

// Persistent HUD across the 4 stages: the step rail and the visibility meter.
export const Hud: React.FC = () => {
  const frame = useCurrentFrame();
  const vertical = useIsVertical();
  const from = sceneStart("see") + 12; // after the slide-in from Meet
  const to = sceneStart("visible") + 12;
  if (frame < from - 2 || frame > to) return null;

  const show = interpolate(frame, [from, from + 10, to - 12, to], [0, 1, 1, 0], clamp);
  const vis = interpolate(frame, KEYS.map((k) => k[0]), KEYS.map((k) => k[1]), { ...clamp, easing: EASE });
  const current = STAGES.filter(([s]) => frame >= sceneStart(s) + 6).length - 1;

  return (
    <div
      style={{
        position: "absolute",
        left: vertical ? 56 : 120,
        right: vertical ? 56 : 120,
        ...(vertical ? { top: 200 } : { bottom: 56 }),
        display: "flex",
        flexDirection: vertical ? "column" : "row",
        alignItems: vertical ? "stretch" : "center",
        gap: vertical ? 24 : 48,
        padding: vertical ? "24px 32px" : "22px 36px",
        background: color.bg,
        border: `2px solid ${color.line}`,
        borderRadius: radius.lg,
        opacity: show,
        translate: `0 ${(1 - show) * 16}px`,
        fontFamily: font.sans,
      }}
    >
      <div style={{ display: "flex", gap: vertical ? 28 : 36, justifyContent: vertical ? "space-between" : undefined }}>
        {STAGES.map(([s, label], i) => {
          const state = i < current ? "done" : i === current ? "now" : "next";
          return (
            <span key={s} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ ...type.num, fontSize: 26, color: state === "next" ? color.ink3 : color.signalText }}>{`0${i + 1}`}</span>
              <span
                style={{
                  ...type.label,
                  fontSize: 30,
                  fontWeight: 600,
                  color: state === "now" ? color.inkStrong : state === "done" ? color.ink2 : color.ink3,
                  borderBottom: `4px solid ${state === "now" ? color.signal : "transparent"}`,
                  paddingBottom: 4,
                }}
              >
                {label}
              </span>
            </span>
          );
        })}
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 28 }}>
        <BrandChip solid={vis >= 59.5 ? 1 : vis / 60} size={28} />
        <div style={{ flex: 1, height: 14, borderRadius: radius.sm, background: color.bg3 }}>
          <div style={{ width: `${(vis / 60) * 100}%`, height: "100%", borderRadius: radius.sm, background: color.signal }} />
        </div>
        <span style={{ ...type.label, color: color.ink2 }}>Visibility</span>
        <span style={{ ...type.num, fontSize: 40, color: color.inkStrong, width: 96, textAlign: "right" }}>{Math.round(vis)}%</span>
        {vis >= 59.5 && <Delta text="+60 pts" size={28} />}
      </div>
    </div>
  );
};
