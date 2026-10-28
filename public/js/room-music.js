(function(){
'use strict';
const button=document.getElementById('music-toggle');
if(!button||!window.Audio)return;
const audio=new Audio('/assetNEW/background-music.mp3');
audio.loop=true;audio.preload='auto';audio.volume=.15;
const festivalAudio=new Audio('/assetNEW/cupak-gerantang.MP3');
festivalAudio.loop=true;festivalAudio.preload='auto';festivalAudio.volume=.10;
const moonAudio=new Audio('/assetNEW/moonfestivalsong.MP3');
moonAudio.loop=true;moonAudio.preload='auto';moonAudio.volume=.10;
const tracks=[audio,festivalAudio,moonAudio];
let activeAudio=audio,phase='aquarium',festivalId=null,language=null,storyLanguage=null,storyOpen=false,unlocked=false,enabled=true;
const playback=new Map(tracks.map(track=>[track,{pending:false,retry:false}]));
try{enabled=localStorage.getItem('jelly-room-music-muted-v1')!=='1';}catch{}
function culturalTrack(id,lang){
 if(id)return id==='bau-nyale'?festivalAudio:id==='mid-autumn'?moonAudio:null;
 return lang==='indonesian'?festivalAudio:lang==='chinese'?moonAudio:null;
}
function selectedTrack(){
 if(storyOpen)return ['room','festival'].includes(phase)?culturalTrack(null,storyLanguage||language):null;
 if(['aquarium','departing','room'].includes(phase))return audio;
 return phase==='festival'?culturalTrack(festivalId,language):null;
}
function eligible(){return Boolean(selectedTrack());}
function wanted(){return eligible()&&enabled&&unlocked&&document.visibilityState!=='hidden';}
function render(){
 button.hidden=!eligible();
 const on=enabled&&unlocked;
 button.textContent=on?'Music on ♫':'Play music ♫';
 button.setAttribute('aria-pressed',String(on));
 button.setAttribute('aria-label',on?'Mute background music':'Play background music');
}
function apply(){
 activeAudio=selectedTrack();
 render();
 for(const track of tracks){
  const state=playback.get(track);
  if(track!==activeAudio||!wanted()){
   if(state.pending)state.retry=true;
   if(!track.paused)track.pause();
   continue;
  }
  if(state.pending||!track.paused)continue;
  state.pending=true;
  try{
   Promise.resolve(track.play()).then(()=>{
    const retry=state.retry;state.pending=false;state.retry=false;
    if(track!==activeAudio||!wanted())track.pause();else if(retry&&track.paused)apply();
    render();
   }).catch(()=>{state.pending=false;state.retry=false;if(track===activeAudio){unlocked=false;render();}});
  }catch{state.pending=false;state.retry=false;unlocked=false;render();}
 }
}
function gesture(event){
 if(event.target.closest?.('#music-toggle'))return;
 if(!unlocked){unlocked=true;apply();}
}
document.addEventListener('pointerdown',gesture);
document.addEventListener('keydown',gesture);
document.addEventListener('visibilitychange',apply);
window.addEventListener('jelly-story-visibility',event=>{storyOpen=event.detail.open;storyLanguage=storyOpen?(event.detail.language||language):null;apply();});
window.addEventListener('pagehide',()=>{for(const track of tracks)track.pause();});
window.addEventListener('jelly-speech',event=>{audio.volume=event.detail.speaking ? .035 : .15;festivalAudio.volume=moonAudio.volume=event.detail.speaking ? .025 : .10;});
button.addEventListener('click',()=>{
 if(!unlocked){unlocked=true;enabled=true;}else enabled=!enabled;
 try{localStorage.setItem('jelly-room-music-muted-v1',enabled?'0':'1');}catch{}
 apply();
});
window.RoomMusic={sync(state){phase=state?.phase||'aquarium';festivalId=state?.festivalId;language=state?.language;apply();}};
render();
})();
