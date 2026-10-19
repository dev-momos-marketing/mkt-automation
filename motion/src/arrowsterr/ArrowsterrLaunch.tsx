import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { color, font } from "./brand";
import { LivingGrid } from "./grid";
import { NavHud } from "./NavHud";
import { Close, Land, Ship } from "./scenes/Finale";
import { Everywhere, Fix, Hook, Shortlist, Zero } from "./scenes/Intro";
import { Meet } from "./scenes/Meet";
import { Create, Find, Plan, See } from "./scenes/Stations";
import { sceneLength, sceneStart, TIMELINE, type Scene } from "./timeline";

// Script: scripts/arrowsterr-launch.md (v4). Scene lengths and every beat come from
// timeline.json, written by scripts/build-arrowsterr-soundtrack.py from the voiceover.
export const ARROWSTERR_DURATION = TIMELINE.total;

const SCENES: [Scene, React.FC][] = [
  ["hook", Hook],
  ["shortlist", Shortlist],
  ["everywhere", Everywhere],
  ["zero", Zero],
  ["fix", Fix],
  ["meet", Meet],
  ["see", See],
  ["find", Find],
  ["plan", Plan],
  ["create", Create],
  ["ship", Ship],
  ["land", Land],
  ["close", Close],
];

// One continuous shot: a living grid underneath, scenes moving across it, and the
// navigation display riding on top from the moment it boots.
export const ArrowsterrLaunch: React.FC = () => (
  <AbsoluteFill style={{ background: color.bg2, fontFamily: font.sans }}>
    <LivingGrid />
    {SCENES.map(([id, Comp]) => (
      <Sequence key={id} name={id} from={sceneStart(id)} durationInFrames={sceneLength(id)}>
        <Comp />
      </Sequence>
    ))}
    <NavHud />
    <Audio src={staticFile("audio/arrowsterr-mix.wav")} />
  </AbsoluteFill>
);
