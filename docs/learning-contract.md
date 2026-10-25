# Learning and cultural adventure integration contract

This contract describes the integrated backend on `integration/language-learning`. One journey exists per server process, in memory. Connect with `io({ auth: { journey: true } })`. A joining or reconnecting journey socket immediately receives the complete `journey-state` snapshot. Mutations broadcast that event to all journey sockets. The older, separate `start-game` aquarium activity in `server.js` is unchanged.

## Content

`window.JOURNEYS[language]` (or `require('./public/js/journey-content')`) supports `indonesian` and `chinese`. Each has exactly five `learningLevels`, with exactly five `questions` per level. Each question has `id`, `language`, `level`, `targetWord`, `translation`, `pronunciationLocale`, `sentenceBefore`, `sentenceAfter`, `hint`, `correctItemId`, `distractorItemIds`, `colouringAsset`, and `options: [{ itemId, label, asset }]`. Mandarin questions also have tone-marked `pinyin`. The question's correct ID is content data for rendering; the server still validates all submitted IDs.

`stories: [{ id, language, title, festivalId, chapters, rewards }]` and `festivals: [{ id, language, title, place, intro, areas, items, outfits }]` link by `festivalId`. The current entries are `putri-mandalika` → `bau-nyale` and `moon-rabbit` → `mid-autumn`. Only these complete festivals are selectable. The legacy top-level `chapters`, `storyRewards`, `festivalItems`, etc. remain for current frontend compatibility. New story/festival entries can be added in content data; the frontend must use the selected IDs and arrays rather than assuming those top-level arrays always represent the selection.

## Snapshot fields

The server sends `journey-state` as a JSON object:

| Field | Meaning |
| --- | --- |
| `revision` | Monotonically increasing snapshot revision for this server process; clients discard older snapshots except on a fresh reconnect, which may join a restarted server. |
| `phase` | `aquarium`, `departing`, `room`, `travelling`, `festival`, or `returning`. |
| `language`, `trip` | Selected content track and monotonically increasing visit number. `language` is null before a journey or after reset. |
| `learning.levels` | Five `{ level, unlocked, completed }` entries. Only level 1 starts unlocked. Completed levels remain unlocked and replayable. |
| `learning.active` | Null until a level is started at the bookshelf. Otherwise `{ level, questionIndex, questionId, attemptId, stage }`. `questionIndex` is zero-based; `stage` is `select` or `colouring`. Resolve the visible question from content using these IDs. |
| `learning.tutorialCompleted`, `learning.allCompleted` | Permanent completion flags for this language's current server-session progress. |
| `learning.storybookUnlocked` | Permanent Level 1 unlock flag. The book must stay closed while false. |
| `learning.storybookUnlockVersion`, `learning.storybookUnlockedAtTrip` | Version starts at 0 and becomes 1 on the first Level 1 completion; it never increments on replay. Use a 0 → 1 state transition to show the celebration popup, and do not show it merely because a reconnect snapshot already contains 1. The trip field gives the original unlock visit. Attempts remain unique across explicit resets within this server process. |
| `stories` | Per-story status entries: `{ id, language, title, festivalId, completed, invitationAvailable, invited, replayEligible }`. Content supplies the chapters. |
| `activeStoryId`, `storyPage`, `storyDone` | Selected story and its current reading run; `storyPage` is zero-based and advances after each accepted page. Historical completion stays in `stories`. |
| `invited`, `outfit`, `festivalId` | Current trip's accepted invitation, chosen outfit ID, and linked festival ID. |
| `festivalArea`, `festivalMission`, `festivalFeedback`, `festivalFound` | Existing festival map and mission state. |
| `bag`, `memories` | Current visit's earned entries and cumulative entries brought home. Each reward is unique by `language + id`; replay does not duplicate it. |

## Client events and responses

All listed events require the journey socket authentication above. Send exact payload shapes. Responses use the named events and snapshots below, not Socket.IO acknowledgement callbacks. Invalid state, a locked level or book, malformed payload, stale attempt, or unavailable story/festival produces `journey-error: { event, code: 'invalid-state', message }` to the sender, with no state change. Wrong *valid* learning options use `journey-learning-result` instead of an error. Existing festival wrong-target feedback remains `journey-hint` (a string).

