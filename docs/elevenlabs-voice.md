# Jelly's ElevenLabs voice

Jelly voice: `IR4Yywb88oVWHqzWLjAs`.
Instruction narrator: `zlatCM6nK59gyedHFFxn`.

The app plays saved MP3 recordings. API requests happen only when you run a
generation command, never during gameplay. Without recordings, it keeps using
the existing device voices. Story recordings keep pause, replay and mouth
animation; failed playback falls back to the original language segments.

## Setup and one-sentence preview

Use Node.js 20.12 or newer. Create `.env` in the project root using `.env.example`
if it does not exist. Put your key in `ELEVENLABS_API_KEY`. Keep `.env` private;
it is ignored by Git and is outside the public website directory.

```dotenv
ELEVENLABS_API_KEY=your_private_key
ELEVENLABS_VOICE_ID=IR4Yywb88oVWHqzWLjAs
ELEVENLABS_NARRATOR_VOICE_ID=zlatCM6nK59gyedHFFxn
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
```

Run `npm run voice:sample`. This generates only “I want to read. Can you find
buku?” and prints a listening URL. With `npm start` running, open that URL to
preview it. Generation consumes ElevenLabs credits; available voices and models
depend on your account access. The preview is separate from the game's
segmented question playback.

## Generate the game recordings

After reviewing the preview, run `npm run voice:generate -- --list` to inspect
the workload without making API requests. Run `npm run voice:generate` to
generate the full catalog.

The catalog covers Levels 1–3, both storybooks, spoken story hints and prompts,
festival introduction and words, and memory replay. Mixed-language lines are split into English and native-language recordings.
Jelly’s Indonesian words use `eleven_v4` (override with
`ELEVENLABS_INDONESIAN_MODEL_ID`). Narrator Indonesian and Mandarin Hanzi use
`eleven_flash_v2_5`. Native segments enforce `language_code` (`id` or `zh`);
English retains the configured model. Each segment
uses the same Jelly or narrator voice ID. Displayed Mandarin pinyin is removed
from the spoken text. The manifest retains ordered recording sequences as build inputs. Mixed-language
sentences are assembled into a single PCM WAV file for playback, so an entire
thank-you (including the target word) plays without a media-file handoff.
Assembly uses macOS `afconvert`, or `ffmpeg` on other platforms.
`npm run voice:assemble` rebuilds continuous recordings from cached clips without
using API credits. Other multi-part speech also reuses one media element per playback.
Check Indonesian and Mandarin pronunciation before the demo; a chosen voice's
accent and model can affect the result.

Bookshelf guidance, level/story menus, the first storybook unlock, coloring
instructions, festival missions and retries use the
narrator voice. Jelly's vocabulary, story narration and festival thank-you lines
use the Jelly voice. Story interaction requests also use Jelly’s voice. Run `npm run voice:guidance` to generate narrator cues and
festival feedback only. The bookshelf and festival mission panel have Hear instructions buttons.
The coloring dialog plays its instructions automatically and offers only Clear
and Done. Drawing, selecting a color, and clearing keep narration playing; Done
stops it before Jelly’s thank-you. Comic captions smoothly follow Jelly with a stable side and size throughout
a question; resize or new dialogue recalculates the placement. Festival mission cues play once per mission;
unchanged snapshots do not repeat them. Starting a new speaker cancels the old
speaker so recordings cannot overlap.

All player-facing text and guidance call the character Jelly. After a wrong
choice in vocabulary, story interactions, or festivals, narrator feedback plays
first and Jelly repeats the current request. The sequence does not advance the
question or award a reward. Normal replay returns to the vocabulary request once
feedback has finished.

After a correct basic-level choice, the narrator praises the child, explains the
word in Indonesian or Mandarin Chinese, and invites them to color it. After Done,
Jelly thanks the child and explains how the item meets the original request.
Done closes the coloring screen and Jelly delivers that thank-you in a room
speech bubble. The client waits for the thank-you before submitting completion
and allowing the next request or unlock. A failed save keeps the drawing in
memory and offers Try saving again in the room.
Leaving the activity cancels the pending thank-you without submitting stale work.

