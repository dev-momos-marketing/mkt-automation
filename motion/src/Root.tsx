import { Composition } from "remotion";
import { ALFIE_DURATION, AlfieLaunch } from "./alfie/AlfieLaunch";
import { ARROWSTERR_DURATION, ArrowsterrLaunch } from "./arrowsterr/ArrowsterrLaunch";
import { NIGHT_SHIFT_DURATION, NightShift } from "./alfie3/NightShift";
import { MomosPromo, momosPromoSchema } from "./MomosPromo";

const defaultProps = {
  headline: "Turn every guest review into revenue",
  features: [
    "Reply to reviews in seconds",
    "Spot issues across every outlet",
    "Grow repeat visits",
  ],
  cta: "Book a demo",
  url: "momos.com",
  brandColor: "#5B3DF5",
  accentColor: "#FFB547",
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AlfieNightShift"
        component={NightShift}
        durationInFrames={NIGHT_SHIFT_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="AlfieNightShiftVertical"
        component={NightShift}
        durationInFrames={NIGHT_SHIFT_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="ArrowsterrLaunch"
        component={ArrowsterrLaunch}
        durationInFrames={ARROWSTERR_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ArrowsterrLaunchVertical"
        component={ArrowsterrLaunch}
        durationInFrames={ARROWSTERR_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="AlfieLaunch"
        component={AlfieLaunch}
        durationInFrames={ALFIE_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="AlfieLaunchVertical"
        component={AlfieLaunch}
        durationInFrames={ALFIE_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="MomosPromo"
        component={MomosPromo}
        schema={momosPromoSchema}
        defaultProps={defaultProps}
        durationInFrames={240}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="MomosPromoSquare"
        component={MomosPromo}
        schema={momosPromoSchema}
        defaultProps={defaultProps}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1080}
      />
    </>
  );
};
