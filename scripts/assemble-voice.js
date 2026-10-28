const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {createHash}=require('node:crypto');
const run=promisify(execFile);
function readWave(bytes){
 if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('Expected PCM WAV audio.');
 let format,data;
 for(let offset=12;offset+8<=bytes.length;){
  const size=bytes.readUInt32LE(offset+4),end=offset+8+size;
  if(end>bytes.length)throw Error('Truncated WAV audio.');
  const name=bytes.toString('ascii',offset,offset+4);
  if(name==='fmt ')format=bytes.subarray(offset+8,end);
  if(name==='data')data=bytes.subarray(offset+8,end);
  offset=end+(size%2);
 }
 if(!format||!data?.length||format.readUInt16LE(0)!==1)throw Error('Missing PCM WAV samples.');
 return{format,data};
}
function joinWaves(waves,pauses=[]){
 const decoded=waves.map(readWave),format=decoded[0]?.format;
 if(!format||decoded.some(w=>!w.format.equals(format)))throw Error('Audio formats must match.');
 const data=Buffer.concat(decoded.flatMap((w,i)=>{const ms=pauses[i]||0,align=format.readUInt16LE(12),count=Math.round(format.readUInt32LE(8)*ms/1000/align)*align;return count?[w.data,Buffer.alloc(count)]:[w.data];})),header=Buffer.alloc(44);
 header.write('RIFF');header.writeUInt32LE(36+data.length,4);header.write('WAVEfmt ',8);
 header.writeUInt32LE(16,16);format.copy(header,20,0,16);header.write('data',36);header.writeUInt32LE(data.length,40);
 return Buffer.concat([header,data]);
}
async function assembleManifest(manifest,output){
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'jelly-voice-'));
 const decoded=new Map();manifest.sequences||={};let assembled=0;
 try{
  for(const[key,clip]of Object.entries(manifest.clips)){
   const sequence=Array.isArray(clip)?clip:manifest.sequences[key];
   if(!sequence)continue;
   const hash=createHash('sha256').update(JSON.stringify({sequence,format:'continuous-pcm44100-v2'})).digest('hex');
   const name=hash+'.wav',target=path.join(output,name);
   try{await fs.access(target);}catch{
    const waves=[];
    for(const part of sequence){
     if(!/^\/audio\/elevenlabs\/[a-f0-9]+\.mp3$/.test(part.audio))throw Error('Unexpected voice segment path.');
     if(!decoded.has(part.audio)){
      const input=path.join(output,path.basename(part.audio)),wav=path.join(temp,path.basename(part.audio)+'.wav');
      if(process.platform==='darwin')await run('/usr/bin/afconvert',['-f','WAVE','-d','LEI16@44100','-c','1',input,wav]);
      else await run('ffmpeg',['-v','error','-i',input,'-ar','44100','-ac','1','-c:a','pcm_s16le',wav]);
      decoded.set(part.audio,await fs.readFile(wav));
     }
     waves.push(decoded.get(part.audio));
    }
    await fs.writeFile(target+'.tmp',joinWaves(waves,sequence.map(part=>part.pauseAfterMs||0)));await fs.rename(target+'.tmp',target);
   }
   manifest.sequences[key]=sequence;manifest.clips[key]='/audio/elevenlabs/'+name;assembled++;
  }
 }finally{await fs.rm(temp,{recursive:true,force:true});}
 return assembled;
}
async function main(){
 const output=path.resolve(__dirname,'../public/audio/elevenlabs'),file=path.join(output,'manifest.json');
 const manifest=JSON.parse(await fs.readFile(file,'utf8'));
 const count=await assembleManifest(manifest,output);
 await fs.writeFile(file+'.tmp',JSON.stringify(manifest,null,2));await fs.rename(file+'.tmp',file);
 console.log(`${count} mixed-language sentences saved as continuous recordings.`);
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={readWave,joinWaves,assembleManifest};
