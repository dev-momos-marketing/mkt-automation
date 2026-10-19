import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { color, font } from "./brand";
import { LivingGrid } from "./grid";
import { Close, Land, Ship } from "./scenes/Finale";
import { Ask, Engines, Invisible, Navigator, Shortlist } from "./scenes/Intro";
import { Meet } from "./scenes/Meet";
import { Create, Find, Plan, See } from "./scenes/Stations";
import { sceneLength, sceneStart, TIMELINE, type Scene } from "./timeline";

// Script: scripts/arrowsterr-launch.md (v3). Scene lengths and every beat come from
// timeline.json, written by scripts/build-arrowsterr-soundtrack.py from the voiceover.
export const ARROWSTERR_DURATION = TIMELINE.total;

const SCENES: [Scene, React.FC][] = [
  ["ask", Ask],
  ["shortlist", Shortlist],
  ["engines", Engines],
  ["invisible", Invisible],
  ["navigator", Navigator],
  ["meet", Meet],
  ["see", See],
  ["find", Find],
  ["plan", Plan],
  ["create", Create],
  ["ship", Ship],
  ["land", Land],
  ["close", Close],
];

// One continuous shot: a living grid underneath, scenes panning across it.
export const ArrowsterrLaunch: React.FC = () => (
  <AbsoluteFill style={{ background: color.bg2, fontFamily: font.sans }}>
    <LivingGrid />
    {SCENES.map(([id, Comp]) => (
      <Sequence key={id} name={id} from={sceneStart(id)} durationInFrames={sceneLength(id)}>
        <Comp />
      </Sequence>
    ))}
    <Audio src={staticFile("audio/arrowsterr-mix.wav")} />
  </AbsoluteFill>
);
