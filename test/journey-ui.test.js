const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const journeys=require('../public/js/journey-content');
const objectManifest=JSON.parse(fs.readFileSync('public/assetNEW/storybook-objects/PNG-MANIFEST.json'));
const objectAssets=new Map(objectManifest.assets.map(asset=>[path.basename(asset.file).replace(/^storybook-|\.png$/g,''),asset]));
test('storybook pack imports supplied objects with original pixels',()=>{
 const crypto=require('node:crypto');
 assert.equal(objectManifest.count,29);
 for(const asset of objectManifest.assets){
  const name=path.basename(asset.file),bytes=fs.readFileSync('public/assetNEW/storybook-objects/'+name);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),asset.sha256,name);
  assert.doesNotMatch(name,/sun/);
 }
});
function checkStoryObjectFits(svg){
 for(const image of svg.querySelectorAll('[data-story-object]')){
  const asset=objectAssets.get(image.dataset.storyObject);assert.ok(asset);
  assert.equal(image.getAttribute('pointer-events'),'none');
  assert.equal(image.getAttribute('preserveAspectRatio'),'xMidYMid meet');
  const width=Number(image.getAttribute('width')),height=Number(image.getAttribute('height'));
  assert.ok(Math.abs(width/height-asset.width/asset.height)<.00001,'PNG aspect ratio');
  if(image.dataset.storyObject.startsWith('zh-family')){
   const foot=Number(image.getAttribute('y'))+asset.bounds_alpha_above_32[3]*height/asset.height;
   assert.ok(Math.abs(foot-439)<.001,'family feet stay at the original body baseline');
   assert.equal(image.parentElement.querySelector('[data-family-hit-area]').getAttribute('opacity'),'0');
  }
 }
}
const storyBackgrounds={
 indonesian:['id-kingdom-day','id-kingdom-day','id-coast-day','id-coast-twilight','id-coast-day'],
 chinese:['zh-moonlit-garden','zh-family-courtyard','zh-family-courtyard','zh-lantern-garden','zh-lantern-garden']
};
function checkStoryBackground(svg,language,index){
 const background=svg.querySelector('[data-story-background]');assert.ok(background);
 assert.equal(background.getAttribute('data-story-background'),`/assetNEW/storybook-${storyBackgrounds[language][index]}.png`);
 assert.equal(svg.firstElementChild,background,'background is below all foreground layers');
 assert.equal(background.getAttribute('pointer-events'),'none');
 assert.deepEqual(['x','y','width','height'].map(name=>background.getAttribute(name)),['0','0','960','520']);
 assert.match(background.getAttribute('href'),/^data:image\/png;base64,/,'background is embedded for page turns');
 svg.querySelectorAll('[data-story-scenery]').forEach(node=>assert.equal(node.style.display,'none'));
}
test('six supplied storybook backgrounds have the expected PNG dimensions',()=>{
 for(const name of new Set(Object.values(storyBackgrounds).flat())){
  const bytes=fs.readFileSync(`public/assetNEW/storybook-${name}.png`);
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[1920,1040]);
 }
});
function page(t,name='mobile.html') {
 const source=fs.readFileSync(path.join(__dirname,'../public',name),'utf8').replace(/<script[\s\S]*?<\/script>/g,'');
 const dom=new JSDOM(source,{runScripts:'outside-only',url:'http://localhost:3000/'+name});t.after(()=>dom.window.close());
 const w=dom.window;let now=0,sequence=0;const frames=new Map(),timers=new Map(),events=[],handlers={},draws=[];
 const context=new Proxy({createLinearGradient:()=>({addColorStop(){}}),drawImage(...args){draws.push(args);}}, {get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 w.HTMLCanvasElement.prototype.getContext=()=>context;
 w.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/png;base64,Y29sb3Vy';
 w.HTMLImageElement.prototype.decode=()=>Promise.resolve();
 w.HTMLElement.prototype.setPointerCapture=()=>{};
 w.HTMLElement.prototype.getBoundingClientRect=function(){return {left:0,top:0,width:960,height:520,right:960,bottom:520};};
 w.Path2D=class{constructor(d){this.d=d;}};
 w.Image=class{constructor(){this.complete=true;this.naturalWidth=100;this.naturalHeight=100;}set src(s){this._src=s;if(/underwater-room-|commonroombackground/.test(s)){this.naturalWidth=1672;this.naturalHeight=941;}this.onload?.();}get src(){return this._src;}};
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
  const item=state.phase==='festival'?([...journeys[state.language].festivalItems,...journeys[state.language].festivalAreas[state.festivalArea].distractors,{id:'area-right',x:880,y:450},{id:'area-left',x:80,y:450}].find(i=>i.id===id)):{book:{x:486,y:393},wardrobe:{x:807,y:396},memories:{x:172,y:510}}[id];
  assert.ok(item,'Unknown world station '+id);
  w.document.getElementById('game').dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true,clientX:item.x,clientY:item.y*520/620}));
 }
 return {w,events,draws,advance,click,walk,giveElixir(){const e=w.document.querySelector('[data-legend-elixir][aria-disabled="false"]');if(e)e.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));},get state(){return state;},update(data){Object.assign(state,data);publish();}};
}
for(const language of ['indonesian','chinese'])test(`${language}: common room renders its cultural background and all four supplied furniture pictures`,async t=>{
 const p=page(t);
 p.update({phase:'room',language,trip:1,storyDone:true,invited:true,memories:[{id:'moon',word:'moon',icon:'moon'}]});await p.advance(100);
 const images=p.draws.map(draw=>draw[0]?.src);
 assert.ok(images.includes(`/assetNEW/underwater-room-${language==='chinese'?'chinese':'nusantara'}-balanced.png`));
 for(const name of ['bookshelf','memory-shelf','storybook','wardrobe'])assert.ok(images.includes(`/underwater_commonroom/${name}.png`),name+' is rendered');
});

for(const language of ['indonesian','chinese'])test(`${language}: festival requests and retries use narrator; thanks use Jelly; snapshots do not repeat cues`,async t=>{
 const p=page(t),spoken=[];
 p.w.JellyGuidanceContent=require('../public/js/guidance-content');
 p.w.VocabularySpeech={create:()=>({play(parts){spoken.push(parts);},cancel(){}})};
 const content=journeys[language];
 p.update({phase:'festival',language,trip:1,storyDone:true,invited:true,festivalMission:0,festivalArea:0,festivalFeedback:false});
 assert.equal(spoken.at(-1)[0].role,'narrator');
 assert.equal(spoken.at(-1).at(-1).text,p.w.JellyGuidanceContent.festivalRequest(content.festivalItems[0],content.festivalAreas[0]));
 const count=spoken.length;p.update({});assert.equal(spoken.length,count);
 p.walk(content.festivalAreas[0].distractors[0].id);await p.advance(6500);
 assert.equal(spoken.at(-1)[0].role,'narrator');assert.match(spoken.at(-1)[0].text,/Good try/);
 assert.equal(spoken.at(-1)[1].role,'jelly');assert.equal(spoken.at(-1)[1].text,content.festivalItems[0].request,'Jelly repeats the current request after feedback');
 p.walk(content.festivalItems[0].id);await p.advance(6500);
 assert.equal(spoken.at(-1)[0].text,content.festivalItems[0].thanks);
 assert.equal(spoken.at(-1)[0].role,'jelly');assert.equal(spoken.at(-1)[1].role,'narrator');
 p.click('#festival-next');assert.equal(spoken.at(-1)[0].role,'narrator');
 assert.equal(spoken.at(-1)[0].text,p.w.JellyGuidanceContent.festivalRequest(content.festivalItems[1],content.festivalAreas[1]));
});

