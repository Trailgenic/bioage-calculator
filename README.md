# TrailGenic — Trail-Derived Biological Age Calculator

Estimates trail-derived biological age from a single hike. VO₂max is estimated
from grade-adjusted effort vs heart-rate reserve, age-graded against population
reference curves, then pooled with resting HR and HRV. **Hiking modality only (v1).**

## Why it reads true
Calibrated on the 25-session World Model dataset:
- Mechanics VO₂max estimator: median **45.4** across recent sessions vs Garmin **46**,
  derived without seeing the device number.
- Pooled bio-age reproduces the published **32–40** band against chronological age 53,
  with no constant forced.
- Pure VO₂max age-grading would read mid-20s; pooling autonomic markers (resting HR,
  HRV) — excellent-for-age, not elite-youthful — moderates it to the mid-30s. That's
  the honest result the copy states explicitly.

## Files
| File | Role |
|---|---|
| `methodology.js` | Pure scoring logic, no DOM. **Reused as-is by the MCP tool.** |
| `widget.js` | Builds the UI, calls methodology, renders. |
| `styles.css` | Scoped under `#tg-bioage`. |
| `index.html` | Standalone page for `tools.trailgenic.com/bioage` + WebApplication JSON-LD. |
| `webflow-embed.html` | The ~300-byte snippet to paste into Webflow. |

## Architecture
GitHub repo → Cloudflare static host (`tools.trailgenic.com/bioage`) → thin Webflow embed.
The calculator never lives inside Webflow; you ship updates by pushing to this repo.

## Deploy (Claude Code pass — steps that need Cloudflare/DNS/Webflow)
1. `Trailgenic/bioage-calculator` — push these files to `main`.
2. **Cloudflare Pages**: connect the repo, build command none, output dir `/`.
   Add custom domain `tools.trailgenic.com` (or route `/bioage` on the existing
   Worker). Reuse the WAF rules already solved for `mcp.trailgenic.com` so the
   static assets aren't bot-challenged.
3. **Verify** `https://tools.trailgenic.com/bioage` renders and lands on the
   prefilled 06/06 session at bio-age midpoint ~33–34.
4. **Webflow**: create `/tools/biological-age-calculator`. Paste `webflow-embed.html`
   into an Embed element. Paste the JSON-LD block from `index.html` `<head>` into the
   page's custom head code. Publish.
5. **Internal links**: link the new page from `/lexicon/trail-derived-biological-age`,
   `/longevity`, and `/physiology` to fold it into the entity graph.

## MCP fast-follow (nearly free)
`methodology.js` is pure and dependency-free. Expose `TGBioAge.compute(I)` as
`calculate_trail_bioage` on the Trailgenic node — JSON in, JSON out, same numbers
as the widget. No re-implementation.

## Deferred (scoped, not built)
- Running as a second bio-age input (shares the `validate()` intensity gate).
- Modality selector + Zone-1 refusal.
- Conditioning Tracker for walking + rucking (load-carry economy).
- HR-drift efficiency modifier — pending confirmation that the 3–8% narrative
  figure is canonical (the −0.60% structured column is a different metric).

## Known edge
Very long days (7+ h) read ~5 VO₂max points low because the even time-split
assumption underprices climb pace. Recent Baldy/Wilson sessions are the clean zone.
Refine with split times in v2.
