import { StrikeThrough } from "@remotion/rough-notation";
import { AbsoluteFill, Easing, Freeze, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Pan } from "../../arrowsterr/fx";
import { color, fontFamily, type } from "../../brand";
import { Bubble, clamp, MaskWords, useIsVertical } from "../../alfie/ui";
import { Dashes, Decode, EASE, Notice, Phone, Printer, Receipt, ReceiptLine, Steam, Steamer, Ticket } from "../fx";
import { cue, sceneLength } from "../timeline";

// 1. "Friday. 9:47 PM." A ticket printer chatters the timestamp out.
export const PrinterScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const vertical = useIsVertical();
  const pw = vertical ? 700 : 620;
  const feed = interpolate(frame, [cue("open-1") - 12, cue("open-1") + 60], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const paperH = 560;
  const top = vertical ? 520 : 140;
  return (
    <Pan enter={false}>
      <div style={{ position: "absolute", left: width / 2 - pw / 2, top, zIndex: 2 }}>
        <Printer width={pw} jitter={feed > 0 && feed < 1 ? 1 : 0} />
      </div>
      <div style={{ position: "absolute", left: width / 2 - (pw - 120) / 2, top: top + pw * 0.3 - 30, width: pw - 120, height: paperH * feed + 40, overflow: "hidden" }}>
        <div style={{ translate: `0 ${(feed - 1) * paperH}px` }}>
          <Receipt width={pw - 120}>
            <ReceiptLine left="Momos Kitchen" right="#4182" />
            <Dashes />
            <ReceiptLine left="Friday" style={{ color: color.gray600 }} />
            <ReceiptLine left="9:47 PM" big />
            <Dashes />
            <ReceiptLine left="1 Burger" right="12.00" />
            <ReceiptLine left="1 Lemonade" right="4.00" />
            <ReceiptLine left="1 Fries" right="4.00" />
          </Receipt>
        </div>
      </div>
    </Pan>
  );
};

// 2. "Your kitchen is slammed." Tickets snap onto a rail on every beat.
export const RailScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertical = useIsVertical();
  const railY = vertical ? height * 0.36 : height * 0.22;
  const pitch = 270;
  const scroll = frame * 7;
  return (
    <Pan>
      <div style={{ position: "absolute", left: 0, right: 0, top: railY, height: 18, background: color.neutral700, borderRadius: 9 }} />
      {Array.from({ length: 14 }).map((_, i) => {
        const clipAt = (i - 7) * 7; // a new ticket clips on every half beat once the scene starts
        const x = width + 40 - (i + 1) * pitch + scroll * 0.6 - (i > 7 ? 0 : 0);
        const drop = frame < clipAt ? -400 : interpolate(frame, [clipAt, clipAt + 6], [-120, 0], { ...clamp, easing: Easing.in(Easing.quad) });
        if (x < -pitch || x > width + 20) return null;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: railY + 8 + drop, opacity: frame < clipAt ? 0 : 1 }}>
            <div style={{ width: 30, height: 30, borderRadius: 6, background: color.gray600, margin: "-12px auto 0" }} />
            <Ticket n={4170 + i} seed={i} />
          </div>
        );
      })}
      <Steam x={width * 0.3} y={height * 0.95} count={8} spread={500} opacity={0.35} />
      <Steam x={width * 0.75} y={height * 0.95} count={8} spread={500} opacity={0.35} />
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: vertical ? "center" : "flex-start", padding: vertical ? "0 64px 520px" : "0 140px 120px" }}>
        <MaskWords text="Slammed." delay={cue("rail-1") + 18} stagger={4} style={{ ...type.display, fontSize: vertical ? 170 : 200, color: color.ink, fontFamily }} />
      </AbsoluteFill>
    </Pan>
  );
};

