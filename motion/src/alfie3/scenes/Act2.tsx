import { Highlight } from "@remotion/rough-notation";
import { AbsoluteFill, Img, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Pan, Starburst, useShake } from "../../arrowsterr/fx";
import { color, fontFamily, radius, shadow, type } from "../../brand";
import { AlfieAvatar, Bubble, clamp, MOMOS_LOGO, TypingDots, useIsVertical } from "../../alfie/ui";
import { Dashes, EASE, MoodDial, Notice, Receipt, ReceiptLine, RingBurst, Slam, Steam, Steamer, TraceConsole, useIn, usePop } from "../fx";
import { cue } from "../timeline";
import { ALFIE_SRC } from "./shared";

const POP = 8; // the lid pops this many frames into the reveal

// 6. "Meet Alfie." The steamer lid pops; Alfie springs out; the logo wipes in.
export const RevealScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertical = useIsVertical();
  const basketW = vertical ? 460 : 420;
  const bx = vertical ? width / 2 : width * 0.32;
  const by = vertical ? height * 0.42 : height * 0.36;
  const t = frame - POP;
  const lid = {
    y: t < 0 ? 0 : -t * 38 + t * t * 0.9,
    rot: t < 0 ? 0 : t * -9,
    opacity: t < 0 ? 1 : interpolate(t, [10, 24], [1, 0], clamp),
  };
  // Alfie springs up with squash and stretch.
  const up = spring({ frame: t, fps, config: { damping: 9, stiffness: 140 } });
  const squash = t < 0 ? 1 : 1 + Math.sin(Math.min(t, 18) * 0.55) * 0.18 * Math.exp(-t / 10);
  const alfieH = vertical ? 520 : 500;
  const shake = useShake([POP], 16, 10);
  const wipe = interpolate(frame, [cue("reveal-agent"), cue("reveal-agent") + 16], [0, 100], { ...clamp, easing: EASE });
  const textX = vertical ? width / 2 : width * 0.66;

  return (
    <Pan enter={false}>
      <AbsoluteFill style={{ translate: shake }}>
        {/* frozen complaint cards blasting outward on the pop */}
        {t >= 0 &&
          Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2 + 0.3;
            const d = t * 60 + t * t * 2;
            return (
              <div key={i} style={{ position: "absolute", left: bx - 250 + Math.cos(a) * d, top: by + Math.sin(a) * d, rotate: `${t * (i % 2 ? 6 : -6)}deg`, opacity: interpolate(t, [0, 16], [0.8, 0], clamp), filter: "grayscale(0.8)" }}>
                <Notice channel="App chat" text="Missing fries. Again." w={500} />
              </div>
            );
          })}
        <div style={{ position: "absolute", left: bx, top: by + 60, width: 0, height: 0 }}>
          <RingBurst at={POP} size={360} tint={color.brand} />
          <Starburst at={POP} size={1100} tint={color.brandFg} rays={14} spin={0.8} life={26} />
        </div>
        {/* Alfie rises out of the basket */}
        <div style={{ position: "absolute", left: bx - (alfieH * 418) / 512 / 2, top: by + 40 - up * alfieH * 0.92, height: alfieH, scale: `${2 - squash} ${squash}`, transformOrigin: "50% 100%", opacity: t < 0 ? 0 : 1, zIndex: 1 }}>
          <Img src={ALFIE_SRC} style={{ height: alfieH }} />
        </div>
        <div style={{ position: "absolute", left: bx - basketW / 2, top: by, zIndex: 2 }}>
          <Steamer w={basketW} lid={lid} />
        </div>
        <Steam x={bx} y={by + 40} count={22} spread={260} opacity={0.85} start={POP} burst />
        <Steam x={bx} y={by + 40} count={6} spread={140} opacity={0.4} start={POP + 20} />

        <div style={{ position: "absolute", left: textX, top: vertical ? height * 0.66 : height * 0.3, translate: "-50% 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 28, zIndex: 3 }}>
          <div style={{ ...type.display, fontFamily, fontSize: vertical ? 150 : 150, color: color.ink, opacity: useIn(cue("reveal-meet"), 6), scale: `${0.8 + usePop(cue("reveal-meet"), 11) * 0.2}`, whiteSpace: "nowrap" }}>
            Meet <span style={{ color: color.brand }}>Alfie.</span>
          </div>
          <div style={{ clipPath: `inset(0 ${100 - wipe}% 0 0)`, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
            <Img src={MOMOS_LOGO} style={{ height: vertical ? 96 : 90 }} />
            <span style={{ ...type.h3, fontFamily, fontWeight: 500, color: color.neutral700, whiteSpace: "nowrap" }}>The Experience Agent</span>
          </div>
        </div>
      </AbsoluteFill>
    </Pan>
  );
};

// 7. The fix: chat on one side, Alfie's live agent trace on the other.
export const FixScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const vertical = useIsVertical();
  const order = cue("fix-order");
  const policy = cue("fix-policy");
  const right = cue("fix-right");
  const voice = cue("fix-voice");
  const closed = cue("fix-closed");
  const thanks = voice + 34;
  const points = Math.round(interpolate(frame, [right + 12, right + 34], [1240, 1440], { ...clamp, easing: EASE }));
  const shake = useShake([closed], 14, 10);

  const lines = [
    { at: cue("fix-watch") + 8, call: "new message · app chat · Downtown", ok: cue("fix-watch") + 24 },
    { at: order + 2, call: 'order.lookup("#4182")', ok: order + 16, ms: "118 ms" },
    { at: policy + 2, call: 'policy.match("missing item")', ok: policy + 20, ms: "64 ms" },
    { at: right + 2, call: "loyalty.credit(+200)", ok: right + 12, ms: "41 ms" },
    { at: right + 10, call: 'offer.create("free fries")', ok: right + 22, ms: "37 ms" },
    { at: voice + 2, call: 'reply.compose(voice: "your brand")', ok: voice + 16, ms: "212 ms" },
    { at: closed, call: "case.resolve()", ok: closed + 8, ms: "done" },
  ];

  const chatW = vertical ? width - 112 : 780;
  const sideW = vertical ? width - 112 : width - 120 * 2 - chatW - 60;

  return (
    <Pan>
      <AbsoluteFill style={{ translate: shake, flexDirection: vertical ? "column" : "row", padding: vertical ? "200px 56px 160px" : "90px 120px", gap: vertical ? 32 : 60 }}>
        {/* Chat */}
        <div style={{ position: "relative", width: chatW, height: vertical ? 620 : "100%", boxSizing: "border-box", background: color.white, borderRadius: radius.xl, boxShadow: shadow.l, border: `2px solid ${color.border}`, padding: 32, display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, paddingBottom: 20, borderBottom: `2px solid ${color.border}` }}>
            <AlfieAvatar size={64} />
            <span style={{ fontFamily, fontWeight: 700, fontSize: 34, color: color.ink }}>Alfie</span>
            <span style={{ fontFamily, fontWeight: 500, fontSize: 26, color: color.gray600, marginLeft: "auto" }}>App chat</span>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 20 }}>
            <Bubble from="guest" delay={-30} size={30} text="My order just arrived and the fries are missing. Again." />
            <TypingDots from={order} to={voice + 4} size={30} />
            <Bubble from="alfie" delay={voice + 4} typeFrames={36} size={30} text="So sorry, Maya. Your fries were missed. I've added 200 points and your next fries are on us." />
            <Bubble from="guest" delay={thanks} size={30} text="Wow, that was fast. Thank you!" />
          </div>
          <Slam at={closed} label="Resolved" tone="olive" size={vertical ? 64 : 72} style={{ right: 40, top: vertical ? 110 : 140 }} />
        </div>

        {/* Agent trace + the receipts of what it did */}
        <div style={{ width: sideW, display: "flex", flexDirection: "column", gap: vertical ? 24 : 32 }}>
          <TraceConsole lines={lines} w={sideW} minH={vertical ? 420 : 470} size={vertical ? 26 : 28} />
          <div style={{ display: "flex", gap: 24, alignItems: "stretch" }}>
            <div style={{ flex: 1.2, opacity: useIn(order + 8, 10) }}>
              <Receipt width={vertical ? 400 : 380} style={{ padding: "20px 24px 30px" }}>
                <ReceiptLine left="#4182" right="9:47 PM" style={{ fontSize: 24 }} />
                <Dashes />
                <ReceiptLine left="1 Fries" style={{ fontSize: 26, color: frame >= order + 10 && frame < right && Math.floor(frame / 6) % 2 ? color.brand : color.ink }} />
                <div style={{ fontSize: 24, fontWeight: 500, color: color.textSecondary, marginTop: 8, opacity: useIn(policy + 10, 8) }}>
                  Policy:{" "}
                  <Highlight color={color.brandBg} progress={interpolate(frame, [policy + 14, policy + 30], [0, 1], clamp)}>
                    200 pts + free item
                  </Highlight>
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: color.brand, marginTop: 8, opacity: useIn(right + 22, 8) }}>+200 pts · Fries on us</div>
              </Receipt>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", background: color.white, borderRadius: radius.lg, boxShadow: shadow.s, padding: 20, opacity: useIn(right + 6, 10), position: "relative" }}>
              <span style={{ fontFamily, fontWeight: 500, fontSize: 24, color: color.gray600 }}>Maya's points</span>
              <span style={{ fontFamily, fontWeight: 700, fontSize: vertical ? 64 : 60, color: color.ink, fontVariantNumeric: "tabular-nums" }}>{points.toLocaleString("en-US")}</span>
              {Array.from({ length: 8 }).map((_, i) => {
                const pt = frame - (right + 14 + i * 2);
                if (pt < 0 || pt > 26) return null;
                return <AlfieAvatar key={i} size={36} style={{ position: "absolute", left: `${20 + random(`dx${i}`) * 60}%`, top: `${60 - pt * 3}%`, opacity: interpolate(pt, [0, 26], [1, 0]) }} />;
              })}
              <MoodDial at={thanks} size={vertical ? 230 : 210} />
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </Pan>
  );
};
