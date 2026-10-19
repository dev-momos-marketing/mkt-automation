# Social specs

Pixel values come from third-party guides that disagree with each other. Check the live
platform pages before locking a template, and update this file when you do.

## Aspect set (one composition each, own layout)

| Ratio | Size | Where |
|---|---|---|
| 9:16 | 1080×1920 | Reels, TikTok, Shorts, LinkedIn mobile, X vertical (master) |
| 4:5 | 1080×1350 | Instagram/Facebook/LinkedIn feed |
| 1:1 | 1080×1080 | LinkedIn, X |
| 16:9 | 1920×1080 | LinkedIn desktop, X, YouTube |

LinkedIn shows vertical ads to mobile only; use 16:9 when targeting desktop.

## Safe zones (9:16)

| Source | Top | Bottom | Left | Right |
|---|---|---|---|---|
| Meta Reels (≈14% / 35% / 6%) | 269 | 672 | 65 | 65 |
| YouTube Shorts ads template | 288 | 672 | 48 | 192 |
| TikTok in-feed (approx.) | 240 | 660 | 120 | 120 |
| **momos composite (use this)** | **288** | **672** | **120** | **192** |

Composite safe box: x 120–888, y 288–1248 (768×960). `theme.ts → safe916`.
Render with `--safe` to see it. On 4:5 keep text away from the top and bottom ~10%
because the Instagram grid previews at 3:4.

## Export

- H.264 MP4, AAC audio, 30fps, CRF 18 (Remotion default for H.264).
- LinkedIn ads: ≤ 200MB, 3s–30min, 15–30s recommended. X organic ≤ 512MB, 2:20.
- Paid B2B spots: 15–30s. Brand and key message inside the first 3s.

## Accessibility

- Nothing flashes more than 3 times per second (WCAG 2.3.1).
- Burned-in captions on every social cut; text contrast ≥ 4.5:1.
