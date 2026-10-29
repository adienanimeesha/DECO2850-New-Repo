const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
function setup(t,query='',stored){
 const html=fs.readFileSync('public/pet.html','utf8').replace(/<script[\s\S]*?<\/script>/g,'');
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'http://localhost/pet.html'+query});
 t.after(()=>dom.window.close());const w=dom.window,d=w.document,handlers={},calls=[],frames=[];
 const ctx=new Proxy({canvas:d.querySelector('canvas')},{get:(o,k)=>k in o?o[k]:(...args)=>{calls.push([k,...args]);if(k==='createLinearGradient')return{addColorStop(){}};},set:(o,k,v)=>{calls.push(['set',k,v]);o[k]=v;return true;}});
 w.HTMLCanvasElement.prototype.getContext=()=>ctx;
 w.HTMLElement.prototype.getBoundingClientRect=()=>({width:960,height:620});
 w.matchMedia=()=>({matches:false});w.requestAnimationFrame=fn=>{frames.push(fn);};
 w.Path2D=class{constructor(d){this.d=d;}};
 w.Image=class{constructor(){this.complete=true;this.naturalWidth=100;this.naturalHeight=100;}set src(v){this._src=v;this.onload?.();}get src(){return this._src;}};
 w.io=()=>({on:(name,fn)=>handlers[name]=fn});
 if(stored!==undefined)w.localStorage.setItem('jelly-aquarium-calibration-v1',stored);
 for(const file of ['journey-content','ocean-art','learning-backend','aquarium-display','aquarium'])w.eval(fs.readFileSync('public/js/'+file+'.js','utf8'));
 return{w,d,calls,handlers,frame(time=1000){calls.length=0;frames.shift()(time);return calls;},key(code){w.dispatchEvent(new w.KeyboardEvent('keydown',{code,bubbles:true}));}};
}
test('default aquarium keeps its normal background and has no calibration UI or transforms',t=>{
 const p=setup(t);assert.equal(p.w.AquariumDisplay.ghost,false);assert.equal(p.d.querySelector('button'),null);
 assert.equal(p.d.querySelector('canvas').style.transform,'');
 assert.ok(p.frame().some(c=>c[0]==='createLinearGradient'));
});
test('ghost mode clears to pure black, removes tank gradients and preserves Jelly movement and artwork',t=>{
 const normal=setup(t),ghost=setup(t,'?display=ghost');
 const decorations=[];
 for(const p of [normal,ghost]){const draw=p.w.OceanArt.canvasIcon;p.w.OceanArt.canvasIcon=(ctx,id,...args)=>{decorations.push(id);return draw(ctx,id,...args);};}
 const n=normal.frame(),g=ghost.frame();
 assert.deepEqual(decorations,[],'no uncollected coral or ocean decorations in either view');
 assert.equal(ghost.w.AquariumDisplay.ghost,true);assert.equal(ghost.d.querySelector('button'),null);
 assert.equal(g.some(c=>c[0]==='createLinearGradient'),false);
 assert.ok(g.some(c=>c[0]==='set'&&c[1]==='fillStyle'&&c[2]==='#000000'));
 assert.deepEqual(g.find(c=>c[0]==='fillRect').slice(1),[0,0,960,620]);
 const jelly=calls=>calls.find(c=>c[0]==='drawImage'&&c[4]===116&&c[5]===134);
 assert.equal(jelly(g)[1].src,jelly(n)[1].src);
 assert.deepEqual(jelly(g).slice(2),jelly(n).slice(2));
 for(const calls of [n,g])assert.ok(calls.some(c=>c[0]==='scale'&&c[1]===2.2&&c[2]===2.2),'Jelly and its glow render at 2.2 times their original size in both modes');
 assert.ok(g.some(c=>c[0]==='set'&&c[1]==='shadowBlur'&&c[2]===14));
 assert.ok(g.some(c=>JSON.stringify(c)===JSON.stringify(n.filter(c=>c[0]==='translate').at(-1))),'Jelly keeps the same swimming position');
});
test('collected items glow without habitat decorations, with hollow bubbles on black',t=>{
 const p=setup(t,'?display=ghost');
 p.handlers['journey-state']({revision:1,trip:1,phase:'aquarium',memories:[{id:'moon',icon:'moon'},{id:'fish',icon:'fish'},{id:'star',icon:'star'}],bag:[]});
 const calls=p.frame();
 assert.deepEqual(calls.filter(c=>c[0]==='fillRect').map(c=>c.slice(1)),[[0,0,960,620]],'only the black background fills the scene');
 for(const colour of ['#9af5ff','#e4b0ff','#ffe6a1','#d7b3ff'])assert.ok(calls.some(c=>c[0]==='set'&&c[1]==='shadowColor'&&c[2]===colour),colour+' glow is applied');
 assert.equal(calls.filter(c=>c[0]==='arc').length,34,'each hollow bubble has a bright highlight');
 assert.ok(calls.some(c=>c[0]==='set'&&c[1]==='shadowColor'&&c[2]==='#80efff'));
 const strokes=calls.filter(c=>c[0]==='stroke'&&c[1] instanceof p.w.Path2D);
 assert.equal(strokes.length,2,'tentacles have two direct vector halo strokes');
 assert.match(strokes[0][1].d,/M29 65Q18 88 30 99/,'halo follows the original tentacle artwork');
 assert.ok(calls.some(c=>c[0]==='set'&&c[1]==='shadowColor'&&c[2]==='#f3baff'));
});
test('calibration persists locally, clamps corrupt values, resets and can hide controls',t=>{
 const p=setup(t,'?display=ghost&calibrate=1',JSON.stringify({scale:99,x:-100,y:100,brightness:-1,mirror:true,flip:true}));
 const canvas=p.d.querySelector('canvas'),panel=p.d.querySelector('.display-calibration');
 assert.match(canvas.style.transform,/translate\(-40%, 40%\) scale\(1.5\) scale\(-1, -1\)/);
 assert.equal(canvas.style.filter,'brightness(0.25)');
 const x=panel.querySelector('[name=x]');x.value=12;x.dispatchEvent(new p.w.Event('input',{bubbles:true}));
 assert.equal(JSON.parse(p.w.localStorage.getItem('jelly-aquarium-calibration-v1')).x,12);
 p.key('KeyC');assert.equal(panel.hidden,true);p.key('KeyC');assert.equal(panel.hidden,false);
 p.w.dispatchEvent(new p.w.KeyboardEvent('keydown',{code:'KeyC',repeat:true}));assert.equal(panel.hidden,false,'held keys do not repeatedly toggle calibration');
 panel.querySelector('[data-reset]').click();assert.equal(canvas.style.filter,'brightness(1)');assert.match(canvas.style.transform,/scale\(1, 1\)/);
 panel.querySelector('[data-mode]').click();assert.equal(p.w.AquariumDisplay.ghost,false);assert.equal(canvas.style.transform,'');assert.equal(canvas.style.filter,'');assert.equal(p.w.location.search,'?calibrate=1');
 assert.ok(p.frame().some(c=>c[0]==='createLinearGradient'));
 panel.querySelector('[data-hide]').click();assert.equal(panel.hidden,true);
});
test('normal URL ignores stored ghost calibration and invalid storage does not stop rendering',t=>{
 const p=setup(t,'',JSON.stringify({scale:.5,mirror:true,brightness:.4}));assert.equal(p.d.querySelector('canvas').style.transform,'');assert.equal(p.w.AquariumDisplay.ghost,false);
 const broken=setup(t,'?display=ghost','{broken');assert.ok(broken.frame().length>0);
});
test('clicking or tapping the ghost display reopens hidden controls without resetting calibration',t=>{
 const p=setup(t,'?display=ghost');
 p.d.querySelector('canvas').click();
 const panel=p.d.querySelector('.display-calibration');
 assert.equal(panel.hidden,false);
 const scale=panel.querySelector('[name=scale]');scale.value=.75;scale.dispatchEvent(new p.w.Event('input',{bubbles:true}));
 panel.querySelector('[data-hide]').click();assert.equal(panel.hidden,true,'hide click must not reopen controls');
 p.d.querySelector('canvas').click();assert.equal(panel.hidden,false);
 assert.equal(scale.value,'0.75');
 p.key('Escape');assert.equal(panel.hidden,true);
 p.key('KeyC');assert.equal(panel.hidden,false);
 const normal=setup(t);normal.d.querySelector('canvas').click();assert.equal(normal.d.querySelector('.display-calibration'),null);
});
test('display controls request fullscreen without changing shared journey state',async t=>{
 const p=setup(t,'?display=ghost&calibrate=1');let requested=0;
 p.d.documentElement.requestFullscreen=async()=>{requested++;};
 p.d.querySelector('[data-fullscreen]').click();await Promise.resolve();assert.equal(requested,1);
 const state={revision:5,trip:1,phase:'aquarium',language:'chinese',outfit:'hanfu-lilac',memories:[{id:'moon',icon:'moon'}],bag:[]};
 const before=JSON.stringify(state);p.handlers['journey-state'](state);p.frame();
 const jelly=p.calls.find(c=>c[0]==='drawImage'&&c[4]===116&&c[5]===134);
 assert.ok(decodeURIComponent(jelly[1].src).includes('moon-festival-outfit'));
 p.handlers['journey-state']({...state,revision:6,phase:'room'});assert.equal(p.frame().some(c=>c[0]==='drawImage'&&c[4]===116&&c[5]===134),false);
 p.handlers['journey-state']({...state,revision:4});assert.equal(p.frame().some(c=>c[0]==='drawImage'&&c[4]===116&&c[5]===134),false);
 p.handlers['journey-state']({...state,revision:7,phase:'returning'});assert.ok(p.frame().some(c=>c[0]==='drawImage'&&c[4]===116&&c[5]===134));
 assert.equal(JSON.stringify(state),before);
});
