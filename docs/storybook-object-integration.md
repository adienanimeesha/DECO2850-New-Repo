# Storybook object pack integration

The generated pack was inspected against the current renderer, `public/assetNEW/PNG-MANIFEST.json`, and the pack's `STORYBOOK-OBJECT-PACK-README.md` in `Documents/storybook-object-assets`. The current source already contained the six background mappings and the fitted boat, shell and table replacements. Those changes are retained.

## Imported artwork

29 original PNGs are copied, byte-for-byte, into `public/assetNEW/storybook-objects/`. The subfolder's filtered `PNG-MANIFEST.json` records source dimensions, alpha bounds and hashes for these 29 files. Original files in assetNEW and the supplied pack are untouched. The follow-up request replaces the five remaining people with their supplied full-body poses. The optional sun and unrelated artwork are not copied.

| Filenames (all prefixed `storybook-`, suffixed `.png`) | Existing scene wrappers / use |
|---|---|
| `id-mandalika`, `id-neighbour-left`, `id-neighbour-right`, `id-prince-blue`, `id-prince-green` | Existing princess, neighbour and prince wrappers; single-pose art with whole-body movement/fade, original shadows and separate prince invitations |
| `cloud-left`, `cloud-right` | Indonesian `cloud-a`, `cloud-b`; existing drift remains |
| `fish`, `flower` | Indonesian `story-fish`, `story-flower`; original circular hit targets remain |
| `id-crowd-lilac`, `id-crowd-peach`, `id-crowd-pink` | `crowd-one`, `crowd-two`, `crowd-three`; entry, bob and celebration hop remain |
| `zh-family-first`, `zh-family-second` | Chinese family wrappers on pages 2–5; bob, choice/exploration and invitations remain |
| `invitation` | Separate delivered-invitation children for Indonesian princes and Chinese family, page 2 |
| `id-nyale-target` | Existing `nyale-target-body` image inside `nyale-target`; inner wiggle remains independent of outer bob/choice bounce |
| `id-nyale-school-pink`, `id-nyale-school-peach`, `id-nyale-school-lilac` | Separate `nyale-a`, `nyale-b`, `nyale-c` images inside the existing reveal/fade/drift wrapper |
| `id-plant-pink`, `id-plant-yellow`, `id-plant-leafy-a`, `id-plant-leafy-b` | Existing `scene-plants` rotation wrapper |
| `id-coastal-flag-left`, `id-coastal-flag-right` | `coast-flags`, page 3; whole assembly rotation remains |
| `id-festival-bunting`, `id-canopy-left`, `id-canopy-right` | `festival-decor`, page 5; bob remains; the bunting includes its cord, so the old cord and pennants are removed |
| `zh-serving-tray` | Separate serving-tray artwork on Chinese page 3; food/table remain independent |

Every image preserves its source aspect ratio and has pointer events disabled. Fits use the supplied **alpha above 32** bounds, excluding soft margins. There is no canvas cropping, pixel resizing or sprite-sheet extraction. Indonesian fits are explicit image children; the Chinese dynamic renderer uses the same bounds in `storyObjectImage`.

Crowd feet remain at their original local baselines, respectively y420, y423 and y425, with heights capped at 85, 88 and 91. Chinese family feet remain at y439, inside the original 150-high figure envelope; their procedural shadows stay at y445. No new shadow is baked into a wrapper. The original Chinese body geometry is retained at opacity 0 solely as the exact pointer hit geometry; none of its old body, face or limbs is visible. Original shadow and delivered invitation layers remain separate. PNG image boxes do not enlarge hit areas.

Plant substitutions retain the original rotation `sin(time*1.5)*1.2` about (480,450), but broad leaves and illustrated stems perceive that sway differently from the former line paths. They remain rigid silhouettes with whole-group sway; no leaf deformation is claimed. Bunting retains the old logical envelope and aspect ratio; the supplied cord/pennant assembly is more compact than the old widely spaced line drawing. Neither animation anchors nor scene layout were changed to accommodate it.

## Retained visuals and behavior

Existing assetNEW boat (`perahu.png`), shell (`seashell.png`), table (`table.png`), moon, rabbit, round lantern and mooncake mappings are unchanged, including the table drop point (490,390), mooncake snap, boat fit/bundled water and shell sparkle separation. All six backgrounds keep their prior page mapping. Both stages keep `viewBox="0 0 960 520"` and responsive/clipping behavior.

Mandalika, both neighbours and both princes now display only the supplied PNG poses. Their original geometry remains invisible at opacity 0 to retain legacy animation IDs and the exact prince pointer hit area; none of the old schematic body, limb, eye or mouth artwork is visible. Foot anchors remain (0,0); aspect-preserving art is capped at the original figure envelopes (Mandalika 106×195, neighbours 100×150, princes 110×172), with actual Mandalika visible height about 177 because of its wider dress. Separate shadow and invitation layers remain outside the invisible geometry. Whole-body entrance/walking translation, bob/hop, sea approach/fade and invitation bounce continue. Independent limb movement, blinking and changing mouths are not visible with these single-pose PNGs; this is an intentional animation simplification in response to the follow-up request to replace all remaining character artwork. Jelly narrator, sun, dynamic mist, ripple rings, water highlights, stars/sparkles, shadows, choice/focus glows, Chinese hanging-lantern cords, rabbit-lantern line and all UI remain procedural. The sun still changes fill by page and shifts its y coordinate on page 5. Story content, handlers, audio/narration beats, logical anchors, page visibility, keyboard access, rewards and progression are unchanged.

