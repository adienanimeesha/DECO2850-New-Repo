# Jelly's Ocean Home

A two-screen language-learning adventure built with Node.js, Express, Socket.IO, vanilla JavaScript, Canvas, and SVG. Jelly travels from an aquarium to a common room, learns cultural vocabulary, reads a story, and visits its festival.

## Run locally

```sh
npm install
npm start
```

Open both screens on the same server:

- Mobile adventure: <http://localhost:3000/mobile.html>
- Aquarium: <http://localhost:3000/pet.html>
- Pepper’s Ghost aquarium: <http://localhost:3000/pet.html?display=ghost&calibrate=1> (use **Hide controls** once calibrated).

For a phone on the same Wi-Fi, use the computer's local IP in place of localhost. The server listens on `0.0.0.0`, port 3000 (or `PORT`). `npm run dev` restarts the server on backend changes; refresh pages after frontend changes.

## Adventure flow

1. Choose Indonesian or Mandarin Chinese and press **Start new adventure** for a clean session. Jelly leaves the aquarium and arrives in the common room.
2. Approach the learning bookshelf. Only Level 1 is initially unlocked. Start it to learn five vocabulary words.
3. Move Jelly to a floating picture that matches the spoken word. An incorrect answer gives a contextual hint. A confirmed correct answer opens colouring.
4. Draw or use Fill object, then press Done. The server accepts the colouring before advancing. Back to room keeps the answer saved; Continue colouring reopens it. Refreshing or reconnecting restores an active colouring question. All choices have numbered outlines, a gentle float, and matching pointer/keyboard controls; a comic caption follows Jelly using the current question.
5. Completing Level 1 automatically celebrates the storybook unlock. Approach the physical storybook, choose a story, and start reading after server confirmation.
6. Each of five chapters has narration and an illustrated interaction. Continue narration provides a read-along option. The next page becomes available after the server accepts completion.
7. Finish the story, open the mailbox, and accept the festival invitation. Approach the wardrobe, select an outfit, and press Done to travel.
8. Explore three connected festival areas, find each requested object, and read its cultural explanation before the next mission. The side gates lead to neighbouring areas.
9. Swim home. Earned discoveries decorate the aquarium and Jelly retains the selected outfit while home.
10. Choose **Continue adventure** for the same language to replay completed levels or stories and finish optional Levels 2–5. Each level has five questions and unlocks the next level. Completed rewards are never awarded twice.

Use WASD, arrow keys, the touch D-pad, or click a destination to walk there. Floating choices respond on approach. The bookshelf and storybook open their selection menus. The memory shelf displays earned discoveries. Escape closes idle dialogs; Exit level explicitly ends a vocabulary run. Restarting that level begins at question 1. The home control can return early with discoveries already earned.

## Content and speech

| Language | Story | Festival | Clothing |
| --- | --- | --- | --- |
| Indonesian | Putri Mandalika, a Sasak legend from Lombok | Bau Nyale | Sasak-inspired woven wrap and headcloth |
| Mandarin Chinese | Chang’e Flies to the Moon | Mid-Autumn Festival | Hanfu-inspired robe |

Each language has three basic learning levels and 15 questions about everyday objects, food, and animals. The level menu introduces listening, guessing, movement, and colouring before the child presses Start. Cultural vocabulary remains in the separate stories and festivals. All vocabulary choices and colouring targets have SVG illustrations. Abstract words use contextual scenes, such as family gathering or sharing a mooncake. The clothing and festival art are playful interpretations. The story retells one version of Chang’e’s legend and distinguishes it from present-day festival traditions; nyale and bau are identified as Sasak words.

Narration separates English context from Indonesian (`id-ID`) or Mandarin (`zh-CN`) vocabulary. Pinyin is displayed and is never synthesized as English. Jelly's mouth follows speech playback. Devices without the required voice show an audio notice and retain text and pronunciation guidance. Actual voice availability and autoplay behavior depend on the browser/device. Optional [ElevenLabs setup](docs/elevenlabs-voice.md) generates saved recordings using the configured Jelly voice, with device voices as a fallback. Compressed deployment recordings are bundled in `public/audio/elevenlabs/deploy/`; private generation settings and source recordings stay local.

Cultural references used for the festival context:

