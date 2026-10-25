# Integrated learning gameplay

The integration branch connects the authoritative protocol in `learning-contract.md` to the existing Canvas room and vocabulary components. `journey.js` owns progression; no client component awards unlocks or advances a question locally.

## Page loading and ownership

`mobile.html` loads Socket.IO, shared content, OceanArt, vocabulary speech, colouring, gameplay, the learning backend adapter, the learning interface, and mobile orchestration. The room loads last and announces `ocean-room-ready`. `pet.html` loads the shared content/art/adapter utilities and aquarium renderer.

`learning-interface.js` configures the room once. The room's bookshelf event opens the level menu; its storybook callback opens the story selector. The interface joins content definitions with backend progress. `unlocked` controls level availability, `completed` controls Replay, and `learning.storybookUnlocked` controls both drawing and interaction for the storybook.

## Adapter and authoritative presentation

`JourneyLearning.create({socket, timeoutMs, onError})` returns `request(name, payload)`. Supported actions are `startLevel`, `selectObject`, `completeQuestion`, `exitLevel`, `selectStory`, and `storyPage`. These map to the exact existing protocol. Story selection also starts a reading run; there is no additional story-start event.

The adapter permits one pending action, rejects stale question keys, observes `journey-state`, correlates `journey-learning-result` by question/attempt, and rejects on `journey-error`, timeout, disconnect, or incompatible phase/track changes. It does not depend on acknowledgement callbacks. Successful selection supplies the gameplay result shape `{correct: true, colouringAllowed: true}`. Selection-stage changes can also be restored entirely from authoritative snapshots.

`JourneyLearning.presentation(state, content)` resolves `learning.active` against the actual curriculum and returns:

```js
{
 key, language, level, index, questionId, attemptId, stage,
 colouringItemId, colouringAsset,
 question: {
  before, word, after, pronunciation, hint,
  objects: [{id, icon}]
 }
}
```

The key includes language, trip, attempt, and question. Repeated snapshots with the same key preserve in-progress drawing. A new attempt gets a new key. Mandarin pronunciation is tone-marked Pinyin; the spoken target is Hanzi. The correct item identity is used to restore the colouring stage, while answer acceptance remains exclusively on the backend.

`JourneyLearning.selectedContent(content, state)` resolves stories and festivals by `activeStoryId` and `festivalId`, projecting their fields into the room's existing rendering API. Before accepting an invitation, its festival is resolved through the selected story's link. The aquarium uses the same resolver for outfits.

## Gameplay and recovery

`OceanRoom.configureLearning({root, onBookshelf?, onStorybook?, adapter})` returns an integration with `sync`, `stop`, `destroy`, and a diagnostic `controller`. The mobile interface consumes the bookshelf event rather than also configuring its callback. Every room snapshot calls `sync(view, {storyUnlocked})`.

Floating objects occupy deterministic, reachable grid positions. Placement checks full 100 × 108 world-unit envelopes (including hit targets, glow and maximum float) against painted furniture silhouettes, floor decorations, other choices, and visible controls. All choices have identical numbered badges, soft outlines, and pointer/keyboard controls. The float and glow respect reduced-motion preferences; visual motion never moves a hitbox. While learning is active, furniture interactions are excluded. Click-to-walk ignores incidental choices along the path to the selected destination. A comic caption follows Jelly, displaying the same authoritative mixed-language question without restarting narration. It measures several responsive widths and chooses a position avoiding Jelly’s head, the choices, and movement controls. It disappears during colouring and is removed on question change or exit. Replay and Exit float directly inside the full-height room. The duplicate prompt, progress and numbered controls are screen-reader-only; the character bubble retains visible pronunciation guidance. Wrong confirmed answers display contextual hints. Correct authoritative stages mount colouring.

A `colouring` snapshot restores the correct outline without another selection event. Back to room closes the modal, retaining the accepted answer; Continue colouring or approaching the correct object reopens it. Cancelled colouring stays closed on duplicate snapshots, while a fresh reconnect restores it automatically. Drawing itself is local until Done; reconnect restores the activity, not unsaved brush strokes.

Done exports a PNG, waits for backend acceptance, and advances only through the resulting snapshot. Rejected saves keep the drawing for retry. Exiting a level waits for an inactive snapshot. Disconnect and pagehide stop local presentation; reconnect supplies a fresh snapshot. Hiding or locking the room cancels narration and rests the mouth. Inactive snapshots do not interrupt unrelated walking or story narration.

All 48 curriculum asset keys are registered in `ocean-art.js`. Concrete words use object illustrations; abstract words use contextual scenes. Unsupported curriculum art is a validation error, never a silently substituted seashell. `OceanArt.outline` derives colouring outlines from the same SVG primitives.

## Stories and celebrations

Approaching the unlocked physical storybook opens the story menu. Selecting a story waits for its accepted snapshot before opening the reader. Story-page completion similarly waits for accepted page progress; a rejected page stays locked and offers retry through Continue narration. Historical completed stories can be replayed without duplicate rewards.

The unlock popup uses a live `storybookUnlockVersion` transition within the current track. Initial/reconnect snapshots do not replay it. Reset and language changes allow the next track's first unlock to celebrate. Dismissing the popup is local and sends no backend mutation.

The server rejects conflicting story, outfit, and travel actions while a vocabulary level is active. The wardrobe is also excluded from proximity navigation until the current story is complete and its invitation is authoritatively accepted. A mailbox-triggered walk waits for that acceptance. Explicit Exit level or Bring Jelly home provides safe departure. Attempts remain unique across server-session resets.

## Verification

`test/learning-integration.test.js` reads both HTML script lists, mounts the actual modules, and uses real Socket.IO connections to the real journey backend. Both languages complete all 25 vocabulary questions through physical approach and actual colouring controls, then exercise stories, festivals, returning home, optional levels, replay, and colouring reconnect. Additional cases cover all art references, authoritative menus, stale attempts, conflicting actions, timeout/disconnect recovery, selected content, celebrations, and delayed/rejected story pages. Existing component, legacy protocol, and cultural story tests remain intact.

Canvas drawing, images, speech, and frame timing are simulated in Node/jsdom. No browser connection was available during implementation. Portrait/landscape layout, touch control behavior, actual SVG/PNG rendering, art recognisability, native-language pronunciation, browser audio permissions, and mouth synchronization still require manual device verification. No pronunciation-quality or device-rendering claim follows from the automated tests.

## Fresh sessions versus continuation

Start new adventure sends `journey-start: {language, fresh:true}`. The backend clears learning, current and historical story/festival progress, memories, bag, outfit and invitation before publishing the new trip. Continue adventure sends the existing language string and retains same-language learning/history/memories. Reconnect sends neither action and restores the current snapshot.

Every state publication includes an increasing revision. Mobile, learning adapter, and aquarium ignore delayed older snapshots, with a new reconnect allowed to adopt a restarted server. Attempt IDs remain unique across resets. Trip changes clear presentation, captions, paint dialogs, focus/highlights, movement, story/activity overlays and cached memory art; aquarium image callbacks retain their existing version guard.
