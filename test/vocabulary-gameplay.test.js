const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const content=require('../public/js/journey-content');

function setup(t,{room=false,voices=[]}={}) {
 const html=room?fs.readFileSync(path.join(__dirname,'../public/mobile.html'),'utf8').replace(/<script[\s\S]*?<\/script>/g,''):'<!doctype html><div id="root"></div>';
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'http://localhost:3000/mobile.html'}),w=dom.window,d=w.document;
 t.after(()=>w.close());
 let time=0,sequence=0;const frames=new Map(),timers=new Map(),utterances=[],voiceListeners=new Set(),draws=[],ellipses=[];
 const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),drawImage(...args){draws.push(args);},ellipse(...args){ellipses.push(args);}}, {get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 w.HTMLCanvasElement.prototype.getContext=()=>ctx;w.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/png;base64,Y29sb3Vy';
 w.HTMLElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width:960,height:620});
 w.Image=class{constructor(){this.complete=true;this.naturalWidth=100;}set src(value){this._src=value;this.onload?.();}get src(){return this._src;}};
 Object.defineProperty(w.performance,'now',{value:()=>time});
 w.requestAnimationFrame=fn=>{const id=++sequence;frames.set(id,fn);return id;};w.cancelAnimationFrame=id=>frames.delete(id);
 w.setTimeout=(fn,ms)=>{const id=++sequence;timers.set(id,{fn,at:time+ms});return id;};w.clearTimeout=id=>timers.delete(id);
 w.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
 w.speechSynthesis={getVoices:()=>voices,speak:speech=>utterances.push(speech),cancel(){},addEventListener:(_,fn)=>voiceListeners.add(fn),removeEventListener:(_,fn)=>voiceListeners.delete(fn)};
 function load(file){w.eval(fs.readFileSync(path.join(__dirname,'../public/js',file),'utf8'));}
 ['journey-content.js','ocean-art.js','vocabulary-speech.js','vocabulary-colouring.js','vocabulary-gameplay.js'].forEach(load);
 if(room){
  const state={phase:'room',trip:1,language:'indonesian',storyPage:0,festivalFeedback:false};
  w.JellyJourney={state,content:content.indonesian,memories:[],outfit:null,locked:false,trapFocus(){},send(){},openActivity(){}};
  load('ocean-room.js');w.OceanRoom.sync(state,null);
 }
 const root=d.getElementById('root')||d.body.appendChild(d.createElement('div'));
 async function advance(ms=100){for(let i=0;i<Math.ceil(ms/50);i++){time+=50;for(const[id,task]of [...timers])if(task.at<=time){timers.delete(id);task.fn();}const now=[...frames];frames.clear();now.forEach(([,fn])=>fn(time));await Promise.resolve();}await Promise.resolve();}
 return {w,d,root,ctx,draws,ellipses,utterances,voiceListeners,advance,load};
}
function question(language='indonesian',level=1,index=0,attempt=0){
 // Fixtures reuse cultural items from shared content, not renderer vocabulary.
 const c=content[language],target=c.festivalItems[index%3];
 return {key:`${language}:${level}:${index}:${attempt}`,language,level,index,question:{word:target.word,pronunciation:target.pronunciation,before:'We are preparing for the festival. Find',after:'to help Jelly.',hint:target.fact,objects:c.festivalItems.map(item=>({id:item.id,icon:item.icon}))}};
}
const geometry={bounds:{left:49,right:911,top:127,bottom:567},player:{x:486,y:408,radius:21},furniture:[{x:83,y:348,width:179,height:81},{x:77,y:155,width:180,height:63},{x:731,y:164,width:152,height:76},{x:413,y:239,width:145,height:77},{x:785,y:441,width:65,height:63}],reserved:[{x:180,y:270,radius:55},{x:190,y:413,radius:50}]};
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}

