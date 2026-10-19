# Social Video Specs, Creative Conventions and Benchmark SaaS Motion (2025-2026)

Research note: the session's egress proxy blocked direct page fetches (WebFetch and curl got 403 / DNS failures for linkedin.com, wistia.com, solidlabs.com and others), so every finding below comes from web-search result summaries of the cited pages, not full-page reads. Official platform help pages (Meta Business Help, ads.tiktok.com, LinkedIn Marketing Solutions, YouTube Help, X Business) did not show up in the search results. Most spec figures therefore come from third-party spec guides, which often disagree. Wherever they conflict, both versions are given. Verify against the live official pages before locking templates.

## 1. Platform technical specs and vertical-video UI safe zones

### Takeaway
One 1080x1920 (9:16) master works for TikTok, Reels, Shorts, LinkedIn mobile and X vertical. Add a 1080x1350 (4:5) cut for the Instagram/Facebook feed and LinkedIn feed, plus 16:9 (1920x1080) for LinkedIn desktop, X, YouTube and CTV. Export H.264 MP4 with AAC audio at 30fps. Platforms don't publish identical safe zones. The template should use a conservative composite safe zone: about 288px top, 672px bottom, 65px left and 192px right on 1080x1920. That leaves roughly an 830-840 x 960px "hero box" in the upper-middle of the frame.

### Cited Findings

