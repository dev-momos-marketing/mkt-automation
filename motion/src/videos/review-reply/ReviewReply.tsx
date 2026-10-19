import type React from "react";
import { AbsoluteFill, Track, useVideoConfig } from "remotion";
import { color } from "../../brand/theme";
import { SafeZoneOverlay } from "../../kit/SafeZoneOverlay";
import { EndCardScene } from "./EndCardScene";
import { ReviewScene } from "./ReviewScene";
import { ScaleScene } from "./ScaleScene";

export type ReviewReplyProps = {
  readonly showSafeZone: boolean;
};

// 14s 9:16 social ad, cut to a 120 BPM grid (2 beats per second, so scene
// boundaries sit on whole or half seconds). Hard cuts land on beats 16 and 24.
export const ReviewReply: React.FC<ReviewReplyProps> = ({ showSafeZone }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: color.cream }}>
      <Track name="Scenes">
        <ReviewScene name="Review" durationInFrames={8 * fps} style={{ backgroundColor: color.cream }} />
        <ScaleScene name="Scale" from={8 * fps} durationInFrames={4 * fps} style={{ backgroundColor: color.cream }} />
        <EndCardScene name="End card" from={12 * fps} durationInFrames={2 * fps} style={{ backgroundColor: color.cream }} />
      </Track>
      {showSafeZone ? <SafeZoneOverlay /> : null}
    </AbsoluteFill>
  );
};
