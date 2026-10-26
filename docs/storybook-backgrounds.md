# Storybook backgrounds

The six supplied opaque PNGs are reused directly from `public/assetNEW/`; none were regenerated, altered or duplicated. Each is 1920 × 1040 (24:13), displayed across the complete 960 × 520 SVG viewBox with no cropping.

| Language | Pages (one-based) | AssetNEW PNG |
|---|---|---|
| Indonesian | 1–2 | storybook-id-kingdom-day.png |
| Indonesian | 3, 5 | storybook-id-coast-day.png |
| Indonesian | 4 | storybook-id-coast-twilight.png |
| Chinese | 1 | storybook-zh-moonlit-garden.png |
| Chinese | 2–3 | storybook-zh-family-courtyard.png |
| Chinese | 4–5 | storybook-zh-lantern-garden.png |

`public/js/ocean-room.js` preloads the pictures at startup and embeds their original pixels as PNG data URLs. The selected image is the first/bottom SVG layer with pointer events disabled. Page opening waits for its image when necessary; turning waits for the destination image. Outgoing, fixed and incoming page-turn snapshots include the embedded background and embedded image-backed props, avoiding external resource restrictions when a serialised SVG is displayed as an image. If loading fails, the old static scenery remains available.

`data-story-scenery` marks only old sky fills, terrain, hills and architecture. The referenced DOM nodes remain intact, but their display is disabled when the replacement is available. The mixed Indonesian `scene-background` group remains, with its original transforms and all animated children. Chinese moon/stars remain above the background; the original cord, lanterns, rabbit, family, table and props retain their original ordering and handlers. Narration, gameplay data, hit-area sizes, beat timing and page-turn duration are unchanged. The follow-up shoreline adjustments below align Indonesian foreground assets with the supplied illustrations.

## Foreground layout follow-up

The opaque Indonesian water sheet has been replaced by small animated highlights over the illustrated sea, leaving the beach and kingdom courtyard visible beneath the people. Neighbours and the crowd stay on land; only Mandalika approaches and enters the sea during the disappearance sequence, retaining its existing beat durations and fade. Boat, fish, nyale, mist and peaceful ripples now align with the illustrated water. The ripple visuals are flattened, but their original circular hit target remains. The shell and its sparkle group are moved clear of the prompt and neighbouring character.

The decorative “A little discovery, a lovely memory” SVG text has been removed from every Chinese page, including its visibility update. There was no equivalent decorative overlay in the Indonesian story. Narration, spoken/status feedback and completion/progression remain.

The illustration is rendered above the book spine; the book fold remains visible outside the scene. Turning leaves retain their foreground layer.

## Checks

- All six PNG signatures and dimensions.
- All ten page mappings, full-stage placement, pointer transparency and suppression of only marked static scenery.
- Outgoing/fixed/incoming snapshots embed their background and image props.
- Existing story UI and network integration suite, including choices, audio, rewards and progression.

Browser checks use the actual DOM, CSS and rendering scripts with the existing synchronous story-state adapter; live Socket.IO behaviour is covered separately by the integration suite.

Final verification: all 172 automated tests pass. Chrome checked every desktop page and every page at 390 × 844, including background selection, foreground animation, choices, backward/forward navigation and loaded outgoing/fixed/incoming page-turn leaves. Moon/stars and lantern/stars choices were exercised separately; stars did not complete the mission. The Indonesian nyale disappearance/appearance and final boat movement were checked. Chinese mooncake drag-to-table completed successfully.

Existing interaction limitation: a direct pointer tap on the Chinese page 3 mooncake did not complete the interaction in Chrome, both with the current renderer and with the previous `ocean-room.js` from HEAD. Programmatic click tests and real pointer dragging pass. The original click/drag handlers were deliberately left unchanged in this background-only update.

## Supplied foreground PNG replacements

The boat and shell now use `/assetNEW/perahu.png` and `/assetNEW/seashell.png` inside their existing SVG wrappers. Chinese pages 3 and 5 use `/assetNEW/table.png`. These files are reused without edits. The Chinese moon, rabbit, round lantern and mooncake mappings, all SVG people, and the six backgrounds above are retained.

All three source PNGs have 1536 × 1024 canvases with transparent padding. Fits were measured against their visible pixels rather than their canvas boxes:

| Object | Visible source bounds (approximately, alpha ≥ 32) | Scene fit |
|---|---|---|
| Boat | x238–1299, y42–980 | Uniform 0.12 scale; image box (597.72, 274.2), 184.32 × 122.88. Hull baseline ≈383 and bundled water ≈392 before the existing animation transform. |
| Shell | x199–1370, y135–906 | Uniform 0.05625 scale; image box (639.844, 413.694), 86.4 × 57.6. Visible art remains around the original local hit centre (684,443). |
| Table | x215–1329, y259–854 | Uniform 0.19 scale; image box (343.7,342), 291.84 × 194.56. Tabletop y≈392–431; feet ≈504. |

Boat and shell retain their original hit circles and independent movement/bounce/sparkle layers. PNG pointer events are disabled. The table retains the original exploration geometry invisibly, with a separate visible shadow beneath its feet. Food, tray and the other scene shadow remain independent. The drag calculation still targets (490,390), with the original snap transform `translate(-182 16)`. The small cake base (≈399) and delivered cake base (≈418–426 throughout its bob) sit inside the measured tabletop polygon. No character positions or logical anchors were changed for these replacements.

Opening and turning wait for the relevant replacement PNGs, and page-turn snapshots embed their pixels. Regression checks cover the original hit circles, PNG aspect ratios, table food contact points, fixed drop translation and embedded images. All 172 tests pass. Browser verification covers all ten pages on desktop and at 390 × 844, forward/back page turns, loaded outgoing/fixed/incoming images, pointer and keyboard Enter activation of the Indonesian shell/boat, the nyale sequence, and Chinese moon/stars, lanterns and mooncake drag. The existing page 5 rabbit/food overlap and the page 3 pointer-tap limitation above are unchanged; no additional alignment issue was found for these replacements.