Preloading includes the compatible object pack. Opening waits for the relevant language's image set so a later reveal cannot introduce an unloaded PNG. Existing snapshot capture embeds each image as PNG data, including outgoing, fixed and incoming page-turn leaves.

## Future articulated animation requirements

The five full-body character PNGs are now integrated as whole objects. They cannot preserve the original articulated motions. To restore those motions using the illustrated characters, request the following transparent, registration-aligned layers per character, with no baked shadow, invitation, or duplicate face/limbs:

| Character | Required layers / exact existing motion to preserve |
|---|---|
| Mandalika | Separate dress/torso; rear hair/head base without baked eyes or mouth; left and right arms; two independent legs/feet; left/right eye layers with open/blink states; mouth states: smile (`M-7-135 Q0-128 7-135`), concerned (`M-5-131 Q0-135 5-131`), speaking/open (`M-4-134 Q0-125 4-134`). Right-arm shoulder pivot (27,-96); leg pivots (-17,-25), (17,-25); eyes (-11,-149), (11,-149). The current left arm is static, so its layer may remain fixed. |
| Left neighbour | Torso, head/hair base with static smile, static right arm, separate animated left arm, separate legs/feet, independent open/blink eyes. Left shoulder (-22,-76); leg pivots (-13,-12), (13,-12); eyes (-10,-113), (11,-113). |
| Right neighbour | Torso, head/hair base with static smile, static left arm, animated right arm, separate legs/feet, independent open/blink eyes. Right shoulder (22,-77); leg pivots (-13,-12), (13,-12); eyes (-10,-113), (11,-113). |
| Blue prince | Torso/belt, head/hair/crown base with static eyes, static right arm, animated left arm, separate legs/feet; smile (`M-6-115 Q0-110 6-115`) and speaking (`M-3-115 Q0-109 3-115`) mouth states. Left shoulder (-27,-87); leg pivots (-15,-15), (15,-15). |
| Green prince | Matching separate components in the green character design; static left arm, animated right arm with shoulder (26,-86); same leg pivots and two mouth states as the blue prince. |

All layers need shared local registration with the same foot anchor (0,0), enough concealed overlap at shoulder/hip joints to avoid gaps, and artwork sized to the current silhouette envelope (Mandalika about 195 high, neighbours about 150, princes about 172). Do not scale the supplied complete figures over the existing limbs.

Once supplied: replace each visible SVG component with its corresponding image **inside the existing rig**, retaining all outer IDs, translations, bob/hop/fade and invite wrappers. Existing leg and arm rotation functions can continue around the measured pivots. Add explicit face-state switching for PNG eyes/mouths: SVG `ry`, `r` and `d` attributes do not animate a raster image. Preserve the current blink periods (Mandalika 3.4s, neighbours 4.1s), blink duration (.12s), speaking sine cadence and chapter-specific mouth choices; princes currently have changing mouths but no independent blink loop. Keep walking cadence (`sin(time*12)`) and the existing chapter-dependent amplitudes and shoulder angles. Validate each entrance/walk, wave, speech, blink, concerned/peaceful pose, sea entry/fade and invitation sequence against the retained SVG baseline before removing those rigs. Full-body pose swaps would approximate these continuous motions; they are not an equivalent replacement without a separately approved animation change.

## Verification

- Automated regression suite: 173 passing tests, including source PNG hashes, compatible import scope, aspect ratios, family foot anchors/hit geometry, invisible legacy rig nodes, character foot anchors, three nyale variants, separate tray, background mapping, page-turn embedding, mooncake tabletop contact/drop and existing socket-backed gameplay tests.
- Browser checks use the actual DOM/CSS/rendering scripts with an isolated synchronous story-state adapter. All ten pages were checked on desktop and at 390×844, forward/back navigation and loaded outgoing/fixed/incoming page turns. Existing socket behavior is covered separately by the integration suite.
- All 50 narration beats loaded their scene images successfully, with no browser runtime errors. Chinese family invitations also passed real keyboard Enter activation. Pointer checks covered both invitation deliveries, Indonesian fish/flower distractors (no completion), shell, ripple, nyale reveal/choice, boat sailing, Chinese moon/stars, lantern/stars, rabbit lantern and mooncake drag/drop.
- Existing Chinese page 3 pointer-tap limitation remains: real dragging succeeds, and the interaction handler is unchanged. Chinese page 5 rabbit/food overlap and crowd/foreground occlusion at existing Indonesian anchors remain; no character was repositioned to remove them.
- System voice output cannot be verified in headless Chrome. Audio callbacks/fallback/cancellation and progression are covered by the existing tests; no narration or audio code was changed.

Follow-up verification: the automated suite still has 173 passing tests after replacing the five remaining people. Existing character animation calculations and gameplay handlers remain unchanged, but their legacy limb/face nodes are invisible; this does not animate the baked PNG face or limbs. The new five PNGs participate in preload and page-turn embedding. Browser re-verification passed all ten pages and all 50 narration beats, desktop/390×844 layouts, all existing pointer interactions and loaded outgoing/fixed/incoming page turns. Both newly illustrated princes also passed Enter-key invitation delivery.
