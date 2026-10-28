# Storybook control responsiveness

## Findings

The old Continue handler cancelled speech and set an elapsed-time flag, but left progression to a later animation frame. Several clicks before that frame all affected the same beat. At the required-object beat, Continue could not advance the story and did not explain or focus the required choice. These both made accepted clicks appear to do nothing.

Page turns set an internal guard and stopped narration while building and decoding large SVG snapshots. Continue remained visually enabled, but its handler returned because narration was inactive. The snapshots embedded every PNG, including invisible characters, decorations and hit geometry. During saving, the primary button also looked available even though progression still required backend confirmation.

## Changes

- Manual Continue now advances exactly one narration beat synchronously. Automatic narration still follows its existing timing.
- At an incomplete choice, Continue displays the page's existing instruction and focuses an available choice. It cannot bypass the mission or invitation requirement.
- Page saving shows **Saving page…** and disables the primary control until confirmation. A failed save restores an enabled **Retry saving →** action. Completion/rewards still require the authoritative backend response.
- One accepted page-turn click immediately shows **Turning page…**, marks the book busy, disables reading/navigation controls, and freezes narration. Controls return after the original 920 ms turn animation and image preparation finish. Errors restore usable controls with retry feedback.
- A version guard cancels obsolete asynchronous page turns when the book closes, including if another story session opens before the old images finish decoding.
- Frozen page-turn snapshots omit invisible artwork and legacy hit geometry. All visible PNGs remain embedded. This affects snapshots only; live assets, anchors, hit areas, wrappers and artwork are unchanged.

## Verification

176 automated tests pass. New regressions exercise both languages with multiple Continue clicks before any animation frame, required-choice feedback/focus, saving feedback, delayed image decoding, a single accepted turn, and closing/reopening while image preparation is pending. Existing socket tests verify delayed backend confirmation and retry after rejection. Snapshot assertions verify invisible geometry is omitted and visible images stay embedded.

The isolated Chrome fixture checks all ten pages, all 50 narration beats, pointer interactions, outgoing/fixed/incoming page-turn images, back/forward navigation and 390×844 responsive layouts. Live socket behavior is checked by the separate integration suite.

A single before/after Chrome comparison of an Indonesian backward turn measured preparation at approximately 1044 ms before and 623 ms after; total time including the unchanged turn animation was approximately 2023 ms versus 1510 ms. Outgoing snapshot URI size fell from about 45.0 million characters/30 images to 28.2 million/19 images, and the incoming snapshot to 23.4 million/13 images. These figures are local measurements, not a cross-device performance guarantee. The fixed button and busy feedback appeared immediately, while the old button remained enabled with the unchanged Continue label.

The book still requires the correct interactive object at its choice beat, and still waits for page saves. Those requirements are now visible rather than silently ignored by the primary control.

## Follow-up: Next stays labelled Next

The primary control previously routed directly to navigation only when the local narration state was both completed and at beat 4. The alternate Next handler used a separate check involving page completion and audio completion. This meant navigation and the primary label did not share a single completion rule, particularly for confirmed pages being revisited or when authoritative confirmation arrived independently of the current narration beat.

The visible primary control and alternate Next handler now both accept confirmed page completion independently of narration beat, pause or replay state. Completed pages retain a Next/Finish label on replay and revisit, rather than requiring a fresh pass through the narration. Authoritative completion updates the primary label immediately; newly earned pages still wait for their save confirmation. A pending turn refreshes its busy feedback rather than silently returning.

Follow-up verification: 178 automated tests pass. Added cases cover backend confirmation independently of the current audio frame, replay plus pause, single-click navigation, backward/forward revisits and no duplicate save submissions in both languages. Real Chrome pointer checks also passed one-click Next after replay/pause and after revisiting a completed page in both languages, with no runtime errors in the final check.

## Desktop follow-up: button stability and first paint

The remaining report was repeated desktop clicks before the label changed to Turning. Two additional issues were addressed:

1. The completed-beat animation loop called `finishIntroPage` every frame and rewrote the button's text/disabled attributes even though nothing had changed. It now returns after completion. Repeated authoritative updates also avoid rewriting an unchanged ready button. This keeps the actual control stable during mouse-down/up.
2. Setting the Turning label followed by resolved promises did not give the browser a rendering opportunity before synchronous SVG serialization and PNG work. Turn preparation now yields through two animation frames first, so accepted-click feedback can paint before that work begins.

Snapshot PNGs are now sized to each image's rendered screen dimensions and device pixel ratio, preserving aspect ratio and alpha. Original asset files and live scene PNGs are unchanged. A bounded per-image cache reuses these lossless screen-sized PNGs; full-resolution pixels remain the fallback. The stage viewBox, art coordinates, object visibility, interactions and 920 ms turn animation are unchanged.

Desktop verification used real mouse-down/up at Retina (2×) density with 4× CPU throttling, including 40, 180 and 450 ms presses in both languages. Each accepted click initiated one turn, with no ready-button mutations during the press and no runtime errors. A separate freshly-earned-page comparison measured **22 button mutations during a 450 ms press before, versus 0 after**. The first feedback frame occurred after two snapshot leaves had already been prepared before the fix, versus before any leaves were prepared afterward. In that local comparison, snapshot URI size fell from approximately 26.4 million to 5.5 million characters and total turn time from 3567 ms to 1743 ms. These are diagnostic local measurements, not universal timing guarantees; the old click did eventually arrive in this controlled run, so the exact intermittent missed click in the user's browser was not directly captured.

All 178 automated tests pass, including an assertion that the completed primary button has no mutations across animation frames and a redundant backend update. Frozen image tests still require all visible image data to be embedded and preserve the live artwork's geometry.

Final browser regression after screen-sized PNG capture passed all ten pages and all 50 narration beats, desktop/mobile layouts, existing interactions and outgoing/fixed/incoming page-turn images, with no runtime errors.

## Returning to a festival

Continue adventure resumes an unfinished festival at its saved area and mission, retaining the outfit and completed story. The top-left book button opens an optional replay from page one; closing it returns to the same festival without awarding story rewards again. After all festival missions are complete, Continue returns to the common room for optional vocabulary levels, with the completed story retained. Start new adventure clears story completion.

Completed stories show **Start festival** in the story selection menu. This starts festival prompts directly, using the current outfit or the first festival outfit, without reopening the story. The festival book button is the optional replay entry point.

## Chang’e story pacing and optional discovery

The five chapters separate Hou Yi’s rescue, the precious elixir, Chang’e’s flight, remembrance, and the modern celebration. Automatic playback gives each narrative beat at least seven seconds, slows the arrows and ascent, and leaves two quiet seconds after the flight narration. Continue remains available for children who want to advance sooner.

The final Chinese page has an optional “Who is the Jade Rabbit?” disclosure. Opening it pauses playback; close it and press Play to resume. It explains the moon companion and distinguishes it from the festival’s rabbit-shaped lantern. It does not gate completion or award another reward. Reference: [Asian Civilisations Museum rabbit resource](https://www.nhb.gov.sg/acm/-/media/acm/acm2017/documents/education-resources/resource---rabbit.pdf?la=en).

The final page, “A Rabbit Lantern”, uses short sentences to introduce the Jade Rabbit, then the festival lantern. The lantern and optional discovery stay hidden until the line “Look! A rabbit-shaped lantern.” Replaying earlier narration hides them again. The discovery uses two short paragraphs.
