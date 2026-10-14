(function () {
'use strict';
let player=null,wrapper=null,version=0,apiPromise=null;
function loadAPI(){
 if(window.YT?.Player)return Promise.resolve();
 if(apiPromise)return apiPromise;
 apiPromise=new Promise((resolve,reject)=>{
  window.onYouTubeIframeAPIReady=resolve;
  const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;
  script.onerror=()=>reject(new Error('The player controls could not connect.'));
  document.head.append(script);
 });return apiPromise;
}
function destroy(){
 version++;
 try{player?.destroy();}catch{}
 player=null;wrapper?.remove();wrapper=null;
}
function status(message){const target=document.getElementById('song-status');if(target)target.textContent=message;}
function mount(slot,song,{onEnded=()=>{},onUnavailable=()=>{}}={}){
 destroy();const token=version;
 wrapper=document.createElement('div');wrapper.className='song-video';
 const frame=document.createElement('iframe');frame.id='rhyme-player';frame.title=`${song.title} · sung by ${song.channel}`;
 frame.src=`https://www.youtube-nocookie.com/embed/${song.videoId}?playsinline=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
 frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;
 frame.referrerPolicy='strict-origin-when-cross-origin';
 wrapper.append(frame);slot.append(wrapper);
 loadAPI().then(()=>{
  if(token!==version||!frame.isConnected)return;
  player=new window.YT.Player(frame,{
   events:{
    onReady(){if(token===version)status('Press play in the video, and sing along with Jelly.');},
    onStateChange(event){if(token!==version)return;if(event.data===1)status('Sing along! Listen until the song finishes.');if(event.data===0){status('Beautiful singing!');onEnded();}},
    onError(){if(token===version){status('This video could not play here. Watch the song on YouTube, then come back.');onUnavailable();}}
   }
  });
 }).catch(()=>{if(token===version){status('The player could not connect. Watch the song on YouTube, then come back.');onUnavailable();}});
}
window.JellySong={mount,destroy};
})();
