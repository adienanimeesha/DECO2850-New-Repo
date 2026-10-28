const fs = require('node:fs/promises');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {catalog, keyFor, spokenText, speechSegments} = require('../voice-catalog');
const {assembleManifest}=require('./assemble-voice');
function pronunciationFor(segment){
 if(segment.lang!=='id-ID')return null;
 const word=segment.text.toLowerCase();
 if(word==='undangan')return{text:'undangan',previous_text:'Aku menerima sebuah',revision:'undangan-native-context-v1'};
 if(word==='kerang')return{text:'kerang',previous_text:'Di pantai ada banyak',revision:'kerang-native-context-v2'};
 if(word==='nyale')return{text:'nyalé',previous_text:'Di Lombok, cacing laut ini disebut',revision:'nyale-final-e-v2'};
 if(word==='bau nyale')return{text:'Bau Nyalé',previous_text:'Di Lombok kita merayakan festival',revision:'nyale-final-e-v2'};
 return null;
}
function modelForSegment(segment,role,englishModel,indonesianModel='eleven_v4'){
 if(segment.lang==='id-ID'&&role!=='narrator')return indonesianModel;
 return segment.lang==='en-US'?englishModel:'eleven_flash_v2_5';
}
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public/audio/elevenlabs');
function mergeManifest(manifest,{voiceId,narratorVoiceId,modelId}){
  const clips={};
  if(manifest.modelId===modelId)for(const[key,source]of Object.entries(manifest.clips||{})){
    const same=key.startsWith('narrator\n')?manifest.narratorVoiceId===narratorVoiceId:manifest.voiceId===voiceId;
    if(same)clips[key]=source;
  }
  return{voiceId,narratorVoiceId,modelId,clips};
}

async function generateClip(clip, {apiKey, voiceId, modelId, fetchImpl = fetch}) {
  const response = await fetchImpl(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: 'POST', signal: AbortSignal.timeout(60000),
    headers: {'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg'},
    body: JSON.stringify({text: clip.pronunciation?.text||spokenText(clip.text), model_id: modelId,
      ...(clip.pronunciation?{previous_text:clip.pronunciation.previous_text}:{}),
      ...(!clip.mixed && modelId !== 'eleven_multilingual_v2' ? {language_code: clip.lang.split('-')[0]} : {}),
      voice_settings: {stability: .5, similarity_boost: .75}})
  });
  if (!response.ok) {
    const failure = await response.json().catch(() => null);
    const code = failure?.detail?.code || failure?.detail?.status;
    const reason = typeof code === 'string' && /^[a-z_]+$/.test(code) ? ` (${code})` : '';
    const advice = response.status === 402
      ? 'Your account cannot generate this audio under its current plan or credit allowance. Check voice API access and billing in ElevenLabs.'
      : 'Check your key, voice access, model and remaining credits.';
    throw new Error(`ElevenLabs returned HTTP ${response.status}${reason}. ${advice}`);
  }
  if (!response.headers.get('content-type')?.startsWith('audio/')) throw new Error('ElevenLabs did not return audio. No file was saved.');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error('ElevenLabs returned empty audio.');
  return bytes;
}
async function main() {
  try { process.loadEnvFile(path.join(root, '.env')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const all = process.argv.includes('--all');
  const festivalLines=new Set(Object.values(require('../public/js/journey-content')).flatMap(c=>c.festivals.flatMap(f=>f.items.flatMap(item=>[keyFor(item.thanks,c.speech),keyFor(item.request,c.speech)]))));
  const clips = process.argv.includes('--guidance')
    ? catalog().filter(clip=>clip.role==='narrator'||festivalLines.has(keyFor(clip.text,clip.lang)))
    : all ? catalog() : [{text: 'I want to read. Can you find buku?', lang: 'id-ID', mixed: true}];
  if (process.argv.includes('--list')) { console.log(`${clips.length} clips, ${clips.reduce((n, c) => n + spokenText(c.text).length, 0)} characters before cache reuse.`); return; }
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || apiKey === 'paste_your_key_here') throw new Error('Add ELEVENLABS_API_KEY to your local .env first. Keep the key private.');
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'IR4Yywb88oVWHqzWLjAs';
  const narratorVoiceId = process.env.ELEVENLABS_NARRATOR_VOICE_ID || 'zlatCM6nK59gyedHFFxn';
  const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
  const indonesianModelId=process.env.ELEVENLABS_INDONESIAN_MODEL_ID||'eleven_v4';
  await fs.mkdir(output, {recursive: true});
  let manifest = {clips: {}};
  try { manifest = JSON.parse(await fs.readFile(path.join(output, 'manifest.json'), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  manifest=mergeManifest(manifest,{voiceId,narratorVoiceId,modelId});
  for (const [index, clip] of clips.entries()) {
    const selectedVoice=clip.role==='narrator'?narratorVoiceId:voiceId;
    const segments=speechSegments(clip), sequence=[];
    for(const segment of segments){
      const {pauseAfterMs,...speechSegment}=segment;
      // Keep the chosen Jelly voice, using v4 for its Indonesian pronunciation.
      // English and Mandarin keep their existing models and cached recordings.
      const segmentModel=modelForSegment(segment,clip.role,modelId,indonesianModelId);
      const pronunciation=pronunciationFor(segment);
      const hash=createHash('sha256').update(JSON.stringify({voiceId:selectedVoice,modelId:segmentModel,...speechSegment,revision:'native-segments-v1',settings:[.5,.75],...(pronunciation?{pronunciation}:{})})).digest('hex');
      const filename=`${hash}.mp3`,target=path.join(output,filename);
      try{await fs.access(target);}catch{
        const bytes=await generateClip({...segment,mixed:false,pronunciation},{apiKey,voiceId:selectedVoice,modelId:segmentModel});
        await fs.writeFile(`${target}.tmp`,bytes);await fs.rename(`${target}.tmp`,target);
      }
      sequence.push({...segment,audio:`/audio/elevenlabs/${filename}`});
    }
    manifest.clips[keyFor(clip.text,clip.lang,clip.role)]=sequence.length===1?sequence[0].audio:sequence;
    await fs.writeFile(path.join(output, 'manifest.json.tmp'), JSON.stringify(manifest, null, 2));
    await fs.rename(path.join(output, 'manifest.json.tmp'), path.join(output, 'manifest.json'));
    console.log(`${index + 1}/${clips.length} saved: ${clip.role||'jelly'} · ${clip.lang} · ${clip.text.slice(0, 70)}`);
    if (!all && !process.argv.includes('--guidance')) console.log(`Listen: http://localhost:${process.env.PORT || 3000}${sequence[0].audio}`);
  }
  await assembleManifest(manifest,output);
  await fs.writeFile(path.join(output,'manifest.json.tmp'),JSON.stringify(manifest,null,2));
  await fs.rename(path.join(output,'manifest.json.tmp'),path.join(output,'manifest.json'));
  console.log('Ready. Refresh the app to load the saved recordings. Repeating this command reuses cached clips.');
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = {generateClip,mergeManifest,pronunciationFor,modelForSegment};
