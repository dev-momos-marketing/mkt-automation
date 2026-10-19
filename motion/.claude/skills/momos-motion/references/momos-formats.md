# momos formats

Formats that fit what momos sells (review management and guest experience for
restaurants). Each one makes real UI the hero. Reuse the kit before building new pieces.

## Review → reply (built: `src/videos/review-reply/`)

A 1-star review lands (problem first), the camera lifts it, momos types the reply, Send.
Then a wide shot of the inbox answering on the off-beats, then the end card.
Kit: `ReviewCard`, `ReplyComposer`, `InboxRow`, `MaskLine`.

## Stat counter

One large number per beat with a source line beneath it. Count up with `enter` easing over
`dur.hero`, tabular figures (`fontVariantNumeric: "tabular-nums"`) so digits don't jitter.
Only real numbers with a named source (case study, dashboard export).

## UI push-in

Screen recording or ported UI; the camera moves to one focal region every 2–3s with
`move` easing, a deliberate cursor, and a short label in the safe box. Crop hard; label big.

## Customer result

Operator quote (real, approved) plus a before/after metric. Likely the strongest format
for B2B: case-study videos out-engage product videos. Needs the customer's sign-off on
name, logo and numbers.

## Rules for every format

- Diner names are invented or anonymised. Restaurant names and logos need permission.
- Reviews shown on screen are illustrative unless sourced; say so in the brief.
- The momos wordmark is set type until a logo SVG is added at `public/brand/logo.svg`.
