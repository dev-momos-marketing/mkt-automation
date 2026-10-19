import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import { font } from "./theme";

// loadFont() holds the render until the font is ready, so frames never capture a fallback face.
// Import this module from every scene or element that sets type, so connected
// compositions render correctly when opened on their own.
const weights = [
  ["Regular", font.regular],
  ["Medium", font.medium],
  ["SemiBold", font.semibold],
  ["Bold", font.bold],
] as const;

for (const [file, weight] of weights) {
  loadFont({
    family: font.family,
    url: staticFile(`fonts/Poppins-${file}.ttf`),
    weight: String(weight),
  });
}

export const fontFamily = `${font.family}, sans-serif`;
