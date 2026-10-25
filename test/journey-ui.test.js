const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const journeys=require('../public/js/journey-content');
function page(t,name='mobile.html') {
 const source=fs.readFileSync(path.join(__dirname,'../public',name),'utf8').replace(/<script[\s\S]*?<\/script>/g,'');
 const dom=new JSDOM(source,{runScripts:'outside-only',url:'http://localhost:3000/'+name});t.after(()=>dom.window.close());
 const w=dom.window;let now=0,sequence=0;const frames=new Map(),timers=new Map(),events=[],handlers={};
 const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 w.HTMLCanvasElement.prototype.getContext=()=>context;
 w.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/png;base64,Y29sb3Vy';
 w.HTMLImageElement.prototype.decode=()=>Promise.resolve();
 w.HTMLElement.prototype.setPointerCapture=()=>{};
 w.HTMLElement.prototype.getBoundingClientRect=function(){return {left:0,top:0,width:960,height:520,right:960,bottom:520};};
 w.Image=class{constructor(){this.complete=true;this.naturalWidth=100;this.naturalHeight=100;}set src(s){this._src=s;this.onload?.();}get src(){return this._src;}};
 Object.defineProperty(w.performance,'now',{value:()=>now});
 w.requestAnimationFrame=fn=>{const id=++sequence;frames.set(id,fn);return id;};w.cancelAnimationFrame=id=>frames.delete(id);
 w.setTimeout=(fn,delay)=>{const id=++sequence;timers.set(id,{fn,at:now+delay});return id;};w.clearTimeout=id=>timers.delete(id);
 const socket={connected:true,on:(event,fn)=>{handlers[event]=fn;},emit:(event,payload)=>{events.push([event,payload]);respond(event,payload);}};
 w.io=()=>socket;
 let state={phase:'aquarium',language:null,storyPage:0,storyDone:false,invited:false,outfit:null,festivalArea:0,festivalMission:0,festivalFeedback:false,festivalFound:[],bag:[],memories:[],trip:0};
 function publish(){handlers['journey-state']?.(structuredClone(state));}
 function respond(event,payload){
  const c=journeys[state.language];
  if(event==='journey-start'){state={phase:'departing',language:typeof payload==='string'?payload:payload.language,storyPage:0,storyDone:false,invited:false,outfit:null,festivalArea:0,festivalMission:0,festivalFeedback:false,festivalFound:[],bag:[],memories:[],trip:state.trip+1};publish();return;}
  if(event==='journey-story-page'&&payload===state.storyPage){state.bag.push({...c.storyRewards[payload],language:state.language,source:'story'});state.storyPage++;state.storyDone=state.storyPage===5;publish();}
  if(event==='journey-invitation'){state.invited=true;publish();}
  if(event==='journey-try-outfit'){state.outfit=payload;publish();}
  if(event==='journey-festival'){state.phase='travelling';publish();}
  if(event==='journey-area'&&!state.festivalFeedback&&Math.abs(payload-state.festivalArea)===1&&c.festivalAreas[payload]){state.festivalArea=payload;publish();}
  if(event==='journey-find'&&!state.festivalFeedback){const item=c.festivalItems[state.festivalMission];if(item?.id!==payload||item.area!==state.festivalArea){handlers['journey-hint']?.('Keep looking for '+item?.word);return;}state.festivalFound.push(payload);state.bag.push({...item,language:state.language,source:'festival'});state.festivalFeedback=true;publish();}
  if(event==='journey-next-festival'&&state.festivalFeedback){state.festivalFeedback=false;state.festivalMission++;publish();}
  if(event==='journey-return'){state.phase='returning';state.memories=[...state.bag];publish();}
  if(event==='journey-exit'){state.phase='returning';state.memories=[...state.bag];publish();}
 }
 function load(file){w.eval(fs.readFileSync(path.join(__dirname,'../public/js',file),'utf8'));}
 for(const file of ['journey-content.js','ocean-art.js',name==='mobile.html'?'journey-mobile.js':'aquarium.js'])load(file);
 if(name==='mobile.html')load('ocean-room.js');
 handlers.connect?.();publish();
 async function advance(ms){for(let i=0;i<Math.ceil(ms/50);i++){now+=50;for(const[id,task]of [...timers])if(task.at<=now){timers.delete(id);task.fn();}const current=[...frames];frames.clear();current.forEach(([,fn])=>fn(now));await Promise.resolve();}}
 function click(selector){const el=w.document.querySelector(selector);assert.ok(el,`Missing ${selector}`);assert.notEqual(el.disabled,true,`${selector} disabled`);if(typeof el.click === "function")el.click();else el.dispatchEvent(new w.MouseEvent("click",{bubbles:true}));}
 function walk(id){
  const item=state.phase==='festival'?([...journeys[state.language].festivalItems,...journeys[state.language].festivalAreas[state.festivalArea].distractors,{id:'area-right',x:880,y:450},{id:'area-left',x:80,y:450}].find(i=>i.id===id)):{book:{x:486,y:269},wardrobe:{x:810,y:212},memories:{x:190,y:413}}[id];
  assert.ok(item,'Unknown world station '+id);
  w.document.getElementById('game').dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true,clientX:item.x,clientY:item.y*520/620}));
 }
 return {w,events,advance,click,walk,get state(){return state;},update(data){Object.assign(state,data);publish();}};
}
for(const language of ['indonesian','chinese'])test(`${language}: mobile completes a cultural story, accepts an invitation, dresses, and explores the festival`,async t=>{
 const p=page(t),d=p.w.document;
 p.click(`[data-language="${language}"]`);p.click('#start-adventure');assert.equal(d.querySelector('#travel-screen').hidden,false);
 p.update({phase:'room'});assert.equal(d.querySelector('#language-screen').hidden,true);
 assert.equal(d.querySelector('#mission-step').textContent,'MISSION 1 OF 5');
 assert.equal(d.querySelector('#mailbox-button').disabled,true);
 p.walk('book');await p.advance(6500);assert.equal(d.querySelector('#storybook-backdrop').hidden,false);
 for(let chapter=0;chapter<5;chapter++){
  for(let beat=0;beat<3;beat++){p.click('#scene-continue');await p.advance(100);}
  if(language==='chinese'){
   assert.equal(d.querySelector('.chinese-choices'),null,'no separate Chinese choice controls');
   assert.equal(d.querySelector('.chinese-scene button'),null);
   const ids=[['story-shell'],['prince-left','prince-right'],['peace-ripple'],['nyale-target'],['scene-boat']][chapter];
   for(const id of ids){assert.equal(d.querySelector(`[data-chinese-choice="${id}"]`).closest('svg').classList.contains('chinese-scene'),true);p.click(`[data-chinese-choice="${id}"]`);}
  }else{
   const ids=[['story-shell'],['prince-left','prince-right'],['peace-ripple'],['nyale-target'],['scene-boat']][chapter];
   for(const id of ids)p.click('#'+id);
  }
  p.click('#scene-continue');await p.advance(100);
  p.click('#scene-continue');await p.advance(100);
  assert.equal(p.state.storyPage,chapter+1,`chapter ${chapter+1} awards vocabulary`);
  p.click('#scene-next');await p.advance(2000);
 }
 assert.equal(p.state.storyDone,true);assert.equal(d.querySelector('#storybook-backdrop').hidden,true);
 assert.equal(d.querySelector('#mission-step').textContent,'MISSION 3 OF 5');
 assert.match(d.querySelector('#objective').textContent,/invitation/);assert.equal(d.querySelector('#mailbox-button').disabled,false);
 p.click('#mailbox-button');assert.match(d.querySelector('#activity-title').textContent,/invited/);
 p.click('#accept-invite');await p.advance(6500);assert.match(d.querySelector('#activity-title').textContent,/Dress/);assert.equal(d.querySelectorAll('[data-outfit] .outfit-thumbnail svg').length,2);
 assert.equal(d.querySelector('#mission-step').textContent,'MISSION 4 OF 5');
 p.click(`[data-outfit="${journeys[language].outfits[0].id}"]`);
 p.click(`[data-outfit="${journeys[language].outfits[1].id}"]`);
 assert.equal(p.state.outfit,journeys[language].outfits[1].id);
 p.click('#outfit-done');assert.equal(p.state.phase,'travelling');p.update({phase:'festival'});
 assert.equal(d.querySelector('#mission-step').textContent,'MISSION 5 OF 5');
 for(const item of journeys[language].festivalItems){
  assert.equal(d.querySelector('#objective').textContent,item.request);
  if(item.area!==p.state.festivalArea){p.walk('area-right');await p.advance(6500);assert.equal(p.state.festivalArea,item.area);}
  const before=p.state.bag.length;
  p.walk(journeys[language].festivalAreas[item.area].distractors[0].id);await p.advance(6500);assert.equal(p.state.bag.length,before,'wrong object earns nothing');
  p.walk(item.id);await p.advance(6500);
  assert.equal(d.querySelector('#activity-title').textContent,item.thanks);
  assert.ok(d.querySelector('#activity-body').textContent.includes(item.fact));
  assert.equal(d.querySelector('#interaction').hidden,true,'no collect confirmation');
  p.click('#festival-next');
 }
 assert.equal(p.state.festivalFound.length,3);assert.ok(d.querySelector('#take-home'));
 p.click('#take-home');assert.equal(p.state.phase,'returning');assert.equal(p.state.memories.length,8);
 p.update({phase:'aquarium'});assert.equal(d.querySelector('#language-screen').hidden,false);
 assert.match(d.querySelector('#welcome-return').textContent,/8 discoveries/);
 assert.ok(!d.querySelector('script[src*="robot.js"]'));
});
test('refresh restores completed activity and memory book; aquarium displays returned collections',async t=>{
 const p=page(t);p.update({language:'chinese',phase:'room',trip:2,storyPage:5,storyDone:true,invited:true});
 p.walk('book');await p.advance(6500);
 // Reopening a completed story still lets the reader browse without earning duplicates.
 assert.equal(p.w.document.querySelector('#scene-next').disabled,false);
 p.click('#close-story');p.walk('memories');await p.advance(6500);assert.match(p.w.document.querySelector('#activity-title').textContent,/memory/);
 p.click('#close-activity');p.walk('wardrobe');await p.advance(6500);
 assert.equal(p.w.document.querySelector('#outfit-done').disabled,true,'must try an outfit before leaving');
 const a=page(t,'pet.html');a.update({language:'chinese',phase:'aquarium',trip:1,memories:[{...journeys.chinese.storyRewards[0],source:'story',language:'chinese'}]});
 assert.equal(a.w.document.querySelector('button'),null,'aquarium has no buttons');
 assert.equal(a.w.document.querySelector('a'),null,'aquarium has no links');
 assert.equal(a.w.document.querySelector('header'),null,'aquarium has no header');
 assert.match(a.w.document.querySelector('#aquarium').getAttribute('aria-label'),/1 collected memories/);
 a.update({phase:'room'});assert.match(a.w.document.querySelector('#aquarium-status').textContent,/common room/);
});
test('switching from a Chinese trip to Indonesian restores the reference story illustration',async t=>{
 const p=page(t),d=p.w.document;
 p.update({language:'chinese',phase:'room',trip:1});
 p.walk('book');await p.advance(6500);
 assert.ok(d.querySelector('.chinese-scene'));
 assert.equal(d.querySelector('#scene-stage > svg:not(.chinese-scene)').hasAttribute('hidden'),true);
 p.click('#close-story');p.update({phase:'aquarium'});
 p.update({language:'indonesian',phase:'room',trip:2});
 p.walk('book');await p.advance(6500);
 assert.equal(d.querySelector('.chinese-scene'),null);
 assert.equal(d.querySelector('#scene-stage > svg').hasAttribute('hidden'),false);
 assert.match(d.querySelector('#story-name').textContent,/Mandalika/);
});
test('swimming toward the book opens it automatically; closing it does not reopen it until approaching again',async t=>{
 const p=page(t),d=p.w.document;
 p.update({phase:'room',language:'indonesian',trip:1});
 p.w.dispatchEvent(new p.w.KeyboardEvent('keydown',{code:'ArrowUp',key:'ArrowUp'}));
 await p.advance(350);
 assert.equal(d.querySelector('#storybook-backdrop').hidden,false,'no Read confirmation is needed');
 p.click('#close-story');await p.advance(1000);
 assert.equal(d.querySelector('#storybook-backdrop').hidden,true,'the book stays closed while Jelly is nearby');
 p.w.dispatchEvent(new p.w.KeyboardEvent('keydown',{code:'ArrowDown',key:'ArrowDown'}));await p.advance(450);
 p.w.dispatchEvent(new p.w.KeyboardEvent('keyup',{code:'ArrowDown',key:'ArrowDown'}));
 p.w.dispatchEvent(new p.w.KeyboardEvent('keydown',{code:'ArrowUp',key:'ArrowUp'}));await p.advance(650);
 assert.equal(d.querySelector('#storybook-backdrop').hidden,false,'walking away and approaching again reopens it');
});
test('memory shelf opens on approach without a button and stays closed until approached again',async t=>{
 const p=page(t),d=p.w.document;
 p.update({phase:'room',language:'indonesian',trip:1});
 assert.equal(d.querySelector('#open-memories'),null);
 p.w.dispatchEvent(new p.w.KeyboardEvent('keydown',{code:'ArrowLeft',key:'ArrowLeft'}));await p.advance(1000);
 assert.equal(d.querySelector('#activity-screen').hidden,false);
 assert.match(d.querySelector('#activity-title').textContent,/memory book/);
 assert.equal(d.querySelector('#interaction').hidden,true);
 p.click('#close-activity');await p.advance(1000);
 assert.equal(d.querySelector('#activity-screen').hidden,true);
 p.w.dispatchEvent(new p.w.KeyboardEvent('keydown',{code:'ArrowRight',key:'ArrowRight'}));await p.advance(500);
 p.w.dispatchEvent(new p.w.KeyboardEvent('keyup',{code:'ArrowRight',key:'ArrowRight'}));
 p.w.dispatchEvent(new p.w.KeyboardEvent('keydown',{code:'ArrowLeft',key:'ArrowLeft'}));await p.advance(700);
 assert.equal(d.querySelector('#activity-screen').hidden,false);
});
test('memory shelf and book show only earned items, with no future rewards or duplicates',async t=>{
 const p=page(t),d=p.w.document,drawn=[];
 const paint=p.w.OceanArt.canvasMemory;
 p.w.OceanArt.canvasMemory=(ctx,item,x,y,size)=>{if([117,173,229].includes(x)&&[381,411].includes(y))drawn.push(item.icon);paint(ctx,item,x,y,size);};
 p.update({phase:'room',language:'indonesian',trip:1});await p.advance(50);
 assert.deepEqual(drawn,[],'empty shelf must not show reward artwork');
 p.walk('memories');await p.advance(6500);
 assert.equal(d.querySelectorAll('.memory-card').length,0);
 assert.match(d.querySelector('.memory-grid').textContent,/No discoveries yet/);
 const learned={...journeys.indonesian.storyRewards[0],language:'indonesian',source:'story'};
 drawn.length=0;p.update({storyPage:1,bag:[learned]});await p.advance(50);
 assert.deepEqual(drawn,['shell'],'only the learned reward is drawn');
 assert.equal(d.querySelectorAll('.memory-card').length,1);
 assert.match(d.querySelector('.memory-card').textContent,/kerang/);
 assert.doesNotMatch(d.querySelector('.memory-grid').textContent,/undangan|nyale|gendang/);
 drawn.length=0;p.update({memories:[learned],bag:[learned]});await p.advance(50);
 assert.deepEqual(drawn,['shell'],'returned and current copies must not duplicate');
 assert.equal(d.querySelectorAll('.memory-card').length,1);
});
test('Chinese Jelly mouth animates during narration, rests on pause, and page objects keep stable interaction targets',async t=>{
 const p=page(t),d=p.w.document,utterances=[];
 p.w.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
 p.w.speechSynthesis={speaking:false,cancel(){this.speaking=false;},pause(){},resume(){},speak(line){utterances.push(line);this.speaking=true;line.onstart?.();}};
 p.update({phase:'room',language:'chinese',trip:1});p.walk('book');await p.advance(6500);
 assert.ok(utterances.length>0);
 const mouth=d.querySelector('#narrator-mouth'),narrator=d.querySelector('.narrator-avatar'),moon=d.querySelector('[data-chinese-choice="story-shell"]');
 assert.equal(narrator.classList.contains('is-speaking'),true);
 const initial=mouth.getAttribute('ry');await p.advance(150);assert.notEqual(mouth.getAttribute('ry'),initial);
 p.click('#scene-play');assert.equal(mouth.getAttribute('ry'),'2');
 p.click('#scene-play');assert.equal(narrator.classList.contains('is-speaking'),true);
 for(let i=0;i<3;i++){p.click('#scene-continue');await p.advance(100);}
 p.w.speechSynthesis.speaking=false;utterances.at(-1).onend();await p.advance(100);
 assert.equal(mouth.getAttribute('ry'),'2','mouth rests while waiting for the child');
 assert.equal(d.querySelector('[data-chinese-choice="story-shell"]'),moon,'animation does not replace the illustrated target');
 assert.equal(moon.getAttribute('tabindex'),'0');assert.equal(moon.getAttribute('aria-disabled'),'false');
 moon.dispatchEvent(new p.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
 assert.equal(moon.getAttribute('aria-disabled'),'true','keyboard activates the illustrated moon');
});
function installStoryVoices(p,initialVoices) {
 let voices=initialVoices;
 const utterances=[],listeners=new Set();
 p.w.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
 p.w.speechSynthesis={speaking:false,getVoices:()=>voices,cancel(){this.speaking=false;},pause(){},resume(){},
  addEventListener(event,fn){if(event==='voiceschanged')listeners.add(fn);},removeEventListener(event,fn){listeners.delete(fn);},
  speak(line){utterances.push(line);this.speaking=true;line.onstart?.();}};
 return {utterances,finish(line=utterances.at(-1)){p.w.speechSynthesis.speaking=false;line.onend();},
  setVoices(value){voices=value;[...listeners].forEach(fn=>fn());},listeners};
}
async function reachStoryReward(p,chapter=0,language='chinese') {
 p.update({phase:'room',language,trip:1,storyPage:chapter});p.walk('book');await p.advance(6500);
 for(let i=0;i<3;i++){p.click('#scene-continue');await p.advance(100);}
 for(const id of [['story-shell'],['prince-left','prince-right'],['peace-ripple'],['nyale-target'],['scene-boat']][chapter])p.click(language==='chinese'?`[data-chinese-choice="${id}"]`:'#'+id);
 p.click('#scene-continue');await p.advance(100);
}
test('all Chinese story words use a Mandarin voice between English segments and never read pinyin aloud',async t=>{
 const english={name:'English default',lang:'en-US',default:true},cantonese={name:'Cantonese',lang:'zh-HK'},mandarin={name:'Tingting',lang:'zh-CN'};
 for(let chapter=0;chapter<5;chapter++){
  const p=page(t),speech=installStoryVoices(p,[english,cantonese,mandarin]);await reachStoryReward(p,chapter);
  const start=speech.utterances.length-1,reward=journeys.chinese.storyRewards[chapter];
  assert.equal(speech.utterances.at(-1).lang,'en-US');speech.finish();
  const word=speech.utterances.at(-1);assert.equal(word.text,reward.word);assert.equal(word.lang,'zh-CN');assert.equal(word.voice,mandarin);assert.equal(word.pitch,1);
  assert.equal(p.state.storyPage,chapter,'the chapter waits for the whole speech sequence');
  speech.finish();assert.equal(speech.utterances.at(-1).lang,'en-US');assert.equal(speech.utterances.at(-1).voice,english);
  const spoken=speech.utterances.slice(start).map(line=>line.text).join(' ');
  assert.equal(spoken.includes(reward.pronunciation),false,'pinyin is not spoken with an English voice');
  assert.match(p.w.document.querySelector('#scene-subtitle').textContent,new RegExp(reward.pronunciation),'pinyin stays visible');
  speech.finish();await p.advance(2200);assert.equal(p.state.storyPage,chapter+1);
 }
});
test('Indonesian story vocabulary uses an Indonesian voice, including repeated Sasak words',async t=>{
 const english={name:'English',lang:'en-US'},indonesian={name:'Damayanti',lang:'id-ID'};
 for(let chapter=0;chapter<5;chapter++){
  const p=page(t),speech=installStoryVoices(p,[english,indonesian]);await reachStoryReward(p,chapter,'indonesian');
  const start=speech.utterances.length-1;
  for(let i=0;i<20;i++){const count=speech.utterances.length;speech.finish();if(speech.utterances.length===count)break;}
  const parts=speech.utterances.slice(start),target=journeys.indonesian.storyRewards[chapter].word;
  assert.ok(parts.some(part=>part.text.toLowerCase()===target&&part.lang==='id-ID'));
  for(const part of parts.filter(part=>part.lang==='id-ID')){assert.equal(part.voice,indonesian);assert.equal(part.pitch,1);}
 }
});
test('Mandarin voice loading, pause, replay, and close preserve speech order and discard stale callbacks',async t=>{
 const p=page(t),english={name:'English',lang:'en-US'},mandarin={name:'Mandarin',lang:'zh-CN'},speech=installStoryVoices(p,[english]);
 await reachStoryReward(p);speech.finish();
 const waitingCount=speech.utterances.length;assert.equal(speech.listeners.size,1);
 p.click('#scene-play');speech.setVoices([english,mandarin]);assert.equal(speech.utterances.length,waitingCount,'voice arrival cannot play while paused');
 p.click('#scene-play');const word=speech.utterances.at(-1);assert.equal(word.text,'月亮');assert.equal(word.voice,mandarin);
 p.click('#scene-replay');const replay=speech.utterances.at(-1);assert.equal(replay.lang,'en-US');
 const replayCount=speech.utterances.length;speech.finish(word);assert.equal(speech.utterances.length,replayCount,'old word completion cannot enqueue another segment');
 p.click('#close-story');speech.finish(replay);await p.advance(1200);assert.equal(speech.utterances.length,replayCount);
 assert.equal(speech.listeners.size,0);
});
test('a device without a Mandarin voice uses subtitles instead of reading Hanzi with English or Cantonese',async t=>{
 const p=page(t),speech=installStoryVoices(p,[{name:'English',lang:'en-US'},{name:'Cantonese',lang:'zh-HK'}]);
 await reachStoryReward(p);speech.finish();await p.advance(1100);
 assert.match(p.w.document.querySelector('#scene-status').textContent,/Mandarin voice unavailable/);
 assert.equal(speech.utterances.some(line=>/\p{Script=Han}/u.test(line.text)),false);
 assert.equal(speech.listeners.size,0);
});
test('wardrobe opens automatically on approach without confirmation and stays closed until approached again',async t=>{
 const p=page(t),d=p.w.document;
 p.update({phase:'room',language:'chinese',trip:1,storyDone:true,invited:true});
 // Swim across the floor, then up toward the wardrobe.
 p.w.dispatchEvent(new p.w.KeyboardEvent('keydown',{code:'ArrowRight',key:'ArrowRight'}));await p.advance(1500);
 p.w.dispatchEvent(new p.w.KeyboardEvent('keyup',{code:'ArrowRight',key:'ArrowRight'}));
 p.w.dispatchEvent(new p.w.KeyboardEvent('keydown',{code:'ArrowUp',key:'ArrowUp'}));await p.advance(1000);
 assert.equal(d.querySelector('#activity-screen').hidden,false);assert.match(d.querySelector('#activity-title').textContent,/Dress/);
 assert.equal(d.querySelector('#interaction').hidden,true);
 p.click('#close-activity');await p.advance(1000);assert.equal(d.querySelector('#activity-screen').hidden,true);
 p.w.dispatchEvent(new p.w.KeyboardEvent('keydown',{code:'ArrowDown',key:'ArrowDown'}));await p.advance(450);
 p.w.dispatchEvent(new p.w.KeyboardEvent('keyup',{code:'ArrowDown',key:'ArrowDown'}));
 p.w.dispatchEvent(new p.w.KeyboardEvent('keydown',{code:'ArrowUp',key:'ArrowUp'}));await p.advance(550);
 assert.equal(d.querySelector('#activity-screen').hidden,false);
});
test('Bring Jelly home keeps its outfit and memories until starting a fresh adventure',async t=>{
 const p=page(t),d=p.w.document,learned={...journeys.chinese.storyRewards[0],language:'chinese',source:'story'};
 p.click('[data-language="chinese"]');p.click('#start-adventure');
 p.update({phase:'room',bag:[learned],storyPage:1,outfit:journeys.chinese.outfits[0].id});
 p.click('#return-early');assert.match(d.querySelector('#activity-title').textContent,/Bring Jelly home/);
 p.click('#keep-playing');assert.equal(p.state.bag.length,1,'cancelling keeps earned progress');
 p.click('#return-early');p.click('#exit-confirm');assert.equal(p.state.phase,'returning');
 p.update({phase:'aquarium'});
 assert.equal(p.state.memories.length,1);assert.equal(p.state.outfit,journeys.chinese.outfits[0].id);
 assert.equal(d.querySelector('#language-screen').hidden,false);assert.equal(d.querySelector('#start-adventure').disabled,true);
 assert.equal(d.querySelectorAll('[data-language][aria-pressed="true"]').length,0);
 assert.match(d.querySelector('#welcome-return').textContent,/1 discoveries/);
 p.click('[data-language="indonesian"]');p.click('#start-adventure');
 assert.equal(p.state.memories.length,0);assert.equal(p.state.bag.length,0);assert.equal(p.state.outfit,null);assert.equal(p.state.storyPage,0);
 assert.equal(p.w.JellyJourney.memories.length,0);
 p.update({phase:'room'});p.walk('memories');await p.advance(6500);
 assert.equal(d.querySelectorAll('.memory-card').length,0);assert.match(d.querySelector('.memory-grid').textContent,/No discoveries yet/);
 const a=page(t,'pet.html'),paint=a.w.OceanArt.canvasIcon,drawn=[];
 a.w.OceanArt.canvasIcon=(ctx,icon,...args)=>{drawn.push(icon);paint(ctx,icon,...args);};
 await a.advance(50);assert.equal(drawn.includes('shell'),false,'no reward shells are displayed initially');
 a.update({phase:'aquarium',language:'chinese',outfit:journeys.chinese.outfits[0].id,memories:[learned]});await a.advance(50);
 assert.match(a.w.document.querySelector('#aquarium-status').textContent,/1 collected memories/);
});
test('common room bubbles drift smoothly in seconds and wrap while invisible',t=>{
 const p=page(t);
 for(let i=0;i<18;i++)for(let time=0;time<100;time+=.1){
  const a=p.w.OceanArt.roomBubble(i,time),b=p.w.OceanArt.roomBubble(i,time+.016);
  assert.ok(a.alpha>=0&&a.alpha<=1);
  if(Math.abs(a.y-b.y)>10){assert.equal(a.alpha,0);assert.equal(b.alpha,0);}
  else assert.ok(Math.abs(a.y-b.y)<.5,'normal motion is at most 24px per second');
 }
});
for(const language of ['indonesian','chinese'])test(`${language}: reconnect restores thank-you and walking through side gates changes area`,async t=>{
 const p=page(t),d=p.w.document,item=journeys[language].festivalItems[0];
 p.update({phase:'festival',language,trip:1,festivalFeedback:true,festivalFound:[item.id],bag:[{...item,language,source:'festival'}]});
 assert.equal(d.querySelector('#activity-title').textContent,item.thanks);
 p.click('#close-activity');assert.equal(d.querySelector('#festival-home').hidden,false);
 p.w.dispatchEvent(new p.w.KeyboardEvent('keydown',{code:'ArrowRight'}));await p.advance(3000);
 assert.equal(p.state.festivalArea,0,'finish thank-you before moving');
 p.click('#festival-home');p.click('#festival-next');assert.equal(p.state.festivalMission,1);
 p.w.dispatchEvent(new p.w.KeyboardEvent('keydown',{code:'ArrowRight'}));await p.advance(3000);
 assert.equal(p.state.festivalArea,1,'D-pad / keyboard movement enters the adjacent map');
 p.w.dispatchEvent(new p.w.KeyboardEvent('keyup',{code:'ArrowRight'}));
 p.walk('area-left');await p.advance(2000);assert.equal(p.state.festivalArea,0,'can revisit the previous area');
 assert.equal(p.state.festivalMission,1,'changing map does not skip a mission');
});
