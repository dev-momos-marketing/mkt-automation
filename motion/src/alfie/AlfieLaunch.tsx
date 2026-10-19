import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { color, fontFamily, radius, shadow, type } from "../brand";
import {
  Bubble,
  Check,
  MaskWords,
  Rise,
  TypingDots,
  useEnter,
  useIsVertical,
} from "./ui";

// Script: scripts/alfie-launch.md. Scene lengths are in frames at 30fps.
const SCENES = {
  hook: 105,
  oldWay: 150,
  turn: 75,
  demo: 390,
  reveal: 105,
  reach: 135,
  cta: 105,
};
const TRANSITION = 15;

export const ALFIE_DURATION =
  Object.values(SCENES).reduce((a, b) => a + b, 0) -
  TRANSITION * (Object.keys(SCENES).length - 1);

const timing = linearTiming({ durationInFrames: TRANSITION });

export const AlfieLaunch: React.FC = () => {
  return (
    <AbsoluteFill style={{ fontFamily, background: color.beige }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENES.hook}>
          <Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={SCENES.oldWay}>
          <OldWay />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={timing}
        />
        <TransitionSeries.Sequence durationInFrames={SCENES.turn}>
          <Turn />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={timing}
        />
        <TransitionSeries.Sequence durationInFrames={SCENES.demo}>
          <Demo />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={SCENES.reveal}>
          <Reveal />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={timing}
        />
        <TransitionSeries.Sequence durationInFrames={SCENES.reach}>
          <Reach />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={SCENES.cta}>
          <Cta />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

const Scene: React.FC<{
  bg?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ bg = color.beige, children, style }) => {
  const vertical = useIsVertical();
  return (
    <AbsoluteFill
      style={{
        background: bg,
        justifyContent: "center",
        padding: vertical ? "160px 80px" : "96px 160px",
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// 1. Hook: the guest's own words, before any branding.
const Hook: React.FC = () => {
  const vertical = useIsVertical();
  return (
    <Scene style={{ alignItems: "center" }}>
      <div
        style={{
          width: vertical ? "100%" : 1500,
          display: "flex",
          flexDirection: "column",
          gap: 48,
        }}
      >
        <Rise>
          <div style={{ ...type.h3, color: color.gray600, textAlign: "right" }}>
            9:47 PM
          </div>
        </Rise>
        <Bubble
          from="guest"
          delay={6}
          size={vertical ? 52 : 60}
          text="My order just arrived and the fries are missing. Again."
        />
        <div style={{ marginTop: 48 }}>
          <MaskWords
            text="Every restaurant"
            delay={48}
            style={{ ...type.h1, color: color.ink }}
          />
          <MaskWords
            text="gets this message."
            delay={58}
            style={{ ...type.h1, color: color.ink }}
          />
        </div>
      </div>
    </Scene>
  );
};

// 2. The old way: the ticket sits unread until the guest is gone.
const WAIT_LABELS = [
  "Unread for 10 minutes",
  "Unread for 3 hours",
  "Unread for 1 day",
  "Unread for 3 days",
];

const OldWay: React.FC = () => {
  const frame = useCurrentFrame();
  const vertical = useIsVertical();
  const card = useEnter(12);
  const label =
    WAIT_LABELS[
      Math.min(
        WAIT_LABELS.length - 1,
        Math.max(0, Math.floor((frame - 24) / 18)),
      )
    ];
  const decay = interpolate(frame, [96, 120], [1, 0.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Scene>
      <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>
        <MaskWords
          text="Usually, it waits."
          style={{ ...type.h1, color: color.ink }}
        />
        <div
          style={{
            alignSelf: "flex-start",
            width: vertical ? "100%" : 1000,
            boxSizing: "border-box",
            padding: 48,
            borderRadius: radius.md,
            background: color.white,
            boxShadow: shadow.m,
            opacity: card * decay,
            filter: `grayscale(${1 - decay})`,
            transform: `translateY(${(1 - card) * 40}px)`,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ ...type.h3, fontWeight: 700, color: color.ink }}>
              Order #4182
            </div>
            <div
              style={{
                ...type.caption,
                color: color.neutral700,
                background: color.bgSecondary,
                border: `2px solid ${color.border}`,
                borderRadius: radius.full,
                padding: "8px 28px",
                alignSelf: "center",
              }}
            >
              {label}
            </div>
          </div>
          <div style={{ ...type.body, color: color.textSecondary }}>
            Missing fries. Second time this month.
          </div>
        </div>
        <Rise delay={100}>
          <div style={{ ...type.h3, color: color.neutral700 }}>
            By then, the guest has moved on.
          </div>
        </Rise>
      </div>
    </Scene>
  );
};

// 3. The turn: the only dark frame in the video.
const Turn: React.FC = () => {
  const vertical = useIsVertical();
  return (
    <Scene bg={color.ink}>
      <MaskWords
        text="Now it gets answered in seconds."
        delay={6}
        stagger={5}
        style={{
          ...type.display,
          fontSize: vertical ? 120 : 140,
          color: color.white,
          maxWidth: 1500,
        }}
      />
    </Scene>
  );
};

// 4. Proof: Alfie acts while it replies.
const ACTIONS = [
  { at: 40, text: "Found order #4182 at Downtown" },
  { at: 70, text: "Checked your recovery policy" },
  { at: 100, text: "Added 200 loyalty points" },
  { at: 130, text: "Fries on us next time" },
];

const Demo: React.FC = () => {
  const vertical = useIsVertical();
  const panel = useEnter(0);
  const resolved = useEnter(300, 14);

  return (
    <Scene style={{ padding: vertical ? "120px 64px" : "80px 120px" }}>
      <div
        style={{
          display: "flex",
          flexDirection: vertical ? "column" : "row",
          gap: vertical ? 64 : 96,
          alignItems: vertical ? "stretch" : "center",
          height: "100%",
        }}
      >
        <div
          style={{
            flex: vertical ? "none" : "0 0 980px",
            height: vertical ? 1060 : "100%",
            boxSizing: "border-box",
            background: color.brandPale,
            border: `2px solid ${color.border}`,
            borderRadius: radius.xl,
            boxShadow: shadow.l,
            padding: 40,
            display: "flex",
            flexDirection: "column",
            gap: 28,
            opacity: panel,
            transform: `translateY(${(1 - panel) * 60}px)`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: 24,
              borderBottom: `2px solid ${color.border}`,
            }}
          >
            <div style={{ ...type.caption, fontWeight: 700, color: color.ink }}>
              Alfie
            </div>
            <div
              style={{
                ...type.caption,
                color: color.oliveDark,
                background: color.olive,
                borderRadius: radius.full,
                padding: "4px 24px",
                opacity: resolved,
                transform: `scale(${0.8 + resolved * 0.2})`,
              }}
            >
              Resolved
            </div>
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              gap: 28,
            }}
          >
            <Bubble
              from="guest"
              delay={0}
              text="My order just arrived and the fries are missing. Again."
            />
            <TypingDots from={24} to={150} />
            <Bubble
              from="alfie"
              delay={150}
              typeFrames={70}
              text="So sorry, Maya. I found order #4182 from Downtown, and the fries didn't make it in. I've added 200 points to your account, and your next fries are on us."
            />
            <Bubble from="guest" delay={260} text="That was quick. Thank you!" />
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 40 }}>
          <Rise delay={20}>
            <div style={{ ...type.h3, color: color.neutral700 }}>
              While it replies, Alfie
            </div>
          </Rise>
          {ACTIONS.map((a) => (
            <Rise key={a.text} delay={a.at} distance={24}>
              <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
                <Check delay={a.at + 4} />
                <div style={{ ...type.body, fontWeight: 500, color: color.ink }}>
                  {a.text}
                </div>
              </div>
            </Rise>
          ))}
        </div>
      </div>
    </Scene>
  );
};

// 5. Reveal: the name lands after the viewer has seen what it does.
const Reveal: React.FC = () => {
  const vertical = useIsVertical();
  const name = useEnter(10, 16);
  return (
    <Scene style={{ alignItems: vertical ? "flex-start" : "center" }}>
      <div>
        <Rise>
          <div style={{ ...type.h2, color: color.neutral700 }}>Meet</div>
        </Rise>
        <div
          style={{
            ...type.display,
            fontSize: vertical ? 260 : 320,
            lineHeight: 1,
            letterSpacing: -8,
            color: color.brand,
            transform: `scale(${0.85 + name * 0.15})`,
            transformOrigin: "left center",
            opacity: name,
          }}
        >
          Alfie
        </div>
        <Rise delay={32}>
          <div style={{ ...type.h3, color: color.ink, marginTop: 24 }}>
            The Experience Agent from Momos
          </div>
        </Rise>
      </div>
    </Scene>
  );
};

// 6. Reach: channels as a kinetic list, then the human handoff.
const CHANNELS = [
  "Website chat",
  "Mobile app",
  "Post-visit surveys",
  "Delivery platforms",
];

const Reach: React.FC = () => {
  return (
    <Scene>
      <Rise>
        <div style={{ ...type.h3, color: color.gray600, marginBottom: 24 }}>
          Alfie works across
        </div>
      </Rise>
      {CHANNELS.map((c, i) => (
        <SlideInLine key={c} delay={8 + i * 7}>
          {c}
        </SlideInLine>
      ))}
      <Rise delay={70}>
        <div
          style={{
            ...type.h3,
            fontWeight: 400,
            color: color.neutral700,
            marginTop: 48,
            maxWidth: 1300,
          }}
        >
          And when your team should step in, Alfie hands over the full story.
        </div>
      </Rise>
    </Scene>
  );
};

const SlideInLine: React.FC<{ delay: number; children: React.ReactNode }> = ({
  delay,
  children,
}) => {
  const p = useEnter(delay);
  return (
    <div
      style={{
        ...type.h1,
        color: color.ink,
        opacity: p,
        transform: `translateX(${(1 - p) * -80}px)`,
      }}
    >
      {children}
    </div>
  );
};

// 7. CTA: the product's verbs, ending on the business outcome.
const Cta: React.FC = () => {
  const vertical = useIsVertical();
  const button = useEnter(36, 12);
  return (
    <Scene style={{ alignItems: vertical ? "flex-start" : "center" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: vertical ? "flex-start" : "center",
          gap: 56,
        }}
      >
        <div style={{ textAlign: vertical ? "left" : "center" }}>
          <MaskWords
            text="Resolve. Recover."
            stagger={6}
            style={{ ...type.h1, color: color.ink }}
          />
          <MaskWords
            text="Bring them back."
            delay={14}
            stagger={6}
            style={{ ...type.h1, color: color.ink }}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: vertical ? "column" : "row",
            alignItems: vertical ? "flex-start" : "center",
            gap: vertical ? 32 : 48,
          }}
        >
          <div
            style={{
              ...type.h3,
              fontWeight: 700,
              color: color.white,
              background: color.brand,
              borderRadius: radius.sm,
              padding: "24px 56px",
              transform: `scale(${button})`,
            }}
          >
            Book a demo
          </div>
          <Rise delay={46}>
            <div style={{ ...type.h3, fontWeight: 500, color: color.neutral700 }}>
              momos.com/alfie
            </div>
          </Rise>
        </div>
      </div>
    </Scene>
  );
};
