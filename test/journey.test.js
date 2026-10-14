const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { Server } = require('socket.io');
const { createJourney } = require('../journey');
const content = require('../public/js/journey-content');
const { io: clientIo } = require(path.join(path.dirname(require.resolve('socket.io')), '../client-dist/socket.io.js'));

async function setup(t) {
 const server = http.createServer(), io = new Server(server), journey = createJourney(io, { transitionMs: 5 }), clients=[];
 io.on('connection', socket => socket.on('barrier', done => done()));
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 t.after(async () => { journey.stop();clients.forEach(c=>c.socket.disconnect());await new Promise(resolve=>io.close(resolve)); });
 async function connect(auth={journey:true}) {
  const socket=clientIo(`http://127.0.0.1:${server.address().port}`,{auth,transports:['websocket'],forceNew:true}),c={socket,states:[]};clients.push(c);
  socket.on('journey-state', s=>c.states.push(s));
  await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('connect_error',reject);});
  await new Promise(resolve=>socket.emit('barrier',resolve));return c;
 }
 async function send(c,event,payload) {
  if (event !== 'barrier') {
    if (payload === undefined) c.socket.emit(event);
    else c.socket.emit(event,payload);
  }
  await Promise.all(clients.filter(x=>x.socket.connected).map(x=>new Promise(resolve=>x.socket.emit('barrier',resolve))));
  return journey.snapshot();
 }
 async function phase(expected) {
  await new Promise((resolve,reject)=>{
   const deadline=Date.now()+1000;
   function check(){if(journey.snapshot().phase===expected)return resolve();if(Date.now()>deadline)return reject(new Error('Expected '+expected));setTimeout(check,5);}check();
  });
 }
 return {connect,send,phase,journey};
}
for (const language of ['indonesian','chinese']) test(`${language}: two screens, mission gates, wardrobe, festival, and memories brought home`,async t=>{
 const {connect,send,phase,journey}=await setup(t),mobile=await connect(),aquarium=await connect();
 assert.equal(mobile.states.at(-1).phase,'aquarium');
 await send(mobile,'journey-start','__proto__');assert.equal(journey.snapshot().phase,'aquarium');
 await send(mobile,'journey-start',language);assert.equal(journey.snapshot().phase,'departing');
 await phase('room');
 const trip=journey.snapshot().trip;
 await send(mobile,'journey-start',language);assert.equal(journey.snapshot().trip,trip);
 await send(mobile,'journey-festival');assert.equal(journey.snapshot().phase,'room');
 await send(mobile,'journey-invitation');assert.equal(journey.snapshot().invited,false);
 await send(mobile,'journey-story-page',4);assert.equal(journey.snapshot().storyPage,0);
 await send(mobile,'journey-story-page',0);
 await send(mobile,'journey-story-page',0);assert.equal(journey.snapshot().bag.length,1);
 for(let i=1;i<5;i++)await send(mobile,'journey-story-page',i);
 assert.equal(journey.snapshot().storyDone,true);
 await send(mobile,'journey-rhyme-answer',{icon:'star',artwork:'data:image/png;base64,Y29sb3Vy'});
 assert.equal(journey.snapshot().rhymeStep,0,'even correct answers are ignored before the song finishes');
 assert.equal(journey.snapshot().rhymeListened,false);
 await send(mobile,'journey-invitation');assert.equal(journey.snapshot().invited,false);
 await send(mobile,'journey-rhyme-answer',{icon:'fish',artwork:'data:image/png;base64,Y29sb3Vy'});assert.equal(journey.snapshot().rhymeStep,0);
 await send(mobile,'journey-rhyme-listened');
 for(const line of content[language].rhyme.lines)await send(mobile,'journey-rhyme-answer',{icon:line.icon,artwork:'data:image/png;base64,Y29sb3Vy'});
 assert.equal(journey.snapshot().rhymeDone,true);
 await send(mobile,'journey-invitation');assert.equal(journey.snapshot().invited,true);
 const refreshed=await connect();assert.deepEqual(refreshed.states.at(-1),journey.snapshot());
 await send(mobile,'journey-try-outfit','unknown');assert.equal(journey.snapshot().outfit,null);
 const id=content[language].outfits[0].id;
 await send(mobile,'journey-try-outfit',id);assert.equal(journey.snapshot().outfit,id);
 await send(mobile,'journey-festival');assert.equal(journey.snapshot().phase,'travelling');
 await phase('festival');
 await send(mobile,'journey-return');assert.equal(journey.snapshot().phase,'festival');
 await send(mobile,'journey-find','unknown');assert.equal(journey.snapshot().festivalFound.length,0);
 await send(mobile,'journey-area',2);assert.equal(journey.snapshot().festivalArea,0,'cannot skip map sections');
 await send(mobile,'journey-find',content[language].festivalItems[2].id);assert.equal(journey.snapshot().festivalFound.length,0,'cannot skip missions');
 for(const item of content[language].festivalItems){
  if(item.area!==journey.snapshot().festivalArea){
   await send(mobile,'journey-find',item.id);assert.equal(journey.snapshot().festivalFeedback,false,'target must be in current area');
   await send(mobile,'journey-area',item.area);
  }
  const before=journey.snapshot().bag.length;
  await send(mobile,'journey-find',content[language].festivalAreas[item.area].distractors[0].id);assert.equal(journey.snapshot().bag.length,before);
  await send(mobile,'journey-find',item.id);await send(mobile,'journey-find',item.id);
  assert.equal(journey.snapshot().bag.length,before+1);assert.equal(journey.snapshot().festivalFeedback,true);
  await send(mobile,'journey-area',item.area+1);assert.equal(journey.snapshot().festivalArea,item.area,'thank-you before moving on');
  await send(mobile,'journey-return');assert.equal(journey.snapshot().phase,'festival');
  const reconnect=await connect();assert.equal(reconnect.states.at(-1).festivalFeedback,true);
  await send(mobile,'journey-next-festival');await send(mobile,'journey-next-festival');
  assert.equal(journey.snapshot().festivalMission,item.area+1,'acknowledgement only advances once');
 }
 assert.equal(journey.snapshot().festivalFound.length,3);assert.equal(journey.snapshot().bag.length,11);
 await send(mobile,'journey-return');assert.equal(journey.snapshot().phase,'returning');
 await phase('aquarium');await send(mobile,'barrier');
 assert.equal(journey.snapshot().memories.length,11);
 assert.deepEqual(aquarium.states.at(-1),journey.snapshot());
 await send(mobile,'journey-start',language);await phase('room');
 assert.equal(journey.snapshot().storyPage,0);assert.equal(journey.snapshot().bag.length,0);assert.equal(journey.snapshot().memories.length,0);assert.equal(journey.snapshot().outfit,null);
 await send(mobile,'journey-story-page',0);await send(mobile,'journey-exit');await phase('aquarium');
 await send(mobile,'barrier');
 assert.equal(journey.snapshot().memories.length,1,'bringing Jelly home keeps the current trip’s learned word');
 assert.equal(journey.snapshot().bag.length,1);
 assert.equal(journey.snapshot().language,language);
 assert.equal(journey.snapshot().outfit,null);
 assert.deepEqual(aquarium.states.at(-1),journey.snapshot());
});
test('nursery colouring artwork is awarded once after listening and shared with the aquarium',async t=>{
 const {connect,send,phase,journey}=await setup(t),mobile=await connect(),aquarium=await connect();
 await send(mobile,'journey-start','indonesian');await phase('room');
 const answer={icon:'star',artwork:'data:image/png;base64,Y29sb3Vy'};
 await send(mobile,'journey-rhyme-answer',answer);assert.equal(journey.snapshot().bag.length,0);
 await send(mobile,'journey-rhyme-listened');await send(mobile,'journey-rhyme-answer',answer);
 assert.equal(journey.snapshot().bag.length,1);assert.equal(journey.snapshot().bag[0].artwork,answer.artwork);
 assert.deepEqual(aquarium.states.at(-1).bag,journey.snapshot().bag);
 await send(mobile,'journey-rhyme-answer',answer);assert.equal(journey.snapshot().bag.length,1);
 await send(mobile,'journey-exit');await phase('aquarium');assert.equal(journey.snapshot().memories[0].artwork,answer.artwork);
 await send(mobile,'journey-start','indonesian');await phase('room');
 assert.equal(journey.snapshot().rhymeListened,false);assert.deepEqual(journey.snapshot().memories,[]);
});
test('bringing Jelly home preserves discoveries and cancels departure; old clients do not enter the journey',async t=>{
 const {connect,send,phase,journey}=await setup(t),legacy=await connect({}),mobile=await connect();
 assert.equal(legacy.states.length,0);
 await send(legacy,'journey-start','indonesian');assert.equal(journey.snapshot().phase,'aquarium');
 await send(mobile,'journey-start','chinese');await phase('room');
 await send(mobile,'journey-rhyme-listened');
 await send(mobile,'journey-rhyme-answer',{icon:'star',artwork:'data:image/png;base64,Y29sb3Vy'});
 await send(mobile,'journey-exit');await phase('aquarium');
 assert.equal(journey.snapshot().memories[0].word,'星星');
 assert.equal(journey.snapshot().bag.length,1);
 assert.equal(journey.snapshot().rhymeStep,1);
 await send(mobile,'journey-start','indonesian');
 await send(mobile,'journey-exit');await phase('aquarium');
 assert.equal(journey.snapshot().language,'indonesian');assert.equal(journey.snapshot().memories.length,0);
 await new Promise(resolve=>setTimeout(resolve,20));
 assert.equal(journey.snapshot().phase,'aquarium','cancelled departure cannot bring Jelly back into the room');
 const reconnect=await connect();assert.deepEqual(reconnect.states.at(-1),journey.snapshot());
});
test('home keeps clothing and items; a new adventure resets both screens and all mission progress',async t=>{
 const {connect,send,phase,journey}=await setup(t),mobile=await connect(),aquarium=await connect();
 assert.deepEqual(journey.snapshot().memories,[],'the initial aquarium has no collected items');
 await send(mobile,'journey-start','chinese');await phase('room');
 for(let i=0;i<5;i++)await send(mobile,'journey-story-page',i);
 await send(mobile,'journey-rhyme-listened');
 for(const line of content.chinese.rhyme.lines)await send(mobile,'journey-rhyme-answer',{icon:line.icon,artwork:'data:image/png;base64,Y29sb3Vy'});
 await send(mobile,'journey-invitation');await send(mobile,'journey-try-outfit',content.chinese.outfits[0].id);
 await send(mobile,'journey-festival');await send(mobile,'journey-exit');await phase('aquarium');
 await new Promise(resolve=>setTimeout(resolve,20));
 const home=journey.snapshot();
 assert.equal(home.phase,'aquarium');assert.equal(home.language,'chinese');assert.equal(home.outfit,content.chinese.outfits[0].id);
 assert.equal(home.memories.length,8);assert.equal(home.bag.length,8);
 const refreshed=await connect();assert.deepEqual(refreshed.states.at(-1),home);assert.deepEqual(aquarium.states.at(-1),home);
 await send(mobile,'journey-start','indonesian');await phase('room');
 const fresh=journey.snapshot();
 assert.equal(fresh.language,'indonesian');assert.equal(fresh.outfit,null);assert.equal(fresh.invited,false);
 assert.equal(fresh.storyPage,0);assert.equal(fresh.storyDone,false);assert.equal(fresh.rhymeStep,0);assert.equal(fresh.rhymeDone,false);
 assert.deepEqual(fresh.bag,[]);assert.deepEqual(fresh.memories,[]);assert.deepEqual(fresh.festivalFound,[]);
 await send(mobile,'barrier');assert.deepEqual(aquarium.states.at(-1),fresh);
});
