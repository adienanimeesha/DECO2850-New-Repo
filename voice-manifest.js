const fs=require('node:fs/promises');
const path=require('node:path');
async function publicVoiceManifest(directory){
 try{
  const file=await fs.readFile(path.join(directory,'manifest.json'),'utf8').catch(error=>{
   if(error.code!=='ENOENT')throw error;
   return fs.readFile(path.join(directory,'deploy/manifest.json'),'utf8');
  });
  return {clips:JSON.parse(file).clips||{}};
 }catch{return {clips:{}};}
}
module.exports={publicVoiceManifest};
