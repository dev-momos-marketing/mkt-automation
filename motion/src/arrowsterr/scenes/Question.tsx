import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { color, radius, type } from "../brand";
import { cue } from "../timeline";
import { BrandChip, clamp, EASE, FlightGrid, Ticks, useIn, useIsVertical } from "../ui";
import { AnswerIntro, AnswerRow, AskBubble, ChatWindow } from "./Chat";

const ASK = cue("aw-q1") - 4;
const ANSWER = ASK + 50;
const SHORTLIST = cue("aw-q2");

// 1–2. A buyer asks AI for a recommendation. The shortlist has no room for you.
export const Question: React.FC = () => {
  const frame = useCurrentFrame();
  const vertical = useIsVertical();
  const push = interpolate(frame, [SHORTLIST, SHORTLIST + 40], [1, vertical ? 1.05 : 1.08], {
    ...clamp,
    easing: EASE,
  });
  const slot = useIn(SHORTLIST + 4, 12);

  return (
    <FlightGrid>
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          scale: `${push}`,
          transformOrigin: "50% 85%",
        }}
      >
        <ChatWindow>
          <AskBubble start={ASK} />
          <AnswerIntro delay={ANSWER} />
          <AnswerRow rank={1} name="Revora" note="Review inbox with auto replies" delay={ANSWER + 10} />
          <AnswerRow rank={2} name="Guestly" note="Simple Google and Yelp replies" delay={ANSWER + 18} />
          <AnswerRow rank={3} name="Plateful" note="Feedback surveys for small teams" delay={ANSWER + 26} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 28,
              padding: "18px 24px",
              borderRadius: radius.md,
              border: `3px dashed ${color.lineStrong}`,
              opacity: slot,
              translate: `0 ${(1 - slot) * 16}px`,
            }}
          >
            <span style={{ ...type.num, fontSize: 30, color: color.ink3, width: 60, textAlign: "center" }}>4</span>
            <Ticks delay={SHORTLIST + 18}>
              <BrandChip solid={0} size={36} />
            </Ticks>
            <span style={{ ...type.ui, color: color.ink3, marginLeft: "auto" }}>Not in the answer</span>
          </div>
        </ChatWindow>
      </AbsoluteFill>
    </FlightGrid>
  );
};
