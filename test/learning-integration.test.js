const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
const content = require('../public/js/journey-content');
const bridge = require('../public/js/learning-backend');
const {createJourney} = require('../journey');

test('all 30 real curriculum questions map to supported, parseable illustrations and colouring outlines', t => {
 const dom = new JSDOM('<!doctype html><div id="root"></div>', {runScripts: 'outside-only'});
 t.after(() => dom.window.close());
 const w = dom.window; w.Image = class {};
 for (const file of ['ocean-art','vocabulary-gameplay']) w.eval(fs.readFileSync(`public/js/${file}.js`, 'utf8'));
 let count = 0;
 for (const [language, track] of Object.entries(content)) {
  assert.equal(track.learningLevels.length, 3);
  for (const level of track.learningLevels) {
   assert.equal(level.questions.length, 5);
   for (const [index, q] of level.questions.entries()) {
    const state = {phase:'room',language,trip:1,learning:{active:{level:level.level,questionIndex:index,questionId:q.id,attemptId:++count,stage:'select'}}};
    const view = bridge.presentation(state, track);
    assert.equal(view.question.word, q.targetWord);
    assert.equal(view.question.hint, q.hint);
    assert.deepEqual(view.question.objects.map(x=>x.id), q.options.map(x=>x.itemId));
    for (const asset of [...q.options.map(x=>x.asset),q.colouringAsset]) {
     assert.ok(w.OceanArt.hasIcon(asset), `Missing ${language} ${q.id}: ${asset}`);
     const svg = new w.DOMParser().parseFromString(w.OceanArt.outline(asset), 'image/svg+xml');
     assert.equal(svg.querySelector('parsererror'), null);
     assert.ok(svg.querySelectorAll('path,rect,circle,ellipse').length > 0, asset);
    }
    const objects = w.VocabularyGameplay.placeObjects(view.question.objects, {
     bounds:{left:49,right:911,top:127,bottom:567},player:{x:486,y:408,radius:21},
     furniture:[{x:83,y:348,width:179,height:81},{x:77,y:155,width:180,height:63},{x:731,y:164,width:152,height:76},{x:413,y:239,width:145,height:77},{x:785,y:441,width:65,height:63}],
     reserved:[{x:180,y:270,radius:55},{x:190,y:413,radius:50}]
    });
    assert.equal(objects.length,3);
   }
  }
 }
 assert.equal(count,30);
});

// Real backend handlers with asynchronously delivered socket events. No fixture
// duplicates progression rules, event payloads, question data, or reward logic.
function backend(t) {
 let connection; const sockets = [];
 const io = {on(event,fn){if(event==='connection')connection=fn;},to(){return {emit(event,data){sockets.forEach(s=>s.deliver(event,data));}};}};
 const journey = createJourney(io,{transitionMs:1}); t.after(()=>journey.stop());
 function connect() {
  const clientHandlers = {}, serverHandlers = {}, sent = [];
  const socket = {connected:true,on(event,fn){(clientHandlers[event] ||= []).push(fn);},emit(event,data){sent.push([event,data]);queueMicrotask(()=>serverHandlers[event]?.(data));}};
  const serverSocket = {handshake:{auth:{journey:true}},join(){},on(event,fn){serverHandlers[event]=fn;},emit(event,data){this.deliver(event,data);},deliver(event,data){const copy=structuredClone(data);queueMicrotask(()=>{if(socket.connected)(clientHandlers[event]||[]).forEach(fn=>fn(copy));});}};
  sockets.push(serverSocket); connection(serverSocket);
  return {socket,sent,deliver:(event,data)=>serverSocket.deliver(event,data),disconnect(){socket.connected=false;(clientHandlers.disconnect||[]).forEach(fn=>fn());}};
 }
 return {journey,connect};
}
async function waitFor(predicate) {
 for(let i=0;i<200;i++){if(predicate())return;await new Promise(r=>setTimeout(r,2));}
 throw new Error('Timed out waiting for authoritative state');
}
test('adapter uses real backend events, waits for state, rejects errors and duplicate actions', async t => {
 const api=backend(t), client=api.connect(), adapter=bridge.create({socket:client.socket,timeoutMs:100});
 await new Promise(r=>setImmediate(r));
 client.socket.emit('journey-start','indonesian');await waitFor(()=>api.journey.snapshot().phase==='room');
 await assert.rejects(adapter.request('startLevel',{level:2}),/not available/);
 const start=adapter.request('startLevel',{level:1});
 await assert.rejects(adapter.request('startLevel',{level:1}),/wait/);await start;
 const q=content.indonesian.learningLevels[0].questions[0], key=bridge.keyOf(api.journey.snapshot());
 const wrong=await adapter.request('selectObject',{key,objectId:q.distractorItemIds[0]});assert.equal(wrong.correct,false);assert.match(wrong.hint,/putri/);
 const right=await adapter.request('selectObject',{key,objectId:q.correctItemId});assert.equal(right.colouringAllowed,true);assert.equal(api.journey.snapshot().learning.active.stage,'colouring');
 await adapter.request('completeQuestion',{key,artwork:'data:image/png;base64,YQ=='});assert.equal(api.journey.snapshot().learning.active.questionIndex,1);
 await assert.rejects(adapter.request('completeQuestion',{key}),/no longer active/);
 await adapter.request('exitLevel');assert.equal(api.journey.snapshot().learning.active,null);
});