| Client event | Payload | Effect / response |
| --- | --- | --- |
| `journey-start` | `'indonesian'` or `'chinese'` to continue; `{ language, fresh: true }` for a fresh adventure | From aquarium: `departing` → `room`. A string payload explicitly continues a same-language track, retaining learning, story history and memories. A `fresh: true` payload clears all track progress, memories, invitation and outfit, even for the same language. Switching language also begins a fresh track. No question starts automatically. |
| `journey-learning-start` | `{ level: 1..5 }` | In room, starts question 1 of an unlocked level. The bookshelf interaction should send this for the mandatory tutorial. The new active question appears in `journey-state`. |
| `journey-learning-select-item` | `{ questionId, attemptId, itemId }` | During `select`, validates one of the current question's three option IDs. Wrong: sender receives `journey-learning-result: { correct: false, questionId, attemptId, hint }`. Correct: changes stage to `colouring`, broadcasts state and sends `{ correct: true, questionId, attemptId, colouringAsset }` to the sender. |
| `journey-learning-colouring-complete` | `{ questionId, attemptId, artwork? }` | Accepted only in `colouring` for the current question and attempt. Optional `artwork` must be a PNG data URL of at most 250,000 characters. The server records the word once and activates the next question or completes the level. Colouring quality is not inspected. Old or duplicate completions cannot advance. |
| `journey-learning-exit` | none | In room, closes the active level. Starting it again begins question 1; completed rewards remain deduplicated. |
| `journey-story-select` | `{ storyId }` | In room after book unlock, chooses an available story with an implemented festival. Resets the current reading, invitation, outfit and festival trip fields. A completed story may be selected again. No separate `journey-story-start` event is needed. |
| `journey-story-page` | zero-based page number | Existing event. Accepted only for the active story after book unlock and in sequence. The final page marks its `stories` entry complete and invitation available. |
| `journey-invitation` | none | Existing event. After the active story is finished, accepts its invitation and selects its linked festival. Level 2–5 completion is not required. |
| `journey-try-outfit`, `journey-festival` | outfit ID; none | Existing events. No learning level may be active. Outfit must belong to the linked festival; travel uses `travelling` → `festival`. |
| `journey-area`, `journey-find`, `journey-next-festival`, `journey-return` | Existing payloads | Existing sequential festival mission and `returning` → `aquarium` transitions, using the active festival's content. |
| `journey-exit` | none | Existing early return. Moves through `returning` and carries earned bag entries into memories. |
| `journey-reset` | none | Explicitly clears all shared journey progress and returns to initial aquarium state. |

The legacy `journey-rhyme-listened` and `journey-rhyme-answer` events no longer mutate journey state. The old `rhyme` content remains only so existing assets and unrelated screens are not removed in this branch.

## Integrated clients

`public/js/learning-backend.js` maps the presentation actions to these exact events and correlates results/state/errors without acknowledgement callbacks. `learning-interface.js` joins level/story content with authoritative progress and supplies the room presentation. See `learning-gameplay-integration.md` for the final API and lifecycle.

The bookshelf starts a chosen unlocked level; no level auto-starts on arrival. `learning.active` resolves actual shared questions and the authoritative stage. Wrong-answer hints use the backend result; colouring is enabled only after confirmation or a restored colouring-stage snapshot. Colouring cancellation can reopen the accepted object without another selection. Done and Exit wait for state confirmation. Completed levels remain replayable.

The physical book stays hidden until `storybookUnlocked`; approach opens story selection and accepted selection opens the reader. Page progression waits for backend acceptance and rejected actions surface feedback. Story/festival content follows the selected IDs. Memory cards label `source: 'learning'` as vocabulary.

The first-unlock popup follows the live unlock version transition, with initial/reconnect snapshots excluded. Reset and language changes restart the celebration lifecycle. Neither popup dismissal nor reconnect awards progress.

The backend and all connected screens share one in-memory adventure. Continue adventure uses the string payload and retains same-language progress. Start new adventure sends `{language, fresh:true}` and clears that progress. Switching languages also starts a fresh track. The contract does not promise persistent accounts or progress across server restarts.
