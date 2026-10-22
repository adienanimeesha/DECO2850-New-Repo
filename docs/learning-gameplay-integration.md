# Learning gameplay handoff

Implemented on `feature/learning-gameplay`. No merge or push was performed.

`docs/learning-contract.md` was absent during implementation. The current backend
and shared content still implement the nursery rhyme. Consequently, this change
provides **independent rendering and interaction components** and an opt-in room
integration. It does not invent Socket.IO event names, backend state fields,
level content, reward rules, or a second unlock system. The old experience stays
active until Person 3 connects the new components. This file describes a local
presentation API, not the team's final shared backend contract.

## Ownership and changes

- `public/js/ocean-room.js`: bookshelf rendering and interaction, vocabulary
  stations, proximity checks, room narration mouth animation, authoritative
  story visibility input, and cleanup hooks. Existing pathfinding, collision,
  storybook, festival, and travel implementations remain in use.
- `public/js/ocean-art.js`: bookshelf illustration and `hasIcon(icon)`.
- `public/js/vocabulary-gameplay.js`: content-driven question presentation,
  reachable object placement, selection/confirmation, colouring orchestration.
- `public/js/vocabulary-speech.js`: segmented narration, replay/cancellation,
  explicit language voices, missing-voice notices, recording support.
- `public/js/vocabulary-colouring.js`: instance-scoped version of the existing
  brush/fill/clear/export mechanics, with async Done and retry support.
- `test/vocabulary-gameplay.test.js`: new component and room integration tests.

No edits were made to `server.js`, `journey.js`, `journey-content.js`,
`journey-mobile.js`, `mobile.html`, `ocean.css`, or the old colouring module.

## Person 3: load and mount

Add these scripts after `ocean-art.js` and before configuring the room:

```html
<script src="/js/vocabulary-speech.js"></script>
<script src="/js/vocabulary-colouring.js"></script>
<script src="/js/vocabulary-gameplay.js"></script>
```

Add one empty host outside `.game-frame`, preferably after the main game shell:

```html
<div id="vocabulary-gameplay" hidden></div>
```

No fixed IDs are needed inside it. Components create the dialogue, replay/exit
controls, status messages, modal, palette, canvas, and Done button. Vocabulary
text is inserted with DOM text nodes, not HTML interpolation. Cultural outlines
come from the internal SVG registry, not external image URLs.

After `ocean-room-ready` (or immediately if `window.OceanRoom` already exists),
configure once:

```js
const learning = window.OceanRoom.configureLearning({
  root: document.getElementById('vocabulary-gameplay'),
  onBookshelf(id) {
    // id === 'learning-bookshelf'
    // Person 3 opens their level-selection popup here.
  },
  adapter: {
    async select({ key, objectId }) {
      // Map to the AGREED backend contract and await confirmation.
      // Return { correct: false, hint?: contentHint } for a retry, or:
      // { correct: true, colouringAllowed: true } to open colouring.
    },
    async complete({ key, objectId, artwork }) {
      // Submit the PNG data URL using the agreed backend contract.
      // Resolve only after acceptance; reject on failure for a Done retry.
      // Do not advance locally. The next authoritative snapshot calls sync.
    },
    async exit() {
      // Request exit through the agreed backend contract.
      // On confirmed inactive state, call learning.sync(null, unlockInput).
    }
  }
});
```

Alternatively consume `window`'s `ocean-room-interaction` CustomEvent with
`event.detail.id === 'learning-bookshelf'`. Choose the callback **or** the event
to avoid opening the popup twice. Physical approach and click-to-walk both use
the same bookshelf identifier. No level popup or unlock celebration is supplied.

Close the level popup and release `OceanRoom.lock(false)` before presenting the
first question. Do this after the backend confirms Start, not on an optimistic
local click. Feed the mapped authoritative presentation into:

```js
learning.sync(presentation, { storyUnlocked: authoritativeLevelOneComplete });
```

