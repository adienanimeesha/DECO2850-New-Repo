const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
function setup(t,{muted=false,rejectOnce=false}={}){
 const dom=new JSDOM('<button id="music-toggle"></button>',{runScripts:'outside-only',url:'http://localhost/mobile.html'});
 t.after(()=>dom.window.close());const w=dom.window,d=w.document,audios=[];let visibility='visible';
 Object.defineProperty(d,'visibilityState',{get:()=>visibility});
 w.Audio=class{
  constructor(src){this.src=src;this.paused=true;this.plays=0;this.pauses=0;this.currentTime=0;audios.push(this);}
  play(){this.plays++;if(rejectOnce){rejectOnce=false;return Promise.reject(new Error('gesture required'));}this.paused=false;return Promise.resolve();}
  pause(){this.paused=true;this.pauses++;}
 };
 if(muted)w.localStorage.setItem('jelly-room-music-muted-v1','1');
 w.eval(fs.readFileSync('public/js/room-music.js','utf8'));
 return{w,d,audio:audios[0],festivalAudio:audios[1],moonAudio:audios[2],button:d.querySelector('button'),gesture(){d.dispatchEvent(new w.Event('pointerdown'));},visibility(value){visibility=value;d.dispatchEvent(new w.Event('visibilitychange'));}};
}
test('the supplied music starts after a gesture and loops continuously through welcome and common room',async t=>{
 const p=setup(t);assert.equal(p.audio.src,'/assetNEW/background-music.mp3');assert.equal(p.audio.loop,true);assert.equal(p.audio.volume,.15);
 assert.equal(p.audio.plays,0);p.gesture();await new Promise(resolve=>setImmediate(resolve));assert.equal(p.audio.plays,1);
 p.audio.currentTime=12;const state={phase:'room'};p.w.RoomMusic.sync(state);assert.equal(p.audio.plays,1);assert.deepEqual(state,{phase:'room'});
 p.w.dispatchEvent(new p.w.CustomEvent('jelly-story-visibility',{detail:{open:true}}));assert.equal(p.audio.paused,true);assert.equal(p.button.hidden,true);
 p.w.dispatchEvent(new p.w.CustomEvent('jelly-story-visibility',{detail:{open:false}}));await new Promise(resolve=>setImmediate(resolve));assert.equal(p.audio.paused,false);assert.equal(p.audio.currentTime,12,'story pause does not reset music');
 for(const phase of ['travelling','festival','returning']){p.w.RoomMusic.sync({phase});assert.equal(p.audio.paused,true);}
 p.w.RoomMusic.sync({phase:'aquarium'});await new Promise(resolve=>setImmediate(resolve));assert.equal(p.audio.paused,false);
});
test('mute persists and hidden pages pause without losing the loop position',async t=>{
 const p=setup(t,{muted:true});p.gesture();assert.equal(p.audio.plays,0);
 p.button.click();await new Promise(resolve=>setImmediate(resolve));assert.equal(p.audio.paused,false);assert.equal(p.w.localStorage.getItem('jelly-room-music-muted-v1'),'0');
 p.visibility('hidden');assert.equal(p.audio.paused,true);p.visibility('visible');await new Promise(resolve=>setImmediate(resolve));assert.equal(p.audio.paused,false);
 p.button.click();assert.equal(p.audio.paused,true);assert.equal(p.w.localStorage.getItem('jelly-room-music-muted-v1'),'1');
});
test('blocked autoplay can be retried on the next tap',async t=>{
 const p=setup(t,{rejectOnce:true});p.gesture();await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(p.button.getAttribute('aria-pressed'),'false');p.gesture();await new Promise(resolve=>setImmediate(resolve));assert.equal(p.audio.plays,2);assert.equal(p.audio.paused,false);
});
test('music recovers if a story opens and closes while playback is still starting',async t=>{
 const p=setup(t),play=p.audio.play.bind(p.audio);let release;
 p.audio.play=()=>{p.audio.paused=false;return new Promise(resolve=>{release=resolve;});};
 p.gesture();p.w.dispatchEvent(new p.w.CustomEvent('jelly-story-visibility',{detail:{open:true}}));
 p.w.dispatchEvent(new p.w.CustomEvent('jelly-story-visibility',{detail:{open:false}}));
 p.audio.play=play;release();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(p.audio.paused,false);
});

