import { Audio } from "@remotion/media";
import { Sequence, staticFile } from "remotion";
import voiceover from "./voiceover.json";

// Each line plays from the frame it's pinned to. Regenerate the audio with
// scripts/generate-voiceover.py after editing voiceover.json.
export const Voiceover: React.FC = () => (
  <>
    {voiceover.lines.map((line) => (
      <Sequence key={line.id} name={`VO ${line.id}`} from={line.at} layout="none">
        <Audio src={staticFile(`voiceover/alfie/${line.id}.wav`)} />
      </Sequence>
    ))}
  </>
);
