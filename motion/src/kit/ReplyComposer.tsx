import type React from "react";
import { useMemo } from "react";
import { Interactive, interpolate, interpolateColors, random, useCurrentFrame, useVideoConfig } from "remotion";
import { color, column916, dur, ease, font, radius, shadow, type } from "../brand/theme";
import { fontFamily } from "../brand/fonts";

type ReplyComposerProps = {
  readonly label: string;
  readonly reply: string;
  // Frame typing starts, relative to this element.
  readonly typeAt: number;
  // Frame the send button is pressed.
  readonly sendAt: number;
  readonly style?: React.CSSProperties;
};

// Frame offset of each character. Human rhythm: per-character jitter, longer
// pauses after punctuation. Seeded, so every render is identical.
const typingSchedule = (text: string) => {
  const times: number[] = [];
  let t = 0;
  for (let i = 0; i < text.length; i++) {
    times.push(t);
    const ch = text[i];
    t += 0.6 + random(`type-${i}`) * 0.5;
    if (ch === "." || ch === "!" || ch === "?") t += 6;
    else if (ch === "," || ch === "—") t += 3;
  }
  return times;
};

const ReplyComposerInner: React.FC<ReplyComposerProps> = ({ label, reply, typeAt, sendAt, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const schedule = useMemo(() => typingSchedule(reply), [reply]);
  const typed = schedule.filter((t) => t <= frame - typeAt).length;
  const typingDone = typed === reply.length;
  const doneAt = typeAt + schedule[schedule.length - 1];
  // Caret: solid while typing, blinks on the beat (every 15 frames) once done, gone after send.
  const caretOn =
    frame >= typeAt - 4 && frame < sendAt && (!typingDone || Math.floor((frame - doneAt) / 15) % 2 === 0);
  // The button wakes up when the reply is ready, so it never outshines an empty box.
  const ready = interpolate(frame, [doneAt, doneAt + dur.micro * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.settle,
  });

  return (
    <div
      style={{
        width: column916.width,
        padding: 32,
        display: "flex",
        flexDirection: "column",
        gap: 18,
        backgroundColor: color.white,
        borderRadius: radius.card,
        boxShadow: shadow.card,
        fontFamily,
        color: color.ink,
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 38, fontWeight: font.medium, color: color.inkSoft }}>
        <div style={{ width: 14, height: 14, borderRadius: radius.pill, backgroundColor: color.red }} />
        {label}
      </div>
      <div
        style={{
          fontSize: type.body,
          lineHeight: type.lineHeight.body,
          letterSpacing: type.tracking.body,
          // Line breaks are written into the copy ("\n"), never left to the browser.
          whiteSpace: "pre-line",
        }}
      >
        <span>{reply.slice(0, typed)}</span>
        <span style={{ display: "inline-block", width: 0, position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: 3,
              top: "-0.95em",
              width: 4,
              height: "1.15em",
              borderRadius: 2,
              backgroundColor: color.red,
              opacity: caretOn ? 1 : 0,
            }}
          />
        </span>
        {/* Untyped text keeps its space so lines never reflow while typing. */}
        <span style={{ color: "transparent" }}>{reply.slice(typed)}</span>
      </div>
      <div
        style={{
          alignSelf: "flex-end",
          height: 80,
          padding: "0 40px",
          borderRadius: radius.button,
          backgroundColor: interpolateColors(ready, [0, 1], [color.white, color.red]),
          border: `2px solid ${interpolateColors(ready, [0, 1], [color.hairline, color.red])}`,
          color: interpolateColors(ready, [0, 1], [color.inkMuted, color.white]),
          fontSize: 36,
          fontWeight: font.semibold,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          scale: interpolate(frame, [sendAt, sendAt + 3, sendAt + dur.micro * fps + 3], [1, 0.94, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease.settle,
          }),
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            translate: `0 ${interpolate(frame, [sendAt + 3, sendAt + 3 + dur.exit * fps], [0, -76], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: ease.move,
            })}px`,
          }}
        >
          <div style={{ height: 76, display: "flex", alignItems: "center" }}>Send reply</div>
          <div style={{ height: 76, display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
            <svg width={34} height={34} viewBox="0 0 24 24" fill="none">
              <path d="M5 12.5l4.5 4.5L19 7.5" stroke={color.white} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Sent
          </div>
        </div>
      </div>
    </div>
  );
};

export const ReplyComposer = Interactive.create({
  Component: ReplyComposerInner,
  layout: "none",
  schema: {
    label: { type: "string", default: "momos drafted a reply", description: "Label" },
    reply: { type: "string", default: "", description: "Reply text" },
    typeAt: { type: "number", default: 0, step: 1, description: "Typing starts (frame)", hiddenFromList: false },
    sendAt: { type: "number", default: 90, step: 1, description: "Send pressed (frame)", hiddenFromList: false },
  },
});