async function networkBackend(t) {
 const http = require('node:http'), path = require('node:path');
 const {Server} = require('socket.io');
 const {io: clientIo} = require(path.join(path.dirname(require.resolve('socket.io')), '../client-dist/socket.io.js'));
 const server = http.createServer(), io = new Server(server), clients = [];
 const journey = createJourney(io,{transitionMs:5});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{journey.stop();clients.forEach(s=>s.disconnect());await new Promise(resolve=>io.close(resolve));});
 return {journey,connect(){const socket=clientIo(`http://127.0.0.1:${server.address().port}`,{auth:{journey:true},transports:['websocket'],forceNew:true});clients.push(socket);return socket;}};
}
function mobile(t, api, name='mobile.html', viewport={width:960,height:620}) {
 const html = fs.readFileSync(`public/${name}`,'utf8');
 const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g,''),{runScripts:'outside-only',url:`http://localhost/${name}`});
 t.after(()=>dom.window.close());
 const w=dom.window,d=w.document,frames=new Map(),timers=new Map(),motion={matches:false};let now=0,sequence=0,controller;
 w.matchMedia=()=>motion;
 const draws=[],ellipses=[];
 const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),drawImage(...args){draws.push(args);},ellipse(...args){ellipses.push(args);}}, {get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 w.HTMLCanvasElement.prototype.getContext=function(){ctx.canvas=this;return ctx;};
 w.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/png;base64,YQ==';
 w.HTMLImageElement.prototype.decode=()=>Promise.resolve();
 w.HTMLElement.prototype.setPointerCapture=()=>{};
 w.HTMLElement.prototype.getBoundingClientRect=function(){
  const width=this.classList.contains('jelly-question-bubble')?Math.min(parseFloat(this.style.width)||230,viewport.width-16):viewport.width;
  const height=this.classList.contains('jelly-question-bubble')?80:viewport.height;
  const left=parseFloat(this.style.left)||0,top=parseFloat(this.style.top)||0;
  return {left,top,width,height,right:left+width,bottom:top+height};
 };
 w.Image=class{constructor(){this.complete=true;this.naturalWidth=100;this.naturalHeight=100;}set src(value){this._src=value;this.onload?.();}get src(){return this._src;}};
 Object.defineProperty(w.performance,'now',{value:()=>now});
 w.requestAnimationFrame=fn=>{const id=++sequence;frames.set(id,fn);return id;};w.cancelAnimationFrame=id=>frames.delete(id);
 w.setTimeout=(fn,ms)=>{const id=++sequence;timers.set(id,{fn,at:now+ms});return id;};w.clearTimeout=id=>timers.delete(id);
 const socket=api.connect(),sent=[];socket.onAnyOutgoing?.((...args)=>sent.push(args));w.io=()=>socket;
 // Read the actual HTML script list; the only dynamic script is the room.
 const scripts=[...html.matchAll(/<script src="\/js\/([^"?]+)(?:\?[^\"]*)?"/g)].map(match=>match[1]);
 if(name==='mobile.html')scripts.push('ocean-room.js');
 for(const script of scripts){
  w.eval(fs.readFileSync(`public/js/${script}`,'utf8'));
  if(script==='vocabulary-gameplay.js') {
   const create=w.VocabularyGameplay.create;
   w.VocabularyGameplay.create=options=>(controller=create(options));
  }
 }
 async function advance(ms=100){for(let i=0;i<Math.ceil(ms/50);i++){now+=50;for(const[id,task]of [...timers])if(task.at<=now){timers.delete(id);task.fn();}const current=[...frames];frames.clear();current.forEach(([,fn])=>fn(now));await Promise.resolve();}await new Promise(r=>setImmediate(r));}
 function click(selector){const element=d.querySelector(selector);assert.ok(element,selector);assert.notEqual(element.disabled,true,selector);if(typeof element.click==='function')element.click();else element.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));}
 async function walk(x,y){d.getElementById('game').dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true,clientX:x*viewport.width/960,clientY:y*viewport.height/620}));await advance(7000);}
 return {w,d,socket,sent,draws,ellipses,motion,advance,click,walk,get controller(){return controller;}};
}

