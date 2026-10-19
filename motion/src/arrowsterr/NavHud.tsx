import { interpolate, useCurrentFrame } from "remotion";
import { color, type } from "./brand";
import { Compass, FlapCounter } from "./fx";
import { absCue, sceneLength, sceneStart, type Cue, type Scene } from "./timeline";
import { clamp, EASE, useIsVertical } from "./ui";

// The navigation display that boots in "Fix" and rides along until the landing:
// a compass whose needle swings toward each next stop, and a visibility readout.
const LEGS: { scene: Scene; heading: number; next: string }[] = [
  { scene: "meet", heading: 45, next: "See" },
  { scene: "see", heading: 20, next: "Find" },
  { scene: "find", heading: 70, next: "Plan" },
  { scene: "plan", heading: 35, next: "Create" },
  { scene: "create", heading: 60, next: "Ship" },
  { scene: "ship", heading: 90, next: "Shortlist" },
  { scene: "land", heading: 45, next: "Arrived" },
];

// Visibility climbs as each stop finishes its line.
const STEPS: { at: Cue; value: number }[] = [
  { at: "see-1", value: 18 },
  { at: "find-2", value: 34 },
  { at: "plan-1", value: 47 },
  { at: "create-ai", value: 52 },
  { at: "land-rec", value: 60 },
];

export const NavHud: React.FC = () => {
  const frame = useCurrentFrame();
  const vertical = useIsVertical();
  const from = sceneStart("meet");
  const to = sceneStart("land") + sceneLength("land");
  if (frame < from || frame >= to) return null;

  const heading = interpolate(
    frame,
    LEGS.flatMap((l) => [sceneStart(l.scene), sceneStart(l.scene) + 12]),
    LEGS.flatMap((l, i) => [i ? LEGS[i - 1].heading : 45, l.heading]),
    { ...clamp, easing: EASE },
  );
  const leg = [...LEGS].reverse().find((l) => frame >= sceneStart(l.scene)) ?? LEGS[0];
  const done = STEPS.filter((s) => frame >= absCue(s.at) + 20);
  const prev = done.length > 1 ? done[done.length - 2].value : 0;
  const value = done.length ? done[done.length - 1].value : 0;
  // NavHud renders at the root, so frames here are absolute.
  const flipAt = done.length ? absCue(done[done.length - 1].at) + 20 : -1000;
  const fade = interpolate(frame, [to - 10, to], [1, 0], clamp);
  const lift = interpolate(frame, [from, from + 8], [0, 1], { ...clamp, easing: EASE });

  return (
    <div
      style={{
        position: "absolute",
        right: vertical ? 56 : 120,
        top: vertical ? 200 : 64,
        display: "flex",
        alignItems: "center",
        gap: 24,
        opacity: fade * lift,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ ...type.label, fontSize: 26, color: color.ink2 }}>Visibility</span>
          <FlapCounter value={value} from={prev} suffix="%" start={flipAt} size={40} />
        </div>
        <span style={{ ...type.num, fontSize: 22, color: color.signalText }}>next · {leg.next}</span>
      </div>
      <Compass size={120} boot={-1000} heading={heading} />
    </div>
  );
};
