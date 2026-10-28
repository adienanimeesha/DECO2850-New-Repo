# Jelly’s Ocean Home — A2 showcase poster

- `jelly-showcase-a2.pdf`: one-page A2 portrait colour poster. Print at actual size / 100%, without browser headers or footers.
- `jelly-showcase-preview.png`: screen preview.
- `jelly-showcase-a2.html`: editable, self-contained poster source; open in a browser. All image assets are embedded.
- `build_poster.py`: rebuilds the HTML using the existing project assets.

Content uses the project description supplied in chat and annotated feedback in `public/usabilitytesting/`, particularly us9, us18, us21 and us22. The evaluation is attributed to a Chinese teacher with primary-school teaching experience; it is not presented as a child study. Feedback is paraphrased. Screen/device artwork is a concept illustration, not a live application screenshot. No test participant counts or measured learning outcomes are claimed.

Project title follows the current website name. Team names and an optional demo QR code can be added when supplied. No bleed or crop marks are included; check printer requirements if printing edge-to-edge.

## Print as two A3 halves

`jelly-showcase-two-a3.pdf` contains the original poster split horizontally: page 1 is the top, page 2 the bottom. Individual copies are also provided as `jelly-showcase-a3-top.pdf` and `jelly-showcase-a3-bottom.pdf`.

Print single-sided on A3 landscape at actual size / 100%, without Fit to page. The artwork is clipped directly from the original PDF, with no layout changes, scaling or overlap. Join the bottom edge of page 1 to the top edge of page 2. Borderless printing is needed for an uninterrupted join; a printer's unprintable margins can otherwise leave a gap or omit artwork at the seam.

Recreate the split with `swift -module-cache-path /tmp/jelly-swift-module-cache output/showcase/split_poster.swift output/showcase` on macOS.
