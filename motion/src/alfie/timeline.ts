// Generated timing: scripts/build-soundtrack.py measures the voiceover and writes
// timeline.json. Scenes read it so animation beats land on the spoken words.
import timeline from "./timeline.json";

export type Scene = keyof typeof timeline.scenes;
export type Cue = keyof typeof timeline.cues;

export const TIMELINE = timeline;

// Scene-relative frame where a voiceover phrase starts.
export const cue = (id: Cue) => timeline.cues[id].at;

export const sceneLength = (scene: Scene) => timeline.scenes[scene].length;