`authoritativeLevelOneComplete` above is a placeholder local variable, **not an
invented backend field**. Person 3 must derive it from the shared contract.
Pass it on every sync, including inactive snapshots. The default is false. The
book drawing and interaction both stay hidden/disabled while false; this module
never awards the unlock or displays a celebration.

Map each backend question to this local presentation shape:

```js
{
  key,       // opaque unique string identifying trip + level + attempt + question
  language,  // 'indonesian' or 'chinese'
  level,     // integer 1–5
  index,     // zero-based question index 0–4
  question: {
    before,        // English context preceding the target word
    word,          // exact shared-content heritage word / Hanzi
    after,         // English context following the target word
    pronunciation, // editorially verified guidance; tone-marked Pinyin required for Chinese
    hint,          // contextual shared-content hint, required
    objects: [     // correct object AND distractors, all supplied by shared content
      { id, icon }
    ],
    beforeAudio,   // optional verified same-origin recording URL
    wordAudio,     // optional verified native-speaker recording URL
    afterAudio     // optional verified same-origin recording URL
  }
}
```

This shape carries no correct-answer field. Only the backend adapter decides
whether a selection is correct. IDs must be unique within the question. At least
two choices are required. Do not create a separate vocabulary list to satisfy
this API: map the final shared data. All choices must have an explicit registered
`OceanArt` icon; unsupported keys fail visibly instead of showing a misleading
seashell. Add culturally appropriate outlines to `ocean-art.js` for any new
shared-content objects before enabling those questions.

Keep each question presentation immutable under its `key`. Repeated snapshots
of the same key do not restart narration or discard an in-progress drawing.
Every new question and every level replay needs a distinct key. After question
five, pass `null` to remove objects/dialogue and restore ordinary room controls.
There is no hardcoded Level 1 path: all five levels use this same presentation.
Mandatory Level 1, optional Levels 2–5, replay permissions, and reward
deduplication belong to the authoritative backend and Person 3's popup.

On a wrong result, `question.hint` is displayed unless the confirmed result
supplies its own content-specific `hint`. Optional `speechParts` on a wrong
result can contain pre-segmented `{text, lang, audio?}` hint narration; target
segments must use `id-ID` or `zh-CN`. Otherwise only the prompt is narrated on
replay, and the contextual hint is shown as text.

Resolve selection and completion promises only on backend acknowledgement, and
reject them on network errors/timeouts. After accepted Done the modal closes,
but movement/selection remain paused until a new authoritative presentation
arrives. Do not count a promise resolving as an additional reward. For reconnect
to an interrupted colouring step, map the shared contract so the correct object
can be selected and confirmed again, or coordinate a restore interface once the
backend's colouring-stage contract exists.

## Lifecycle and other interfaces

- `learning.sync(null, {storyUnlocked})`: end/exit level, including after Q5.
- `learning.stop()`: immediate local interruption cleanup. Call on disconnect,
  connect error, cancellation, and before replacing the activity with another UI.
  Reconnect must supply a fresh authoritative `sync`.
- `learning.destroy()`: dispose the integration and restore the legacy room mode.
- `learning.controller`: gameplay controller for diagnostics; includes `active`,
  `blocked`, `speaking`, `objects`, `replay()`, and `cancelNarration()`.
- `VocabularyGameplay.create({root, adapter, room, colouring?})`: standalone
  component. The room adapter supplies `geometry()`, `isNear(item)`, and
  `clearMovement()`; normal integration should use `OceanRoom.configureLearning`.
- `VocabularyGameplay.placeObjects(objects, geometry)`: deterministic placement
  on reachable grid points; throws if choices cannot fit with sufficient spacing.
- `VocabularyColouring.mount(root, {icon}, onDone, onCancel)`: returns `{close()}`.
  `onDone(artwork)` may return a promise. Rejection keeps the drawing and enables
  retry. No grading, content selection, or reward logic is performed here.