for(const language of ['indonesian','chinese'])test(`${language}: wrong story choice gives narrator feedback then Jelly repeats the task without progressing`,async t=>{
 const p=page(t),recordings=[],lookups=[];
 p.w.speechSynthesis={speaking:false,cancel(){},getVoices:()=>[]};
 p.w.eval(fs.readFileSync('public/js/vocabulary-speech.js','utf8'));
 p.w.VocabularySpeech.recordingFor=(text,lang,role)=>{lookups.push({text,role});return '/audio/'+role+'.mp3';};
 p.w.Audio=class{constructor(src){this.src=src;recordings.push(this);}play(){this.onplaying?.();return Promise.resolve();}pause(){this.onpause?.();}};
 p.update({phase:'room',language,trip:1});p.walk('book');await p.advance(6500);
 for(let i=0;i<3;i++)p.click('#scene-continue');
 assert.equal(lookups.at(-1).role,'jelly','Jelly voices the story interaction request');
 recordings.at(-1).onended();
 p.click(language==='chinese'?'.chinese-scene [data-chinese-choice="story-fish"]':'#story-fish');
 assert.match(recordings.at(-1).src,/narrator\.mp3$/);
 await p.advance(100);assert.equal(p.w.document.querySelector('.narrator-avatar').classList.contains('is-speaking'),false,'Jelly does not lip-sync narrator feedback');
 recordings.at(-1).onended();
 assert.match(recordings.at(-1).src,/jelly\.mp3$/);
 assert.equal(lookups.at(-1).text,journeys[language].chapters[0].beats[3].line);
 assert.equal(p.state.storyPage,0,'a retry does not complete the task');
 p.click('#close-story');
});

test('saved story narration supports mouth animation, pause, replay, long playback and cancellation',async t=>{
 const p=page(t),recordings=[];
 p.w.eval(fs.readFileSync('public/js/vocabulary-speech.js','utf8'));
 p.w.VocabularySpeech.recordingFor=()=>'/audio/elevenlabs/test.mp3';
 p.w.Audio=class{constructor(src){this.src=src;recordings.push(this);}play(){this.onplaying?.();return Promise.resolve();}pause(){this.onpause?.();}};
 p.update({phase:'room',language:'chinese',trip:1});p.walk('book');await p.advance(6500);
 assert.equal(recordings.length,1);
 assert.equal(p.w.document.querySelector('.narrator-avatar').classList.contains('is-speaking'),true);
 p.click('#scene-play');await p.advance(1000);
 assert.equal(p.w.document.querySelector('.narrator-avatar').classList.contains('is-speaking'),false);
 p.click('#scene-play');await p.advance(20000);
 assert.equal(recordings.length,1,'long saved narration is not interrupted by the synthesis watchdog');
 const stale=recordings[0].onended;
 p.click('#scene-replay');assert.equal(recordings.length,2);
 stale();assert.equal(recordings.length,2,'old completion cannot advance a replay');
 p.click('#close-story');assert.equal(recordings[1].onended,null);
});

