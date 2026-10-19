import "./brand/fonts";
import { Composition, Folder } from "remotion";
import { color } from "./brand/theme";
import { InboxRow } from "./kit/InboxRow";
import { ReplyComposer } from "./kit/ReplyComposer";
import { ReviewCard } from "./kit/ReviewCard";
import { EndCardScene } from "./videos/review-reply/EndCardScene";
import { ReviewReply } from "./videos/review-reply/ReviewReply";
import { ReviewScene } from "./videos/review-reply/ReviewScene";
import { ScaleScene } from "./videos/review-reply/ScaleScene";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ReviewReply-9x16"
        component={ReviewReply}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={420}
        defaultProps={{ showSafeZone: false }}
      />
      <Folder name="ReviewReply-scenes">
        <Composition
          id="ReviewScene"
          component={ReviewScene}
          width={1080}
          height={1920}
          fps={30}
          durationInFrames={240}
          defaultProps={{ style: { backgroundColor: color.cream } }}
        />
        <Composition
          id="ScaleScene"
          component={ScaleScene}
          width={1080}
          height={1920}
          fps={30}
          durationInFrames={120}
          defaultProps={{ style: { backgroundColor: color.cream } }}
        />
        <Composition
          id="EndCardScene"
          component={EndCardScene}
          width={1080}
          height={1920}
          fps={30}
          durationInFrames={60}
          defaultProps={{ style: { backgroundColor: color.cream } }}
        />
      </Folder>
      <Folder name="Kit">
        <Composition
          id="ReviewCard"
          component={ReviewCard}
          width={1080}
          height={1920}
          fps={30}
          durationInFrames={60}
          defaultProps={{
            author: "Alex M.",
            source: "Google review · 2 min ago",
            rating: 1,
            text: "Waited 40 minutes for our mains. Lovely staff, slammed kitchen.",
            starPopAt: 10,
            style: { position: "absolute", left: 180, top: 700 },
          }}
        />
        <Composition
          id="ReplyComposer"
          component={ReplyComposer}
          width={1080}
          height={1920}
          fps={30}
          durationInFrames={150}
          defaultProps={{
            label: "momos drafted a reply",
            reply: "So sorry, Alex.\nFriday got away from us.\nDessert's on the house.",
            typeAt: 10,
            sendAt: 110,
            style: { position: "absolute", left: 180, top: 700 },
          }}
        />
        <Composition
          id="InboxRow"
          component={InboxRow}
          width={1080}
          height={1920}
          fps={30}
          durationInFrames={60}
          defaultProps={{
            rating: 5,
            snippet: "Best laksa in town, and the team remembered us.",
            repliedAt: 15,
            style: { position: "absolute", left: 180, top: 900 },
          }}
        />
      </Folder>
    </>
  );
};
