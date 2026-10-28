const test = require('node:test');
const assert = require('node:assert/strict');
const {catalog, keyFor, spokenText, speechSegments} = require('../voice-catalog');
const {generateClip,mergeManifest,pronunciationFor,modelForSegment} = require('../scripts/generate-voice');
const journeys = require('../public/js/journey-content');

test('recording catalog covers both languages, all story beats, prompts, words and festivals', () => {
  const clips = new Map(catalog().map(clip => [keyFor(clip.text, clip.lang,clip.role), clip]));
  const guidance=require('../public/js/guidance-content');
  for(const text of Object.values(guidance))assert.ok(clips.has(keyFor(text,'en-US','narrator')));
  for (const content of Object.values(journeys)) {
    for (const level of content.learningLevels) for (const q of level.questions){
      assert.ok(clips.has(keyFor(q.targetWord, content.speech)));
      const feedback=guidance.vocabularyFeedback(q,content.speech==='zh-CN'?'chinese':'indonesian');
      assert.ok(clips.has(keyFor(feedback.narration,content.speech,'narrator')));
      assert.ok(clips.has(keyFor(feedback.thankYou,content.speech)));
      assert.match(feedback.meaning,new RegExp(q.translation));
      assert.doesNotMatch(feedback.thankYou,/new discovery/,'every item has its own purpose');
    }
    for (const story of content.stories) {
      for (const ch of story.chapters) {
        assert.ok(clips.has(keyFor(ch.prompt, content.speech)));
        for (const [index,beat] of ch.beats.entries()) assert.equal(clips.get(keyFor(beat.line, content.speech,'jelly')).mixed, true);
      }
      for (const reward of story.rewards) assert.ok(clips.has(keyFor(reward.word, content.speech)));
    }
    for (const festival of content.festivals) for (const item of festival.items){
      assert.ok(clips.has(keyFor(item.word, content.speech)));
      assert.ok(clips.has(keyFor(item.thanks, content.speech)));
      assert.ok(clips.has(keyFor(item.request, content.speech)));
      assert.ok(clips.has(keyFor(guidance.festivalRequest(item,festival.areas[item.area]),content.speech,'narrator')));
      assert.ok(clips.has(keyFor(guidance.festivalRetry(item),content.speech,'narrator')));
    }
  }
  assert.equal(spokenText('Lovely! 月饼, yuè bǐng, means mooncake.'), 'Lovely! 月饼, means mooncake.');
  assert.equal(spokenText('Tap the seashell 🐚'), 'Tap the seashell');
});
test('changing narrator voice preserves cached Jelly clips and invalidates only narrator clips',()=>{
 const manifest={voiceId:'jelly',narratorVoiceId:'old',modelId:'model',clips:{'en-US\nHello':'/jelly.mp3','narrator\nen-US\nHello':'/narrator.mp3'}};
 const updated=mergeManifest(manifest,{voiceId:'jelly',narratorVoiceId:'new',modelId:'model'});
 assert.deepEqual(updated.clips,{'en-US\nHello':'/jelly.mp3'});
 assert.equal(updated.narratorVoiceId,'new');
});
test('generation sends credentials only to ElevenLabs and returns MP3 bytes', async () => {
  let request;
  const bytes = await generateClip({text: '书', lang: 'zh-CN', mixed: false}, {
    apiKey: 'test-secret', voiceId: 'test-voice', modelId: 'eleven_flash_v2_5',
    fetchImpl: async (url, options) => {
      request = {url, options};
      return new Response(Buffer.from('test-audio'), {headers: {'content-type': 'audio/mpeg'}});
    }
  });
  assert.equal(bytes.toString(), 'test-audio');
  assert.match(request.url, /^https:\/\/api.elevenlabs.io\/v1\/text-to-speech\/test-voice\?/);
  assert.equal(request.options.headers['xi-api-key'], 'test-secret');
  assert.equal(JSON.parse(request.options.body).language_code, 'zh');
});
test('mixed story narration omits language enforcement and strips displayed pinyin', async () => {
  await generateClip({text: '月饼, yuè bǐng, means mooncake.', lang: 'zh-CN', mixed: true}, {
    apiKey: 'test-secret', voiceId: 'test', modelId: 'eleven_multilingual_v2',
    fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body);
      assert.equal(body.text, '月饼, means mooncake.');
      assert.equal(body.language_code, undefined);
      return new Response('audio', {headers: {'content-type': 'audio/mpeg'}});
    }
  });
});
test('provider failures and non-audio results cannot become saved recordings or expose provider error contents', async () => {
  const config = {apiKey: 'test-secret', voiceId: 'test', modelId: 'eleven_multilingual_v2'};
  await assert.rejects(generateClip({text:'Hello',lang:'en-US'}, {...config, fetchImpl: async () => new Response('private provider details', {status:403})}), /HTTP 403/);
  await assert.rejects(generateClip({text:'Hello',lang:'en-US'}, {...config, fetchImpl: async () => new Response('{}', {headers:{'content-type':'application/json'}})}), /did not return audio/);
});

