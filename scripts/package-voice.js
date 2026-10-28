// Package existing recordings for Git deployments. No credentials or API calls.
const fs=require('node:fs/promises');
const path=require('node:path');
const {promisify}=require('node:util');
const run=promisify(require('node:child_process').execFile);
const root=path.resolve(__dirname,'..','public');
async function main(){
 const source=path.join(root,'audio/elevenlabs');
 const manifest=JSON.parse(await fs.readFile(path.join(source,'manifest.json'),'utf8'));
 const output=path.join(source,'deploy');await fs.mkdir(output,{recursive:true});
 const clips={},converted=new Map();let original=0,total=0;
 for(const [key,file]of Object.entries(manifest.clips||{})){
  if(typeof file!=='string'||!/^\/audio\/elevenlabs\/[a-f0-9]+\.(wav|mp3)$/.test(file))throw Error('Unexpected recording path. Generate current recordings before packaging.');
  if(!converted.has(file)){
   const input=path.join(root,file),name=path.basename(file).replace(/\.wav$/,'.m4a'),target=path.join(output,name);
   const stat=await fs.stat(input);original+=stat.size;
   try{await fs.access(target);}catch{
    if(file.endsWith('.mp3'))await fs.copyFile(input,target);
    else if(process.platform==='darwin')await run('/usr/bin/afconvert',['-f','m4af','-d','aac ','-b','96000',input,target]);
    else await run('ffmpeg',['-v','error','-i',input,'-c:a','aac','-b:a','96k',target]);
   }
   total+=(await fs.stat(target)).size;converted.set(file,'/audio/elevenlabs/deploy/'+name);
  }
  clips[key]=converted.get(file);
 }
 // Publish only runtime clip paths, never local generation configuration.
 await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify({clips},null,2)+'\n');
 console.log(`Packaged ${converted.size} recordings: ${(original/1e6).toFixed(1)} MB → ${(total/1e6).toFixed(1)} MB. No API calls made.`);
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
