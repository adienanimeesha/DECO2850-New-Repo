const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {publicVoiceManifest}=require('../voice-manifest');
const {catalog,keyFor}=require('../voice-catalog');
test('fresh deployment loads packaged recordings without a private generation manifest',async t=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'jelly-voice-deploy-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));
 await fs.mkdir(path.join(directory,'deploy'));
 const clips={'en-US\nHello':'/audio/elevenlabs/deploy/hello.m4a'};
 await fs.writeFile(path.join(directory,'deploy/manifest.json'),JSON.stringify({clips,privateSetting:'never public'}));
 assert.deepEqual(await publicVoiceManifest(directory),{clips});
 const local={'en-US\nHello':'/audio/elevenlabs/local.wav'};
 await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify({clips:local,voiceId:'private generation config'}));
 assert.deepEqual(await publicVoiceManifest(directory),{clips:local});
});
test('absent recordings retain the device voice fallback',async()=>{
 assert.deepEqual(await publicVoiceManifest('/nonexistent-jelly-voice-directory'),{clips:{}});
});
test('deployment bundle covers every current sentence and contains only public clip paths',async()=>{
 const directory=path.join(__dirname,'../public/audio/elevenlabs/deploy');
 const manifest=JSON.parse(await fs.readFile(path.join(directory,'manifest.json'),'utf8'));
 assert.deepEqual(Object.keys(manifest),['clips']);
 for(const clip of catalog())assert.ok(manifest.clips[keyFor(clip.text,clip.lang,clip.role)],`Missing ${clip.text}`);
 for(const file of new Set(Object.values(manifest.clips))){
  assert.match(file,/^\/audio\/elevenlabs\/deploy\/[a-f0-9]+\.(mp3|m4a)$/);
  assert.ok((await fs.stat(path.join(__dirname,'../public',file))).size>0);
 }
});