test('all three levels and both tracks place shared cultural objects in reachable, separated room positions',t=>{
 const p=setup(t);
 for(const language of ['indonesian','chinese'])for(let level=1;level<=3;level++)for(let index=0;index<5;index++){
  const objects=p.w.VocabularyGameplay.placeObjects(question(language,level,index).question.objects,geometry);
  assert.equal(objects.length,3);
  const grid=20,seen=new Set(['480,400']),queue=[[480,400]];
  for(let i=0;i<queue.length;i++)for(const[dx,dy]of[[20,0],[-20,0],[0,20],[0,-20]]){
   const x=queue[i][0]+dx,y=queue[i][1]+dy,key=x+','+y;
   if(seen.has(key)||x<73||x>887||y<151||y>543)continue;
   if(geometry.furniture.some(b=>(x-Math.max(b.x,Math.min(x,b.x+b.width)))**2+(y-Math.max(b.y,Math.min(y,b.y+b.height)))**2<24**2))continue;
   seen.add(key);queue.push([x,y]);
  }
  objects.forEach((o,i)=>{
   assert.ok(seen.has(o.x+','+o.y),'object is in the connected navigation grid');
   assert.equal(o.x%grid,0);assert.equal(o.y%grid,0);
   for(const other of objects.slice(0,i))assert.ok(Math.hypot(o.x-other.x,o.y-other.y)>=115);
   for(const box of geometry.furniture){const dx=o.x-Math.max(box.x,Math.min(o.x,box.x+box.width)),dy=o.y-Math.max(box.y,Math.min(o.y,box.y+box.height));assert.ok(dx*dx+dy*dy>=48**2,'illustration clears furniture');}
  });
 }
 assert.throws(()=>p.w.VocabularyGameplay.placeObjects(Array.from({length:100},(_,id)=>({id})),geometry),/space/);
});

test('proximity and backend confirmation gate colouring; wrong selections use contextual content',async t=>{
 const p=setup(t);let near=false,opened=0,selected=0;const response=deferred();
 const controller=p.w.VocabularyGameplay.create({root:p.root,room:{geometry:()=>geometry,isNear:()=>near,clearMovement(){}},adapter:{select(){selected++;return response.promise;},complete(){},exit(){}},colouring:{mount(){opened++;return{close(){}};}}});
 controller.sync(question());await controller.select('ayam-taliwang');assert.equal(selected,0);
 near=true;const selection=controller.select('gendang');assert.equal(opened,0);assert.equal(controller.blocked,true);
 response.resolve({correct:false});await selection;
 assert.equal(opened,0);assert.equal(controller.blocked,false);assert.equal(p.root.querySelector('.vocabulary-hint').textContent,question().question.hint);
 controller.destroy();
});

test('colouring waits for completion acknowledgement and authoritative next question; stale responses are ignored',async t=>{
 const p=setup(t);let submit,close=0;const completion=deferred(),selection=deferred();
 const controller=p.w.VocabularyGameplay.create({root:p.root,room:{geometry:()=>geometry,isNear:()=>true,clearMovement(){}},adapter:{select:()=>selection.promise,complete:()=>completion.promise,exit(){}},colouring:{mount(_root,_item,done){submit=done;return{close(){close++;}};}}});
 controller.sync(question());const pending=controller.select('ayam-taliwang');assert.equal(submit,undefined);
 selection.resolve({correct:true,colouringAllowed:true});await pending;assert.equal(typeof submit,'function');
 const save=submit('data:image/png;base64,Y29sb3Vy');assert.equal(controller.blocked,true);assert.equal(close,0);
 completion.resolve();await save;assert.equal(close,1);assert.match(p.root.textContent,/Waiting for the next question/);assert.equal(controller.blocked,true);
 controller.sync(question('indonesian',1,1));assert.equal(controller.blocked,false);assert.match(p.root.textContent,/Question 2 of 5/);
 controller.sync(null);assert.equal(controller.active,false);assert.equal(controller.objects.length,0);assert.equal(p.root.hidden,true);
 const late=deferred();controller.destroy();
 const other=p.w.VocabularyGameplay.create({root:p.root,room:{geometry:()=>geometry,isNear:()=>true,clearMovement(){}},adapter:{select:()=>late.promise},colouring:{mount(){assert.fail('stale confirmation opened colouring');}}});
 other.sync(question());const stale=other.select('ayam-taliwang');other.sync(question('chinese',3,4));late.resolve({correct:true,colouringAllowed:true});await stale;assert.match(p.root.textContent,/Question 5 of 5/);other.destroy();
});