- `VocabularySpeech.create({onSpeaking, onStatus})`: returns `play(parts)` and
  `cancel()`. `parts` are `{text, lang, audio?}`; Pinyin is never synthesized as
  English by the prompt builder. English/Indonesian/Mandarin use separate voices.

Leaving the common-room phase, changing trip, or pagehide clears the component.
Hiding the page or locking the room cancels narration and returns the mouth to
rest. While a vocabulary level is active, other furniture stations are removed
from proximity navigation. Person 3 should also disable/hide competing mission,
mailbox, and global activity controls, and wire the normal Back action through
`learning.stop()` as appropriate. Keep one speech owner active at a time.

## Person 3: required styling

Add styles to your owned CSS. The component reuses existing `subtitle-bubble`,
`activity-panel`, `rhyme-paper`, `colour-base`, `colour-lines`, `rhyme-palette`,
`paint-tools`, `primary`, `secondary`, and `small-note` rules. Its new classes are:

- `vocabulary-bubble`, `vocabulary-prompt`, `vocabulary-pronunciation`
- `vocabulary-hint`, `vocabulary-audio-status`, `vocabulary-replay`, `vocabulary-exit`
- `vocabulary-colouring-host`, `vocabulary-colouring`, `vocabulary-paint`,
  `vocabulary-paint-status`

Reserve a separate dialogue band so it does not cover floating choices. The
following is a starting point for Person 3 to adapt and visually verify; toggle
`is-vocabulary-active` on the body from the mapped authoritative question:

```css
body.is-vocabulary-active { --vocabulary-band: clamp(185px, 30dvh, 240px); }
.mobile-page.is-vocabulary-active .game-frame { bottom: var(--vocabulary-band); }
.mobile-page.is-vocabulary-active .mission-panel { display: none; }
#vocabulary-gameplay {
  position: fixed; inset: auto 0 0; z-index: 5;
  height: var(--vocabulary-band); box-sizing: border-box; padding: 8px 12px;
}
.vocabulary-bubble { height: 100%; min-height: 0; overflow: auto; padding: 10px 16px; }
.vocabulary-prompt { margin: 4px 0; line-height: 1.4; font-weight: 800; }
.vocabulary-prompt mark { background: #ffe6a3; color: #624379; border-radius: 4px; }
.vocabulary-pronunciation, .vocabulary-audio-status { display: block; }
.vocabulary-hint { margin: 4px 0; }
.vocabulary-replay, .vocabulary-exit { margin: 4px; padding: 7px 12px; }
.vocabulary-colouring-host {
  position: fixed; inset: 0; z-index: 22; display: grid; place-items: center;
  padding: 12px; background: #315b7d88; backdrop-filter: blur(5px);
}
.vocabulary-colouring { box-sizing: border-box; }
@media (max-height: 500px) {
  body.is-vocabulary-active { --vocabulary-band: 165px; }
}
```

The colouring dialog traps Tab, supports Escape/Back while idle, and restores
focus on close. Its Cancel action keeps the same question and requires another
physical approach to try again. Do not cover or disable the movement controls
with the dialogue host. Check portrait, landscape, long prompts, and Pinyin.

## Verification and remaining limits

Automated tests exercise reachable placement, existing click-to-walk, real room
integration, wrong-choice hints, confirmation gates, actual colouring controls,
Done retry, question transitions across all five levels/both tracks, replay,
missing/late voices, stale narration callbacks, and interruption cleanup.
Canvas, speech, recordings, and animation timing are simulated in Node/jsdom.

No browser/device testing or native-speaker pronunciation assessment has been
performed. Voice selection is checked programmatically; pronunciation accuracy
is not claimed. The code accepts optional verified recordings, but none were
provided. The final five-level cultural dataset, backend contract, reward replay
tests against that backend, popup, script tags, host, and CSS integration are
still needed. Current shared content supplies only three festival objects per
language; tests reuse those existing cultural items as fixtures, not as a new
five-level curriculum. New essential illustrations must be supplied for any
additional vocabulary in the final dataset.