test('mixed-language lines separate whole Indonesian words and native Hanzi from English',()=>{
 assert.deepEqual(speechSegments({text:'Good job! Bola means ball. Let’s colour bola.',lang:'id-ID',mixed:true}).filter(p=>p.lang==='id-ID').map(p=>p.text),['Bola','bola']);
 assert.deepEqual(speechSegments({text:'The chair is beside kerang.',lang:'id-ID',mixed:true}).filter(p=>p.lang==='id-ID').map(p=>p.text),['kerang']);
 assert.deepEqual(speechSegments({text:'月饼, yuè bǐng, means mooncake.',lang:'zh-CN',mixed:true}),[{text:'月饼',lang:'zh-CN'},{text:', means mooncake.',lang:'en-US'}]);
 for(const lang of ['id-ID','zh-CN'])assert.equal(speechSegments({text:'word',lang,mixed:false})[0].lang,lang);
});

test('native pronunciation overrides preserve the displayed vocabulary spelling',async()=>{
 const p=pronunciationFor({text:'nyale',lang:'id-ID'});assert.equal(p.text,'nyalé');
 assert.equal(pronunciationFor({text:'kerang',lang:'id-ID'}).text,'kerang');
 assert.equal(pronunciationFor({text:'kerang',lang:'en-US'}),null);
 await generateClip({text:'nyale',lang:'id-ID',pronunciation:p},{apiKey:'test',voiceId:'jelly',modelId:'eleven_flash_v2_5',fetchImpl:async(_url,options)=>{
  const body=JSON.parse(options.body);assert.equal(body.text,'nyalé');assert.equal(body.language_code,'id');assert.match(body.previous_text,/Lombok/);return new Response('audio',{headers:{'content-type':'audio/mpeg'}});
 }});
});

