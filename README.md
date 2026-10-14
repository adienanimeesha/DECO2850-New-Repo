# Jelly's Ocean Home

A two-screen, full-viewport language-learning adventure: Jelly lives in an aquarium and swims into a mobile common room to discover stories, nursery rhymes, and cultural festivals.

The underwater room, jellyfish, Canvas illustration style, Putri Mandalika storybook SVG, and page-turn animation are adapted from the supplied `test.zip`. The active experience draws its art directly with Canvas and SVG; it does not use the old PNG assets.

## Run locally

```sh
npm install
npm start
```

During development, `npm run dev` reloads the server when backend files change, so it does not keep running an older version of the adventure state logic. Refresh the browser after frontend edits.

Open both screens connected to the same server:

- Mobile adventure: <http://localhost:3000/mobile.html>
- Aquarium: <http://localhost:3000/pet.html>

For a phone on the same Wi-Fi, replace `localhost` with the computer's local IP address. The server listens on `0.0.0.0` and uses port 3000 by default, or the `PORT` environment variable.

## Adventure flow

1. Choose Indonesian or Chinese on mobile and press **Start adventure**.
2. Jelly swims out of the aquarium and arrives in the common room.
3. Walk to the **storybook** for five animated chapters. Each chapter includes an interaction and a vocabulary reward. In the Chinese story, click the illustrated page objects themselves; Jelly’s narration includes mouth and blink animation in both languages. Listen to narration, or use **Continue narration** to read at your own pace. The interaction is required to finish the page.
4. Walk to the **coral radio**, press play in the video, and listen until the song ends. Then answer three questions such as “What is bintang?” without translations. All choices are outline drawings. Select an object, colour it with the brush or Fill object, and press Done. Correct coloured objects are collected; incorrect choices return to the same question. The compact mission card guides the five stages: story, song, invitation, wardrobe, and festival. The story and rhyme can still be completed in either order.
5. Completing both activities unlocks a festival invitation. **Tap the envelope in the top-left corner** to open the mailbox immediately. Accept it and walk to the **wardrobe**.
6. Both outfit cards show clothing illustrations before selection. Try on either colour of the language's festival outfit. Jelly wears the selected outfit in the preview and world. Press **Done** to travel to the festival.
7. Walk around the festival and collect three glowing keepsakes.
8. Swim home. The adventure's 11 discoveries appear as scattered aquarium decorations, and Jelly swims around wearing the chosen outfit.
9. Use the mobile **memory book** to revisit vocabulary and pronunciation. Start another adventure to explore again, or try the other language.

Move with **WASD**, **arrow keys**, or the touch **D-pad**. The storybook, memory book, wardrobe, and nursery rhyme automatically open when Jelly swims close to their furniture. There is no separate memory-book button or confirmation. The shelf starts empty and displays only earned words and collected items; the memory book shows the same collection, for the current adventure only. Clicking furniture in the room makes Jelly walk there around obstacles and open it. The mailbox opens directly when clicked. Escape closes an activity. Festival objects respond automatically when approached, and the arrows at the sides lead to neighbouring areas of the same festival. Closing a story before completion lets you resume from the current uncompleted chapter later.

**Back → Bring Jelly home** returns Jelly to the aquarium wearing the chosen outfit and carrying discoveries already earned. **Keep exploring** cancels the return. Completing the festival and choosing **Swim home** also brings its discoveries home.

The aquarium initially has no collected items. Returned items and clothing stay visible while Jelly is home, including after a page refresh. **Starting a new adventure** resets all mission progress, words, items, invitation state, and clothing on both screens. The new common-room memory shelf and aquarium collection are empty again. Choosing a language alone does not reset anything; pressing **Start adventure** does.

## Content

| Language | Story | Nursery rhyme | Festival | Clothing |
| --- | --- | --- | --- | --- |
| Indonesian | Putri Mandalika, adapted from the supplied reference | Bintang Kecil, sung by Lintang Media | Bau Nyale, Lombok | Stylised Sasak-inspired woven wrap and headcloth |
| Chinese | An imagined Moon Rabbit journey inspired by Chinese folklore | 小星星, sung by BabyBus | Mid-Autumn Festival | Stylised hanfu-inspired robe |

