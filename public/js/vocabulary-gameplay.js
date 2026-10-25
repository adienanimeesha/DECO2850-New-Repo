(function () {
'use strict';
// This presentation model is NOT a backend event/state contract. The integrator
// maps the agreed shared content and authoritative responses into this API.
function placeObjects(objects, { bounds, furniture, player, reserved = [] }) {
 const radius = player.radius + 3, grid = 20;
 const valid = p => p.x >= bounds.left + radius && p.x <= bounds.right - radius && p.y >= bounds.top + radius && p.y <= bounds.bottom - radius && !furniture.some(b => {
  const dx = p.x - Math.max(b.x, Math.min(p.x, b.x + b.width));
  const dy = p.y - Math.max(b.y, Math.min(p.y, b.y + b.height));
  return dx * dx + dy * dy < (radius + 24) ** 2;
 });
 const key = p => p.x + ',' + p.y;
 // Flood-fill using the same four-neighbour grid as the existing pathfinder.
 // Placement never changes the room's collision or navigation implementation.
 const start = { x: Math.round(player.x / grid) * grid, y: Math.round(player.y / grid) * grid };
 const navigable = p => p.x >= bounds.left + radius && p.x <= bounds.right - radius && p.y >= bounds.top + radius && p.y <= bounds.bottom - radius && !furniture.some(b => {
  const dx = p.x - Math.max(b.x, Math.min(p.x, b.x + b.width)), dy = p.y - Math.max(b.y, Math.min(p.y, b.y + b.height));
  return dx * dx + dy * dy < radius ** 2;
 });
 const queue = [start], seen = new Set([key(start)]);
 for (let i = 0; i < queue.length; i++) for (const [dx, dy] of [[grid,0],[-grid,0],[0,grid],[0,-grid]]) {
  const p = {x:queue[i].x+dx,y:queue[i].y+dy};
  if (!seen.has(key(p)) && navigable(p)) { seen.add(key(p)); queue.push(p); }
 }
 const candidates = queue.filter(p => valid(p) && reserved.every(s => Math.hypot(p.x-s.x,p.y-s.y) > s.radius + 45));
 const chosen = [];
 for (const object of objects) {
  let best = null, score = -1;
  for (const p of candidates) {
   const separation = Math.min(Math.hypot(p.x-player.x,p.y-player.y), ...chosen.map(q => Math.hypot(p.x-q.x,p.y-q.y)));
   if (separation > score && separation >= 115) { score = separation; best = p; }
  }
  if (!best) throw new Error('Not enough reachable room space for these vocabulary choices.');
  chosen.push({...object,...best,kind:'vocabulary',radius:48,label:'Explore this object'});
 }
 return chosen;
}
function create({ root, adapter, room, colouring = window.VocabularyColouring }) {
 if (!root || !adapter || !room || !colouring || !window.VocabularySpeech) throw new Error('Vocabulary gameplay dependencies are missing.');
 let view = null, objects = [], generation = 0, pending = false, speaking = false, disposed = false, paint = null, paintedKey = null;
 let feedbackParts = null;
 const speech = window.VocabularySpeech.create({onSpeaking(value){speaking=value;},onStatus(message){const node=root.querySelector('.vocabulary-audio-status');if(node)node.textContent=message;}});
 function stopPresentation() {
  generation++; speech.cancel(); paint?.close(); paint=null; paintedKey=null; pending=false; objects=[]; feedbackParts=null;
  room.clearMovement(); root.replaceChildren(); root.hidden=true;
 }
 function parts(question) {
  const lang = view.language === 'chinese' ? 'zh-CN' : 'id-ID';
  return [{text:question.before,lang:'en-US',audio:question.beforeAudio},{text:question.word,lang,audio:question.wordAudio},{text:question.after,lang:'en-US',audio:question.afterAudio}];
 }
 function replay() { if (view?.question && !paint && !disposed) speech.play(feedbackParts || parts(view.question)); }
 function renderDialogue() {
  root.replaceChildren(); root.hidden=false;
  const bubble=document.createElement('section');bubble.className='vocabulary-bubble subtitle-bubble';bubble.setAttribute('aria-label','Jelly’s vocabulary question');
  const progress=document.createElement('small');progress.textContent=`Level ${view.level} · Question ${view.index + 1} of 5`;
  const text=document.createElement('p');text.className='vocabulary-prompt';text.setAttribute('aria-live','polite');
  const word=document.createElement('mark');word.lang=view.language==='chinese'?'zh-CN':'id-ID';word.textContent=view.question.word;
  text.append(document.createTextNode(view.question.before+' '),word,document.createTextNode(' '+view.question.after));
  const pronunciation=document.createElement('small');pronunciation.className='vocabulary-pronunciation';pronunciation.textContent=view.question.pronunciation || '';
  const hint=document.createElement('p');hint.className='vocabulary-hint';hint.setAttribute('role','status');
  const status=document.createElement('small');status.className='vocabulary-audio-status';status.setAttribute('role','status');
  const replayButton=document.createElement('button');replayButton.type='button';replayButton.className='vocabulary-replay secondary';replayButton.textContent='Replay narration';replayButton.addEventListener('click',replay);
  const exit=document.createElement('button');exit.type='button';exit.className='vocabulary-exit secondary';exit.textContent='Exit level';
  exit.addEventListener('click',async()=>{
   if(pending)return;pending=true;speech.cancel();const token=generation;
   try { await adapter.exit(); } catch { if(token===generation)hint.textContent='Could not leave yet. Try again.'; }
   finally { if(token===generation)pending=false; }
  });
  bubble.append(progress,text,pronunciation,hint,status,replayButton,exit);root.append(bubble);
 }
 function validate(next) {
  const q=next.question;
  if(!['indonesian','chinese'].includes(next.language)||!Number.isInteger(next.level)||next.level<1||next.level>5||!Number.isInteger(next.index)||next.index<0||next.index>4||typeof next.key!=='string'||!next.key||!q||typeof q.word!=='string'||!q.word||typeof q.before!=='string'||typeof q.after!=='string'||typeof q.hint!=='string'||!q.hint||!Array.isArray(q.objects)||q.objects.length<2||q.objects.some(o=>typeof o.id!=='string'||!o.id||!window.OceanArt.hasIcon(o.icon))||new Set(q.objects.map(o=>o.id)).size!==q.objects.length) throw new Error('Incomplete vocabulary presentation data or unsupported cultural illustration.');
  if(next.language==='chinese' && !q.pronunciation)throw new Error('Mandarin vocabulary requires backend-provided tone-marked Pinyin.');
 }
 function sync(next) {
  if(disposed)return;
  if(!next?.question){stopPresentation();view=null;return;}
  try { validate(next); } catch(error) { stopPresentation();view=null;throw error; }
  // Keys include the attempt/session so replay is not mistaken for an old page.
  if(view?.key===next.key){view=next;return;}
  stopPresentation();view=next;
  objects=placeObjects(next.question.objects,room.geometry());renderDialogue();replay();
 }
 async function select(id) {
  if(disposed||!view||pending||paint)return;
  const item=objects.find(o=>o.id===id);if(!item||!room.isNear(item))return;
  const token=generation,key=view.key;pending=true;speech.cancel();room.clearMovement();
  try {
   const result=await adapter.select({key,objectId:id});
   if(token!==generation||disposed)return;
   if(result?.correct!==true){
    root.querySelector('.vocabulary-hint').textContent=result?.hint || view.question.hint;
    // Hints are content, never inferred from the renderer's icon names.
    // Keep contextual mixed-language hint audio available as content segments.
    feedbackParts=result?.speechParts || null;if(feedbackParts)speech.play(feedbackParts);
    return;
   }
   if(result.colouringAllowed!==true)return;
   speech.cancel();paintedKey=key;
   const host=document.createElement('div');host.className='vocabulary-colouring-host';root.append(host);
   paint=colouring.mount(host,item,async artwork=>{
    if(token!==generation||paintedKey!==key)return;
    // Await a backend acknowledgement; only a subsequent sync advances question.
    await adapter.complete({key,objectId:id,artwork});
    if(token===generation){paint?.close();paint=null;host.remove();root.querySelector('.vocabulary-hint').textContent='Waiting for the next question…';}
   },()=>{paint?.close();paint=null;host.remove();pending=false;room.clearMovement();});
  } catch {
   if(token===generation)root.querySelector('.vocabulary-hint').textContent='The connection did not confirm that choice. Try again.';
  } finally { if(token===generation&&!paint)pending=false; }
 }
 function draw(ctx,time,player) {
  for(const item of objects){
   const nearby=Math.hypot(player.x-item.x,player.y-item.y)<=item.radius;
   ctx.save();ctx.beginPath();ctx.ellipse(item.x,item.y+22,30,9,0,0,Math.PI*2);ctx.fillStyle=nearby?'#fff1b5cc':'#c8f5f566';ctx.fill();
   if(nearby){ctx.strokeStyle='#fff5b5';ctx.lineWidth=3;ctx.stroke();}
   window.OceanArt.canvasIcon(ctx,item.icon,item.x,item.y+Math.sin(time/1000+item.x)*4,58);ctx.restore();
  }
 }
 return {sync,select,draw,replay,cancelNarration:()=>speech.cancel(),get objects(){return objects;},get active(){return Boolean(view);},get blocked(){return pending||Boolean(paint);},get speaking(){return speaking;},stop(){stopPresentation();view=null;},destroy(){stopPresentation();view=null;disposed=true;}};
}
window.VocabularyGameplay={create,placeObjects};
})();
