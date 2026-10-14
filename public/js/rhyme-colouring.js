(function(){
'use strict';
let cleanup=()=>{};
function close(){cleanup();cleanup=()=>{};}
function mount(root,icon,onDone){
 close();
 const art=window.OceanArt;
 // Keep the white-filled SVG intact: its fills hide edges of shapes behind it.
 // Multiply blending shows paint through white without exposing hidden lines.
 const outline=art.outline(icon);
 root.innerHTML=`<p>Colour your chosen object, then press Done.</p><div class="rhyme-paper"><div class="colour-base">${outline}</div><canvas id="rhyme-paint" width="400" height="400" aria-label="Colour the chosen object"></canvas><div class="colour-lines">${outline}</div></div><div class="rhyme-palette">${['#e98faf','#a991d4','#73bdc7','#f2c66e','#86bc96'].map((colour,i)=>`<button type="button" data-paint="${colour}" aria-label="${['Pink','Purple','Blue','Yellow','Green'][i]}" aria-pressed="${i===0}" style="background:${colour}"></button>`).join('')}</div><div class="paint-tools"><button id="rhyme-fill" class="secondary" type="button">Fill object</button><button id="rhyme-clear" class="secondary" type="button">Clear</button><button id="rhyme-colour-done" class="primary" type="button" disabled>Done →</button></div><p class="small-note" id="paint-status" role="status">Choose a colour and draw, or use Fill object.</p>`;
 const canvas=root.querySelector('#rhyme-paint'),ctx=canvas.getContext('2d'),done=root.querySelector('#rhyme-colour-done'),status=root.querySelector('#paint-status');
 let colour='#e98faf',drawing=false,painted=false,active=true,revision=0;
 const setPainted=value=>{painted=value;done.disabled=!value;};
 const point=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*400/r.width,y:(e.clientY-r.top)*400/r.height};};
 function down(e){e.preventDefault();canvas.setPointerCapture?.(e.pointerId);drawing=true;revision++;const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+.1,p.y+.1);ctx.strokeStyle=colour;ctx.lineWidth=13;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();setPainted(true);}
 function move(e){if(!drawing)return;e.preventDefault();const p=point(e);ctx.lineTo(p.x,p.y);ctx.strokeStyle=colour;ctx.stroke();}
 function up(){drawing=false;}
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
 root.querySelectorAll('[data-paint]').forEach(button=>button.addEventListener('click',()=>{colour=button.dataset.paint;root.querySelectorAll('[data-paint]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));
 function imageFor(svg){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);});}
 root.querySelector('#rhyme-fill').addEventListener('click',async()=>{
  const stamp=++revision;status.textContent='Colouring…';
  try{const im=await imageFor(art.outline(icon,colour));if(!active||stamp!==revision)return;ctx.clearRect(0,0,400,400);ctx.drawImage(im,0,0,400,400);setPainted(true);status.textContent='Your object is ready. Press Done when you are happy.';}catch{if(active)status.textContent='Try drawing on the object instead.';}
 });
 root.querySelector('#rhyme-clear').addEventListener('click',()=>{revision++;ctx.clearRect(0,0,400,400);setPainted(false);status.textContent='Choose a colour and draw, or use Fill object.';});
 done.addEventListener('click',async()=>{
  if(!painted||done.disabled)return;done.disabled=true;
  try{
   const [base,lines]=await Promise.all([imageFor(outline),imageFor(outline)]);if(!active)return;
   const snapshot=document.createElement('canvas');snapshot.width=400;snapshot.height=400;const out=snapshot.getContext('2d');
   out.drawImage(base,0,0,400,400);out.globalCompositeOperation='multiply';out.drawImage(canvas,0,0);out.globalCompositeOperation='destination-in';out.drawImage(base,0,0,400,400);out.globalCompositeOperation='multiply';out.drawImage(lines,0,0,400,400);
   onDone(snapshot.toDataURL('image/png'));
  }catch{if(active){done.disabled=false;status.textContent='Your drawing could not be saved. Try Done again.';}}
 });
 cleanup=()=>{active=false;canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);};
}
window.JellyColour={mount,close};
})();
