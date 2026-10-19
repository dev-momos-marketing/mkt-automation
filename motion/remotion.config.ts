// See https://www.remotion.dev/docs/config
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// WebGL effects (light leaks) need a GPU-backed GL renderer.
Config.setChromiumOpenGlRenderer("angle");