for(const language of ['indonesian','chinese'])test(`${language}: real sockets and complete pages cover all 15 words, story, festival, return, optional levels and replay`,async t=>{
 const api=await networkBackend(t),p=mobile(t,api),aquarium=mobile(t,api,'pet.html');
 await waitFor(()=>p.w.JellyJourney.state&&p.socket.connected);
 p.click(`[data-language="${language}"]`);p.click('#start-adventure');
 await waitFor(()=>p.w.JellyJourney.state.phase==='room');
 assert.equal(p.d.querySelector('#learning-guidance').hidden,false);
 await p.walk(180,214);
 assert.equal(p.d.querySelector('#learning-level-screen').hidden,false);
 assert.equal(p.d.querySelectorAll('#learning-level-list button').length,1);
 assert.equal(p.d.querySelectorAll('#learning-level-list .is-locked').length,2);
 assert.equal(p.d.querySelector('#learning-level-list h3').textContent,content[language].learningLevels[0].title);
 p.click('#learning-level-list button');
 await waitFor(()=>p.controller?.active&&!p.w.JellyJourney.locked);
 assert.equal(p.d.querySelector('#learning-guidance').hidden,true);
 for(let index=0;index<5;index++) {
  const q=content[language].learningLevels[0].questions[index];
  await p.advance(50);assert.equal(p.d.querySelector('.jelly-question-bubble mark').textContent,q.targetWord);
  assert.equal(p.d.querySelector('.jelly-question-bubble').hidden,false);
  assert.equal(p.d.querySelector('.vocabulary-prompt mark').textContent,q.targetWord);
  let object=p.controller.objects.find(o=>o.id===q.distractorItemIds[0]);
  await p.walk(object.x,object.y);
  await waitFor(()=>p.d.querySelector('.vocabulary-hint').textContent.includes(q.hint));
  assert.equal(api.journey.snapshot().learning.active.stage,'select');
  object=p.controller.objects.find(o=>o.id===q.correctItemId);await p.walk(object.x,object.y);
  await waitFor(()=>p.d.querySelector('.vocabulary-colouring'));
  if(index===0){
   p.click('[data-tool="cancel"]');assert.equal(p.d.querySelector('.vocabulary-resume').hidden,false);
   p.click('.vocabulary-resume');assert.ok(p.d.querySelector('.vocabulary-colouring'));
   // A newly loaded mobile receives only a snapshot, no selection result.
   const restored=mobile(t,api);await waitFor(()=>restored.d.querySelector('.vocabulary-colouring'));
   assert.equal(restored.w.JellyJourney.state.learning.active.stage,'colouring');restored.socket.disconnect();
   const selections=p.sent.filter(([event])=>event==='journey-learning-select-item').length;
   p.socket.disconnect();assert.equal(p.d.querySelector('.vocabulary-colouring'),null);
   p.socket.connect();await waitFor(()=>p.d.querySelector('.vocabulary-colouring'));
   assert.equal(p.sent.filter(([event])=>event==='journey-learning-select-item').length,selections);
  }
  p.click('[data-tool="fill"]');await p.advance();p.click('[data-tool="done"]');
  await waitFor(()=>index===4?!api.journey.snapshot().learning.active:api.journey.snapshot().learning.active.questionIndex===index+1);
  await waitFor(()=>index===4?p.d.querySelector('#storybook-unlock-screen').hidden===false:p.d.querySelector('.vocabulary-prompt mark')?.textContent===content[language].learningLevels[0].questions[index+1].targetWord);
 }
 assert.equal(api.journey.snapshot().bag.length,5);
 assert.equal(api.journey.snapshot().learning.storybookUnlocked,true);
 assert.equal(api.journey.snapshot().learning.levels[1].unlocked,false,'Level 1 must not unlock Level 2');
 assert.equal(p.d.querySelector('#activity-screen').hidden,true);
 assert.equal(p.w.JellyJourney.state.storyDone,false);assert.equal(p.w.JellyJourney.state.invited,false);assert.equal(p.w.JellyJourney.state.outfit,null);
 assert.equal(p.d.querySelector('.jelly-question-bubble'),null);
 p.click('#explore-storybook');await p.advance();
 p.w.JellyJourney.openActivity('wardrobe');p.w.OceanRoom.walkTo('wardrobe');await p.advance(1000);
 assert.equal(p.d.querySelector('#activity-screen').hidden,true);
 assert.equal(p.d.querySelector('#learning-story-screen').hidden,true);

 await p.walk(486,269);
 assert.equal(p.d.querySelector('#learning-story-screen').hidden,false);
 assert.equal(p.d.querySelector('#storybook-backdrop').hidden,true);
 assert.equal(p.d.querySelectorAll('#learning-story-list button').length,1);
 p.click('#learning-story-list button');
 await waitFor(()=>!p.d.querySelector('#storybook-backdrop').hidden);
 assert.equal(p.w.JellyJourney.state.activeStoryId,content[language].stories[0].id);
 assert.match(aquarium.d.querySelector('#aquarium-status').textContent,/common room/);
 for(let chapter=0;chapter<5;chapter++) {
  for(let beat=0;beat<3;beat++){p.click('#scene-continue');await p.advance(100);}
  const ids=[['story-shell'],['prince-left','prince-right'],['peace-ripple'],['nyale-target'],['scene-boat']][chapter];
  for(const id of ids)p.click(language==='chinese'?`[data-chinese-choice="${id}"]`:'#'+id);
  p.click('#scene-continue');await p.advance(100);
  p.click('#scene-continue');await p.advance(100);
  await waitFor(()=>p.w.JellyJourney.state.storyPage===chapter+1);
  await waitFor(()=>!p.d.querySelector('#scene-next').disabled);
  p.click('#scene-next');await p.advance(2000);
 }
 assert.equal(api.journey.snapshot().storyDone,true);
 p.w.JellyJourney.openActivity('wardrobe');assert.equal(p.d.querySelector('#activity-screen').hidden,true);
 p.click('#mailbox-button');p.click('#accept-invite');
 await waitFor(()=>p.w.JellyJourney.state.invited);await p.advance(7000);
 assert.ok(p.d.querySelector('[data-outfit]'));
 p.click(`[data-outfit="${content[language].outfits[0].id}"]`);
 await waitFor(()=>p.w.JellyJourney.state.outfit);p.click('#outfit-done');
 await waitFor(()=>p.w.JellyJourney.state.phase==='festival');
 for(const [index,item] of content[language].festivalItems.entries()) {
  if(p.w.JellyJourney.state.festivalArea!==item.area){await p.walk(880,450);await waitFor(()=>p.w.JellyJourney.state.festivalArea===item.area);}
  await p.walk(item.x,item.y);await waitFor(()=>p.w.JellyJourney.state.festivalFeedback&&p.w.JellyJourney.state.festivalMission===index&&!p.d.querySelector('#activity-screen').hidden);
  p.click('#festival-next');await waitFor(()=>p.w.JellyJourney.state.festivalMission===index+1);
 }
 p.click('#take-home');await waitFor(()=>p.w.JellyJourney.state.phase==='aquarium');
 assert.equal(api.journey.snapshot().memories.length,13);
 assert.equal(api.journey.snapshot().mainAdventureCompleted,true);
 assert.equal(api.journey.snapshot().learning.levels[1].unlocked,true);
 assert.match(p.d.querySelector('#welcome-return').textContent,/unlocked Level 2/);
 await waitFor(()=>/13 collected memories/.test(aquarium.d.querySelector('#aquarium-status').textContent));
 assert.equal(p.d.querySelector(`[data-language="${language}"]`).getAttribute('aria-pressed'),'true');
 p.click('#continue-adventure');await waitFor(()=>p.w.JellyJourney.state.phase==='room');
 assert.equal(p.w.JellyJourney.state.learning.levels[0].completed,true);
 assert.equal(p.d.querySelector('#storybook-unlock-screen').hidden,true);
 // Optional levels use the real content and the same physical/colouring loop.
 for(let level=2;level<=3;level++) {
  await p.walk(180,214);
  assert.equal(p.d.querySelectorAll('#learning-level-list button').length,level);
  assert.equal(p.d.querySelector('#learning-level-list button').textContent,'Replay');
  p.click(`#learning-level-list .learning-card:nth-child(${level}) button`);
  await waitFor(()=>p.controller.active&&!p.w.JellyJourney.locked);
  for(let index=0;index<5;index++){
   const q=content[language].learningLevels[level-1].questions[index];
   await p.advance(50);assert.equal(p.d.querySelector('.jelly-question-bubble mark').textContent,q.targetWord);
   assert.equal(p.d.querySelector('.vocabulary-prompt mark').textContent,q.targetWord);
   const object=p.controller.objects.find(o=>o.id===q.correctItemId);await p.walk(object.x,object.y);
   await waitFor(()=>p.d.querySelector('.vocabulary-colouring'));
   p.click('[data-tool="fill"]');await p.advance();p.click('[data-tool="done"]');
   await waitFor(()=>index===4?!p.w.JellyJourney.state.learning.active:p.w.JellyJourney.state.learning.active.questionIndex===index+1);
  }
 }
 assert.equal(api.journey.snapshot().learning.allCompleted,true);
 assert.equal(api.journey.snapshot().bag.length,10);
 await p.walk(486,269);assert.equal(p.d.querySelector('#learning-story-list button').textContent,'Replay');
 p.click('#learning-story-list button');await waitFor(()=>!p.d.querySelector('#storybook-backdrop').hidden);
 assert.equal(p.w.JellyJourney.state.storyPage,0);
 assert.equal(p.w.JellyJourney.state.storyDone,false);
 assert.equal(p.w.JellyJourney.state.stories[0].completed,true);
 // Finish one replayed chapter; historical rewards must not duplicate.
 for(let beat=0;beat<3;beat++){p.click('#scene-continue');await p.advance(100);}
 p.click(language==='chinese'?'[data-chinese-choice="story-shell"]':'#story-shell');
 p.click('#scene-continue');await p.advance(100);p.click('#scene-continue');await p.advance(100);
 await waitFor(()=>p.w.JellyJourney.state.storyPage===1);assert.equal(api.journey.snapshot().bag.length,10);
});

