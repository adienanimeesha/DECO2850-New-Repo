# Learning and cultural adventure integration contract

This contract describes the backend on `feature/learning-backend`. One journey exists per server process, in memory. Connect with `io({ auth: { journey: true } })`. A joining or reconnecting journey socket immediately receives the complete `journey-state` snapshot. Mutations broadcast that event to all journey sockets. The older, separate `start-game` aquarium activity in `server.js` is unchanged.

## Content

`window.JOURNEYS[language]` (or `require('./public/js/journey-content')`) supports `indonesian` and `chinese`. Each has exactly five `learningLevels`, with exactly five `questions` per level. Each question has `id`, `language`, `level`, `targetWord`, `translation`, `pronunciationLocale`, `sentenceBefore`, `sentenceAfter`, `hint`, `correctItemId`, `distractorItemIds`, `colouringAsset`, and `options: [{ itemId, label, asset }]`. Mandarin questions also have tone-marked `pinyin`. The question's correct ID is content data for rendering; the server still validates all submitted IDs.

`stories: [{ id, language, title, festivalId, chapters, rewards }]` and `festivals: [{ id, language, title, place, intro, areas, items, outfits }]` link by `festivalId`. The current entries are `putri-mandalika` → `bau-nyale` and `moon-rabbit` → `mid-autumn`. Only these complete festivals are selectable. The legacy top-level `chapters`, `storyRewards`, `festivalItems`, etc. remain for current frontend compatibility. New story/festival entries can be added in content data; the frontend must use the selected IDs and arrays rather than assuming those top-level arrays always represent the selection.

## Snapshot fields

The server sends `journey-state` as a JSON object:

| Field | Meaning |
| --- | --- |
| `phase` | `aquarium`, `departing`, `room`, `travelling`, `festival`, or `returning`. |
| `language`, `trip` | Selected content track and monotonically increasing visit number. `language` is null before a journey or after reset. |
| `learning.levels` | Five `{ level, unlocked, completed }` entries. Only level 1 starts unlocked. Completed levels remain unlocked and replayable. |
| `learning.active` | Null until a level is started at the bookshelf. Otherwise `{ level, questionIndex, questionId, attemptId, stage }`. `questionIndex` is zero-based; `stage` is `select` or `colouring`. Resolve the visible question from content using these IDs. |
| `learning.tutorialCompleted`, `learning.allCompleted` | Permanent completion flags for this language's current server-session progress. |
| `learning.storybookUnlocked` | Permanent Level 1 unlock flag. The book must stay closed while false. |
| `learning.storybookUnlockVersion`, `learning.storybookUnlockedAtTrip` | Version starts at 0 and becomes 1 on the first Level 1 completion; it never increments on replay. Use a 0 → 1 state transition to show the celebration popup, and do not show it merely because a reconnect snapshot already contains 1. The trip field gives the original unlock visit. |
| `stories` | Per-story status entries: `{ id, language, title, festivalId, completed, invitationAvailable, invited, replayEligible }`. Content supplies the chapters. |
| `activeStoryId`, `storyPage`, `storyDone` | Selected story and its current reading run; `storyPage` is zero-based and advances after each accepted page. Historical completion stays in `stories`. |
| `invited`, `outfit`, `festivalId` | Current trip's accepted invitation, chosen outfit ID, and linked festival ID. |
| `festivalArea`, `festivalMission`, `festivalFeedback`, `festivalFound` | Existing festival map and mission state. |
| `bag`, `memories` | Current visit's earned entries and cumulative entries brought home. Each reward is unique by `language + id`; replay does not duplicate it. |

## Client events and responses

All listed events require the journey socket authentication above. Send exact payload shapes. Invalid state, a locked level or book, malformed payload, stale attempt, or unavailable story/festival produces `journey-error: { event, code: 'invalid-state', message }` to the sender, with no state change. Wrong *valid* learning options use `journey-learning-result` instead of an error. Existing festival wrong-target feedback remains `journey-hint` (a string).