test('spoken possessives never strand an apostrophe-s in an English audio segment',()=>{
 const cases=[
  ["Several princes came to Mandalika's kingdom.",'Several princes came to the kingdom of Mandalika.'],
  ['Mandalika’s wish for harmony matters.','the wish of Mandalika for harmony matters.'],
  ["They remember Mandalika's story.",'They remember the story of Mandalika.'],
  ["Lombok's traditional grilled chicken.",'traditional grilled chicken from Lombok.'],
  ["We gathered on Lombok's coast.",'We gathered on the coast of Lombok.']
 ];
 for(const [display,expected]of cases){
  assert.equal(spokenText(display),expected);
  const segments=speechSegments({text:display,lang:'id-ID',mixed:true});
  assert.ok(segments.some(p=>p.lang==='id-ID'));assert.ok(segments.every(p=>!/^['’]s\b/.test(p.text)));
 }
 assert.equal(spokenText("Let's explore Jelly's home."),"Let's explore Jelly's home.");
});
test('undangan receives Indonesian sentence context while retaining its normal spelling',()=>{
 const p=pronunciationFor({text:'Undangan',lang:'id-ID'});
 assert.equal(p.text,'undangan');assert.equal(p.previous_text,'Aku menerima sebuah');
 assert.equal(pronunciationFor({text:'undangan',lang:'en-US'}),null);
});

test('Jelly uses the newer Indonesian model while English, Mandarin and narrator retain their models',()=>{
 assert.equal(modelForSegment({lang:'id-ID'},undefined,'eleven_multilingual_v2'),'eleven_v4');
 assert.equal(modelForSegment({lang:'id-ID'},'narrator','eleven_multilingual_v2'),'eleven_flash_v2_5');
 assert.equal(modelForSegment({lang:'zh-CN'},'jelly','eleven_multilingual_v2'),'eleven_flash_v2_5');
 assert.equal(modelForSegment({lang:'en-US'},'jelly','eleven_multilingual_v2'),'eleven_multilingual_v2');
 assert.equal(modelForSegment({lang:'id-ID'},'jelly','english','custom-indonesian'),'custom-indonesian');
});

test('every Indonesian and Chinese vocabulary explanation pauses after praise',()=>{
 const guidance=require('../public/js/guidance-content');
 for(const [language,track]of Object.entries(journeys))for(const level of track.learningLevels)for(const question of level.questions){
  const text=guidance.vocabularyFeedback(question,language).narration;
  const generated=speechSegments({text,lang:track.speech,mixed:true,role:'narrator'});
  const fallback=guidance.vocabularyParts(text,question.targetWord,language,'narrator');
  for(const parts of [generated,fallback]){
   const pauses=parts.filter(p=>p.pauseAfterMs);assert.equal(pauses.length,1);assert.equal(pauses[0].pauseAfterMs,650);
   assert.equal(pauses[0].text.toLowerCase(),question.targetWord.toLowerCase());
   assert.ok(parts.indexOf(pauses[0])<parts.length-1,'meaning follows the silent pause');
  }
 }
});

test('apel uses a schwa pronunciation override without changing displayed words',()=>{
 const p=pronunciationFor({text:'Apel',lang:'id-ID'});
 assert.equal(p.text,'apəl');assert.match(p.previous_text,/melihat pelangi/);
 assert.equal(pronunciationFor({text:'apel',lang:'en-US'}),null);
 const question=journeys.indonesian.learningLevels[0].questions.find(q=>q.targetWord==='apel');
 assert.equal(question.targetWord,'apel');
 for(const clip of catalog().filter(c=>/\bapel\b/i.test(c.text))){
  const segments=speechSegments(clip).filter(s=>s.lang==='id-ID'&&s.text.toLowerCase()==='apel');
  assert.ok(segments.length,clip.text);
  for(const segment of segments)assert.equal(pronunciationFor(segment).text,'apəl');
 }
});

test('narrator pronunciation guidance is separate from Jelly for apel and kursi',async()=>{
 const apple={text:'Apel',lang:'id-ID'},chair={text:'kursi',lang:'id-ID'};
 assert.equal(pronunciationFor(apple,'jelly').text,'apəl');
 assert.equal(pronunciationFor(apple,'narrator').text,'apel');
 assert.match(pronunciationFor(apple,'narrator').previous_text,/buah/);
 assert.equal(pronunciationFor(chair,'jelly'),null);
 assert.equal(pronunciationFor(chair,'narrator').text,'kur-si');
 for(const word of ['apel','kursi']){
  const q=journeys.indonesian.learningLevels[0].questions.find(q=>q.targetWord===word);
  const explanation=require('../public/js/guidance-content').vocabularyFeedback(q,'indonesian').narration;
  const parts=speechSegments({text:explanation,lang:'id-ID',mixed:true,role:'narrator'});
  const native=parts.filter(p=>p.lang==='id-ID'&&p.text.toLowerCase()===word);
  assert.equal(native.length,2,'praise and meaning both use the narrator override');
  const pronunciation=pronunciationFor(native[0],'narrator');
  await generateClip({...native[0],pronunciation},{apiKey:'test',voiceId:'narrator',modelId:'eleven_flash_v2_5',fetchImpl:async(_url,options)=>{
   const body=JSON.parse(options.body);assert.equal(body.text,word==='apel'?'apel':'kur-si');assert.equal(body.language_code,'id');assert.ok(body.previous_text);
   return new Response('audio',{headers:{'content-type':'audio/mpeg'}});
  }});
 }
});