test('reset invalidates previous attempts and competing activities cannot interrupt a level',async t=>{
 const api=backend(t),client=api.connect(),adapter=bridge.create({socket:client.socket});
 await new Promise(r=>setImmediate(r));
 client.socket.emit('journey-start','chinese');await waitFor(()=>api.journey.snapshot().phase==='room');
 await adapter.request('startLevel',{level:1});const old=api.journey.snapshot().learning.active;
 client.socket.emit('journey-reset');await waitFor(()=>api.journey.snapshot().language===null);
 client.socket.emit('journey-start','chinese');await waitFor(()=>api.journey.snapshot().phase==='room');
 await adapter.request('startLevel',{level:1});assert.notEqual(api.journey.snapshot().learning.active.attemptId,old.attemptId);
 client.socket.emit('journey-learning-select-item',{questionId:old.questionId,attemptId:old.attemptId,itemId:content.chinese.learningLevels[0].questions[0].correctItemId});
 await new Promise(r=>setImmediate(r));assert.equal(api.journey.snapshot().learning.active.stage,'select');
 for(const q of content.chinese.learningLevels[0].questions){const key=bridge.keyOf(api.journey.snapshot());await adapter.request('selectObject',{key,objectId:q.correctItemId});await adapter.request('completeQuestion',{key});}
 await adapter.request('selectStory',{storyId:content.chinese.stories[0].id});
 for(let page=0;page<5;page++)await adapter.request('storyPage',{page});
 client.socket.emit('journey-invitation');await waitFor(()=>api.journey.snapshot().invited);
 client.socket.emit('journey-try-outfit',content.chinese.outfits[0].id);await waitFor(()=>api.journey.snapshot().outfit);
 await assert.rejects(adapter.request('startLevel',{level:2}),/not available/,'Level 2 remains locked before festival return');
 client.socket.emit('journey-festival');await waitFor(()=>api.journey.snapshot().phase==='festival');
 for(const item of content.chinese.festivalItems){
  if(item.area!==api.journey.snapshot().festivalArea){client.socket.emit('journey-area',item.area);await waitFor(()=>api.journey.snapshot().festivalArea===item.area);}
  client.socket.emit('journey-find',item.id);await waitFor(()=>api.journey.snapshot().festivalFeedback);
  client.socket.emit('journey-next-festival');await waitFor(()=>!api.journey.snapshot().festivalFeedback);
 }
 client.socket.emit('journey-return');await waitFor(()=>api.journey.snapshot().phase==='aquarium');
 client.socket.emit('journey-start','chinese');await waitFor(()=>api.journey.snapshot().phase==='room');
 await adapter.request('startLevel',{level:2});const before=api.journey.snapshot(),errors=[];client.socket.on('journey-error',e=>errors.push(e));
 client.socket.emit('journey-try-outfit',content.chinese.outfits[1].id);
 client.socket.emit('journey-festival');client.socket.emit('journey-invitation');
 await assert.rejects(adapter.request('selectStory',{storyId:content.chinese.stories[0].id}),/not available/);
 assert.deepEqual(api.journey.snapshot(),before);assert.equal(errors.length,4);
 await adapter.request('exitLevel');assert.equal(api.journey.snapshot().learning.active,null);
 assert.equal(api.journey.snapshot().mainAdventureCompleted,true);
});