- [NParks: Chang’e and her Moon Palace](https://lightsbythelake.nparks.gov.sg/files/LBTL_Handbook.pdf)

- [Indonesia Tourism: Bau Nyale and Mandalika](https://www.indonesia.travel/us/en/events/event-detail/makna-di-balik-festival-bau-nyale-di-mandalika-lombok)
- [Indonesia Tourism: Ayam Taliwang](https://www.indonesia.travel/id/id/travel-ideas/gastronomy/ayam-taliwang)
- [Indonesia Tourism: Sasak Gendang Beleq](https://www.indonesia.travel/cn/zh-cn/travel-ideas/culture/gendang-beleq-the-grand-traditional-music-of-lombok/)
- [Singapore National Heritage Board: Mid-Autumn mooncakes and lanterns](https://www.nhb.gov.sg/~/media/nhb/files/sharedhtml/whos_your_neighbour.pdf?la=en)
- [Singapore National Heritage Board: rabbit symbolism and Mid-Autumn](https://www.nhb.gov.sg/~/media/nhb/files/resources/publications/muse%20sg/bemuse_v4_issue1-vol4_issue1_exploring_the_world_through_artefacts.pdf)

## Architecture

- `server.js`: static serving and Socket.IO; retains the separate earlier activity protocol.
- `journey.js`: authoritative phases, questions, answer validation, colouring acceptance, unlocks, stories, outfits, festivals, and deduplicated rewards.
- `public/js/journey-content.js`: bilingual curriculum, stories, and festivals shared by server and clients.
- `public/js/learning-backend.js`: exact event/payload adapter, result/state correlation, timeout/error handling, question mapping, and selected-content resolution. No Socket.IO acknowledgement callbacks are assumed.
- `public/js/learning-interface.js`: authoritative level and story menus, bookshelf guidance, unlock celebration, and gameplay mounting.
- `public/js/vocabulary-gameplay.js`: reachable floating choices, proximity interaction, and colouring restoration.
- `public/js/vocabulary-colouring.js`: brush, fill, clear, PNG export, and save retry.
- `public/js/vocabulary-speech.js`: language voices, segmented speech, and cancellation.
- `public/js/journey-mobile.js`: mobile phase UI, mailbox, wardrobe, memory book, and state synchronization.
- `public/js/ocean-room.js`: room movement, collision, pathfinding, story illustrations, narration mouth animation, and festival world.
- `public/js/ocean-art.js`: shared SVG pictures and colouring outlines.
- `public/js/aquarium.js`: aquarium animation and returned collections.
- `public/mobile.html`, `public/pet.html`, `public/css/ocean.css`: screen hosts, dependency order, and responsive layouts.

See `docs/learning-contract.md` for the wire protocol and `docs/learning-gameplay-integration.md` for the integrated presentation API. Earlier prototype modules, assets, and their tests remain isolated and are not loaded by these pages.

## State and limits

One shared adventure exists per server process. Every connected journey screen observes the same progress. Refresh and reconnect restore authoritative state. **Start new adventure** clears learning, story history, outfit, active drawings, and memories, including for the same language. **Continue adventure** explicitly revisits the retained same-language track. Refresh/reconnect restores the current authoritative session. Switching language begins a fresh track. An explicit `journey-reset` or server restart clears progress. There is no database or account system.

The backend validates the current question, stage, attempt, option ID, and artwork format/size. It does not grade drawing quality or verify individual story narration beats. Attempts remain unique across resets within the running server. Monotonic snapshot revisions prevent delayed previous-session snapshots from restoring cleared visuals.

## Validation

```sh
npm test
```

The suite retains earlier tests and adds real Socket.IO integration with the complete script lists from both HTML pages. It covers all 50 curriculum questions and assets, both complete Level 1 runs, wrong-answer hints, colouring and recovery, sequential optional levels, cultural stories, invitation/outfit/festival progression, return to aquarium, replay, reset, stale attempts, duplicate submissions, errors, timeouts, and reconnects.

Canvas, image loading, animation clocks, and speech APIs are simulated in DOM tests. Manual checks remain necessary on phone and desktop browsers: portrait/landscape layout, touch movement, brush alignment, illustration recognisability, PNG rendering, Indonesian/Mandarin pronunciation, speech permissions, and mouth animation. Check both mobile and aquarium together and interrupt/reconnect during colouring. Automated tests do not establish real-device audio or visual quality.