// 3. "...a guest just opened the bag. No fries. Again."
export const BagScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vertical = useIsVertical();
  const pop = spring({ frame: frame - 18, fps, config: { damping: 14 } });
  const fries = cue("bag-fries");
  const again = cue("bag-again");
  const phoneIn = spring({ frame: frame - (again - 6), fps, config: { damping: 15 } });
  const bagW = vertical ? 420 : 400;
  return (
    <Pan>
      <AbsoluteFill style={{ flexDirection: vertical ? "column" : "row", justifyContent: "center", alignItems: "center", gap: vertical ? 40 : 160, paddingTop: vertical ? 120 : 0 }}>
        <div style={{ position: "relative", width: bagW, height: vertical ? 900 : 760 }}>
          {/* receipt rising out of the bag */}
          <div style={{ position: "absolute", left: bagW * 0.12, top: interpolate(pop, [0, 1], [300, 0]), zIndex: 1 }}>
            <Receipt width={bagW * 0.76}>
              <ReceiptLine left="#4182" right="9:47 PM" />
              <Dashes />
              <ReceiptLine left="1 Burger" />
              <ReceiptLine left="1 Lemonade" />
              <StrikeThrough color={color.brand} strokeWidth={5} seed={3} progress={interpolate(frame, [fries + 2, fries + 14], [0, 1], clamp)}>
                <ReceiptLine left="1 Fries" />
              </StrikeThrough>
            </Receipt>
          </div>
          {/* the bag */}
          <svg width={bagW} height={bagW * 1.05} viewBox="0 0 100 105" style={{ position: "absolute", left: 0, bottom: 0, zIndex: 2 }}>
            <path d="M8 18 L92 18 L98 104 L2 104 Z" fill={color.warmCream} stroke={color.neutral700} strokeWidth={1.2} />
            <path d="M8 18 L14 10 L86 10 L92 18" fill={color.warmCream} stroke={color.neutral700} strokeWidth={1.2} />
            <path d="M30 18 Q50 -6 70 18" fill="none" stroke={color.neutral700} strokeWidth={2.4} />
            <text x={50} y={66} textAnchor="middle" fontFamily={fontFamily} fontWeight={700} fontSize={11} fill={color.brand}>
              Order up
            </text>
          </svg>
        </div>
        <div style={{ opacity: phoneIn, translate: `0 ${(1 - phoneIn) * 600}px` }}>
          <Phone w={vertical ? 520 : 470} h={vertical ? 760 : 820} buzzAt={again}>
            {frame >= again && (
              <Bubble from="guest" delay={again} size={30} text="My order just arrived and the fries are missing. Again." />
            )}
          </Phone>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: vertical ? 160 : 70 }}>
        <Decode text="No fries." start={fries} perChar={1.2} style={{ ...type.h2, fontFamily, color: color.brand, opacity: interpolate(frame, [fries, fries + 2], [0, 1], clamp) }} />
      </AbsoluteFill>
    </Pan>
  );
};

const NOTICES = [
  { channel: "App chat", text: "Missing fries. Again." },
  { channel: "Post-visit survey · 2 of 5", text: "Third time this month." },
  { channel: "Website chat", text: "Can someone call me back?" },
  { channel: "Delivery app", text: "Half my order is missing." },
  { channel: "App chat", text: "Is anyone there?" },
  { channel: "Post-visit survey · 1 of 5", text: "Not coming back." },
  { channel: "Website chat", text: "Where do I get a refund?" },
  { channel: "Delivery app", text: "Food arrived cold." },
  { channel: "App chat", text: "Still waiting on a reply." },
  { channel: "Post-visit survey · 2 of 5", text: "Slow and wrong order." },
  { channel: "Delivery app", text: "Wrong drink." },
  { channel: "Website chat", text: "Hello???" },
  { channel: "App chat", text: "Telling my friends." },
  { channel: "Post-visit survey · 1 of 5", text: "Never again." },
];
const spawnAt = (i: number) => Math.round(Math.pow(i / (NOTICES.length - 1), 0.6) * 54);

// 4. "Now they're telling everyone." The complaint multiplies and buries the phone.
export const FloodScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertical = useIsVertical();
  const tint = interpolate(frame, [10, 70], [0, 0.55], clamp);
  return (
    <Pan enter={false} exit={false}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Phone w={vertical ? 520 : 470} h={vertical ? 760 : 820}>
          <Bubble from="guest" delay={-20} size={30} text="My order just arrived and the fries are missing. Again." />
        </Phone>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: color.brandBg, opacity: tint, mixBlendMode: "multiply" }} />
      {NOTICES.map((n, i) => {
        const at = spawnAt(i);
        if (frame < at) return null;
        const fall = spring({ frame: frame - at, fps, config: { damping: 13, mass: 0.8 } });
        const x = width * (0.06 + random(`nx${i}`) * (vertical ? 0.46 : 0.62));
        const y = height * (0.12 + random(`ny${i}`) * 0.68);
        return (
          <div key={i} style={{ position: "absolute", left: x, top: interpolate(fall, [0, 1], [-300, y]), rotate: `${(random(`nr${i}`) - 0.5) * 18}deg` }}>
            <Notice channel={n.channel} text={n.text} w={vertical ? 500 : 500} />
          </div>
        );
      })}
    </Pan>
  );
};

// 5. "Unless someone's already on it." Freeze frame; a steamer basket slides in.
export const FreezeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertical = useIsVertical();
  const grey = interpolate(frame, [0, 6], [0, 0.85], clamp);
  const slide = interpolate(frame, [10, 34], [1, 0], { ...clamp, easing: EASE });
  const basketW = vertical ? 460 : 420;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ filter: `grayscale(${grey}) blur(${grey * 3}px)`, opacity: 1 - grey * 0.35 }}>
        <Freeze frame={sceneLength("flood") - 1}>
          <FloodScene />
        </Freeze>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: width / 2 - basketW / 2, top: (vertical ? height * 0.42 : height * 0.36) + slide * height * 0.8 }}>
        <Steamer w={basketW} />
      </div>
      <Steam x={width / 2} y={vertical ? height * 0.45 : height * 0.4} count={6} spread={120} opacity={0.6} start={20} />
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: vertical ? 480 : 110 }}>
        <span style={{ background: color.ink, borderRadius: 20, padding: "18px 36px" }}>
          <Decode text="Unless someone's already on it." start={cue("freeze-1")} perChar={0.8} style={{ ...type.h3, fontSize: vertical ? 46 : 52, fontWeight: 600, fontFamily, color: color.beige }} />
        </span>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