for(const language of ['indonesian','chinese'])test(`${language}: Continue responds without waiting for animation frames and page turns show a busy state`,async t=>{
 const p=page(t),d=p.w.document;
 p.update({phase:'room',language,trip:1});p.walk('book');await p.advance(6500);
 const label=d.querySelector('#scene-beat-label');
 for(let beat=0;beat<3;beat++){
  const before=label.textContent;p.click('#scene-continue');
  assert.notEqual(label.textContent,before,'a single click advances immediately, even without another frame');
 }
 p.click('#scene-continue');
 assert.match(d.querySelector('#scene-status').textContent,/Your turn/,'required interaction has visible feedback');
 const target=language==='chinese'?'[data-chinese-choice="story-shell"]':'#story-shell';
 assert.equal(d.activeElement,d.querySelector(target),'Continue focuses the required object');
 assert.equal(p.state.storyPage,0,'Continue cannot bypass the interaction');
 p.click(target);p.click('#scene-continue');p.click('#scene-continue');
 assert.equal(d.querySelector('#scene-continue').textContent,'Saving page…');
 assert.equal(d.querySelector('#scene-continue').disabled,true);
 await p.advance(100);
 assert.equal(d.querySelector('#scene-continue').textContent,'Next page →');
 assert.equal(p.events.filter(([event])=>event==='journey-story-page').length,1);
 const primary=d.querySelector('#scene-continue'),mutations=[];
 const observer=new p.w.MutationObserver(records=>mutations.push(...records));
 observer.observe(primary,{childList:true,attributes:true,subtree:true});
 await p.advance(300);p.update({});await p.advance(50);observer.disconnect();
 assert.equal(mutations.length,0,'ready button is not rewritten every animation frame during a mouse press');
 const decodes=[];p.w.HTMLImageElement.prototype.decode=()=>new Promise(resolve=>decodes.push(resolve));
 p.click('#scene-continue');
 assert.equal(d.querySelector('.storybook').getAttribute('aria-busy'),'true');
 assert.equal(d.querySelector('#scene-continue').textContent,'Turning page…');
 for(const id of ['scene-prev','scene-next','scene-continue','scene-play','scene-replay'])assert.equal(d.getElementById(id).disabled,true);
 // Hold decoding across several frames: no repeated click should be required.
 await p.advance(200);assert.equal(d.querySelector('#scene-stage').dataset.chapter,'0');
 for(let step=0;step<18;step++){decodes.splice(0).forEach(resolve=>resolve());await p.advance(100);}
 assert.equal(d.querySelector('#scene-stage').dataset.chapter,'1');
 assert.equal(d.querySelector('.storybook').hasAttribute('aria-busy'),false);
 assert.equal(d.querySelector('#scene-continue').disabled,false);
});
test('closing during page-image preparation cannot change a reopened story',async t=>{
 const p=page(t),d=p.w.document;
 p.update({phase:'room',language:'indonesian',trip:1,storyPage:5,storyDone:true});p.walk('book');await p.advance(6500);
 const decodes=[];p.w.HTMLImageElement.prototype.decode=()=>new Promise(resolve=>decodes.push(resolve));
 p.click('#scene-prev');await p.advance(100);
 p.click('#close-story');p.w.OceanRoom.startStory();
 assert.equal(d.querySelector('#scene-stage').dataset.chapter,'4');
 decodes.splice(0).forEach(resolve=>resolve());await p.advance(2000);
 assert.equal(d.querySelector('#scene-stage').dataset.chapter,'4','cancelled async turn stays cancelled');
 assert.equal(d.querySelector('.storybook').hasAttribute('aria-busy'),false);
});
for(const language of ['indonesian','chinese'])test(`${language}: the visible Next button turns a confirmed page while narration is replaying or paused`,async t=>{
 const p=page(t),d=p.w.document;
 p.update({phase:'room',language,trip:1});p.walk('book');await p.advance(6500);
 // Authoritative confirmation can arrive independently of the audio frame.
 p.update({storyPage:1});
 assert.equal(d.querySelector('#scene-continue').textContent,'Next page →');
 p.click('#scene-replay');p.click('#scene-play');
 p.click('#scene-continue');
 assert.equal(d.querySelector('.storybook').getAttribute('aria-busy'),'true','one activation is accepted despite narration state');
 await p.advance(2200);
 assert.equal(d.querySelector('#scene-stage').dataset.chapter,'1');
 p.click('#scene-prev');await p.advance(2200);
 assert.equal(d.querySelector('#scene-stage').dataset.chapter,'0');
 assert.equal(d.querySelector('#scene-continue').textContent,'Next page →','revisited completed pages do not require replaying all beats');
 p.click('#scene-continue');await p.advance(2200);
 assert.equal(d.querySelector('#scene-stage').dataset.chapter,'1');
 assert.equal(p.events.some(([event])=>event==='journey-story-page'),false,'navigation never resubmits a confirmed page');
});
for(const language of ['indonesian','chinese'])test(`${language}: mobile completes a cultural story, accepts an invitation, dresses, and explores the festival`,async t=>{
 const p=page(t),d=p.w.document;
 p.click(`[data-language="${language}"]`);p.click('#start-adventure');assert.equal(d.querySelector('#travel-screen').hidden,false);
 p.update({phase:'room'});assert.equal(d.querySelector('#language-screen').hidden,true);
 assert.equal(d.querySelector('#mission-step').textContent,'MISSION 1 OF 5');
 assert.equal(d.querySelector('#mailbox-button').disabled,true);
 p.walk('book');await p.advance(6500);assert.equal(d.querySelector('#storybook-backdrop').hidden,false);
 for(let chapter=0;chapter<5;chapter++){
  const scene=d.querySelector(language==='chinese'?'.chinese-scene':'#scene-stage > svg:not(.chinese-scene)');
  checkStoryObjectFits(scene);
  if(language==='indonesian'){
   for(const id of ['princess-leg-a','princess-right-arm','princess-eye-a','princess-mouth','left-leg-a','right-eye-a','prince-left-arm','prince-right-mouth'])assert.equal(scene.querySelector('#'+id).closest('[data-character-hit-area]').getAttribute('opacity'),'0','legacy schematic parts stay invisible');
   for(const id of ['princess','villager-left','villager-right','prince-left','prince-right']){
    const wrapper=scene.querySelector('#'+id),image=wrapper.querySelector(':scope > [data-character-art]');
    assert.ok(image,'supplied PNG replaces '+id);
    assert.equal(wrapper.querySelector(':scope > ellipse').getAttribute('cy'),'0','separate original shadow');
    const asset=objectAssets.get(image.dataset.storyObject),scale=Number(image.getAttribute('height'))/asset.height;
    assert.ok(Math.abs(Number(image.getAttribute('y'))+asset.bounds_alpha_above_32[3]*scale)<.001,'feet stay at local ground anchor');
    if(id.startsWith('prince-'))assert.equal(wrapper.querySelector('#'+id+'-invite').parentElement,wrapper,'invitation stays above character art');
   }
   assert.equal(scene.querySelector('#scene-sun').tagName.toLowerCase(),'circle');
   assert.equal(scene.querySelector('#festival-decor').querySelectorAll('path').length,0,'bunting has no duplicate old cord');
   for(const id of ['crowd-one','crowd-two','crowd-three'])assert.equal(scene.querySelector('#'+id).children.length,1,'crowd contains only the new full pose');
   assert.equal(scene.querySelector('#nyale-school').querySelectorAll('image').length,3,'separate school colours');
   assert.equal(scene.querySelector('#nyale-target-body').parentElement.id,'nyale-target');
  }else{
   assert.equal(scene.querySelectorAll('[data-story-tray]').length,[2,3].includes(chapter)?1:0);
   assert.equal(scene.querySelectorAll('[data-story-object^="zh-family-"]').length,chapter<=2?0:2);
   if(chapter===1||chapter===2)assert.equal(scene.querySelectorAll('[data-legend-character]').length,2);
  }
  checkStoryBackground(d.querySelector(language==='chinese'?'.chinese-scene':'#scene-stage > svg:not(.chinese-scene)'),language,chapter);
  if(language==='indonesian')for(const id of ['scene-background','scene-water','scene-plants','cloud-a','cloud-b','scene-sun','scene-boat','princess','nyale-target']){
   assert.notEqual(d.getElementById(id).style.display,'none',`${id} was not disabled with static scenery`);
   assert.equal(d.getElementById(id).closest('[data-story-scenery]'),null);
  }
  if(language==='indonesian')assert.equal(d.querySelector('#scene-water').getAttribute('fill'),'none','animated water must not cover the illustrated sand');
  else assert.equal(d.querySelector('.chinese-scene [data-chinese-success]'),null,'no decorative completion text over the artwork');
  if(language==='indonesian')for(const [id,file,cx,cy,r]of [['scene-boat','perahu.png','690','328','66'],['story-shell','seashell.png','684','443','45']]){
   const wrapper=d.getElementById(id),image=wrapper.querySelector('image'),hit=wrapper.querySelector('circle');
   assert.equal(image.getAttribute('href'),'/assetNEW/'+file);
   assert.equal(image.getAttribute('pointer-events'),'none','PNG padding must not enlarge the hit target');
   assert.deepEqual(['cx','cy','r'].map(name=>hit.getAttribute(name)),[cx,cy,r]);
   assert.ok(Math.abs(Number(image.getAttribute('width'))/Number(image.getAttribute('height'))-1.5)<.001,'original PNG aspect ratio');
  }
  if(language==='chinese')assert.equal(d.querySelectorAll('[data-story-table-art]').length,[1,2,3,4].includes(chapter)?1:0);
  for(let beat=0;beat<3;beat++){p.click('#scene-continue');p.giveElixir();await p.advance(100);}
  if(language==='indonesian'){
   const translation=id=>d.getElementById(id).getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/).slice(1).map(Number);
   assert.ok(translation('scene-boat')[1]<-40,'boat sits in the illustrated sea');
   assert.equal(translation('story-fish')[1],-30);
   assert.ok(translation('story-shell')[1]<=-30,'shell clears the lower-right prompt');
   if(chapter===3){
    assert.equal(d.getElementById('princess').getAttribute('opacity'),'0','Mandalika still disappears at the legend beat');
    assert.ok(translation('nyale-target')[1]<-110,'target nyale stays in water');
   }
  }
  if(language==='chinese'){
   assert.equal(d.querySelector('.chinese-choices'),null,'no separate Chinese choice controls');
   assert.equal(d.querySelector('.chinese-scene button'),null);
   const ids=[['story-shell'],['prince-left','prince-right'],['peace-ripple'],['nyale-target'],['scene-boat']][chapter];
   for(const id of ids){assert.equal(d.querySelector(`[data-chinese-choice="${id}"]`).closest('svg').classList.contains('chinese-scene'),true);p.click(`[data-chinese-choice="${id}"]`);}
  }else{
   const ids=[['story-shell'],['prince-left','prince-right'],['peace-ripple'],['nyale-target'],['scene-boat']][chapter];
   for(const id of ids)p.click('#'+id);
  }
  p.click('#scene-continue');p.giveElixir();await p.advance(100);
  p.click('#scene-continue');p.giveElixir();await p.advance(100);
  assert.equal(p.state.storyPage,chapter+1,`chapter ${chapter+1} awards vocabulary`);
  p.click('#scene-next');await p.advance(1000);
  if(chapter<4)for(const [selector,index]of [['#book-turn-still img',chapter],['#turn-front img',chapter],['.turn-back img',chapter+1]]){
   const image=d.querySelector(selector);assert.ok(image,selector);
   const snapshot=new p.w.DOMParser().parseFromString(decodeURIComponent(image.src.split(',').slice(1).join(',')),'image/svg+xml');
   checkStoryBackground(snapshot.documentElement,language,index);
   assert.equal(snapshot.querySelector('[hidden], [data-character-hit-area], [data-family-hit-area]'),null,'invisible art and hit geometry are omitted from turn pictures: '+snapshot.querySelector('[hidden], [data-character-hit-area], [data-family-hit-area]')?.outerHTML?.slice(0,240));
   snapshot.querySelectorAll('image').forEach(node=>assert.match(node.getAttribute('href'),/^data:/,'snapshot props have no external dependencies'));
  }
  await p.advance(1000);
 }
 assert.equal(p.state.storyDone,true);assert.equal(d.querySelector('#storybook-backdrop').hidden,true);
 assert.equal(d.querySelector('#mission-step').textContent,'MISSION 3 OF 5');
 assert.match(d.querySelector('#objective').textContent,/invitation/);assert.equal(d.querySelector('#mailbox-button').disabled,false);
 assert.equal(d.querySelector('#activity-screen').hidden,false,'the invitation opens when the story finishes');
 assert.match(d.querySelector('#activity-title').textContent,/invited/);
 p.click('#accept-invite');await p.advance(6500);assert.equal(d.querySelector('#activity-screen').hidden,true,'accepting does not walk or open the wardrobe');assert.equal(d.querySelector('#wardrobe-guide').hidden,false);p.walk('wardrobe');await p.advance(6500);assert.match(d.querySelector('#activity-title').textContent,/Dress/);assert.equal(d.querySelectorAll('[data-outfit] .outfit-thumbnail svg').length,2);
 assert.equal(d.querySelector('#mission-step').textContent,'MISSION 4 OF 5');
 p.click(`[data-outfit="${journeys[language].outfits[0].id}"]`);
 p.click(`[data-outfit="${journeys[language].outfits[1].id}"]`);
 assert.equal(p.state.outfit,journeys[language].outfits[1].id);
 const preview=d.querySelector('.wardrobe-preview svg');
 const outfitClass=language==='indonesian'?'bau-nyale-outfit':'moon-festival-outfit';
 assert.equal(preview.classList.contains(outfitClass),true);
 const chosen=d.querySelector(`[data-outfit="${p.state.outfit}"] .outfit-thumbnail svg`);
 assert.equal(preview.outerHTML,chosen.outerHTML,'wardrobe preview and choice use the same outfit artwork');
 assert.equal(d.querySelectorAll(`.outfit-thumbnail svg.${outfitClass}`).length,2);
 p.click('#outfit-done');assert.equal(p.state.phase,'travelling');p.update({phase:'festival'});
 p.draws.length=0;await p.advance(50);
 assert.ok(p.draws.some(([image])=>image?.src?.includes(outfitClass)&&image.src.includes(encodeURIComponent(journeys[language].outfits[1].colour))),
  `the selected ${language} outfit is drawn on the festival Jelly`);
 assert.equal(d.querySelector('#mission-step').textContent,'MISSION 5 OF 5');
 for(const item of journeys[language].festivalItems){
  assert.equal(d.querySelector('#objective').textContent,item.request);
  if(item.area!==p.state.festivalArea){p.walk('area-right');await p.advance(6500);assert.equal(p.state.festivalArea,item.area);}
  const before=p.state.bag.length;
  p.walk(journeys[language].festivalAreas[item.area].distractors[0].id);await p.advance(6500);assert.equal(p.state.bag.length,before,'wrong object earns nothing');
  p.walk(item.id);await p.advance(6500);
  assert.equal(d.querySelector('#activity-title').textContent,item.thanks);
  assert.ok(d.querySelector('#activity-body').textContent.includes(item.fact));
  assert.ok(d.querySelector('#festival-hear-word'),'the discovery can speak its word');
  if(language==='chinese')assert.equal(d.querySelector('.festival-pronunciation').textContent,item.pronunciation);
  assert.equal(d.querySelector('#interaction').hidden,true,'no collect confirmation');
  p.click('#festival-next');
 }
 assert.equal(p.state.festivalFound.length,3);assert.ok(d.querySelector('#take-home'));
 p.click('#take-home');assert.equal(p.state.phase,'returning');assert.equal(p.state.memories.length,8);
 p.update({phase:'aquarium'});assert.equal(d.querySelector('#language-screen').hidden,false);
 assert.match(d.querySelector('#welcome-return').textContent,/8 discoveries/);
 assert.ok(!d.querySelector('script[src*="robot.js"]'));
});
test('Moon Festival chapter three shows the family table and supports exploring and sharing by drag',async t=>{
 const p=page(t),d=p.w.document;
 p.update({phase:'room',language:'chinese',trip:1,storyPage:2});p.walk('book');await p.advance(6500);
 const scene=d.querySelector('.chinese-scene');
 assert.equal(d.querySelector('#scene-stage').dataset.chapter,'2');
 assert.equal(scene.querySelectorAll('[data-family]').length,2,'the family appears with the table');
 assert.equal(scene.querySelector('[data-moon-prop]').hasAttribute('hidden'),true,'cake and plate are absent before the food request');
 assert.ok(scene.querySelector('[data-story-explore="table"]'));
 assert.ok(scene.querySelector('[data-chinese-choice="peace-ripple"]'));
 const table=scene.querySelector('[data-story-explore="table"]'),tableImage=table.querySelector('[data-story-table-art]');
 assert.equal(tableImage.getAttribute('href'),'/assetNEW/table.png');
 assert.equal(tableImage.getAttribute('pointer-events'),'none');
 assert.equal(table.querySelector('[data-table-hit-area]').getAttribute('opacity'),'0');
 assert.ok(table.querySelector('[data-table-shadow]'),'table shadow remains a separate layer');
 assert.equal(table.querySelectorAll('[data-table-hit-area] path').length,2,'original exploration paths are retained');
 // Measured corners of the supplied PNG's flat top surface (source pixels).
 // Test the delivered plate's contact area rather than treating the transparent
 // image box as the tabletop.
 const top=[[219,351],[855,264],[1324,355],[662,464]],scale=Number(tableImage.getAttribute('width'))/1536;
 for(const [x,y]of [[490,409],[490,426],[462,416],[518,416]]){
  const point=[(x-Number(tableImage.getAttribute('x')))/scale,(y-Number(tableImage.getAttribute('y')))/scale];
  const sides=top.map(([ax,ay],i)=>{const [bx,by]=top[(i+1)%top.length];return(bx-ax)*(point[1]-ay)-(by-ay)*(point[0]-ax);});
  assert.ok(sides.every(side=>side>=0)||sides.every(side=>side<=0),'mooncake base stays on the measured tabletop');
 }
 assert.equal(d.querySelector('.story-audio-options').open,false,'audio controls are tucked away');
 assert.equal(d.querySelector('#scene-next').hidden,true,'Back and Continue are the main reading controls');
 for(let beat=0;beat<3;beat++){p.click('#scene-continue');p.giveElixir();await p.advance(100);}
 assert.equal(scene.querySelector('[data-moon-prop]').hasAttribute('hidden'),false,'food request reveals cake and plate');
 assert.equal(scene.querySelector('[data-family="prince-left"]').hasAttribute('hidden'),true,'Chang’e has left before Hou Yi remembers her');
 p.click('[data-story-explore="table"]');
 assert.match(d.querySelector('#scene-status').textContent,/shares mooncakes/);
 scene.getBoundingClientRect=()=>({left:0,top:0,width:960,height:520});
 const mooncake=scene.querySelector('[data-chinese-choice="peace-ripple"]');
 mooncake.dispatchEvent(new p.w.MouseEvent('pointerdown',{bubbles:true,clientX:672,clientY:374}));
 scene.dispatchEvent(new p.w.MouseEvent('pointermove',{bubbles:true,clientX:490,clientY:390}));
 scene.dispatchEvent(new p.w.MouseEvent('pointerup',{bubbles:true,clientX:490,clientY:390}));
 assert.equal(mooncake.getAttribute('transform'),'translate(-180 -10)','cake and plate land together on the tabletop');
 assert.ok(mooncake.querySelector('[data-story-tray]'));assert.ok(mooncake.querySelector('[data-story-mooncake]'));
 assert.equal(scene.querySelectorAll('[data-story-tray]').length,1);
 await p.advance(300);assert.equal(scene.querySelector('[data-moon-prop]').getAttribute('transform'),'translate(0 0)','plated mooncake does not float');
 assert.equal(scene.querySelector('[data-chinese-success]'),null,'decorative success text is removed');
 assert.equal(d.querySelector('#scene-stage').classList.contains('choice-complete'),true);
});
test('refresh restores completed activity and memory book; aquarium displays returned collections',async t=>{
 const p=page(t);p.update({language:'chinese',phase:'room',trip:2,storyPage:5,storyDone:true,invited:true,bag:[{...journeys.chinese.storyRewards[0],source:'story',language:'chinese'}]});
 p.walk('book');await p.advance(6500);
 // Reopening a completed story still lets the reader browse without earning duplicates.
 assert.equal(p.w.document.querySelector('#scene-next').disabled,false);
 p.click('#close-story');p.walk('memories');await p.advance(6500);assert.match(p.w.document.querySelector('#activity-title').textContent,/memory/);
 p.click('#close-activity');p.walk('wardrobe');await p.advance(6500);
 assert.equal(p.w.document.querySelector('#outfit-done').disabled,true,'must try an outfit before leaving');
 const a=page(t,'pet.html');a.update({language:'chinese',phase:'aquarium',trip:1,memories:[{...journeys.chinese.storyRewards[0],source:'story',language:'chinese'}]});
 assert.equal(a.w.document.querySelector('button'),null,'aquarium has no buttons');
 assert.equal(a.w.document.querySelector('.ghost-display-link').getAttribute('href'),'/pet.html?display=ghost&calibrate=1','aquarium offers access to the reflected display');
 assert.equal(a.w.document.querySelector('header'),null,'aquarium has no header');
 assert.match(a.w.document.querySelector('#aquarium').getAttribute('aria-label'),/1 collected memories/);
 a.update({phase:'room'});assert.match(a.w.document.querySelector('#aquarium-status').textContent,/common room/);
});

