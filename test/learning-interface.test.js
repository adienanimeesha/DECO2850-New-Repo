const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

function setup(t) {
 const html = fs.readFileSync(path.join(__dirname, '../public/mobile.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
 const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost:3000/mobile.html' });
 t.after(() => dom.window.close());
 const { window } = dom, actions = [], locks = [];
 window.OceanRoom = { clearMovement() {}, lock(value) { locks.push(value); } };
 window.eval(fs.readFileSync(path.join(__dirname, '../public/js/learning-interface.js'), 'utf8'));
 const api = window.JellyLearningInterface.create({
  action(name, payload) { actions.push([name, payload]); return Promise.resolve({ ok: true }); },
  getContent() { return {}; },
  room: () => window.OceanRoom
 });
 const levels = Array.from({ length: 3 }, (_, index) => ({
  id: 'level-' + (index + 1), title: ['Everyday objects · Tutorial', 'Things we use', 'Food and animal friends'][index],
  status: index ? 'locked' : 'available'
 }));
 const stories = [
  { id: 'mandalika', title: 'Putri Mandalika', culturalTheme: 'Sasak legend', festival: 'Bau Nyale', status: 'available' },
  { id: 'future', title: 'A future story', culturalTheme: 'Coming later', festival: 'Future festival', status: 'locked' }
 ];
 const base = { phase: 'room', language: 'indonesian', learning: { levels, stories, storyUnlocked: false } };
 return { window, document: window.document, api, actions, locks, base };
}

test('first room visit guides movement and bookshelf opens three authoritative level cards', t => {
 const p = setup(t);
 p.api.sync(p.base, null);
 assert.equal(p.document.querySelector('#learning-guidance').hidden, false);
 assert.match(p.document.querySelector('#learning-guidance').textContent, /Move Jelly towards the bookshelf/);
 p.api.approach('learning-bookshelf');
 assert.equal(p.document.querySelector('#learning-level-screen').hidden, false);
 assert.equal(p.document.querySelectorAll('#learning-level-list .learning-card').length, 3);
 assert.equal(p.document.querySelectorAll('#learning-level-list .learning-card-action').length, 1);
 assert.equal(p.document.querySelector('#learning-level-list .learning-card h3').textContent, 'Everyday objects · Tutorial');
 assert.equal(p.document.querySelectorAll('#learning-level-list .is-locked').length, 2);
});

test('guidance is spoken once on arrival, replayable, and canceled before levels start',t=>{
 const p=setup(t),spoken=[];let canceled=0;
 p.window.JellyGuidanceContent=require('../public/js/guidance-content');
 p.window.VocabularySpeech={create:options=>{assert.equal(options.role,'narrator');return{play(parts){spoken.push(parts[0].text);},cancel(){canceled++;}};}};
 p.api.sync(p.base,null);
 assert.equal(spoken.at(-1),p.window.JellyGuidanceContent.bookshelf);
 p.api.sync(p.base,p.base);assert.equal(spoken.length,1,'snapshots do not repeat instructions');
 p.document.querySelector('#hear-learning-guidance').click();assert.equal(spoken.length,2);
 p.api.approach('learning-bookshelf');assert.equal(spoken.at(-1),p.window.JellyGuidanceContent.levels);
 assert.ok(canceled>0);
 p.api.stop();assert.equal(p.document.querySelector('#learning-guidance').hidden,true);
});

test('first storybook unlock is announced by narrator exactly once',t=>{
 const p=setup(t),spoken=[];
 p.window.JellyGuidanceContent=require('../public/js/guidance-content');
 p.window.VocabularySpeech={create:options=>({play(parts){spoken.push({role:options.role,text:parts[0].text});},cancel(){}})};
 p.api.sync(p.base,null);
 const complete=structuredClone(p.base);complete.learning.levels[0].status='completed';complete.learning.storyUnlocked=true;
 p.api.sync(complete,p.base);
 const unlock=p.window.JellyGuidanceContent.unlock;
 assert.deepEqual(spoken.filter(line=>line.text===unlock),[{role:'narrator',text:unlock}]);
 p.api.sync(complete,complete);p.document.querySelector('#explore-storybook').click();p.api.sync(complete,complete);
 assert.equal(spoken.filter(line=>line.text===unlock).length,1);
});

test('starting Level 1 closes the menu without starting from room entry', async t => {
 const p = setup(t);
 p.api.sync(p.base, null);
 assert.equal(p.actions.length, 0, 'room entry must not start the tutorial');
 p.api.approach('learning-bookshelf');
 p.document.querySelector('.learning-card-action').click();
 await new Promise(resolve => setImmediate(resolve));
 assert.equal(JSON.stringify(p.actions[0]), JSON.stringify(['startLevel', { levelId: 'level-1', level: 1 }]));
 assert.equal(p.document.querySelector('#learning-level-screen').hidden, true);
});

test('Level 1 completion celebrates once, then exposes available cultural stories', async t => {
 const p = setup(t);
 p.api.sync(p.base, null);
 const complete = structuredClone(p.base);
 complete.learning.levels[0].status = 'completed';
 complete.learning.storyUnlocked = true;
 p.api.sync(complete, p.base);
 assert.equal(p.document.querySelector('#storybook-unlock-screen').hidden, false);
 p.document.querySelector('#explore-storybook').click();
 await Promise.resolve();
 assert.equal(p.document.querySelector('#storybook-unlock-screen').hidden, true);
 p.api.sync(complete, complete);
 assert.equal(p.document.querySelector('#storybook-unlock-screen').hidden, true, 'unchanged reconnect state must not replay celebration');
 p.api.approach('learning-storybook');
 assert.equal(p.document.querySelector('#learning-story-screen').hidden, false);
 assert.equal(p.document.querySelectorAll('#learning-story-list .learning-card').length, 2);
 assert.equal(p.document.querySelectorAll('#learning-story-list .learning-card-action').length, 1);
 assert.match(p.document.querySelector('#learning-story-list').textContent, /Putri Mandalika/);
});

test('tutorial celebration offers the next level without automatically starting it', async t => {
 const p=setup(t),complete=structuredClone(p.base);
 complete.learning.levels[0].status='completed';
 complete.learning.levels[1].status='available';
 complete.learning.storyUnlocked=true;
 p.api.sync(p.base,null);p.api.sync(complete,p.base);
 assert.equal(p.document.querySelector('#storybook-unlock-screen').hidden,false);
 p.document.querySelector('#continue-learning').click();
 assert.equal(p.document.querySelector('#storybook-unlock-screen').hidden,true);
 assert.equal(p.document.querySelector('#learning-level-screen').hidden,false);
 assert.equal(p.document.querySelectorAll('#learning-level-list .learning-card-action').length,2);
 assert.equal(p.actions.length,0,'opening the menu does not auto-start learning');
 p.document.querySelector('#learning-level-list .learning-card:nth-child(2) button').click();
 await Promise.resolve();
 assert.equal(JSON.stringify(p.actions[0]),JSON.stringify(['startLevel',{levelId:'level-2',level:2}]));
});

test('completed levels and stories render Replay while locked content stays inert', t => {
 const p = setup(t), state = structuredClone(p.base);
 state.learning.storyUnlocked = true;
 state.learning.levels[0].status = 'completed';
 state.learning.levels[1].status = 'available';
 state.learning.stories[0].status = 'completed';
 p.api.sync(state, null);
 p.api.openLevels();
 assert.equal(p.document.querySelector('.learning-card-action').textContent, 'Replay');
 assert.equal(p.document.querySelectorAll('#learning-level-list .learning-card-action').length, 2);
 p.document.querySelector('#close-level-select').click();
 p.api.openStories();
 assert.equal(p.document.querySelector('#learning-story-list .learning-card-action').textContent, 'Start festival');
 assert.equal(p.document.querySelectorAll('#learning-story-list .is-locked button').length, 0);
});

test('real curriculum ignores obsolete five-level progress and never unlocks unknown levels', t => {
 const html = fs.readFileSync(path.join(__dirname, '../public/mobile.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
 const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost:3000/mobile.html' });
 t.after(() => dom.window.close());
 const { window } = dom;
 window.OceanRoom = { clearMovement() {}, lock() {} };
 window.eval(fs.readFileSync(path.join(__dirname, '../public/js/journey-content.js'), 'utf8'));
 window.eval(fs.readFileSync(path.join(__dirname, '../public/js/learning-interface.js'), 'utf8'));
 const state = {phase:'room', language:'indonesian', stories:[], learning:{active:null, storybookUnlocked:false,
  levels:[
   {level:1,unlocked:true,completed:false}, {level:2,unlocked:false,completed:false},
   {level:3,unlocked:false,completed:false}, {level:4,unlocked:true,completed:false},
   {level:5,unlocked:true,completed:false}
  ]}};
 const ui = window.JellyLearningInterface.create({action:()=>Promise.resolve(),
  getContent:value=>window.JOURNEYS[value.language], room:()=>window.OceanRoom});
 ui.sync(state, null); ui.openLevels();
 const cards = [...window.document.querySelectorAll('#learning-level-list .learning-card')];
 assert.equal(cards.length, 3);
 assert.deepEqual(cards.map(card=>card.querySelector('h3').textContent),
  ['Everyday objects · Tutorial', 'Things we use', 'Food and animal friends']);
 assert.equal(window.document.querySelectorAll('#learning-level-list .learning-card-action').length, 1);
 assert.doesNotMatch(window.document.querySelector('#learning-level-list').textContent, /Music and Traditions|Bau Nyale Adventure/);
});

test('owned interface removes nursery-rhyme navigation and includes responsive layouts', () => {
 const html = fs.readFileSync(path.join(__dirname, '../public/mobile.html'), 'utf8');
 const js = fs.readFileSync(path.join(__dirname, '../public/js/journey-mobile.js'), 'utf8');
 const css = fs.readFileSync(path.join(__dirname, '../public/css/ocean.css'), 'utf8');
 assert.doesNotMatch(html, /song-player\.js|rhyme-colouring\.js|nursery rhyme/i);
 assert.doesNotMatch(js, /journey-rhyme-|nursery rhyme|sing along/i);
 assert.match(css, /@media\(max-width:680px\)/);
 assert.match(css, /@media\(max-height:500px\) and \(orientation:landscape\)/);
});

test('first collection pauses the next request for narrator memory shelf guidance, then resumes once',t=>{
 const p=setup(t),views=[],spoken=[];let complete;
 p.window.JellyGuidanceContent=require('../public/js/guidance-content');
 p.window.VocabularyGameplay={};
 p.window.OceanRoom.configureLearning=()=>({sync(view){views.push(view);},stop(){views.push(null);}});
 p.window.VocabularySpeech={create:({role})=>({play(parts,callbacks){spoken.push({role,text:parts[0].text});complete=callbacks.onComplete;},cancel(){}})};
 const first={...p.base,trip:1,bag:[{id:'old-item'}],memories:[{id:'old-memory'}],learning:{...p.base.learning,active:{level:1,questionIndex:0,attemptId:'a'},presentation:{key:'first'}}};
 const second={...first,bag:[{id:'book'}],learning:{...first.learning,active:{level:1,questionIndex:1,attemptId:'b'},presentation:{key:'second'}}};
 p.api.sync(first,null);p.api.sync(second,first);
 assert.equal(p.document.querySelector('#memory-shelf-guidance').hidden,false);
 assert.equal(views.at(-1),null,'next request is deferred');assert.equal(p.locks.at(-1),true);
 assert.deepEqual(spoken,[{role:'narrator',text:p.window.JellyGuidanceContent.memoryShelf}]);
 p.api.sync(second,second);assert.equal(spoken.length,1);
 complete();assert.equal(p.document.querySelector('#memory-shelf-guidance').hidden,true);
 assert.equal(views.at(-1).key,'second');assert.equal(p.locks.at(-1),false);
 p.api.sync(second,first);assert.equal(spoken.length,1,'repeated transition does not repeat the introduction');
});

test('leaving during memory shelf guidance cannot restore an old request',t=>{
 const p=setup(t);let complete;
 p.window.JellyGuidanceContent=require('../public/js/guidance-content');
 p.window.VocabularySpeech={create:()=>({play(parts,callbacks){complete=callbacks.onComplete;},cancel(){}})};
 const first={...p.base,trip:1,bag:[],learning:{...p.base.learning,active:{level:1,questionIndex:0,attemptId:'a'}}};
 const second={...first,bag:[{id:'book'}],learning:{...first.learning,active:{level:1,questionIndex:1,attemptId:'b'}}};
 p.api.sync(first,null);p.api.sync(second,first);p.api.stop();complete();
 assert.equal(p.document.querySelector('#memory-shelf-guidance').hidden,true);assert.equal(p.locks.at(-1),false);
});

function memoryTutorial(t,{speech=true}={}){
 const p=setup(t),views=[],callbacks=[],timers=new Map();let now=0,id=0,hidden=false,paused=0,resumed=0;
 Object.defineProperty(p.document,'hidden',{get:()=>hidden});
 Object.defineProperty(p.window.performance,'now',{value:()=>now});
 p.window.setTimeout=(fn,delay)=>{const key=++id;timers.set(key,{fn,at:now+delay});return key;};
 p.window.clearTimeout=key=>timers.delete(key);
 p.window.JellyGuidanceContent=require('../public/js/guidance-content');p.window.VocabularyGameplay={};
 p.window.OceanRoom.configureLearning=()=>({sync(view){views.push(view);},stop(){views.push(null);}});
 if(speech)p.window.VocabularySpeech={create:()=>({play(parts,c){callbacks.push(c);},cancel(){},pause(){paused++;},resume(){resumed++;}})};
 const first={...p.base,trip:1,bag:[],learning:{...p.base.learning,active:{level:1,questionIndex:0,attemptId:1},presentation:{key:'first'}}};
 const second={...first,bag:[{id:'book'}],learning:{...first.learning,active:{level:1,questionIndex:1,attemptId:2},presentation:{key:'second'}}};
 p.api.sync(first,null);p.api.sync(second,first);
 return {...p,views,callbacks,first,second,
  advance(ms){now+=ms;for(const [key,task]of [...timers])if(task.at<=now){timers.delete(key);task.fn();}},
  visibility(value){hidden=value;p.document.dispatchEvent(new p.window.Event('visibilitychange'));},
  get paused(){return paused;},get resumed(){return resumed;},get timerCount(){return timers.size;}};
}

test('lost audio completion automatically resumes the next item without pressing Continue',t=>{
 const p=memoryTutorial(t);
 p.advance(10000);assert.equal(p.document.querySelector('#memory-shelf-guidance').hidden,false,'normal narration is not cut short');
 p.advance(30000);
 assert.equal(p.document.querySelector('#memory-shelf-guidance').hidden,true);
 assert.equal(p.views.at(-1).key,'second');assert.equal(p.locks.at(-1),false);
 const count=p.views.length;p.callbacks[0].onComplete();assert.equal(p.views.length,count,'late completion cannot repeat the request');
});

test('memory tutorial fallback also advances when speech support is missing',t=>{
 const p=memoryTutorial(t,{speech:false});p.advance(40000);
 assert.equal(p.document.querySelector('#memory-shelf-guidance').hidden,true);assert.equal(p.views.at(-1).key,'second');
});

test('hidden page pauses tutorial recovery and resumes with the remaining time',t=>{
 const p=memoryTutorial(t);p.advance(5000);p.visibility(true);
 assert.equal(p.paused,1);assert.equal(p.timerCount,0);
 p.advance(60000);assert.equal(p.document.querySelector('#memory-shelf-guidance').hidden,false);
 p.visibility(false);assert.equal(p.resumed,1);assert.equal(p.timerCount,1);
 p.advance(1000);assert.equal(p.document.querySelector('#memory-shelf-guidance').hidden,false);
 p.callbacks[0].onComplete();assert.equal(p.timerCount,0);assert.equal(p.views.at(-1).key,'second');
});

test('old tutorial audio and timeout cannot close a newly started introduction',t=>{
 const p=memoryTutorial(t),old=p.callbacks[0];p.api.stop();
 const first={...p.first,trip:2},second={...p.second,trip:2};
 p.api.sync(first,null);p.api.sync(second,first);
 old.onComplete();old.onCancel();
 assert.equal(p.document.querySelector('#memory-shelf-guidance').hidden,false);
 assert.equal(p.views.at(-1),null);assert.equal(p.timerCount,1);
 p.callbacks[1].onComplete();assert.equal(p.views.at(-1).key,'second');assert.equal(p.timerCount,0);
});