test('adapter times out, rejects disconnects, ignores stale results, and permits recovery',async()=>{
 const listeners={},sent=[],socket={connected:true,on(e,fn){listeners[e]=fn;},emit(...args){sent.push(args);}};
 const adapter=bridge.create({socket,timeoutMs:10});
 const state={phase:'room',trip:1,language:'chinese',learning:{active:{level:1,questionId:'q1',attemptId:2,stage:'select'}}};
 listeners['journey-state'](state);
 await assert.rejects(adapter.request('selectObject',{key:bridge.keyOf(state),objectId:'x'}),/too long/);
 const promise=adapter.request('selectObject',{key:bridge.keyOf(state),objectId:'x'});
 listeners['journey-learning-result']({questionId:'q1',attemptId:1,correct:false});assert.equal(adapter.pending,true);
 listeners.disconnect();await assert.rejects(promise,/reconnecting/);
 await assert.rejects(adapter.request('exitLevel'),/reconnecting/);
 listeners['journey-state'](state);const exit=adapter.request('exitLevel');
 listeners['journey-state']({...state,learning:{active:null}});await exit;
 assert.equal(sent.length,3);
});

test('unlock celebration follows each track and reset, and never replays initial reconnect snapshots', t=>{
 const dom=new JSDOM(fs.readFileSync('public/mobile.html','utf8').replace(/<script[\s\S]*?<\/script>/g,''),{runScripts:'outside-only'});
 t.after(()=>dom.window.close());const w=dom.window,d=w.document;
 w.eval(fs.readFileSync('public/js/learning-interface.js','utf8'));
 const ui=w.JellyLearningInterface.create({action:()=>Promise.resolve(),getContent:s=>content[s?.language||'indonesian'],room:()=>({lock(){},clearMovement(){}})});
 const state=(language,completed)=>({phase:'room',language,stories:[],learning:{storybookUnlocked:completed,storybookUnlockVersion:completed?1:0,levels:content[language].learningLevels.map(l=>({level:l.level,unlocked:l.level===1,completed:l.level===1&&completed})),active:null}});
 const id=state('indonesian',false),idDone=state('indonesian',true),zh=state('chinese',false),zhDone=state('chinese',true);
 ui.sync(id,null);ui.sync(idDone,id);assert.equal(d.querySelector('#storybook-unlock-screen').hidden,false);
 d.querySelector('#explore-storybook').click();ui.stop();ui.sync(idDone,null);assert.equal(d.querySelector('#storybook-unlock-screen').hidden,true);
 ui.sync(id,idDone);ui.sync(idDone,id);assert.equal(d.querySelector('#storybook-unlock-screen').hidden,false,'fresh same-language track celebrates again');d.querySelector('#explore-storybook').click();
 ui.sync(zh,idDone);ui.sync(zhDone,zh);assert.equal(d.querySelector('#storybook-unlock-screen').hidden,false);
 d.querySelector('#explore-storybook').click();ui.sync({phase:'aquarium',language:null},zhDone);
 ui.sync(zh,{phase:'aquarium',language:null});ui.sync(zhDone,zh);assert.equal(d.querySelector('#storybook-unlock-screen').hidden,false);
});