for (const [language, voice] of [
 ['indonesian',{name:'Damayanti',lang:'id_ID'}],
 ['chinese',{name:'Tingting',lang:'zh_CN'}]
]) test(`${language} memory replay selects the target-language voice`,async t=>{
 const p=page(t),spoken=[],english={name:'English',lang:'en-US'};
 p.w.SpeechSynthesisUtterance=class { constructor(text){this.text=text;} };
 p.w.speechSynthesis={getVoices:()=>[english,voice],cancel(){},speak(line){spoken.push(line);},
  addEventListener(){},removeEventListener(){}};
 p.w.eval(fs.readFileSync(path.join(__dirname,'../public/js/vocabulary-speech.js'),'utf8'));
 const item={...journeys[language].storyRewards[0],language,source:'story'};
 p.update({phase:'room',language,trip:1,memories:[item]});
 p.walk('memories');await p.advance(6500);
 p.click('.word-replay');
 assert.equal(spoken.length,1);
 assert.equal(spoken[0].text,item.word);
 assert.equal(spoken[0].voice,voice);
 assert.equal(spoken[0].lang,language==='chinese'?'zh-CN':'id-ID');
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
 p.update({phase:'room',language:'indonesian',trip:1,bag:[{...journeys.indonesian.storyRewards[0],language:'indonesian',source:'story'}]});
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
 p.w.OceanArt.canvasMemory=(ctx,item,x,y,size)=>{if([107,166,225].includes(x)&&[496,522].includes(y))drawn.push(item.icon);paint(ctx,item,x,y,size);};
 p.update({phase:'room',language:'indonesian',trip:1});await p.advance(50);
 assert.deepEqual(drawn,[],'empty shelf must not show reward artwork');
 p.walk('memories');await p.advance(6500);
 assert.equal(d.querySelector('#activity-screen').hidden,true,'the memory shelf appears after a word is earned');
 const learned={...journeys.indonesian.storyRewards[0],language:'indonesian',source:'story'};
 drawn.length=0;p.update({storyPage:1,bag:[learned]});await p.advance(50);
 assert.deepEqual(drawn,['shell'],'only the learned reward is drawn');
 p.walk('memories');await p.advance(6500);
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
 for(let i=0;i<3;i++){p.click('#scene-continue');p.giveElixir();await p.advance(100);}
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
 for(let i=0;i<3;i++){p.click('#scene-continue');p.giveElixir();await p.advance(100);}
 for(const id of [['story-shell'],['prince-left','prince-right'],['peace-ripple'],['nyale-target'],['scene-boat']][chapter])p.click(language==='chinese'?`[data-chinese-choice="${id}"]`:'#'+id);
 p.click('#scene-continue');p.giveElixir();await p.advance(100);
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
  speech.finish();await p.advance(14000);assert.equal(p.state.storyPage,chapter+1);
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
 p.click('#scene-play');const word=speech.utterances.at(-1);assert.equal(word.text,'太阳');assert.equal(word.voice,mandarin);
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
 assert.equal(d.querySelector('#language-screen').hidden,false);assert.equal(d.querySelector('#start-adventure').disabled,false);
 assert.equal(d.querySelector('[data-language="chinese"]').getAttribute('aria-pressed'),'true');
 assert.equal(d.querySelector('#continue-adventure').hidden,false);
 assert.match(d.querySelector('#welcome-return').textContent,/1 discoveries/);
 p.click('[data-language="indonesian"]');p.click('#start-adventure');
 assert.equal(p.state.memories.length,0);assert.equal(p.state.bag.length,0);assert.equal(p.state.outfit,null);assert.equal(p.state.storyPage,0);
 assert.equal(p.w.JellyJourney.memories.length,0);
 p.update({phase:'room'});p.walk('memories');await p.advance(6500);
 assert.equal(d.querySelector('#activity-screen').hidden,true,'a fresh adventure hides the empty memory shelf');
 const a=page(t,'pet.html'),paint=a.w.OceanArt.canvasIcon,drawn=[];
 a.w.OceanArt.canvasIcon=(ctx,icon,...args)=>{drawn.push(icon);paint(ctx,icon,...args);};
 await a.advance(50);assert.equal(drawn.includes('shell'),false,'no reward shells are displayed initially');
 a.update({phase:'aquarium',language:'chinese',outfit:journeys.chinese.outfits[0].id,memories:[learned]});await a.advance(50);
 assert.match(a.w.document.querySelector('#aquarium-status').textContent,/1 collected memories/);
});
test('common room bubbles drift smoothly in seconds and wrap while invisible',t=>{
 const p=page(t);
 for(let i=0;i<64;i++)for(let time=0;time<100;time+=.1){
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

for(const language of ['indonesian','chinese'])test(`${language}: completed story reuses the correct backgrounds when browsing backwards and forwards`,async t=>{
 const p=page(t),d=p.w.document;
 p.update({phase:'room',language,trip:1,storyPage:5,storyDone:true});p.walk('book');await p.advance(6500);
 const scene=()=>d.querySelector(language==='chinese'?'.chinese-scene':'#scene-stage > svg:not(.chinese-scene)');
 checkStoryBackground(scene(),language,4);
 for(let index=3;index>=0;index--){p.click('#scene-prev');await p.advance(2200);assert.equal(d.querySelector('#scene-stage').dataset.chapter,String(index));checkStoryBackground(scene(),language,index);}
 for(let index=1;index<5;index++){p.click('#scene-next');await p.advance(2200);assert.equal(d.querySelector('#scene-stage').dataset.chapter,String(index));checkStoryBackground(scene(),language,index);}
 assert.equal(p.events.some(([event])=>event==='journey-story-page'),false,'browsing does not award duplicate story progress');
});


test('Hou Yi’s arrows remove nine suns, keep the final sun, and freeze while paused',async t=>{
 const p=page(t),d=p.w.document;
 p.update({phase:'room',language:'chinese',trip:1,storyPage:0});p.walk('book');await p.advance(6500);
 p.click('#scene-continue');p.click('#scene-continue');await p.advance(1500);
 const scene=d.querySelector('.chinese-scene'),arrow=scene.querySelector('[data-legend-arrow]');
 const gone=()=>[...scene.querySelectorAll('[data-extra-sun]')].filter(sun=>sun.getAttribute('opacity')==='0').length;
 assert.ok(gone()>0&&gone()<9,'suns disappear one by one during Hou Yi’s narration');
 assert.equal(arrow.getAttribute('opacity'),'1');
 const before=arrow.getAttribute('transform');p.click('#scene-play');await p.advance(1000);
 assert.equal(arrow.getAttribute('transform'),before,'pause freezes the arrow');
 p.click('#scene-play');await p.advance(10500);
 assert.equal(gone(),9);
 assert.ok(scene.querySelector('[data-chinese-choice="story-shell"]'),'the remaining sun stays available to select');
});

test('the gift stays at home before Peng Meng arrives and Chang’e rises slowly on the next page',async t=>{
 const p=page(t),d=p.w.document;
 p.update({phase:'room',language:'chinese',trip:1,storyPage:1});p.walk('book');await p.advance(6500);
 assert.ok(d.querySelector('[data-gift-elixir]'));
 assert.equal(d.querySelector('[data-peng-meng]'),null);
 p.click('#close-story');
 p.update({storyPage:2});p.w.OceanRoom.startStory();await p.advance(6500);
 const scene=d.querySelector('.chinese-scene'),peng=scene.querySelector('[data-peng-meng]'),change=scene.querySelector('[data-family="prince-left"]');
 assert.equal(peng.getAttribute('opacity'),'1');
 assert.equal(peng.getAttribute('transform'),'translate(470 0)');
 p.click('#scene-continue');p.click('#scene-continue');p.giveElixir();await p.advance(1200);
 const position=change.getAttribute('transform');assert.notEqual(position,'translate(265 0)');
 p.click('#scene-play');await p.advance(1000);assert.equal(change.getAttribute('transform'),position);
 p.click('#scene-play');await p.advance(6800);assert.equal(change.getAttribute('transform'),'translate(705 -245)');
 assert.equal(scene.querySelector('[data-legend-elixir]').getAttribute('opacity'),'0');
});


test('generated Chinese legend character cutouts are local RGBA PNGs',()=>{
 for(const name of ['change','houyi','pengmeng']){
  const bytes=fs.readFileSync(`public/assetNEW/storybook-zh-${name}.png`);
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(bytes[25],6,'the character retains its alpha channel');
  assert.ok(bytes.readUInt32BE(16)>=1024&&bytes.readUInt32BE(20)>=1024);
 }
});

for(const language of ['indonesian','chinese'])test(`${language}: festival book replay starts at page one and preserves mission progress`,async t=>{
 const p=page(t),d=p.w.document;
 p.update({phase:'festival',language,trip:1,storyPage:5,storyDone:true,invited:true,festivalMission:1,festivalArea:1});
 const before=JSON.stringify(p.state);
 assert.equal(d.querySelector('#festival-storybook').hidden,false);
 p.click('#festival-storybook');await p.advance(2200);
 assert.equal(d.querySelector('#storybook-backdrop').hidden,false);
 assert.equal(d.querySelector('#scene-stage').dataset.chapter,'0');
 p.click('#close-story');
 assert.equal(d.querySelector('#storybook-backdrop').hidden,true);
 assert.equal(JSON.stringify(p.state),before);
 assert.equal(p.events.some(([event])=>event==='journey-story-page'||event==='journey-story-select'),false);
});

test('Jade Rabbit discovery is optional, only on the final Chinese page, and pauses playback',async t=>{
 const p=page(t),d=p.w.document;
 p.update({phase:'room',language:'chinese',trip:1,storyPage:4});p.walk('book');await p.advance(2200);
 const discovery=d.querySelector('#jade-rabbit-discovery');
 assert.equal(discovery.hidden,true);
 assert.equal(d.querySelector('[data-moon-rabbit]').getAttribute('opacity'),'0');
 p.click('#scene-continue');
 assert.equal(d.querySelector('[data-moon-rabbit]').getAttribute('opacity'),'0');
 p.click('#scene-continue');
 assert.equal(d.querySelector('[data-moon-rabbit]').getAttribute('opacity'),'1');
 assert.equal(discovery.hidden,false);
 assert.match(discovery.textContent,/lives on the Moon with Chang’e/);
 assert.match(discovery.textContent,/rabbit-shaped lantern/);
 discovery.open=true;discovery.dispatchEvent(new p.w.Event('toggle'));
 assert.match(d.querySelector('#scene-play').textContent,/Play/);
 p.click('#close-story');p.update({storyPage:0});p.w.OceanRoom.startStory();await p.advance(2200);
 assert.equal(discovery.hidden,true);assert.equal(discovery.open,false);
});

test('Continue repeats the glowing-water task in Jelly’s voice',async t=>{
 const p=page(t),lookups=[],recordings=[];
 p.w.speechSynthesis={speaking:false,cancel(){},getVoices:()=>[]};
 p.w.eval(fs.readFileSync('public/js/vocabulary-speech.js','utf8'));
 p.w.VocabularySpeech.recordingFor=(text,lang,role)=>{lookups.push({text,role});return '/audio/elevenlabs/task.mp3';};
 p.w.Audio=class{constructor(){recordings.push(this);}play(){this.onplaying?.();return Promise.resolve();}pause(){this.onpause?.();}};
 p.update({phase:'room',language:'indonesian',trip:1,storyPage:2});p.walk('book');await p.advance(6500);
 for(let i=0;i<3;i++)p.click('#scene-continue');recordings.at(-1).onended();
 p.click('#scene-continue');assert.match(lookups.at(-1).text,/glowing water/);assert.equal(lookups.at(-1).role,'jelly');p.click('#close-story');
});

test('changing language switches room backgrounds and renders plenty of animated bubbles',async t=>{
 const p=page(t),bubbles=new Set();const original=p.w.OceanArt.roomBubble;
 p.w.OceanArt.roomBubble=(index,seconds)=>{bubbles.add(index);return original(index,seconds);};
 for(const [language,name]of [['indonesian','nusantara'],['chinese','chinese'],['indonesian','nusantara']]){
  p.draws.length=0;bubbles.clear();p.update({phase:'room',language});await p.advance(100);
  const backgrounds=p.draws.map(draw=>draw[0]?.src).filter(src=>src?.includes('underwater-room-'));
  assert.ok(backgrounds.length);assert.ok(backgrounds.every(src=>src===`/assetNEW/underwater-room-${name}-balanced.png`));
  assert.ok(bubbles.size>=50,'the room has a dense field of drifting bubbles');
 }
});

test('bookshelf, storybook and wardrobe arrow tips follow their fitted furniture across screen sizes',async t=>{
 const p=page(t),d=p.w.document;
 p.update({phase:'room',language:'indonesian',trip:1,storyDone:true,invited:true,bag:[{id:'book'}]});
 const guides=[['learning-guidance','.guidance-arrow','bookshelf'],['storybook-guidance','.storybook-guidance-arrow','storybook'],['wardrobe-guide','span','wardrobe'],['memory-shelf-guidance','.memory-guidance-arrow','memory-shelf']];
 for(const [id]of guides){const node=d.getElementById(id);node.hidden=false;node.getBoundingClientRect=()=>({left:0,top:0,width:220,height:100});}
 for(const [width,height]of [[390,590],[844,390],[1280,800]]){
  const rect={left:20,top:30,width,height,right:20+width,bottom:30+height};
  d.getElementById('game').getBoundingClientRect=()=>rect;d.getElementById('game').parentElement.getBoundingClientRect=()=>rect;
  p.draws.length=0;await p.advance(100);
  for(const [id,selector,file]of guides){
   const guide=d.getElementById(id),arrow=guide.querySelector(selector);
   const drawn=p.draws.find(args=>args[0]?.src===`/underwater_commonroom/${file}.png`);assert.ok(drawn,file);
   const x=(drawn[1]+drawn[3]/2)*width/960,y=(drawn[2]+drawn[4]*.08)*height/620;
   const tipX=parseFloat(guide.style.left)+parseFloat(arrow.style.left)+parseFloat(arrow.style.width)/2;
   const tipY=parseFloat(guide.style.top)+parseFloat(arrow.style.top)+parseFloat(arrow.style.height);
   assert.ok(Math.abs(tipX-x)<.01,`${file} arrow is horizontally centered on the artwork`);
   assert.ok(Math.abs(tipY-y)<.01,`${file} arrow points inside the artwork rather than at the old wall position`);
   assert.equal(arrow.textContent,'');
   assert.equal(arrow.querySelector('img').getAttribute('src'),'/assetNEW/room-guidance-arrow.svg');
  }
 }
});

test('tapping the mooncake delivers its plate too, with no independent floating',async t=>{
 const p=page(t),d=p.w.document;
 p.update({phase:'room',language:'chinese',trip:1,storyPage:2});p.walk('book');await p.advance(6500);
 for(let i=0;i<3;i++){p.click('#scene-continue');p.giveElixir();await p.advance(100);}
 const scene=d.querySelector('.chinese-scene'),cake=scene.querySelector('[data-chinese-choice="peace-ripple"]');
 const tray=cake.querySelector('[data-story-tray]'),pastry=cake.querySelector('[data-story-mooncake]');
 assert.ok(tray);assert.ok(pastry);assert.ok(tray.compareDocumentPosition(pastry)&p.w.Node.DOCUMENT_POSITION_FOLLOWING,'plate is painted underneath the cake');
 assert.ok(tray.querySelector('[data-cake-contact-shadow]'),'contact shadow joins cake to plate');
 p.click('[data-chinese-choice="peace-ripple"]');assert.equal(cake.getAttribute('transform'),'translate(-180 -10)');
 await p.advance(500);assert.equal(cake.getAttribute('transform'),'translate(-180 -10)');
 assert.equal(scene.querySelector('[data-moon-prop]').getAttribute('transform'),'translate(0 0)');
 assert.equal(tray.closest('[data-chinese-choice]'),cake);assert.equal(pastry.closest('[data-chinese-choice]'),cake);
 assert.equal(d.querySelector('#scene-stage').classList.contains('choice-complete'),true);
});

test('the supplied elixir stands above the tabletop and character hearts use the supplied PNG',async t=>{
 for(const pageIndex of [1,2]){
  const p=page(t),d=p.w.document;
  p.update({phase:'room',language:'chinese',trip:1,storyPage:pageIndex});p.walk('book');await p.advance(6500);
  const scene=d.querySelector('.chinese-scene'),table=scene.querySelector('[data-story-explore="table"]');
  const bottle=scene.querySelector(pageIndex===1?'[data-gift-elixir]':'[data-legend-elixir]'),image=bottle.querySelector('image');
  assert.equal(image.getAttribute('href'),'/assetNEW/magical-elixir.png');
  assert.ok(table.compareDocumentPosition(bottle)&p.w.Node.DOCUMENT_POSITION_FOLLOWING,'bottle is painted above the table');
  const scale=Number(image.getAttribute('width'))/1310;
  assert.ok(Math.abs(scale-Number(image.getAttribute('height'))/1200)<.00001,'PNG keeps its aspect ratio');
  const baseX=Number(image.getAttribute('x'))+(375+934)/2*scale,baseY=Number(image.getAttribute('y'))+1085*scale;
  assert.ok(Math.abs(baseX-490)<.01);assert.ok(baseY>407&&baseY<409,'visible bottle base touches the tabletop');
  assert.ok((934-375)*scale<=44.01&&(1085-80)*scale<=80.01,'bottle stays proportional to the table');
  assert.ok(bottle.querySelector('[data-elixir-contact-shadow]'));
  if(pageIndex===1){
   for(let i=0;i<3;i++){p.click('#scene-continue');p.giveElixir();await p.advance(100);}
   for(const name of ['prince-left','prince-right']){
    const character=scene.querySelector(`[data-chinese-choice="${name}"]`),heart=character.querySelector('[data-delivered]');
    assert.equal(heart.hasAttribute('hidden'),true);p.click(`.chinese-scene [data-chinese-choice="${name}"]`);assert.equal(heart.hasAttribute('hidden'),false);
    const picture=heart.querySelector('image');assert.equal(picture.getAttribute('href'),'/assetNEW/heart-storybook.png');
    const s=Number(picture.getAttribute('width'))/1310;assert.ok((1114-195)*s<=26.01&&(994-214)*s<=24.01,'heart is a small character-sized cue');
   }
  }
  p.click('#close-story');
 }
});

test('Chang’e waits for the elixir drag before the bottle disappears and she rises',async t=>{
 const p=page(t),d=p.w.document;
 p.update({phase:'room',language:'chinese',trip:1,storyPage:2});p.walk('book');await p.advance(6500);
 p.click('#scene-continue');
 const scene=d.querySelector('.chinese-scene'),elixir=scene.querySelector('[data-legend-elixir]'),change=scene.querySelector('[data-family="prince-left"]');
 scene.getBoundingClientRect=()=>({left:0,top:0,width:960,height:520});
 assert.equal(elixir.getAttribute('aria-disabled'),'false');assert.match(d.querySelector('#scene-prompt').textContent,/Drag the elixir/);
 for(let i=0;i<3;i++)p.click('#scene-continue');await p.advance(12000);
 assert.equal(elixir.getAttribute('opacity'),'1');assert.equal(change.getAttribute('transform'),'translate(265 0)','Continue cannot start the flight');
 elixir.dispatchEvent(new p.w.MouseEvent('pointerdown',{bubbles:true,clientX:490,clientY:368}));
 scene.dispatchEvent(new p.w.MouseEvent('pointermove',{bubbles:true,clientX:850,clientY:368}));scene.dispatchEvent(new p.w.MouseEvent('pointerup',{bubbles:true}));
 assert.equal(elixir.getAttribute('transform'),null);assert.equal(elixir.getAttribute('opacity'),'1','wrong drop keeps the elixir on the table');
 elixir.dispatchEvent(new p.w.MouseEvent('pointerdown',{bubbles:true,clientX:490,clientY:368}));
 scene.dispatchEvent(new p.w.MouseEvent('pointermove',{bubbles:true,clientX:265,clientY:345}));scene.dispatchEvent(new p.w.MouseEvent('pointerup',{bubbles:true}));
 assert.equal(elixir.getAttribute('opacity'),'0');assert.equal(d.querySelector('#scene-prompt').hidden,true);
 await p.advance(1000);assert.notEqual(change.getAttribute('transform'),'translate(265 0)','flight starts only after delivery');
 assert.equal(p.state.storyPage,2,'delivering elixir does not bypass the mooncake interaction');
});

test('remembering Chang’e shows Hou Yi returning, then offerings before the modern celebration',async t=>{
 const p=page(t),d=p.w.document;
 p.update({phase:'room',language:'chinese',trip:1,storyPage:3});p.walk('book');await p.advance(6500);
 const scene=d.querySelector('.chinese-scene'),houyi=scene.querySelector('[data-remembering-houyi]');
 assert.match(d.querySelector('#scene-subtitle').textContent,/When Hou Yi came home/);
 assert.equal(houyi.hasAttribute('hidden'),false);
 assert.equal(houyi.getAttribute('transform'),'translate(700 0)');
 assert.equal(scene.querySelector('[data-modern-family]').hasAttribute('hidden'),true);
 assert.equal(scene.querySelector('[data-remembrance-offerings]').hasAttribute('hidden'),true);
 assert.equal(scene.querySelector('[data-moon-prop]').hasAttribute('hidden'),true);
 p.click('#scene-continue');await p.advance(100);
 assert.match(d.querySelector('#scene-subtitle').textContent,/favourite foods outside beneath the Moon/);
 const offerings=scene.querySelector('[data-remembrance-offerings]');
 assert.equal(offerings.hasAttribute('hidden'),false);
 assert.ok(offerings.querySelector('[data-story-tray]'));assert.ok(offerings.querySelector('[data-story-mooncake]'));
 assert.equal(scene.querySelector('[data-story-explore="table"]').hasAttribute('hidden'),false);
 p.click('#scene-continue');await p.advance(100);
 assert.match(d.querySelector('#scene-subtitle').textContent,/Today, families celebrate/);
 assert.equal(houyi.hasAttribute('hidden'),true);
 assert.equal(scene.querySelector('[data-modern-family]').hasAttribute('hidden'),false);
 assert.equal(scene.querySelector('[data-moon-prop]').hasAttribute('hidden'),false);
});

test('memory book pages every earned item with six cards per screen and preserves replay',async t=>{
 const p=page(t),d=p.w.document;
 const memories=Array.from({length:15},(_,i)=>({id:`earned-${i}`,word:`word ${i+1}`,meaning:'collected discovery',icon:'book',source:'learning',language:'indonesian'}));
 p.update({phase:'room',language:'indonesian',trip:1,memories});
 p.w.JellyJourney.openActivity('memories');
 assert.equal(d.querySelectorAll('.memory-card').length,6);
 assert.equal(d.querySelector('#memory-prev').disabled,true);
 assert.match(d.querySelector('.memory-pagination').textContent,/Page 1 of 3/);
 const seen=[...d.querySelectorAll('.memory-card strong')].map(e=>e.textContent);
 p.click('#memory-next');assert.match(d.querySelector('.memory-pagination').textContent,/Page 2 of 3/);
 seen.push(...[...d.querySelectorAll('.memory-card strong')].map(e=>e.textContent));
 p.click('#memory-next');assert.equal(d.querySelectorAll('.memory-card').length,3);
 assert.equal(d.querySelector('#memory-next').disabled,true);
 seen.push(...[...d.querySelectorAll('.memory-card strong')].map(e=>e.textContent));
 assert.deepEqual(seen,memories.map(m=>m.word));
 assert.equal(d.querySelectorAll('.word-replay').length,3);
 p.click('#memory-prev');assert.equal(d.querySelector('.memory-card strong').textContent,'word 7');
 p.update({memories:[memories[0]]});
 assert.equal(d.querySelectorAll('.memory-card').length,1);assert.equal(d.querySelector('.memory-pagination'),null);
});