| Client event | Payload | Effect / response |
| --- | --- | --- |
| `journey-start` | `'indonesian'` or `'chinese'` | From aquarium: `departing` → `room`. Same-language visits retain learning, story history and memories; switching language begins a fresh track. No question starts automatically. |
| `journey-learning-start` | `{ level: 1..5 }` | In room, starts question 1 of an unlocked level. The bookshelf interaction should send this for the mandatory tutorial. The new active question appears in `journey-state`. |
| `journey-learning-select-item` | `{ questionId, attemptId, itemId }` | During `select`, validates one of the current question's three option IDs. Wrong: sender receives `journey-learning-result: { correct: false, questionId, attemptId, hint }`. Correct: changes stage to `colouring`, broadcasts state and sends `{ correct: true, questionId, attemptId, colouringAsset }` to the sender. |
| `journey-learning-colouring-complete` | `{ questionId, attemptId, artwork? }` | Accepted only in `colouring` for the current question and attempt. Optional `artwork` must be a PNG data URL of at most 250,000 characters. The server records the word once and activates the next question or completes the level. Colouring quality is not inspected. Old or duplicate completions cannot advance. |
| `journey-learning-exit` | none | In room, closes the active level. Starting it again begins question 1; completed rewards remain deduplicated. |
| `journey-story-select` | `{ storyId }` | In room after book unlock, chooses an available story with an implemented festival. Resets the current reading, invitation, outfit and festival trip fields. A completed story may be selected again. No separate `journey-story-start` event is needed. |
| `journey-story-page` | zero-based page number | Existing event. Accepted only for the active story after book unlock and in sequence. The final page marks its `stories` entry complete and invitation available. |
| `journey-invitation` | none | Existing event. After the active story is finished, accepts its invitation and selects its linked festival. Level 2–5 completion is not required. |
| `journey-try-outfit`, `journey-festival` | outfit ID; none | Existing events. Outfit must belong to the linked festival; travel uses `travelling` → `festival`. |
| `journey-area`, `journey-find`, `journey-next-festival`, `journey-return` | Existing payloads | Existing sequential festival mission and `returning` → `aquarium` transitions, using the active festival's content. |
| `journey-exit` | none | Existing early return. Moves through `returning` and carries earned bag entries into memories. |
| `journey-reset` | none | Explicitly clears all shared journey progress and returns to initial aquarium state. |

The legacy `journey-rhyme-listened` and `journey-rhyme-answer` events no longer mutate journey state. The old `rhyme` content remains only so existing assets and unrelated screens are not removed in this branch.

## Frontend work for the other developers

1. In the common room, turn the bookshelf interaction into the Level 1 entry point. Do not auto-start a level on room arrival. Gate story opening on `learning.storybookUnlocked`; display a first-unlock comic popup on the version transition.
2. Replace the nursery rhyme activity and its UI references with a level picker and question/colouring flow. Use `learning.active` and question content to render options. Submit the current `questionId` and `attemptId` for both actions; enable colouring only after the server's correct result or authoritative `colouring` stage. Show the returned hint on wrong answers. Send `journey-learning-exit` when closing an unfinished level.
3. Read story/festival arrays by `activeStoryId` and `festivalId`. Add story selection and replay in the unlocked storybook. Keep the existing page interaction and travel animations. Use `stories` for historical status and `storyDone` / `invited` for the current run.
4. Update the mailbox, mission text and memory cards to use learning fields and `source: 'learning'`. The old frontend's `rhymeDone` gate and radio UI cannot drive this backend. For new vocabulary `colouringAsset` names without existing art, supply matching drawings or a labelled card fallback.
5. On reconnect, render the snapshot without replaying first-unlock or reward animations. The backend may return `journey-error` for stale taps; ignore or surface its message without assuming a state change.

This contract is the integration baseline for the three branches. Coordinate any event or field changes before changing it.
