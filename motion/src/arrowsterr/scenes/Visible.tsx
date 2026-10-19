import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { cue } from "../timeline";
import { clamp, EASE, FlightGrid, SparkStar, Tag, Ticks } from "../ui";
import { AnswerIntro, AnswerRow, AskBubble, ChatWindow } from "./Chat";

// 9. Ask again. This time you're on the shortlist, with the film's one gold Spark.
export const Visible: React.FC = () => {
  const frame = useCurrentFrame();
  const land = cue("aw-v2");
  // Rows below #1 make room as tablely.com slides in at #2.
  const room = interpolate(frame, [land - 6, land + 6], [0, 1], { ...clamp, easing: EASE });

  return (
    <FlightGrid>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <ChatWindow>
          <AskBubble start={2} cps={4} />
          <AnswerIntro delay={18} />
          <AnswerRow rank={1} name="Revora" note="Review inbox with auto replies" delay={24} />
          <div style={{ height: room * 116, overflow: "visible", position: "relative" }}>
            {frame >= land - 2 && (
              <Ticks delay={land + 8} gap={8} style={{ display: "block" }}>
                <AnswerRow rank={2} name="tablely.com" note="Every review in one inbox" delay={land} highlight>
                  <Tag tone="spark">
                    <SparkStar size={26} /> New citation
                  </Tag>
                </AnswerRow>
              </Ticks>
            )}
          </div>
          <AnswerRow rank={frame >= land ? 3 : 2} name="Guestly" note="Simple Google and Yelp replies" delay={30} />
          <AnswerRow rank={frame >= land ? 4 : 3} name="Plateful" note="Feedback surveys for small teams" delay={36} />
        </ChatWindow>
      </AbsoluteFill>
    </FlightGrid>
  );
};
