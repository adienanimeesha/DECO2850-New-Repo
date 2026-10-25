(function () {
'use strict';
// This presentation model is NOT a backend event/state contract. The integrator
// maps the agreed shared content and authoritative responses into this API.
const footprint = Object.freeze({halfWidth:50, halfHeight:54, float:5, radius:48});
const overlaps = (a,b,gap=0) => a.x < b.x+b.width+gap && a.x+a.width+gap > b.x && a.y < b.y+b.height+gap && a.y+a.height+gap > b.y;
const objectBounds = item => ({x:item.x-footprint.halfWidth,y:item.y-footprint.halfHeight,width:footprint.halfWidth*2,height:footprint.halfHeight*2});
function placeObjects(objects, { bounds, furniture, player, reserved = [], visualObstacles = furniture }) {
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
 const obstacles=[...visualObstacles,...reserved.map(s=>s.width!==undefined?s:{x:s.x-s.radius,y:s.y-s.radius,width:s.radius*2,height:s.radius*2})];
 const candidates = queue.filter(p => {
  const box=objectBounds(p);
  return valid(p) && box.x>=bounds.left && box.x+box.width<=bounds.right && box.y>=bounds.top && box.y+box.height<=bounds.bottom && !obstacles.some(obstacle=>overlaps(box,obstacle,2));
 });
 const chosen = [];
 for (const object of objects) {
  let best = null, score = -1;
  for (const p of candidates) {
   const separation = Math.min(Math.hypot(p.x-player.x,p.y-player.y), ...chosen.map(q => Math.hypot(p.x-q.x,p.y-q.y)));
   if (Math.hypot(p.x-player.x,p.y-player.y)<player.radius+footprint.radius+8 || chosen.some(q=>overlaps(objectBounds(p),objectBounds(q),8)||Math.hypot(p.x-q.x,p.y-q.y)<115))continue;
   if (separation > score) { score = separation; best = p; }
  }
  if (!best) throw new Error('Not enough reachable room space for these vocabulary choices.');
  chosen.push({...object,...best,choice:chosen.length+1,kind:'vocabulary',radius:footprint.radius,label:'Swim to picture '+(chosen.length+1)});
 }
 return chosen;
}
function fitBubble({width,height,bubbleWidth,bubbleHeight,head,obstacles=[]}) {
 const margin=8, w=bubbleWidth,h=bubbleHeight;
 if(w>width-2*margin||h>height-2*margin)return null;
 const cx=head.x+head.width/2,cy=head.y+head.height/2;
 const points=[{x:cx-w/2,y:head.y-h-14},{x:head.x+head.width+14,y:cy-h/2},{x:head.x-w-14,y:cy-h/2},{x:cx-w/2,y:head.y+head.height+14}];
 const xs=[margin,width-w-margin],ys=[margin,height-h-margin];
 for(const box of [head,...obstacles]){xs.push(box.x+box.width+11,box.x-w-11);ys.push(box.y+box.height+11,box.y-h-11);}
 for(const x of xs)for(const y of ys)points.push({x,y});
 for(let y=margin;y<=height-h-margin;y+=18)for(let x=margin;x<=width-w-margin;x+=18)points.push({x,y});
 let best=null,score=Infinity;
 for(const point of points){
  const box={x:Math.max(margin,Math.min(width-w-margin,point.x)),y:Math.max(margin,Math.min(height-h-margin,point.y)),width:w,height:h};
  if([head,...obstacles].some(obstacle=>overlaps(box,obstacle,10)))continue;
  const distance=Math.hypot(box.x+w/2-cx,box.y+h/2-cy);
  if(distance<score){best=box;score=distance;}
 }
 if(!best)return null;
 const dx=cx-(best.x+w/2),dy=cy-(best.y+h/2);
 const side=Math.abs(dx)/(w/2)>Math.abs(dy)/(h/2)?(dx>0?'right':'left'):(dy>0?'bottom':'top');
 return {...best,side,tailX:Math.max(14,Math.min(w-14,cx-best.x)),tailY:Math.max(14,Math.min(h-14,cy-best.y))};
}
function positionBubble(options) {
 const widths=[options.bubbleWidth,Math.min(190,options.bubbleWidth),Math.min(150,options.bubbleWidth)];
 const sizes=options.sizes || widths.map(width=>({width,height:Math.ceil(options.bubbleHeight*options.bubbleWidth/width)}));
 for(const size of sizes){const point=fitBubble({...options,bubbleWidth:size.width,bubbleHeight:size.height});if(point)return point;}
 return null;
}
function create({ root, adapter, room, colouring = window.VocabularyColouring }) {
 if (!root || !adapter || !room || !colouring || !window.VocabularySpeech) throw new Error('Vocabulary gameplay dependencies are missing.');
 let view = null, objects = [], generation = 0, pending = false, speaking = false, disposed = false, paint = null, paintedKey = null;
 let feedbackParts = null, cancelledKey = null, hoveredId=null,targetId=null,characterBubble=null,bubbleSize=null,layoutDirty=false;
 const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 const speech = window.VocabularySpeech.create({onSpeaking(value){speaking=value;},onStatus(message){const node=root.querySelector('.vocabulary-audio-status');if(node)node.textContent=message;}});
 function stopPresentation() {
  generation++; speech.cancel(); paint?.close(); paint=null; paintedKey=null; pending=false; objects=[]; feedbackParts=null; cancelledKey=null;
  room.clearMovement(); root.replaceChildren(); root.hidden=true;
  hoveredId=targetId=null;characterBubble?.remove();characterBubble=null;bubbleSize=null;layoutDirty=false;
 }
 function parts(question) {
  const lang = view.language === 'chinese' ? 'zh-CN' : 'id-ID';
  return [{text:question.before,lang:'en-US',audio:question.beforeAudio},{text:question.word,lang,audio:question.wordAudio},{text:question.after,lang:'en-US',audio:question.afterAudio}];
 }
 function replay() { if (view?.question && !paint && !disposed) speech.play(feedbackParts || parts(view.question)); }
 function relayout() {
  if(!view||disposed)return;
  layoutDirty=true;bubbleSize=null;
  if(paint||pending)return;
  objects=placeObjects(view.question.objects,room.geometry());layoutDirty=false;hoveredId=targetId=null;room.clearMovement();
 }
 window.addEventListener('resize',relayout);
 const resizeObserver=window.ResizeObserver?new ResizeObserver(relayout):null;
 const roomCanvas=document.getElementById('game');if(roomCanvas)resizeObserver?.observe(roomCanvas);
 function renderDialogue() {
  root.replaceChildren(); root.hidden=false;
  const canvas=document.getElementById('game');
  if(canvas)canvas.parentElement.append(root);
  const bubble=document.createElement('section');bubble.className='vocabulary-overlay';bubble.setAttribute('aria-label','Vocabulary controls');
  const progress=document.createElement('small');progress.textContent=`Level ${view.level} · Question ${view.index + 1} of 5`;
  const text=document.createElement('p');text.className='vocabulary-prompt';text.setAttribute('aria-live','polite');
  const word=document.createElement('mark');word.lang=view.language==='chinese'?'zh-CN':'id-ID';word.textContent=view.question.word;
  text.append(document.createTextNode(view.question.before+' '),word,document.createTextNode(' '+view.question.after));
  const pronunciation=document.createElement('small');pronunciation.className='vocabulary-pronunciation';pronunciation.textContent=view.question.pronunciation || '';
  const hint=document.createElement('p');hint.className='vocabulary-hint';hint.setAttribute('role','status');
  const status=document.createElement('small');status.className='vocabulary-audio-status sr-only';status.setAttribute('role','status');
  const replayButton=document.createElement('button');replayButton.type='button';replayButton.className='vocabulary-replay secondary';replayButton.textContent='Replay narration';replayButton.addEventListener('click',replay);
  const exit=document.createElement('button');exit.type='button';exit.className='vocabulary-exit secondary';exit.textContent='Exit level';
  exit.addEventListener('click',async()=>{
   if(pending)return;pending=true;speech.cancel();const token=generation;
   try { await adapter.exit(); } catch { if(token===generation)hint.textContent='Could not leave yet. Try again.'; }
   finally { if(token===generation)pending=false; }
  });
  const resume=document.createElement('button');resume.type='button';resume.className='vocabulary-resume primary';resume.textContent='Continue colouring';resume.hidden=true;
  resume.addEventListener('click',()=>openColouring(objects.find(item=>item.id===view?.colouringItemId)));
  const controls=document.createElement('div');controls.className='vocabulary-controls';controls.append(replayButton,exit,resume);
  const choices=document.createElement('div');choices.className='vocabulary-choice-controls';choices.setAttribute('aria-label','Swim to a numbered picture');
  objects.forEach(item=>{
   const button=document.createElement('button');button.type='button';button.className='vocabulary-choice secondary';button.dataset.vocabularyChoice=item.id;
   button.textContent=String(item.choice);button.tabIndex=-1;button.setAttribute('aria-label',item.label);button.disabled=!room.walkTo;
   button.addEventListener('click',()=>room.walkTo?.('@vocabulary/'+item.id));
   button.addEventListener('focus',()=>{hoveredId=item.id;});button.addEventListener('blur',()=>{hoveredId=null;});choices.append(button);
  });
  // Keep one accessible transcript and keyboard alternatives without repeating
  // the character's caption in a second visible panel.
  const transcript=document.createElement('div');transcript.className='sr-only vocabulary-transcript';
  transcript.append(progress,text,pronunciation,choices);
  bubble.append(transcript,controls,hint,status);root.append(bubble);
  if(canvas){characterBubble=document.createElement('aside');characterBubble.className='jelly-question-bubble';characterBubble.hidden=true;characterBubble.setAttribute('aria-hidden','true');characterBubble.append(text.cloneNode(true));if(view.question.pronunciation)characterBubble.append(pronunciation.cloneNode(true));canvas.parentElement.append(characterBubble);}
 }
 function validate(next) {
  const q=next.question;
  if(!['indonesian','chinese'].includes(next.language)||!Number.isInteger(next.level)||next.level<1||next.level>5||!Number.isInteger(next.index)||next.index<0||next.index>4||typeof next.key!=='string'||!next.key||!q||typeof q.word!=='string'||!q.word||typeof q.before!=='string'||typeof q.after!=='string'||typeof q.hint!=='string'||!q.hint||!Array.isArray(q.objects)||q.objects.length<2||q.objects.some(o=>typeof o.id!=='string'||!o.id||!window.OceanArt.hasIcon(o.icon))||new Set(q.objects.map(o=>o.id)).size!==q.objects.length) throw new Error('Incomplete vocabulary presentation data or unsupported cultural illustration.');
  if(next.language==='chinese' && !q.pronunciation)throw new Error('Mandarin vocabulary requires backend-provided tone-marked Pinyin.');
 }
 function sync(next) {
  if(disposed)return;
  if(!next?.question){if(view||objects.length||paint)stopPresentation();else root.hidden=true;view=null;return;}
  try { validate(next); } catch(error) { stopPresentation();view=null;throw error; }
  // Keys include the attempt/session so replay is not mistaken for an old page.
  if(view?.key===next.key){view=next;restoreColouring();return;}
  stopPresentation();view=next;
  objects=placeObjects(next.question.objects,room.geometry());renderDialogue();
  if(next.stage==='colouring')restoreColouring();else replay();
 }
 function restoreColouring() {
  if(view?.stage==='colouring'&&!paint&&cancelledKey!==view.key)
   openColouring(objects.find(item=>item.id===view.colouringItemId));
 }
 function openColouring(item) {
  if(!item||paint||!view)return;
  const token=generation,key=view.key;
  speech.cancel();room.clearMovement();paintedKey=key;cancelledKey=null;
  if(characterBubble)characterBubble.hidden=true;
  root.querySelector('.vocabulary-resume').hidden=true;
  const host=document.createElement('div');host.className='vocabulary-colouring-host';root.append(host);
  paint=colouring.mount(host,{...item,icon:view.colouringAsset||item.icon},async artwork=>{
   if(token!==generation||paintedKey!==key)return;
   await adapter.complete({key,objectId:item.id,artwork});
   if(token===generation){paint?.close();paint=null;host.remove();root.querySelector('.vocabulary-hint').textContent='Waiting for the next question…';}
  },()=>{
   paint?.close();paint=null;host.remove();pending=false;cancelledKey=key;room.clearMovement();
   if(layoutDirty)relayout();
   root.querySelector('.vocabulary-resume').hidden=false;
   root.querySelector('.vocabulary-hint').textContent='Your answer is saved. Continue colouring when you are ready.';
  });
 }
 async function select(id) {
  if(disposed||!view||pending||paint)return;
  const item=objects.find(o=>o.id===id);if(!item||!room.isNear(item))return;
  if(view.stage==='colouring'){if(id===view.colouringItemId)openColouring(item);return;}
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
   openColouring(item);
  } catch {
   if(token===generation)root.querySelector('.vocabulary-hint').textContent='The connection did not confirm that choice. Try again.';
  } finally { if(token===generation&&!paint){pending=false;if(layoutDirty)relayout();} }
 }
 function updateCharacterBubble(player) {
  if(!characterBubble)return;
  characterBubble.hidden=Boolean(paint)||view?.stage==='colouring';if(characterBubble.hidden)return;
  const canvas=document.getElementById('game'),rect=canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const sx=rect.width/960,sy=rect.height/620,u=Math.min(sx,sy);
  if(!bubbleSize||bubbleSize.frameWidth!==rect.width||bubbleSize.frameHeight!==rect.height){
   const sizes=[230,190,150].map(width=>{
    characterBubble.style.width=Math.min(width,rect.width-16)+'px';
    const measured=characterBubble.getBoundingClientRect();
    return {width:Math.min(measured.width||width,rect.width-16),height:measured.height||80};
   });
   bubbleSize={sizes,frameWidth:rect.width,frameHeight:rect.height};
  }
  const head={x:player.x*sx-43*u,y:(player.y-25)*sy-62*u,width:86*u,height:82*u};
  const obstacles=objects.map(item=>{const b=objectBounds(item);return{x:b.x*sx,y:b.y*sy,width:b.width*sx,height:b.height*sy};});
  for(const node of document.querySelectorAll('.d-pad,.journey-tools,.vocabulary-controls,.vocabulary-hint'))if(node.getClientRects().length){const b=node.getBoundingClientRect();obstacles.push({x:b.left-rect.left,y:b.top-rect.top,width:b.width,height:b.height});}
  const point=positionBubble({width:rect.width,height:rect.height,sizes:bubbleSize.sizes,head,obstacles});
  if(!point){characterBubble.hidden=true;return;}
  characterBubble.style.width=point.width+'px';characterBubble.style.left=point.x+'px';characterBubble.style.top=point.y+'px';characterBubble.dataset.tail=point.side;
  characterBubble.style.setProperty('--tail-x',point.tailX+'px');characterBubble.style.setProperty('--tail-y',point.tailY+'px');
 }
 function draw(ctx,time,player) {
  for(const item of objects){
   const nearby=Math.hypot(player.x-item.x,player.y-item.y)<=item.radius;
   const focused=nearby||item.id===hoveredId||item.id===targetId;
   const bob=reducedMotion?.matches?0:Math.sin(time/1300+item.choice*1.7)*footprint.float;
   const glow=reducedMotion?.matches ? .32 : .32+Math.sin(time/1800+item.choice)*.06;
   const scale=window.OceanArt.screenScale(ctx.canvas);
   ctx.save();ctx.translate(item.x,item.y+bob);ctx.scale(scale.unit/scale.x,scale.unit/scale.y);
   ctx.shadowColor=`rgba(212,250,243,${glow})`;ctx.shadowBlur=8*scale.unit;
   ctx.beginPath();ctx.ellipse(0,0,37,37,0,0,Math.PI*2);ctx.fillStyle='#efffffdd';ctx.fill();ctx.shadowBlur=0;
   ctx.strokeStyle=focused?'#76558e':'#b49acd';ctx.lineWidth=focused?3:2;ctx.stroke();
   ctx.beginPath();ctx.ellipse(0,0,42,42,0,0,Math.PI*2);ctx.strokeStyle=focused?'#ffffff':'#e5fff5';ctx.lineWidth=2;ctx.stroke();
   ctx.beginPath();ctx.ellipse(0,34,9,9,0,0,Math.PI*2);ctx.fillStyle='#76558e';ctx.fill();
   ctx.fillStyle='#ffffff';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(item.choice),0,34);ctx.restore();
   window.OceanArt.canvasIcon(ctx,item.icon,item.x,item.y+bob,58);
  }
  updateCharacterBubble(player);
 }
 const hitTest=p=>objects.find(item=>{const b=objectBounds(item);return p.x>=b.x&&p.x<=b.x+b.width&&p.y>=b.y&&p.y<=b.y+b.height;});
 return {sync,select,draw,replay,hitTest,setHover:id=>{hoveredId=id;},setTarget:id=>{targetId=id;},cancelNarration:()=>speech.cancel(),get objects(){return objects;},get active(){return Boolean(view);},get blocked(){return pending||Boolean(paint);},get speaking(){return speaking;},stop(){stopPresentation();view=null;},destroy(){stopPresentation();view=null;disposed=true;window.removeEventListener('resize',relayout);resizeObserver?.disconnect();}};
}
window.VocabularyGameplay={create,placeObjects,footprint,objectBounds,overlaps,positionBubble};
})();