test('selected story and festival IDs override legacy aliases',()=>{
 const track=content.chinese,story=track.stories[0],festival=track.festivals[0];
 const poisoned={...track,chapters:[],storyTitle:'wrong',storyRewards:[],festival:'wrong',outfits:[],festivalItems:[],festivalAreas:[]};
 const selected=bridge.selectedContent(poisoned,{activeStoryId:story.id,festivalId:festival.id});
 assert.equal(selected.chapters,story.chapters);assert.equal(selected.storyTitle,story.title);
 assert.equal(selected.storyRewards,story.rewards);assert.equal(selected.festival,festival.title);
 assert.equal(selected.outfits,festival.outfits);assert.equal(selected.festivalItems,festival.items);assert.equal(selected.festivalAreas,festival.areas);
});

test('authoritative selection snapshots recover missing results; another screen exiting cannot confirm a colouring save',async()=>{
 const listeners={},socket={connected:true,on(e,fn){listeners[e]=fn;},emit(){}};
 const adapter=bridge.create({socket});
 const state={phase:'room',language:'chinese',trip:1,learning:{levels:[{level:1,completed:false}],active:{level:1,questionIndex:0,questionId:'q1',attemptId:1,stage:'select'}}};
 listeners['journey-state'](state);const key=bridge.keyOf(state);
 const selection=adapter.request('selectObject',{key,objectId:'moon'});
 listeners['journey-state']({...state,learning:{...state.learning,active:{...state.learning.active,stage:'colouring'}}});
 assert.equal((await selection).colouringAllowed,true);
 const completion=adapter.request('completeQuestion',{key});
 listeners['journey-state']({...state,learning:{...state.learning,active:null}});
 await assert.rejects(completion,/no longer active/);
});

test('reader waits for backend confirmation and rejected pages can be retried',async t=>{
 const api=await networkBackend(t),socket=api.connect(),adapter=bridge.create({socket});
 await waitFor(()=>socket.connected);await new Promise(r=>setTimeout(r,5));
 socket.emit('journey-start','indonesian');await waitFor(()=>api.journey.snapshot().phase==='room');
 await adapter.request('startLevel',{level:1});
 for(const q of content.indonesian.learningLevels[0].questions){const key=bridge.keyOf(api.journey.snapshot());await adapter.request('selectObject',{key,objectId:q.correctItemId});await adapter.request('completeQuestion',{key});}
 const p=mobile(t,api);await waitFor(()=>p.w.JellyJourney.state?.phase==='room');
 assert.equal(p.d.querySelector('#storybook-unlock-screen').hidden,true);
 await p.walk(486,269);p.click('#learning-story-list button');await waitFor(()=>!p.d.querySelector('#storybook-backdrop').hidden);
 const emit=p.socket.emit.bind(p.socket);let held;
 p.socket.emit=(event,data,...args)=>{if(event==='journey-story-page'){held=data;return p.socket;}return emit(event,data,...args);};
 for(let beat=0;beat<3;beat++){p.click('#scene-continue');await p.advance(100);}
 p.click('#story-shell');p.click('#scene-continue');await p.advance(100);p.click('#scene-continue');await p.advance(100);
 assert.equal(held,0);assert.equal(api.journey.snapshot().storyPage,0);assert.equal(p.d.querySelector('#scene-next').disabled,true);
 emit('journey-story-page',999);await waitFor(()=>/retry/.test(p.d.querySelector('#scene-status').textContent));
 assert.equal(p.d.querySelector('#scene-next').disabled,true);p.socket.emit=emit;
 p.click('#scene-continue');await p.advance(100);await waitFor(()=>p.w.JellyJourney.state.storyPage===1);
 await waitFor(()=>p.d.querySelector('#scene-next').disabled===false);
});

test('all 30 questions fit actual room silhouettes, floating envelopes, reachable grid and control reserves',async t=>{
 const api=await networkBackend(t),p=mobile(t,api);await waitFor(()=>p.w.JellyJourney.state);
 p.click('[data-language="indonesian"]');p.click('#start-adventure');await waitFor(()=>p.w.JellyJourney.state.phase==='room');
 const game=p.w.VocabularyGameplay,geometry=p.w.OceanRoom.learningGeometry();
 for(const player of [{x:486,y:408},{x:320,y:260},{x:660,y:200},{x:660,y:320},{x:620,y:440}])
 for(const track of Object.values(content))for(const level of track.learningLevels)for(const question of level.questions){
  const reserved=[{x:790,y:360,width:140,height:190}];
  const layout={...geometry,player:{...geometry.player,...player},reserved};
  const choices=question.options.map(o=>({id:o.itemId,icon:o.asset})),items=game.placeObjects(choices,layout);
  assert.equal(JSON.stringify(items),JSON.stringify(game.placeObjects(choices,layout)),'deterministic');
  for(const [index,item]of items.entries()){
   const box=game.objectBounds(item);
   assert.ok(box.x>=geometry.bounds.left&&box.y>=geometry.bounds.top&&box.x+box.width<=geometry.bounds.right&&box.y+box.height<=geometry.bounds.bottom);
   for(const obstacle of [...geometry.visualObstacles,...reserved])assert.equal(game.overlaps(box,obstacle,2),false,question.id);
   for(const other of items.slice(0,index))assert.equal(game.overlaps(box,game.objectBounds(other),8),false);
  }
 }
});

