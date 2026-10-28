(function () {
'use strict';
// Display-only preferences never enter the shared journey state or socket.
const params=new URLSearchParams(location.search),key='jelly-aquarium-calibration-v1';
const defaults={scale:1,x:0,y:0,brightness:1,mirror:false,flip:false};
let stored={};try{stored=JSON.parse(localStorage.getItem(key))||{};}catch{}
const bounded=(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;
const settings={
 scale:bounded(stored.scale,.4,1.5,1),x:bounded(stored.x,-40,40,0),y:bounded(stored.y,-40,40,0),
 brightness:bounded(stored.brightness,.25,1.5,1),mirror:stored.mirror===true,flip:stored.flip===true
};
let ghost=params.get('display')==='ghost',panel=null;
const canvas=document.getElementById('aquarium');
function apply(){
 document.body.classList.toggle('ghost-display',ghost);
 canvas.style.transform=ghost?`translate(${settings.x}%, ${settings.y}%) scale(${settings.scale}) scale(${settings.mirror?-1:1}, ${settings.flip?-1:1})`:'';
 canvas.style.filter=ghost?`brightness(${settings.brightness})`:'';
 if(panel)panel.querySelector('[data-mode]').textContent=ghost?'Switch to normal mode':'Switch to Pepper’s Ghost';
}
function persist(){try{localStorage.setItem(key,JSON.stringify(settings));}catch{}apply();}
function syncControls(){if(!panel)return;for(const [name,value]of Object.entries(settings)){const input=panel.querySelector(`[name="${name}"]`);if(input.type==='checkbox')input.checked=value;else input.value=value;const output=panel.querySelector(`[data-value="${name}"]`);if(output)output.textContent=value;}}
async function fullscreen(){
 try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else throw Error('unsupported');}
 catch{if(panel)panel.querySelector('[role="status"]').textContent='Fullscreen unavailable. Use your browser’s fullscreen command.';}
}
function showCalibration(show=true){
 if(!panel){
  panel=document.createElement('section');panel.className='display-calibration';panel.setAttribute('aria-label','Aquarium display calibration');
  panel.innerHTML=`<strong>Pepper’s Ghost calibration</strong><p>Single reflection · C toggles controls · F fullscreen</p>
  ${[['scale','Scene scale',.4,1.5,.01],['x','Horizontal position (%)',-40,40,1],['y','Vertical position (%)',-40,40,1],['brightness','Brightness',.25,1.5,.05]].map(([name,label,min,max,step])=>`<label>${label} <output data-value="${name}"></output><input type="range" name="${name}" min="${min}" max="${max}" step="${step}"></label>`).join('')}
  <label class="display-check"><input type="checkbox" name="mirror"> Mirror horizontally</label><label class="display-check"><input type="checkbox" name="flip"> Flip vertically</label>
  <div><button type="button" data-fullscreen>Fullscreen</button><button type="button" data-mode></button><button type="button" data-reset>Reset calibration</button><button type="button" data-hide>Hide controls</button></div><small>To reopen hidden controls, press C or click/tap anywhere on the Pepper’s Ghost display. Position is relative to the scene size. Calibration stays on this browser.</small><p role="status"></p>`;
  document.body.append(panel);
  panel.addEventListener('input',event=>{const input=event.target;if(!(input.name in defaults))return;settings[input.name]=input.type==='checkbox'?input.checked:Number(input.value);persist();syncControls();});
  panel.querySelector('[data-hide]').addEventListener('click',()=>showCalibration(false));
  panel.querySelector('[data-reset]').addEventListener('click',()=>{Object.assign(settings,defaults);persist();syncControls();});
  panel.querySelector('[data-fullscreen]').addEventListener('click',fullscreen);
  panel.querySelector('[data-mode]').addEventListener('click',()=>{
   ghost=!ghost;const url=new URL(location.href);if(ghost)url.searchParams.set('display','ghost');else url.searchParams.delete('display');history.replaceState(null,'',url);apply();
  });
  syncControls();apply();
 }
 panel.hidden=!show;
 if(show)panel.querySelector('input').focus();else if(panel.contains(document.activeElement))document.activeElement.blur();
}
document.addEventListener('click',event=>{
 if(ghost&&(!panel||panel.hidden)&&!event.target.closest('a, button, .display-calibration'))showCalibration();
});
window.addEventListener('keydown',event=>{
 if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.target.matches?.('textarea, select, input:not([type=range]):not([type=checkbox])'))return;
 if(event.code==='KeyC'){event.preventDefault();showCalibration(!panel||panel.hidden);}
 else if(event.code==='KeyF'&&(ghost||panel&&!panel.hidden)){event.preventDefault();fullscreen();}
 else if(event.code==='Escape'&&panel&&!panel.hidden)showCalibration(false);
});
window.AquariumDisplay={get ghost(){return ghost;}};
apply();if(params.get('calibrate')==='1')showCalibration();
})();