test('actual colouring supports brush, fill, clear, Done retry, cancel, and cleanup',async t=>{
 const p=setup(t);let calls=0,cancel=0;const failure=deferred();
 const paint=p.w.VocabularyColouring.mount(p.root,{icon:'mooncake'},()=>{calls++;return calls===1?failure.promise:Promise.resolve();},()=>cancel++);
 const done=p.root.querySelector('[data-tool="done"]');assert.equal(done.disabled,true);
 p.root.querySelector('canvas').dispatchEvent(new p.w.MouseEvent('pointerdown',{clientX:100,clientY:100}));assert.equal(done.disabled,false);
 p.root.querySelector('[data-tool="clear"]').click();assert.equal(done.disabled,true);
 p.root.querySelector('[data-tool="fill"]').click();await p.advance();assert.equal(done.disabled,false);
 done.click();await p.advance();done.click();assert.equal(calls,1,'duplicate completion blocked');
 failure.reject(new Error('offline'));await p.advance();assert.equal(done.disabled,false);assert.match(p.root.textContent,/retry/);
 done.click();await p.advance();assert.equal(calls,2);
 paint.close();assert.equal(p.root.children.length,0);assert.equal(cancel,0);
 const next=p.w.VocabularyColouring.mount(p.root,{icon:'lantern'},()=>{},()=>cancel++);
 p.d.dispatchEvent(new p.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(cancel,1);next.close();
 assert.throws(()=>p.w.VocabularyColouring.mount(p.root,{icon:'unsupported'},()=>{}),/outline/);
});

test('all three levels support five authoritative questions, replay, cleanup, and safe text rendering',async t=>{
 const p=setup(t);let completed=0;
 const controller=p.w.VocabularyGameplay.create({root:p.root,room:{geometry:()=>geometry,isNear:()=>true,clearMovement(){}},adapter:{select:()=>({correct:true,colouringAllowed:true}),complete:()=>{completed++;},exit(){}}});
 for(const language of ['indonesian','chinese'])for(let level=1;level<=3;level++){
  for(let index=0;index<5;index++){
   const view=question(language,level,index);controller.sync(view);const first=controller.objects[0];await controller.select(first.id);
   p.root.querySelector('[data-tool="fill"]').click();await p.advance();p.root.querySelector('[data-tool="done"]').click();await p.advance();
   assert.match(p.root.textContent,/Waiting for the next question/);
  }
  controller.sync(null);assert.equal(controller.objects.length,0);assert.equal(controller.speaking,false);
  controller.sync(question(language,level,0,1));assert.match(p.root.textContent,/Question 1 of 5/);controller.sync(null);
 }
 assert.equal(completed,30);
 const unsafe=question();unsafe.question.before='<img src=x onerror=alert(1)>';controller.sync(unsafe);assert.equal(p.root.querySelector('img'),null);
 const missing=question('chinese');delete missing.question.pronunciation;assert.throws(()=>controller.sync(missing),/Pinyin/);controller.destroy();
});

test('segmented narration uses target-language voices and Hanzi, with mouth callbacks and stale replay protection',t=>{
 const voices=[{lang:'en-US',name:'English'},{lang:'id-ID',name:'Indonesian'},{lang:'zh-CN',name:'Mandarin'},{lang:'zh-HK',name:'Cantonese'}],p=setup(t,{voices}),mouth=[];
 const speech=p.w.VocabularySpeech.create({onSpeaking:value=>mouth.push(value)});
 const parts=[{text:'Please find',lang:'en-US'},{text:'月饼',lang:'zh-CN'},{text:'for our festival.',lang:'en-US'}];
 speech.play(parts);let s=p.utterances.at(-1);assert.equal(s.text,'Please find');s.onstart();assert.equal(mouth.at(-1),true);s.onend();
 s=p.utterances.at(-1);assert.equal(s.text,'月饼');assert.equal(s.voice,voices[2]);assert.equal(s.lang,'zh-CN');s.onstart();s.onend();
 assert.equal(p.utterances.at(-1).lang,'en-US');const stale=p.utterances.at(-1);speech.play([{text:'gendang',lang:'id-ID'}]);const count=p.utterances.length;stale.onstart();stale.onend();assert.equal(p.utterances.length,count);assert.equal(mouth.at(-1),false);
 s=p.utterances.at(-1);assert.equal(s.voice,voices[1]);s.onstart();assert.equal(mouth.at(-1),true);speech.cancel();assert.equal(mouth.at(-1),false);s.onstart();assert.equal(mouth.at(-1),false);
});

test('dedicated Indonesian and Mandarin voices take priority over English-persona multilingual voices',t=>{
 const p=setup(t),choose=p.w.VocabularySpeech.voiceFor;
 const english={name:'Samantha',lang:'en-US'};
 const genericChinese={name:'Eddy (Chinese (China mainland))',lang:'zh-CN'};
 const mandarin={name:'Tingting',lang:'zh_CN'};
 const indonesian={name:'Damayanti',lang:'id_ID'};
 assert.equal(choose([english,genericChinese,mandarin,indonesian],'zh-CN'),mandarin);
 assert.equal(choose([english,indonesian],'id-ID'),indonesian);
 assert.equal(choose([english,{name:'Cantonese',lang:'zh-HK'}],'zh-CN'),undefined);
 assert.equal(choose([english],'id-ID'),undefined);
});

for(const [language,targetWord,targetLocale] of [['indonesian','perahu','id-ID'],['chinese','月饼','zh-CN']])
 test(`${language} question speaks only the target word in ${targetLocale} and never says punctuation`,t=>{
  const voices=[{lang:'en-US',name:'English'},{lang:'id-ID',name:'Indonesian'},{lang:'zh-CN',name:'Mandarin'}];
  const p=setup(t,{voices}),level=content[language].learningLevels[0];
  const index=level.questions.findIndex(item=>item.targetWord===targetWord),item=level.questions[index];
  assert.ok(index>=0);
  const controller=p.w.VocabularyGameplay.create({
   root:p.root,room:{geometry:()=>geometry,clearMovement(){}},
   adapter:{select(){},complete(){},exit(){}}
  });
  controller.sync({
   key:`spoken-${language}`,language,level:1,index,
   question:{before:item.sentenceBefore,word:item.targetWord,after:item.sentenceAfter,
    pronunciation:item.pinyin||'',hint:item.hint,
    objects:item.options.map(option=>({id:option.itemId,icon:option.asset}))}
  });
  assert.equal(p.root.querySelector('.vocabulary-prompt').textContent,
   item.sentenceBefore+item.targetWord+item.sentenceAfter);
  assert.equal(p.utterances.length,1);
  assert.equal(p.utterances[0].lang,'en-US');
  assert.doesNotMatch(p.utterances[0].text,new RegExp(targetWord));
  assert.doesNotMatch(p.utterances[0].text,/[“”]/);
  p.utterances[0].onend();
  assert.equal(p.utterances.length,2);
  assert.equal(p.utterances[1].lang,targetLocale);
  assert.equal(p.utterances[1].text,targetWord);
  p.utterances[1].onend();
  const spokenAfter=item.sentenceAfter.replace(/[?.!\s]+$/u,'').trim();
  if(spokenAfter){
   assert.equal(p.utterances.length,3,'English resumes after the target-language word');
   assert.equal(p.utterances[2].lang,'en-US');
   assert.equal(p.utterances[2].text,spokenAfter);
   p.utterances[2].onend();
  }else assert.equal(p.utterances.length,2,'the visible question mark has no speech segment');
  assert.match(p.root.textContent,/\?/,'the question mark remains visible');
  controller.destroy();
 });

test('missing and late voices never substitute English/Cantonese for Mandarin or Indonesian',async t=>{
 const voices=[{lang:'en-US',name:'English'},{lang:'zh-HK',name:'Cantonese'}],p=setup(t,{voices}),statuses=[];
 const speech=p.w.VocabularySpeech.create({onStatus:value=>statuses.push(value)});
 speech.play([{text:'月饼',lang:'zh-CN'}]);await p.advance(1100);assert.equal(p.utterances.length,0);assert.match(statuses.at(-1),/Mandarin playback unavailable/);assert.equal(p.voiceListeners.size,0);
 speech.play([{text:'gendang',lang:'id-ID'}]);voices.push({lang:'id-ID',name:'Indonesian'});[...p.voiceListeners].forEach(fn=>fn());assert.equal(p.utterances.at(-1).lang,'id-ID');assert.equal(p.voiceListeners.size,0);
 speech.cancel();speech.play([{text:'月饼',lang:'zh-CN'}]);speech.cancel();await p.advance(2000);assert.equal(p.utterances.length,1);
});

test('missing target-language voice is shown beside the vocabulary controls',async t=>{
 const p=setup(t,{voices:[{name:'English',lang:'en-US'}]});
 const controller=p.w.VocabularyGameplay.create({
  root:p.root,room:{geometry:()=>geometry,clearMovement(){}},
  adapter:{select(){},complete(){},exit(){}}
 });
 controller.sync(question());
 p.utterances[0].onend();
 await p.advance(1100);
 const status=p.root.querySelector('.vocabulary-audio-status');
 assert.equal(status.hidden,false);
 assert.match(status.textContent,/Indonesian playback unavailable/);
 assert.equal(p.utterances.some(line=>line.text===question().question.word),false,
  'the target word must not use the English voice');
 controller.destroy();
});

test('actual room bookshelf callback, click-to-walk, physical selection, gated storybook, and phase cleanup',async t=>{
 const p=setup(t,{room:true});let bookshelf=0,selections=0;
 const integration=p.w.OceanRoom.configureLearning({root:p.root,onBookshelf:id=>{assert.equal(id,'learning-bookshelf');bookshelf++;},adapter:{select(){selections++;return{correct:false};},complete(){},exit(){}}});
 const walk=id=>p.w.OceanRoom.walkTo(id);
 walk('book');await p.advance(7000);assert.equal(p.d.querySelector('#storybook-backdrop').hidden,true);
 walk('learning-bookshelf');await p.advance(7000);assert.equal(bookshelf,1);await p.advance(1000);assert.equal(bookshelf,1,'stationary Jelly does not reopen level popup');
 integration.sync(question());const first=integration.controller.objects[0];
 await integration.controller.select(first.id);assert.equal(selections,0,'across-room direct selection rejected');
 const canvas=p.d.getElementById('game');canvas.dispatchEvent(new p.w.MouseEvent('pointerup',{clientX:first.x,clientY:first.y}));assert.equal(selections,0,'click starts walking, not selection');
 await p.advance(7000);assert.equal(selections,1,'existing pathfinder reaches the cultural object');assert.match(p.root.textContent,/grilled chicken/);
 integration.sync(null,{storyUnlocked:true});walk('book');await p.advance(7000);assert.equal(p.d.querySelector('#storybook-backdrop').hidden,false);p.w.OceanRoom.closeStory();
 integration.sync(question());p.w.JellyJourney.state.phase='travelling';p.w.OceanRoom.sync(p.w.JellyJourney.state,{phase:'room'});assert.equal(integration.controller.objects.length,0);assert.equal(integration.controller.speaking,false);integration.destroy();
});

test('room Jelly mouth follows narration start, end, replay cancellation, and room locking',async t=>{
 const p=setup(t,{room:true,voices:[{lang:'en-US',name:'English'},{lang:'id-ID',name:'Indonesian'}]});
 const integration=p.w.OceanRoom.configureLearning({root:p.root,adapter:{select(){},complete(){},exit(){}}});integration.sync(question());
 const speech=p.utterances.at(-1);speech.onstart();assert.equal(integration.controller.speaking,true);
 p.ellipses.length=0;await p.advance();assert.ok(p.ellipses.some(e=>e[2]===3.5&&e[3]>=2&&e[3]<=4),'mouth opening drawn on existing room Jelly');
 speech.onend();assert.equal(integration.controller.speaking,false);p.ellipses.length=0;await p.advance();assert.equal(p.ellipses.some(e=>e[2]===3.5),false);
 p.utterances.at(-1).onstart();assert.equal(integration.controller.speaking,true);integration.controller.replay();assert.equal(integration.controller.speaking,false);
 p.utterances.at(-1).onstart();p.w.OceanRoom.lock(true);assert.equal(integration.controller.speaking,false);integration.destroy();
});

test('verified recording hooks follow playback, fall back safely on failure, and discard canceled callbacks',async t=>{
 const p=setup(t,{voices:[{lang:'zh-CN',name:'Mandarin'}]}),recordings=[],mouth=[];
 p.w.Audio=class{constructor(src){this.src=src;recordings.push(this);}play(){return Promise.resolve();}pause(){this.onpause?.();}};
 const speech=p.w.VocabularySpeech.create({onSpeaking:value=>mouth.push(value)});
 speech.play([{text:'月饼',lang:'zh-CN',audio:'/audio/native-mooncake.mp3'}]);assert.equal(recordings.length,1);assert.equal(p.utterances.length,0);assert.equal(mouth.at(-1),false);
 recordings[0].onplaying();assert.equal(mouth.at(-1),true);recordings[0].onended();assert.equal(mouth.at(-1),false);
 speech.play([{text:'月饼',lang:'zh-CN',audio:'/audio/native-mooncake.mp3'}]);recordings[1].onerror();assert.equal(p.utterances.at(-1).voice.lang,'zh-CN');
 speech.play([{text:'月饼',lang:'zh-CN',audio:'/audio/native-mooncake.mp3'}]);const old=recordings[2].onplaying;speech.cancel();old();assert.equal(mouth.at(-1),false);
 speech.play([{text:'月饼',lang:'zh-CN',audio:'https://untrusted.example/word.mp3'}]);assert.equal(recordings.length,3);assert.equal(p.utterances.at(-1).lang,'zh-CN');speech.cancel();
});

test('failed selection permits retry, exit waits for authoritative cleanup, and interrupted saves cannot resurrect a question',async t=>{
 const p=setup(t);let tries=0,exits=0;const save=deferred();
 const controller=p.w.VocabularyGameplay.create({root:p.root,room:{geometry:()=>geometry,isNear:()=>true,clearMovement(){}},adapter:{select(){if(++tries===1)throw new Error('offline');return{correct:true,colouringAllowed:true};},complete:()=>save.promise,exit(){exits++;}}});
 controller.sync(question());await controller.select('ayam-taliwang');assert.equal(controller.blocked,false);assert.match(p.root.textContent,/Try again/);
 p.root.querySelector('.vocabulary-exit').click();await p.advance();assert.equal(exits,1);assert.equal(controller.active,true,'no optimistic progress reset');
 await controller.select('ayam-taliwang');p.root.querySelector('[data-tool="fill"]').click();await p.advance();p.root.querySelector('[data-tool="done"]').click();await p.advance();
 controller.stop();save.resolve();await p.advance();assert.equal(p.root.children.length,0);assert.equal(controller.objects.length,0);assert.equal(controller.speaking,false);
});