test('speech bubble placement avoids choices and Jelly at portrait and landscape boundaries',async t=>{
 const api=await networkBackend(t),p=mobile(t,api);await waitFor(()=>p.w.JellyJourney.state);
 const game=p.w.VocabularyGameplay;
 for(const [width,height]of [[320,383],[390,590],[844,225],[1280,520]]){
  const sx=width/960,sy=height/620,u=Math.min(sx,sy);
  const objects=[{x:320,y:240},{x:660,y:180},{x:640,y:440}].map(item=>{const box=game.objectBounds(item);return{x:box.x*sx,y:box.y*sy,width:box.width*sx,height:box.height*sy};});
  for(const [x,y]of [[75,155],[880,155],[75,540],[880,540],[486,408],[660,320]]){
   const head={x:x*sx-43*u,y:(y-25)*sy-62*u,width:86*u,height:82*u};
   const bubble=game.positionBubble({width,height,sizes:[{width:Math.min(230,width-16),height:80},{width:190,height:90},{width:150,height:90}],head,obstacles:objects});
   assert.ok(bubble,`${width}x${height}, ${x},${y}`);
   assert.ok(bubble.x>=8&&bubble.y>=8&&bubble.x+bubble.width<=width-8&&bubble.y+bubble.height<=height-8);
   assert.equal(game.overlaps(bubble,head,10),false);
   objects.forEach(object=>assert.equal(game.overlaps(bubble,object,10),false));
  }
 }
});

test('all choices have matching affordances, stable hitboxes, pointer feedback and an authoritative Hanzi caption',async t=>{
 const api=await networkBackend(t),p=mobile(t,api,'mobile.html',{width:390,height:590});await waitFor(()=>p.w.JellyJourney.state);
 p.click('[data-language="chinese"]');p.click('#start-adventure');await waitFor(()=>p.w.JellyJourney.state.phase==='room');
 await p.walk(180,214);p.click('#learning-level-list button');await waitFor(()=>p.controller.active&&!p.w.JellyJourney.locked);await p.advance(50);
 const bubble=p.d.querySelector('.jelly-question-bubble'),question=content.chinese.learningLevels[0].questions[0];
 assert.equal(bubble.hidden,false);assert.equal(bubble.querySelector('mark').textContent,question.targetWord);
 assert.equal(bubble.querySelector('mark').lang,'zh-CN');
 assert.equal(bubble.querySelector('.vocabulary-prompt').textContent,p.d.querySelector('.vocabulary-prompt').textContent);
 assert.equal(bubble.querySelector('.vocabulary-pronunciation').textContent,question.pinyin);
 assert.equal(p.d.querySelectorAll('[data-vocabulary-choice]').length,3);
 assert.ok(p.d.querySelector('.vocabulary-transcript').classList.contains('sr-only'),'duplicate prompt and number controls are screen-reader only');
 assert.equal(p.d.querySelector('#vocabulary-gameplay').parentElement,p.d.querySelector('#game').parentElement,'controls live inside the common room');
 assert.equal(p.d.querySelector('.vocabulary-bubble'),null,'no separate beige dialogue panel');
 assert.equal(p.d.querySelector('.vocabulary-controls').closest('.sr-only'),null,'Replay and Exit remain visible');
 const before=JSON.stringify(p.controller.objects),hits=p.controller.objects.map(o=>p.controller.hitTest(o)?.id);
 p.ellipses.length=0;p.draws.length=0;await p.advance(50);
 const frames=p.draws.filter(args=>args[3]>0&&args[3]<70).slice(-3);assert.equal(frames.length,3);
 assert.equal(p.ellipses.filter(args=>args[2]===42&&args[3]===42).length,3,'every choice has an outline');
 await p.advance(450);assert.equal(JSON.stringify(p.controller.objects),before);
 assert.notDeepEqual(p.draws.filter(args=>args[3]>0&&args[3]<70).slice(-3).map(args=>args[2]),frames.map(args=>args[2]),'artwork floats while targets stay fixed');
 assert.deepEqual(p.controller.objects.map(o=>p.controller.hitTest(o)?.id),hits);
 p.motion.matches=true;p.draws.length=0;await p.advance(50);
 const frozen=p.draws.filter(args=>args[3]>0&&args[3]<70).slice(-3).map(args=>args[2]);
 p.draws.length=0;await p.advance(450);
 assert.deepEqual(p.draws.filter(args=>args[3]>0&&args[3]<70).slice(-3).map(args=>args[2]),frozen,'reduced motion stops object bobbing');
 p.motion.matches=false;
 p.w.dispatchEvent(new p.w.Event('resize'));await p.advance(50);
 assert.equal(p.d.querySelector('.jelly-question-bubble'),bubble,'resize repositions the same caption');
 assert.equal(p.sent.filter(([event])=>event==='journey-learning-select-item').length,0,'resize never submits an answer');
 const item=p.controller.objects[1],canvas=p.d.getElementById('game');
 canvas.dispatchEvent(new p.w.MouseEvent('pointermove',{clientX:item.x*390/960,clientY:item.y*590/620}));assert.equal(canvas.style.cursor,'pointer');
 const selections=p.sent.filter(([event])=>event==='journey-learning-select-item').length;
 p.click(`[data-vocabulary-choice="${item.id}"]`);assert.equal(p.sent.filter(([event])=>event==='journey-learning-select-item').length,selections);
 await p.advance(7000);await waitFor(()=>p.sent.filter(([event])=>event==='journey-learning-select-item').length>selections);
 // The first question's second picture is a distractor, so the caption persists.
 await waitFor(()=>p.d.querySelector('.vocabulary-hint').textContent.includes(question.hint));
 assert.equal(bubble.hidden,false);
 const right=p.controller.objects.find(o=>o.id===question.correctItemId);await p.walk(right.x,right.y);await waitFor(()=>p.d.querySelector('.vocabulary-colouring'));
 assert.equal(bubble.hidden,true);p.click('[data-tool="cancel"]');assert.equal(bubble.hidden,true);
 p.click('.vocabulary-exit');await waitFor(()=>!p.controller.active);assert.equal(p.d.querySelector('.jelly-question-bubble'),null);
});