Nursery activities embed real sung videos with the YouTube player: [Bintang Kecil by Lintang Media](https://www.youtube.com/watch?v=NXad9gFbCLI) and [小星星 by BabyBus](https://www.youtube.com/watch?v=GxtknJ9KFKY). They require internet access. The player stays mounted between picture questions, so answering does not restart playback. Each activity includes a direct YouTube link if embedded playback fails. There is no spoken-lyric or generated melody substitute.

Song questions start after playback ends and display only the heritage target word in an English question, without English translations or visible English labels on the outline choices. The video is not replayed between questions. A fallback completion button is offered only if the embedded player fails, after watching via the direct YouTube link. Learned meanings and pronunciation remain available afterwards in the mobile memory book. Nursery quiz prompts and picture choices do not display translations. Story narration is in English with heritage vocabulary. Indonesian target words use an explicitly selected `id-ID` voice. Chinese Hanzi are spoken as separate segments with an explicitly selected Mandarin voice; pinyin stays in subtitles and is not spoken by the English voice. If a device has no Mandarin voice, the story shows a subtitle notice instead of reading Chinese with an English or Cantonese voice; the memory book replays individual words with `id-ID` or `zh-CN` browser voices. Subtitles and read-along controls keep stories usable without sound.

The aquarium fills the viewport and has no visible text, links, or buttons. Returned discoveries are automatically scattered through the sand and water. The mobile world also fills the viewport, with the mission card at the top, mailbox at the top-left, and movement controls overlaid in the corners.
The clothing and festival art are playful interpretations. The Chinese story explicitly distinguishes its imagined adventure from the festival tradition. Nyale and bau are identified as Sasak words.

Both festivals have three connected map areas and three ordered requests from Jelly. Walk to the requested object to feed or help Jelly, read the thank-you and cultural explanation, then choose **Next mission**. Walk towards a side arrow to reach the next area; clicking the sign also makes Jelly walk there. Wrong objects do not award a memory. Mission prompts use native target words without translations; explanations appear after success. Indonesia explores a food courtyard, music gathering, and seaside harbour; Chinese explores a mooncake courtyard, lantern walk, and moon garden. Fresh adventures clear the area, mission, and thank-you state too.

Cultural references used for the festival context:

- [Indonesia Tourism: Bau Nyale and Mandalika](https://www.indonesia.travel/us/en/events/event-detail/makna-di-balik-festival-bau-nyale-di-mandalika-lombok)
- [Indonesia Tourism: Ayam Taliwang](https://www.indonesia.travel/id/id/travel-ideas/gastronomy/ayam-taliwang)
- [Indonesia Tourism: Sasak Gendang Beleq](https://www.indonesia.travel/cn/zh-cn/travel-ideas/culture/gendang-beleq-the-grand-traditional-music-of-lombok/)
- [Singapore National Heritage Board: Mid-Autumn mooncakes and lanterns](https://www.nhb.gov.sg/~/media/nhb/files/sharedhtml/whos_your_neighbour.pdf?la=en)
- [Singapore National Heritage Board: rabbit symbolism and Mid-Autumn](https://www.nhb.gov.sg/~/media/nhb/files/resources/publications/muse%20sg/bemuse_v4_issue1-vol4_issue1_exploring_the_world_through_artefacts.pdf)

## Project structure

- `server.js`: Express static server and Socket.IO.
- `journey.js`: shared adventure state, mission gates, timed transitions, and rewards.
- `public/mobile.html`: mobile room, storybook SVG, and activity overlays.
- `public/pet.html`: aquarium screen.
- `public/js/journey-content.js`: bilingual content shared by server and clients.
- `public/js/ocean-room.js`: ZIP-based room, movement, collision, pathfinding, storybook, and festival illustration.
- `public/js/journey-mobile.js`: language selection, radio, invitation, outfit preview, and memory book.
- `public/js/ocean-art.js`: shared SVG illustration helpers.
- `public/js/aquarium.js`: aquarium animation and returned collections.
- `public/js/song-player.js`: embedded sung videos, completion callbacks, and playback error fallback.
- `public/js/rhyme-colouring.js`: nursery outline colouring, brush/fill controls, and transparent artwork snapshots carried home.
- `public/css/ocean.css`: ZIP styling plus the new journey screens and responsive layouts.

The earlier low-fidelity game's modules, activities, assets, and tests remain in the repository for reference. They are not loaded by the new mobile or aquarium screens. New screens identify themselves as journey clients; the earlier event contract remains isolated from journey broadcasts.

## State and limits

This prototype runs **one shared adventure per server**, not separate accounts or sessions for each visitor. Server state is authoritative for the activity order, invitation unlock, selected outfit, festival items, and collection deduplication. It accepts a story-page completion notification from the client rather than verifying every narrated beat.

Refreshing either screen restores the current phase, completed chapters, radio step, outfit, and collections. Returned collections and clothing remain while Jelly is home, until **Start adventure** begins a fresh game. **Restarting the server clears progress and memories.** There is no database or account system.

## Validation

```sh
npm test
```

Tests cover the retained earlier event contract plus both new language journeys, synchronized clients, reconnect snapshots, invalid submissions, progression gates, preserved home outfits and collections, resets on new adventures, cancelled transition timers, and deduplicated rewards. DOM interaction tests exercise the actual new UI scripts, click-to-walk around furniture, stories, rhyme choices, invitation, outfit selection, festival collectibles, and aquarium memory display with simulated Canvas and animation timing. They do not replace visual checks in a real browser or device checks for speech playback.
