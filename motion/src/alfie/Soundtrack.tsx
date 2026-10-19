import { Audio } from "@remotion/media";
import { staticFile } from "remotion";

// Voiceover + original music, mixed and ducked by scripts/build-soundtrack.py.
export const Soundtrack: React.FC = () => <Audio src={staticFile("audio/alfie-mix.wav")} />;
