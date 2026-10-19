import { useCurrentFrame } from "remotion";
import { color, font, radius, type } from "../brand";
import { typed, useIn, useIsVertical, Window } from "../ui";

export const QUESTION = "What's the best review software for small cafes?";

// The buyer's question, typed into a generic AI assistant.
export const AskBubble: React.FC<{ start: number; cps?: number }> = ({ start, cps = 1.4 }) => {
  const frame = useCurrentFrame();
  const vertical = useIsVertical();
  const text = typed(QUESTION, frame, start, cps);
  const p = useIn(start - 4, 8);
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", opacity: p }}>
      <div
        style={{
          ...type.lead,
          fontSize: vertical ? 38 : 40,
          color: color.ink,
          background: color.bg3,
          borderRadius: radius.md,
          padding: "20px 32px",
          maxWidth: "80%",
        }}
      >
        {/* Reserve the full width so the bubble doesn't grow while typing. */}
        <span style={{ position: "relative", display: "block" }}>
          <span style={{ visibility: "hidden" }}>{QUESTION}</span>
          <span style={{ position: "absolute", inset: 0 }}>{text}</span>
        </span>
      </div>
    </div>
  );
};

export const AnswerRow: React.FC<{
  rank: number;
  name: string;
  note: string;
  delay: number;
  highlight?: boolean;
  children?: React.ReactNode;
}> = ({ rank, name, note, delay, highlight, children }) => {
  const p = useIn(delay, 10);
  const vertical = useIsVertical();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 28,
        padding: "18px 24px",
        borderRadius: radius.md,
        background: highlight ? color.signalTint : "transparent",
        opacity: p,
        translate: `${(p - 1) * 32}px 0`,
      }}
    >
      <span
        style={{
          width: 60,
          height: 60,
          flexShrink: 0,
          borderRadius: radius.sm,
          background: highlight ? color.signal : color.bg3,
          color: highlight ? color.onSignal : color.ink2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...type.num,
          fontSize: 30,
        }}
      >
        {rank}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        <span style={{ fontFamily: font.sans, fontWeight: 600, fontSize: vertical ? 40 : 42, color: color.inkStrong }}>
          {name}
        </span>
        <span style={{ ...type.ui, color: color.ink2 }}>{note}</span>
      </div>
      {children}
    </div>
  );
};

export const ChatWindow: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => {
  const vertical = useIsVertical();
  return (
    <Window
      title="AI assistant"
      width={vertical ? 960 : 1280}
      style={style}
      bodyStyle={{ display: "flex", flexDirection: "column", gap: 28, padding: 40 }}
    >
      {children}
    </Window>
  );
};

export const AnswerIntro: React.FC<{ delay: number }> = ({ delay }) => {
  const p = useIn(delay, 10);
  return (
    <div style={{ ...type.lead, color: color.ink2, opacity: p, paddingLeft: 8 }}>
      Here are the top picks for small cafes:
    </div>
  );
};