for(const language of ['indonesian','chinese'])test(`${language}: fresh adventure clears earned aquarium art and learning; reconnect restores; stale snapshots cannot resurrect it`,async t=>{
 const api=await networkBackend(t),p=mobile(t,api),aquarium=mobile(t,api,'pet.html');await waitFor(()=>p.w.JellyJourney.state);
 p.click(`[data-language="${language}"]`);p.click('#start-adventure');await waitFor(()=>p.w.JellyJourney.state.phase==='room');
 await p.walk(180,214);p.click('#learning-level-list button');await waitFor(()=>p.controller.active&&!p.w.JellyJourney.locked);
 const q=content[language].learningLevels[0].questions[0],right=p.controller.objects.find(o=>o.id===q.correctItemId);
 await p.walk(right.x,right.y);await waitFor(()=>p.d.querySelector('.vocabulary-colouring'));
 p.click('[data-tool="fill"]');await p.advance();p.click('[data-tool="done"]');await waitFor(()=>p.w.JellyJourney.state.learning.active?.questionIndex===1);
 const old=structuredClone(p.w.JellyJourney.state),oldAttempt=old.learning.active;
 p.socket.disconnect();p.socket.connect();await waitFor(()=>p.controller.active&&p.w.JellyJourney.state.learning.active.questionIndex===1);
 assert.equal(p.w.JellyJourney.state.bag.length,1);
 p.click('#return-early');p.click('#exit-confirm');await waitFor(()=>p.w.JellyJourney.state.phase==='aquarium');
 await waitFor(()=>/1 collected memories/.test(aquarium.d.querySelector('#aquarium-status').textContent));
 assert.equal(p.controller.objects.length,0);assert.equal(p.d.querySelector('.jelly-question-bubble'),null);assert.equal(p.d.querySelector('.vocabulary-colouring'),null);
 p.click(`[data-language="${language}"]`);assert.equal(p.d.querySelector('#continue-adventure').hidden,false);p.click('#start-adventure');
 await waitFor(()=>p.w.JellyJourney.state.phase==='room');
 const fresh=p.w.JellyJourney.state;assert.ok(fresh.trip>old.trip);assert.equal(fresh.bag.length,0);assert.equal(fresh.memories.length,0);assert.equal(fresh.learning.active,null);
 assert.deepEqual(Array.from(fresh.learning.levels,l=>l.completed),[false,false,false]);assert.equal(fresh.learning.storybookUnlocked,false);assert.equal(fresh.storyDone,false);assert.equal(fresh.invited,false);assert.equal(fresh.outfit,null);
 assert.equal(p.d.querySelector('#learning-guidance').hidden,false);assert.equal(p.d.querySelector('#activity-screen').hidden,true);assert.equal(p.controller.objects.length,0);
 // Deliver an obsolete snapshot to every real client handler, including the adapter.
 p.socket.listeners('journey-state').forEach(fn=>fn(old));aquarium.socket.listeners('journey-state').forEach(fn=>fn(old));await p.advance(50);
 assert.equal(p.w.JellyJourney.state.trip,fresh.trip);assert.equal(p.controller.active,false);aquarium.draws.length=0;await aquarium.advance(50);
 assert.equal(aquarium.draws.some(([image])=>image.src==='data:image/png;base64,YQ=='),false);
 p.socket.emit('journey-learning-colouring-complete',{questionId:oldAttempt.questionId,attemptId:oldAttempt.attemptId});
 await new Promise(r=>setTimeout(r,5));assert.equal(api.journey.snapshot().bag.length,0);
 // Switching tracks is also clean and does not carry the previous collection.
 p.click('#return-early');p.click('#exit-confirm');await waitFor(()=>p.w.JellyJourney.state.phase==='aquarium');
 const other=language==='chinese'?'indonesian':'chinese';p.click(`[data-language="${other}"]`);p.click('#start-adventure');await waitFor(()=>p.w.JellyJourney.state.phase==='room');
 assert.equal(p.w.JellyJourney.state.language,other);assert.equal(p.w.JellyJourney.state.memories.length,0);assert.equal(p.w.JellyJourney.state.learning.levels[0].completed,false);
});