**LinkedIn**
- Single-video ads support 16:9, 1:1, 4:5 and 9:16. Vertical ratios are served only to mobile users, so 16:9 is the safe choice if you target desktop and mobile together. — [QuickFrame](https://quickframe.com/blog/linkedin-video-ad-specs); [Shootsta](https://shootsta.com/blog/linkedin-video-ad-specs-and-formats-2026)
- Ads: MP4 only, max 200MB. Length 3 seconds to 30 minutes. H.264 video with AAC audio. 360p minimum, 1080p recommended. 30fps recommended, up to 60fps supported. LinkedIn reportedly recommends 15-30 seconds to qualify for more ad placements. — [QuickFrame](https://quickframe.com/blog/linkedin-video-ad-specs); [Sendspark](https://blog.sendspark.com/linkedin-video-specs); [TheBrief](https://www.thebrief.ai/blog/linkedin-ad-specifications)
- Organic native posts allow much larger files, up to 5GB. The ad cap is 200MB. — [Klap](https://klap.app/blog/linkedin-video-specifications); [PostFast](https://postfa.st/sizes/linkedin/video)
- Carousel video ads: 2-10 cards, 1:1 at 1080x1080. — [TheBrief](https://www.thebrief.ai/blog/linkedin-ad-specifications)
- CTV ads: 16:9 at 1920x1080 minimum, 6-30 seconds. One source gives a 500MB cap, another 200MB (conflict). — [Affect Group](https://affectgroup.com/blog/linkedin-video-ad-sizes-and-specifications/); [Benly](https://benly.ai/learn/linkedin-ads/linkedin-video-ads)
- LinkedIn began testing a dedicated vertical video feed on mobile in March 2024. In February 2025 it extended full-screen vertical video to the web, though TechCrunch said this was "not yet" a full TikTok-style player. — [TechCrunch, Feb 2025](https://techcrunch.com/2025/02/04/linkedin-amps-up-vertical-video-tools-as-uploads-jump-36)
- LinkedIn counts a video view as "two or more continuous seconds of playback while a video is at least 50% visible onscreen". — [TechCrunch](https://techcrunch.com/2025/02/04/linkedin-amps-up-vertical-video-tools-as-uploads-jump-36)

**Instagram / Facebook (Meta)**
- Reels: 1080x1920 (9:16). One source cites Meta's Reels ad spec as recommending 1440x2560. — [Billo](https://billo.app/blog/meta-ads-safe-zones); [AdsUploader](https://adsuploader.com/blog/meta-ads-safe-zones)
- Reels safe zone, widely attributed to Meta's Ads Guide: keep 14% top, 35% bottom and 6% each side clear. On 1080x1920 that is about 269px top, 672px bottom and 65px per side. — [Inro](https://www.inro.social/tools/instagram-reels-safe-zone-checker); [AdNova](https://adnova.ai/blogs/meta-ad-safe-zones-guide); [PostPlanify](https://postplanify.com/blog/social-media-safe-zones-2026-complete-guide)
- Conflict: one guide says Meta unified the Stories and Reels 9:16 safe zone in March 2026 and gives the bottom as a 20-35% range. Another gives Stories 20% bottom against Reels 35%. Another reports that Meta's help article only requires ads with disclaimers to keep the bottom 40% clear. — [Billo](https://billo.app/blog/meta-ads-safe-zones); [House of Marketers](https://houseofmarketers.com/guide-to-safe-zones-tiktok-facebook-instagram-stories-reels/); [AdsUploader](https://adsuploader.com/blog/meta-ads-safe-zones)
- Feed: 4:5 at 1080x1350 is still the best-performing feed ratio, and uploads are capped at 1080 wide x 1350 tall. In 2025 the profile grid moved to 3:4 previews, so the grid crops the edges of 4:5 posts and Reels covers. Keep text and logos away from the top and side edges. — [Metricool](https://metricool.com/instagram-image-size/); [Planoly](https://www.planoly.com/blog/guide-to-instagrams-new-vertical-grid.md); [Pixis](https://pixis.ai/blog/instagram-sponsored-posts-sizes-specs-creative-tips/)
- Reels length: Adam Mosseri announced the move to 3 minutes (180s) in January 2025. One guide claims uploads up to 20 minutes, with Instagram saying Reels over 3 minutes won't be recommended to new audiences. That claim is unverified. — [Motiongility](https://motiongility.com/instagram-video-length/); [PostFast](https://postfa.st/sizes/instagram/reels/2025)

**TikTok**
- In-Feed: 1080x1920 at 9:16, MP4 or MOV, minimum 720x1280. Most guides give a 500MB ad file cap. Another lists 287MB on iOS and 72MB on Android, which is probably the organic app upload limit. — [AdManage](https://admanage.ai/blog/tiktok-ad-specs); [Benly](https://benly.ai/learn/tiktok-ads/tiktok-ad-specs); [Sovran](https://sovran.ai/blog/tiktok-video-ad-specs)
- Bitrate guidance (third-party, not official): 4,000-6,000 kbps at 1080p, H.264. — [Sovran](https://sovran.ai/blog/tiktok-video-ad-specs)
- Safe zones conflict. One guide keeps the top and bottom 120px clear. Another says the lower ~340px must stay clear for the CTA button. Solidlabs lists In-Feed ads at 240px top, 660px bottom and 120px each side. — [Sovran](https://sovran.ai/blog/tiktok-video-ad-specs); [Moda](https://moda.app/resources/sizes/tiktok-ad); [Solidlabs (via search)](https://www.solidlabs.com/social-safe-zones)

**YouTube Shorts**
- Max length is 3 minutes, raised from 60s in October 2024. Shorts must be vertical or square. Anything wider, or longer than 3 minutes, is filed as a regular video. — [Riverside](https://riverside.com/blog/how-long-can-youtube-shorts-be); [PostLink](https://postlinkapp.com/blog/how-long-can-youtube-shorts-be); [Piktochart](https://piktochart.com/blog/how-long-youtube-shorts/)
- Content ID or music caveat (single source, unverified): a Short over 1 minute with a Content ID claim is blocked worldwide. — [Blitzcut](https://blitzcutai.com/blog/youtube-shorts-length-limits-2026)
- YouTube publishes no organic Shorts safe zone. Google's template for vertical YouTube video ads (covers Shorts ads) keeps the top 288px, bottom 672px, left 48px and right 192px of 1080x1920 free of text and logos, leaving an 840x960 safe box. Other tools give top 180 / bottom 350-390 / left 40-60 / right 120. The right-hand action rail is the highest-risk area. — [AdCheckLab](https://adchecklab.com/articles/youtube-shorts-safe-area-dimensions); [Revid](https://www.revid.ai/youtube-shorts-safe-zone); [YouTubeToolkit](https://www.youtubetoolkit.com/blog/youtube-shorts-dimensions)

**X (Twitter)**
- Organic (non-Premium): 512MB, 140s (2:20), MP4 or MOV. Ratios 16:9, 1:1 and 9:16, with 1920x1080 recommended for landscape. — [PostFast](https://postfa.st/sizes/x/video); [Sendcove](https://www.sendcove.app/integrations/twitter/video-specs)
- Premium limits conflict between sources: 8GB vs 16GB, and 2h, 3h or 4h. Android is capped at 10 minutes. — [PostEverywhere](https://posteverywhere.ai/blog/x-twitter-aspect-ratios); [Moda](https://moda.app/resources/sizes/twitter-video)
- Ads: MP4 or MOV, up to 1GB, max 2:20 (15s recommended). 16:9 (1920x1080), 1:1 (1200x1200) or 9:16 (1080x1920). Files around 30MB are recommended. — [Vizup](https://www.tryvizup.com/blog/x-ad-specs-2026-image-video-and-carousel-sizes)

**Cross-platform composite safe zone**
- Guides suggest designing to the most restrictive zone. Suggested central boxes: 835x979, 900x1400 and 900x1160px. — [PostPlanify](https://postplanify.com/blog/social-media-safe-zones-2026-complete-guide); [Syllaby](https://syllaby.io/blog/aspect-ratios-safe-zones-shorts-reels-tiktok/); [FrameExtractor](https://frameextractor.video/blog/social-video-sizes/)

### Inferences
- Template safe zone for one 1080x1920 master: the union of Meta Reels (269/672/65/65), the Google Shorts ad template (288/672/48/192) and TikTok In-Feed (240/660/120/120). That gives about 288px top, 672px bottom, 120px left and 192px right, so the safe box spans x 120-888 and y 288-1248 (about 768x960). Put headline, product UI focal point and logo inside it. Captions go in the lower part of that box (around y 1000-1240), not in the bottom 672px where platform captions, usernames and CTAs sit.
- A practical master set for momos: 9:16 1080x1920 (Reels, TikTok, Shorts, LinkedIn mobile), 4:5 1080x1350 (IG/FB feed, LinkedIn feed), 1:1 1080x1080 (LinkedIn carousel, X) and 16:9 1920x1080 (LinkedIn desktop, X, YouTube, CTV). Keep the 4:5 version 3:4-safe by keeping text away from the top and bottom ~45px, so the 3:4 grid crop (1080x1440 from a 1350-tall frame, or the equivalent) doesn't cut it.
- Export: H.264 High profile MP4 with AAC 48kHz, 30fps (60fps only for fast UI scrolls), and 1080p at about 8-12 Mbps keeps 15-60s files well under every ad cap. The 200MB LinkedIn ad cap is the binding limit. The bitrate is inferred from the caps; no platform states it.

### Gaps
- No official Meta, TikTok, LinkedIn, YouTube or X spec page could be read directly (fetch blocked, not in search results). All pixel safe zones are third-party transcriptions. TikTok's are the least consistent.
- Whether Meta actually unified the Stories and Reels safe zones in March 2026 is unverified (single source).
- No source gave an official LinkedIn vertical-video UI safe zone.
- No confirmed max length for Meta Reels ads (sources say anywhere from 15 minutes to 30s for Stories).

## 2. Creative conventions that perform (hook, length, captions, text, pacing, CTA, branding)

### Takeaway
Design sound-off first with burned-in or animated captions. Put the brand or key message and a moving first frame in the first 1-3 seconds. Keep paid B2B spots at 15-30s and organic product clips at about 30-90s. Show one idea per scene in short phrases. End on a repeatable line plus CTA. Several widely quoted stats (47% of value in the first 3s, 85% watched muted) are old (about 2016) and should not be presented as current.

### Cited Findings
- Meta's Instagram video ad best practices: feature the brand and key message within the first three seconds, use motion or a compelling visual in the first frame, and design for sound off. — [Benly (summarising Meta guidance)](https://benly.ai/learn/meta-ads/video-ads-guide); [Coinis](https://coinis.com/how-to/first-3-seconds-facebook-video-ad)
- The "47% of ad value in the first 3 seconds" figure traces to a Facebook-Nielsen study from around 2016. The "85% of Facebook video watched with sound off" figure is a 2016 publisher-reported number (Digiday), not a current Meta metric. — [BrandRocket](https://www.brandrocket.net/resources/your-video-ad-has-to-work-with-the-sound-off-then-it-has-to-work-better-with-it); [Influencers-Time](https://www.influencers-time.com/silent-subtitled-video-the-format-winning-sound-off-feeds/)
- Captioned video ads reportedly earn about 12% more average view time than the same ads without captions (Meta research via 3Play Media; original not verified). — [BrandRocket](https://www.brandrocket.net/resources/your-video-ad-has-to-work-with-the-sound-off-then-it-has-to-work-better-with-it)
- Counterpoint: one source cites a 2.25x higher CTA click-through when feed video ads are watched with sound on (unverified; the source warns against planning around it). The video should work muted, then work better with sound. — [BrandRocket](https://www.brandrocket.net/resources/your-video-ad-has-to-work-with-the-sound-off-then-it-has-to-work-better-with-it)
- LinkedIn: guides say a large share of members watch with sound off. Hook guidance ranges from the first 6 seconds to the first 3-10 seconds. Recommended conversion ad length is 15-30s, and 30-45s for testimonial ads. An internal LinkedIn study is cited as showing ads under 30s get completion rates up to +200% (study not located). — [Factors.ai](https://www.factors.ai/blog/linkedin-video-ads-best-practices); [ZenABM](https://zenabm.com/blog/linkedin-video-ads-best-practices); [Goldcast](https://www.goldcast.io/blog-post/linkedin-video-guide-best-practices)
- B2B: "a video that shares a sharp industry insight or walks through a real customer result will outperform a flashy brand spot almost every time" (vendor opinion). — [Stackmatix](https://www.stackmatix.com/blog/linkedin-video-marketing-b2b)
- Vidyard benchmark, reported secondhand: case-study videos average a 36% engagement rate against 23% for classic product videos. — [Brixon Group](https://brixongroup.com/en/?p=6417)
- Wistia's State of Video report: 8 in 10 teams say LinkedIn is their primary place to share video, ahead of YouTube. A 572% rise in caption usage since 2021 is attributed to Wistia's 2025 report (secondhand). — [Wistia](https://wistia.com/stateofvideo); [Goldcast](https://goldcast.io/blog-post/closed-captioning-on-video)
- LinkedIn video momentum: video uploads +34% YoY (fiscal Q4 2024), video viewership +36% YoY (fiscal Q1 2025). Video gets 1.4x the engagement of other posts (Axios). — [TechCrunch](https://techcrunch.com/2025/02/04/linkedin-amps-up-vertical-video-tools-as-uploads-jump-36); [Axios](https://www.axios.com/2025/02/04/linkedin-video-update-tiktok-alternative)
- Launch videos: the best get "one idea on screen within the first five seconds", run 35-90s, and "end on a line people can repeat". — [ContentCabinet](https://www.contentcabinet.in/insights/product-launch-video-examples)
- Kinetic type: limit the number of animated words on screen at once. Show short phrases one at a time so each gets weight. — [Todaymade](https://www.todaymade.com/blog/kinetic-typography-examples)
- Captions on vertical video: no settled standard. Limecraft suggests 25 characters per line maximum (29 hard limit). Happy Scribe uses a 32-character cap on portrait video. Nimdzi notes 33-37 character lines tested fine. Keep to 1-2 lines. Use a plain sans-serif in mixed case (not all caps) with a dark outline, shadow or plate for contrast, and test on real phones. — [Nimdzi](https://www.nimdzi.com/subtitling-vertical-videos-guidelines-where-art-thou/); [Limecraft](https://support.limecraft.com/support/solutions/articles/48001169202); [Happy Scribe](https://help.happyscribe.com/en/articles/6226298-my-video-is-in-portrait-mode-and-shows-three-lines-instead-of-two); [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/?p=3272)
- Ad text on Meta images and video: heavy text overlays may reduce reach (guide claim). — [Pixis](https://pixis.ai/blog/instagram-sponsored-posts-sizes-specs-creative-tips/)

### Inferences
- Template timing for a 15-30s paid cut: 0-1.5s pattern-interrupt visual (moving UI or a big review-star stat), plus the problem line. By 3s, momos logo or wordmark visible (small, top-safe area) and the promise stated. 3-20s, 2-4 single-idea beats, about 2-4s each. Final 3-5s, repeatable line plus CTA plate inside the safe box (not the bottom 672px, where native CTA buttons sit).
- Caption style: about 25-32 characters per line, max 2 lines, sentence case, about 56-72px type on a 1080-wide frame (sized for roughly 2-3% of frame height; inferred, as no source gives a px size), with a contrast plate or outline. Captions sit just above the bottom 672px.
- For loops on Reels/TikTok, have the last frame match the first so replays look seamless. This is common practice; I found no metric for it.

### Gaps
- No primary-source 2025-26 data on the share of muted viewing on LinkedIn or Instagram.
- No official guidance on on-screen text px sizes for mobile vertical video.
- No current data on loop or rewatch effects for B2B content.

## 3. Product-led motion (UI as hero, cursor and zoom, stats counters, testimonial/review cards)

### Takeaway
The proven pattern is real (or cleaned-up) UI as the hero. The camera pushes into one focal area at a time with a deliberate cursor, then labels or callouts appear, then the output is revealed, then the benefit plus CTA. On mobile, crop hard into the UI and use large labels, because full-screen dashboards are unreadable at 9:16.

### Cited Findings
- Reusable structure: show the workflow goal, bring in the UI with one focal area, animate the key action, reveal the output, then close with benefit plus CTA. Core techniques are zoomed callouts, cursor motion, feature labels and output reveals. — [Hera](https://hera.video/blog/ui-animation-video-for-software-marketing); [Hera use case](https://hera.video/use-cases/ui-animation-videos)
- Use real UI when it is clean and readable. Use simplified mockups when the real screen is too dense or confidential. For mobile, use zoomed sections, large labels and fewer details per frame. Cursor movement should clarify, not distract. — [Hera](https://hera.video/blog/ui-animation-video-for-software-marketing)
- Client briefs commonly ask for clean overlays, animated callouts and gentle zooms rather than busy pop-ups, and for the video to be understandable without sound. — [Freelancer brief](https://www.freelancer.com/projects/video-editing/saas-product-walkthrough-animation); [Freelancehunt brief](https://freelancehunt.com/en/project/saas-promo-video-motion-design/1627100.html)
- Lago (citing Linear's films as its reference) avoids abstract 3D shapes and shows the real product, "the camera moves through the real product, one action at a time". — [Lago blog](https://getlago.com/blog/we-killed-our-motion-design-job)
- Linear's demo "drops the viewer directly into the product and lets the interface speak for itself". — [Superside](https://www.superside.com/blog/saas-video-examples)
- Customer-result content outperforms product-only content: per the secondhand Vidyard figures, case-study video engagement was 36% against 23% for product videos. — [Brixon Group](https://brixongroup.com/en/?p=6417)
- Caution: advids.co claims a 22.5% lift in demo-request conversion and 40% less cognitive load from animated UI demos, with no citation. Do not use. — [Advids](https://advids.co/blog/30-inspiring-animated-ui-demo-video-examples-for-product-showcase)

### Inferences
- momos-specific formats for templates (inferred from the patterns above plus momos' category):
  1. **Review-card stack**: Google, Yelp and TripAdvisor-style review cards slide in, star rating counts up, then an AI-drafted reply types out in the momos UI. This combines the testimonial and product-demo patterns.
  2. **Stat counter**: one large number (e.g. rating 4.1 to 4.6, response time, reviews answered) counting up inside the safe box, with a one-line source caption. One stat per beat.
  3. **UI push-in**: a dashboard crop, a cursor click, a callout label, then the result (e.g. sentiment by location). Max 1 focal region per 2-3s.
  4. **Customer result clip**: restaurant operator quote card (name, venue, logo) plus a before/after metric. Per the Vidyard data, likely the strongest B2B format.
- Anonymise or recreate guest names and reviews in UI captures (the "simplified mockups when confidential" guidance applies to real diner data).

### Gaps
- No primary data found on stat-counter or review-card formats specifically.
- No case studies of restaurant-tech or review-management SaaS motion found.

## 4. Benchmark brands and motion studios

### Takeaway
The common traits are restraint and product truth. Real interfaces are lit and cropped dramatically, one idea per beat, minimal narration, dark-mode polish, short runtimes (about 30-90s), and a single memorable closing line. Stripe treats motion as a documented brand system. Studio names are only partly verified: Buck, Giant Ant, Ordinary Folk and ManvsMachine are real, top-tier motion studios. "Pixel Pirates" doesn't appear to be a SaaS motion studio.

### Cited Findings
**Brands**
- **Linear**: short, dark-mode feature reels with minimal narration. A 45-90s per-release format is claimed by a vendor (unverified). The product UI does the persuading. — [Arcade](https://www.arcade.software/post/product-launch-video-examples); [Superside](https://www.superside.com/blog/saas-video-examples)
- **Linear (secondhand)**: uses an in-house design team for its films. Lago's team modelled their own launch films on Linear's real-product, one-action-at-a-time camera approach. — [Lago](https://getlago.com/blog/we-killed-our-motion-design-job)
- **Raycast**: a 39-second teaser of "cropped, dark fragments, a glowing search bar and a grid of emoji tiles", which are real interface pieces "lit for drama". — [ContentCabinet](https://www.contentcabinet.in/insights/product-launch-video-examples)
- **Vercel**: the homepage demo is built around speed. A code change goes to Git and the live site updates almost instantly. — [Superside](https://www.superside.com/blog/saas-video-examples)
- **Stripe**: keynote films move away from talking heads, and camera work keeps the energy high. Developer-feature videos use a confident voiceover to make technical content feel premium. — [Superside](https://www.superside.com/blog/saas-video-examples); [Moonb](https://www.moonb.io/blog/product-launch-video)
- **Stripe (primary, job listings)**: "motion is central to how the brand comes alive". The roles build "motion frameworks" at the point where design systems meet cinematic storytelling, meant to scale while feeling deliberate and human, across the Stripe and Link brands. — [Stripe jobs: Motion Designer, Brand Advertising](https://stripe.com/jobs/listing/motion-designer-brand-advertising/7355932); [Stripe jobs: Motion Designer 3D](https://stripe.com/jobs/listing/motion-designer-3d-brand-advertising/6615479)
- **Arc (The Browser Company)**: the 1.0 launch film is about 34 seconds and emotionally framed. — [Arcade](https://www.arcade.software/post/product-launch-video-examples)
- Caveat: most "best SaaS video" lists come from agencies or tools that sell production (Arcade, Superside, What A Story, Advids), so they have an incentive to praise high-production work. — [Superside](https://www.superside.com/blog/saas-video-examples); [What A Story](https://www.whatastory.agency/blog/saas-explainer-video-examples)

**Studios (verification)**
- **Buck**: clients include Apple, Meta, Nike, Google and Airbnb (press release). — [PR Newswire, RESIDENCE](https://www.prnewswire.com/news-releases/introducing-residence-a-group-of-multidisciplinary-companies-empowering-the-creative-community-301641320.html); [MediaPost](https://www.mediapost.com/publications/article/378495/seven-creative-agencies-firms-unite-to-form-resi.html)
- **Giant Ant** (Vancouver): clients include Google, Airbnb, Cartoon Network and Warner Bros. Its own site highlights OpenTable (restaurant tech, a relevant reference) and Duolingo. — [Giant Ant](https://www.giantant.ca/); [Motion Hatch podcast](https://motionhatch.com/098-how-giant-ant-became-a-leading-motion-design-studio-jay-grandin)
- **Ordinary Folk**: a motion design and animation studio whose work includes a Google Doodle, Procreate Dreams, Webflow and Google Gemini projects. Search summaries describe it as Vancouver-based; unconfirmed. — [Webflow showcase](https://webflow.com/made-in-webflow/website/ordinaryfolk-71c8fb); [School of Motion podcast](https://schoolofmotion.com/blog/ordinary-folk-podcast)
- **ManvsMachine**: London design and motion studio founded in 2007, won a Cannes Gold Lion (More4 rebrand). — [Watch the Titles](https://www.watchthetitles.com/studio/manvsmachine); [CB Insights](https://www.cbinsights.com/company/manvsmachine/alternatives-competitors)
- **"Pixel Pirates"**: the only match is "Pixel Pirate Studio", an LA 2D/3D animation studio for film, series, commercials and music videos with its own lip-sync software (UNOMi). It is not a known SaaS motion studio, so likely not the intended reference. — [Riipen listing](https://app.riipen.com/companies/1zE7d8VY)
- **SaaS-specialist studios** surfaced instead: Motion The Agency (London, founded 2019; B2B SaaS explainers and launches for Hyperexponential and Primer), Cadro (Emarsys) and Klingit (Domino Data Lab, Anyscale). — [Motion The Agency](https://www.motiontheagency.com/llms.txt); [Advids directory](https://advids.co/agencies/top-motion-design-studios-london-united-kingdom)

### Inferences
- Traits to encode in momos templates: a restrained palette and a single typeface family; real UI cropped tight and lit or glowing against a dark or neutral backdrop; one action per shot; short phrases that appear one at a time; minimal or no VO with captions carrying the story; and a closing line plus logo lockup. Avoid abstract 3D unless it explains something.
- Giant Ant's OpenTable work is the closest category-adjacent studio reference for a restaurant SaaS.

### Gaps
- No primary design write-ups from Linear, Raycast, Framer, Notion, Ramp, Rippling or Apple on their launch-video process, easing or typography were found. Framer, Notion, Ramp, Rippling and Apple have no sourced findings at all.
- Studio client lists are self-reported or from directories. No Slack work confirmed for any named studio.
- No engagement data was found for specific launch videos beyond anecdotal mentions.

## 5. Accessibility (flashing, reduced motion, caption contrast)

### Takeaway
Hard rule: nothing flashes more than 3 times per second (WCAG 2.3.1, Level A). On the web, honour prefers-reduced-motion by not autoplaying looping video and by offering static fallbacks. Captions need strong contrast (WCAG 1.4.3, 4.5:1 for normal text) on a plate or outline. Pre-recorded video with audio needs captions (WCAG 1.2.2).

### Cited Findings
- WCAG 2.3.1 Three Flashes or Below Threshold (Level A): content must not flash more than three times in any one-second period. Flashing beyond that is a Level A failure. — [Yale Usability](https://usability.yale.edu/digital-accessibility/accessibility-resources/accessibility-articles/animated-content-and-timing); [dock.codes WCAG 2.3.1](https://wcag.dock.codes/rewrite/en/wcag231)
- Passiro describes a stricter "2.3.2 Three Flashes" at Level AAA. The search summary flagged this as mismatching the spec, but from background knowledge WCAG 2.x does include 2.3.2 Three Flashes (AAA: no more than 3 flashes per second regardless of threshold), so the label is likely correct. Verify on w3.org. — [Passiro](https://passiro.com/web-accessibility/designers/animation-motion)
- WCAG 2.3.3 Animation from Interactions (AAA) covers motion triggered by user actions, which should be possible to disable unless essential. Automatic motion falls under 2.2.2 Pause, Stop, Hide. — [Deque University](https://dequeuniversity.com/resources/wcag2.1/2.3.3-animations-from-interactions); [Passiro](https://passiro.com/web-accessibility/designers/animation-motion)
- `prefers-reduced-motion` is the standard way to honour the OS "reduce motion" setting, which Windows, macOS, iOS and Android label differently. A suggested extension: don't autoplay muted looping video when it is set. — [Drupal issue](https://www.drupal.org/node/2928103); [specification.website](https://specification.website/spec/accessibility/reduced-motion.md); [A11y Collective](https://www.a11y-collective.com/blog/wcag-animation/)
- Contrast: 1.4.3 Contrast (Minimum) applies to text in animation that may lose readability. — [Yale Usability](https://usability.yale.edu/digital-accessibility/accessibility-resources/accessibility-articles/animated-content-and-timing)
- Caption legibility: sans-serif, mixed case, dark outline, shadow or background for contrast. — [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/?p=3272); [Harvard Mass Eye and Ear (fonts)](https://face.meei.harvard.edu/font-for-subtitle/12-best-fonts-for-subtitles-and-closed-captions-on-video)

### Inferences
- Template guardrails: no strobe or flash transitions faster than 3 per second (watch fast "glitch" cuts and flashing notification dots). Avoid large-area saturated-red flashes. Caption plates at 4.5:1 or better contrast. When videos are embedded on momos.com, wrap autoplay loops in `prefers-reduced-motion: reduce` and show a poster frame. Also upload SRT or VTT caption files where platforms accept them (LinkedIn and YouTube do), not just burned-in captions, so captions are both accessible and indexable.
- The 4.5:1 ratio and the 1.2.2 captions requirement come from WCAG 2.x general knowledge. The search results didn't directly confirm them, so verify on w3.org.

### Gaps
- Search results didn't directly cover WCAG 1.2.2 (captions, prerecorded) or the 4.5:1 / 3:1 contrast values; these come from background knowledge of WCAG 2.x.
- No guidance found on applying the general flash threshold and red-flash rules to mobile vertical video specifically (the area-based thresholds were defined for a 1024x768 screen at a typical viewing distance).
