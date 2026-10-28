(function () {
'use strict';
// Instance-scoped colouring; no rewards or correctness decisions live here.
function mount(root, item, onDone, onCancel = () => {}) {
 if (!window.OceanArt.hasIcon(item.icon)) throw new Error('Missing vocabulary outline: ' + item.icon);
 const art=window.OceanArt,outline=art.outline(item.icon),sticker=art.asset?.(item.icon);
 let active=true,drawing=false,painted=false,busy=false,revision=0,colour='#e98faf';
 const focusBefore=document.activeElement;
 root.innerHTML=`<section class="vocabulary-colouring activity-panel" role="dialog" aria-modal="true" aria-label="Colour your cultural object"><p class="eyebrow">WORD ${item.step||1} OF ${item.total||5}</p><p>Colour this word to continue your story adventure.</p><div class="rhyme-paper"><div class="colour-base">${outline}</div><canvas class="vocabulary-paint" width="400" height="400" aria-label="Draw colours on your object"></canvas><div class="colour-lines">${outline}</div></div><div class="rhyme-palette">${['#e98faf','#a991d4','#73bdc7','#f2c66e','#86bc96'].map((c,i)=>`<button type="button" data-paint="${c}" aria-label="${['Pink','Purple','Blue','Yellow','Green'][i]}" aria-pressed="${i===0}" style="background:${c}"></button>`).join('')}</div><div class="paint-tools"><button type="button" class="secondary" data-tool="clear">Clear</button><button type="button" class="primary" data-tool="done" disabled>Done →</button></div><p class="small-note vocabulary-paint-status" role="status">Choose a colour and draw.</p></section>`;
 const panel=root.querySelector('section'),canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d'),done=root.querySelector('[data-tool="done"]'),status=root.querySelector('[role="status"]');
 if(item.feedback){
  const heading=document.createElement('h2');heading.className='vocabulary-success-title';heading.textContent=item.feedback.praise;
  panel.querySelector('.eyebrow').after(heading);
  panel.querySelector('p:not(.eyebrow)').textContent=`${item.feedback.meaning} ${item.feedback.instruction}`;
  panel.setAttribute('aria-label',item.feedback.praise);
 }
 const paintedState=value=>{painted=value;done.disabled=!value||busy;};
 const instructionSpeech=window.VocabularySpeech?.create({role:'narrator'});let instructionActive=false;
 const stopInstructions=()=>{if(instructionActive){instructionActive=false;instructionSpeech?.cancel();}};
 function hearInstructions(){
  if(!active||busy)return;
  const text=item.feedback?.narration||window.JellyGuidanceContent?.colouring;
  if(!text||!instructionSpeech)return;
  instructionActive=true;
  instructionSpeech.play([{text,lang:item.feedback?(item.language==='chinese'?'zh-CN':'id-ID'):'en-US',role:'narrator',fallbackParts:item.feedback?window.JellyGuidanceContent?.vocabularyParts(text,item.word,item.language,'narrator'):undefined}],{onComplete(){instructionActive=false;}});
 }
 const imageFor=(source,isUrl=false)=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=isUrl?source:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(source);});
 const drawSticker=(context,image)=>{
  if(!sticker?.raster){context.drawImage(image,0,0,400,400);return;}
  // Match the 4–96 viewBox inset in OceanArt.outline without stretching the
  // supplied portrait into a square or cropping its line drawing.
  const naturalWidth=image.naturalWidth||image.width||400,naturalHeight=image.naturalHeight||image.height||naturalWidth;
  const side=368,ratio=Math.min(side/naturalWidth,side/naturalHeight);
  const width=naturalWidth*ratio,height=naturalHeight*ratio;
  context.drawImage(image,(400-width)/2,(400-height)/2,width,height);
 };
 const point=e=>{const rect=canvas.getBoundingClientRect();return{x:(e.clientX-rect.left)*400/rect.width,y:(e.clientY-rect.top)*400/rect.height};};
 function down(e){if(!active||busy)return;e.preventDefault();canvas.setPointerCapture?.(e.pointerId);drawing=true;revision++;const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+.1,p.y+.1);ctx.strokeStyle=colour;ctx.lineWidth=13;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();paintedState(true);}
 function move(e){if(!drawing||busy)return;e.preventDefault();const p=point(e);ctx.lineTo(p.x,p.y);ctx.strokeStyle=colour;ctx.stroke();}
 function up(){drawing=false;}
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);
 root.querySelectorAll('[data-paint]').forEach(button=>button.addEventListener('click',()=>{if(!active||busy)return;colour=button.dataset.paint;root.querySelectorAll('[data-paint]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));
 root.querySelector('[data-tool="clear"]').addEventListener('click',()=>{if(!active||busy)return;revision++;ctx.clearRect(0,0,400,400);paintedState(false);});
 done.addEventListener('click',async()=>{
  if(!active||busy||!painted)return;stopInstructions();busy=true;revision++;drawing=false;done.disabled=true;status.textContent='Preparing your coloured object…';
  try{
   const base=await imageFor(sticker?.outline||outline,Boolean(sticker));if(!active)return;
   const snapshot=document.createElement('canvas');snapshot.width=snapshot.height=400;const out=snapshot.getContext('2d');
   if(sticker){
    const silhouette=await imageFor(sticker.color,true);if(!active)return;
    drawSticker(out,base);
    out.globalCompositeOperation='multiply';out.drawImage(canvas,0,0);
    out.globalCompositeOperation='destination-in';drawSticker(out,silhouette);
    out.globalCompositeOperation='source-over';
   } else {
    out.drawImage(base,0,0,400,400);out.globalCompositeOperation='multiply';out.drawImage(canvas,0,0);out.globalCompositeOperation='destination-in';out.drawImage(base,0,0,400,400);out.globalCompositeOperation='multiply';out.drawImage(base,0,0,400,400);
   }
   status.textContent='Saving your coloured object…';
   await onDone(snapshot.toDataURL('image/png'));
  }catch{if(active){busy=false;done.disabled=false;status.textContent='Your drawing could not be saved. Press Done to retry.';}}
 });
 const cancel=()=>{if(active&&!busy)onCancel();};
 function keydown(event){
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancel();}
  if(event.key==='Tab'){
   const buttons=[...panel.querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);
   if(event.shiftKey&&(document.activeElement===first||!panel.contains(document.activeElement))){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&(document.activeElement===last||!panel.contains(document.activeElement))){event.preventDefault();first?.focus();}
  }
 }
 document.addEventListener('keydown',keydown,true);panel.querySelector('button').focus();hearInstructions();
 return {close(){if(!active)return;stopInstructions();active=false;revision++;drawing=false;document.removeEventListener('keydown',keydown,true);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('lostpointercapture',up);root.replaceChildren();if(focusBefore?.isConnected)focusBefore.focus();}};
}
window.VocabularyColouring={mount};
})();