test('Bau Nyale loops its own quiet music, ducks for speech, and stops on exit',async t=>{
 const p=setup(t);p.gesture();await new Promise(resolve=>setImmediate(resolve));
 p.w.RoomMusic.sync({phase:'festival',festivalId:'bau-nyale',language:'indonesian'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(p.audio.paused,true);assert.equal(p.festivalAudio.paused,false);
 assert.equal(p.festivalAudio.src,'/assetNEW/cupak-gerantang.MP3');assert.equal(p.festivalAudio.loop,true);
 assert.equal(p.festivalAudio.volume,.10);assert.equal(p.button.hidden,false);
 p.w.dispatchEvent(new p.w.CustomEvent('jelly-speech',{detail:{speaking:true}}));assert.equal(p.festivalAudio.volume,.025);
 p.w.dispatchEvent(new p.w.CustomEvent('jelly-speech',{detail:{speaking:false}}));assert.equal(p.festivalAudio.volume,.10);
 p.festivalAudio.currentTime=9;const starts=p.festivalAudio.plays;
 p.w.dispatchEvent(new p.w.CustomEvent('jelly-story-visibility',{detail:{open:true}}));assert.equal(p.festivalAudio.paused,false);assert.equal(p.festivalAudio.plays,starts);assert.equal(p.festivalAudio.currentTime,9);
 p.w.dispatchEvent(new p.w.CustomEvent('jelly-story-visibility',{detail:{open:false}}));await new Promise(resolve=>setImmediate(resolve));assert.equal(p.festivalAudio.paused,false);
 p.w.RoomMusic.sync({phase:'festival',festivalId:'mid-autumn',language:'chinese'});assert.equal(p.festivalAudio.paused,true);assert.equal(p.moonAudio.paused,false);assert.equal(p.button.hidden,false);
 p.w.RoomMusic.sync({phase:'room'});await new Promise(resolve=>setImmediate(resolve));assert.equal(p.audio.paused,false);
});

for(const [language,festivalId,trackName]of [['indonesian','bau-nyale','festivalAudio'],['chinese','mid-autumn','moonAudio']])test(`${language} storybook loops its cultural music, ducks for Jelly and narrator, and restores room music`,async t=>{
 const p=setup(t),track=p[trackName];p.w.RoomMusic.sync({phase:'room',language,festivalId:null});p.gesture();await new Promise(resolve=>setImmediate(resolve));
 p.audio.currentTime=14;
 p.w.dispatchEvent(new p.w.CustomEvent('jelly-story-visibility',{detail:{open:true,language}}));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(p.audio.paused,true);assert.equal(track.paused,false);assert.equal(track.loop,true);assert.equal(track.volume,.10);assert.equal(p.button.hidden,false);
 if(language==='chinese')assert.equal(track.src,'/assetNEW/moonfestivalsong.MP3');
 for(const role of ['jelly','narrator']){
  p.w.dispatchEvent(new p.w.CustomEvent('jelly-speech',{detail:{speaking:true,role}}));assert.equal(track.volume,.025);
  p.w.dispatchEvent(new p.w.CustomEvent('jelly-speech',{detail:{speaking:false,role}}));assert.equal(track.volume,.10);
 }
 track.currentTime=7;p.visibility('hidden');assert.equal(track.paused,true);p.visibility('visible');await new Promise(resolve=>setImmediate(resolve));assert.equal(track.paused,false);assert.equal(track.currentTime,7);
 p.button.click();assert.equal(track.paused,true);p.button.click();await new Promise(resolve=>setImmediate(resolve));assert.equal(track.paused,false);
 p.w.dispatchEvent(new p.w.CustomEvent('jelly-story-visibility',{detail:{open:false}}));await new Promise(resolve=>setImmediate(resolve));assert.equal(track.paused,true);assert.equal(p.audio.paused,false);assert.equal(p.audio.currentTime,14);
 p.w.RoomMusic.sync({phase:'festival',festivalId,language});await new Promise(resolve=>setImmediate(resolve));assert.equal(track.paused,false);assert.equal(track.currentTime,7);assert.equal(p.audio.paused,true);
 p.w.RoomMusic.sync({phase:'returning',language});assert.equal(track.paused,true);
});
test('storybook language selects its music even when a festival ID is not available',async t=>{
 const p=setup(t);p.w.RoomMusic.sync({phase:'room'});p.gesture();await new Promise(resolve=>setImmediate(resolve));
 p.w.dispatchEvent(new p.w.CustomEvent('jelly-story-visibility',{detail:{open:true,language:'chinese'}}));await new Promise(resolve=>setImmediate(resolve));assert.equal(p.moonAudio.paused,false);assert.equal(p.festivalAudio.paused,true);
 p.w.dispatchEvent(new p.w.CustomEvent('jelly-story-visibility',{detail:{open:true,language:'indonesian'}}));await new Promise(resolve=>setImmediate(resolve));assert.equal(p.moonAudio.paused,true);assert.equal(p.festivalAudio.paused,false);
});