Source recordings and their generation manifest are saved in `public/audio/elevenlabs/`, ignored by Git except for the compressed `deploy/` bundle.
Generation is sequential and saves progress after each clip. Rerun the command
after an interruption to reuse cached clips. Changing voice, model, content or
settings produces new files. Changing the narrator voice preserves Jelly's cache,
and recordings are indexed by speaker role as well as language and text.
Previously generated audio can play without an
ElevenLabs connection. Refresh the mobile page after generation; the iPad uses
the same saved files served by the computer.

If the server was running before this feature was added, restart it to expose
`/api/voice/manifest`. That endpoint returns only audio paths, never credentials.

API reference: <https://elevenlabs.io/docs/api-reference/text-to-speech/convert>

The Princess Mandalika storybook and Bau Nyale festival loop
`/assetNEW/cupak-gerantang.MP3`. The moon festival storybook and Mid-Autumn
Festival loop `/assetNEW/moonfestivalsong.MP3`. Both tracks play at 10% volume;
Jelly or narrator speech lowers them to 2.5%. Closing a storybook in the common
room restores the room music; storybook replay within a festival keeps the
same cultural track playing. Music pauses on hidden tabs and travel screens.
The music toggle controls all three tracks.

Nyale uses the spoken spelling “nyalé” (final é as in sate); displayed text stays
“nyale”. Kerang is generated with Indonesian sentence context. Both changes use
the configured Jelly or narrator voice. Pronunciation overrides live in
`scripts/generate-voice.js` and participate in the recording cache key.

Story requests, including manual Continue reminders, use Jelly. Speech callbacks
carry the speaker role, and Jelly’s mouth animates only while that role is Jelly.
Accepting an invitation displays a wardrobe arrow and leaves movement to the child.

Undangan uses the context “Aku menerima sebuah” to support its Indonesian
pronunciation. Possessives attached to Indonesian names are rephrased only in
the spoken text: “Mandalika's kingdom” becomes “the kingdom of Mandalika”, and
“Lombok's coast” becomes “the coast of Lombok”. This prevents an isolated “'s”
from being generated as “is”. Displayed story text stays unchanged; browser
speech fallback uses the same normalization.

During vocabulary playback, hiding the tab pauses Jelly and returning resumes
the same recording. Cancelled thank-you playback settles explicitly and offers
Continue Jelly’s thank-you in the room, keeping the drawing in memory. The next
request still waits for the thank-you and authoritative completion; leaving or
resetting invalidates pending callbacks rather than submitting stale artwork.

All vocabulary praise has a 650 ms silent pause before the meaning sentence in
both languages. The pause is stored as `pauseAfterMs` on the praise’s last native
segment, inserted as PCM silence during assembly, and respected by fallback
playback. Existing recordings are reused when only the pause metadata changes.

On the Chang’e flight page, narration asks the child to drag the elixir to
Chang’e. Continue cannot bypass this interaction. A correct drop hides the
bottle and starts the drinking/flight beat; an incorrect drop restores the
bottle to the table. Focusing the elixir and pressing Enter/Space provides the
keyboard equivalent. The subsequent plated-mooncake task remains required.

The first Level 1 collection pauses the next request for a narrator introduction
to the memory shelf. A high contrast arrow points to the shelf until narration
finishes (or Continue is pressed). Subsequent snapshots do not repeat the intro;
leaving the activity cancels it without restoring an old question. All furniture
pointers share larger yellow arrows with purple outlines and a white glow.

On the Chang’e flight page, the mooncake and plate remain hidden until the food
request begins. Chang’e is hidden and removed from exploration at that point,
after her flight, while Hou Yi remains to remember her.


For Koyeb and other Git deployments, run `npm run voice:package` locally after
changing narration. This packages only existing runtime clips into
`public/audio/elevenlabs/deploy/` with a public manifest. WAV sentences become
96 kbps AAC/M4A; existing MP3 clips are copied. The complete sentence and its
pauses remain in one file. Packaging never calls ElevenLabs and uses no key.
On macOS it uses afconvert; other systems require ffmpeg.

Commit the deploy folder, `.gitignore`, `voice-manifest.js`, and the server
changes, then push and redeploy on Koyeb. Keep the Koyeb run command `npm start`.
The server uses its local generation manifest when present, otherwise the
packaged deployment manifest. No API key is required on Koyeb for these saved
recordings. Do not commit `.env`. After future voice changes, regenerate locally,
run `npm run voice:package`, and commit the refreshed deployment recordings.
