(function () {
'use strict';
const socket=io({auth:{journey:true}}),canvas=document.getElementById('aquarium'),ctx=canvas.getContext('2d'),art=window.OceanArt;
const $=id=>document.getElementById(id);
let state={phase:'aquarium',memories:[],bag:[]},changedAt=performance.now(),jellyImage=new Image(),imageVersion=0;
const status={aquarium:['Jelly is at home ♡','Ready when you are.','Choose a language on the mobile screen to begin.'],departing:['Swimming to your mobile…','See you in the common room!','Jelly follows a trail of bubbles to your mobile adventure.'],room:['Exploring the common room','Jelly is on an adventure.','Words and cultural stories are waiting on the mobile screen.'],travelling:['On the way to the festival','A special invitation!','Jelly is dressed and swimming toward the celebration.'],festival:['Making festival memories','A festival to remember.','Find the glowing keepsakes with Jelly on the mobile screen.'],returning:['Swimming home with memories…','Welcome home, little explorer.','Jelly is bringing your discoveries into the aquarium.']};
function round(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.stroke();}}
function ellipse(x,y,rx,ry,fill,stroke){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
function plant(x,y,scale,time,colour){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*7,0);ctx.quadraticCurveTo(i*20+Math.sin(time/700+i)*8,-50,i*16+Math.sin(time/650+i)*8,-80-Math.abs(i)*5);ctx.strokeStyle=colour;ctx.lineWidth=9;ctx.lineCap='round';ctx.stroke();}ctx.restore();}
function draw(time){
 const gradient=ctx.createLinearGradient(0,0,0,620);gradient.addColorStop(0,'#c3f5f5');gradient.addColorStop(.45,'#86dce7');gradient.addColorStop(1,'#4bb8cf');ctx.fillStyle=gradient;ctx.fillRect(0,0,960,620);
 for(const [x,w] of [[130,75],[380,105],[680,85]]){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+w,0);ctx.lineTo(x+w+110,590);ctx.lineTo(x+50,590);ctx.fillStyle='#ffffff1c';ctx.fill();}
 round(24,24,912,572,34,'#ffffff09','#8bbace');round(40,40,880,539,24,'#ffffff05','#c9f6f5');
 ctx.beginPath();ctx.moveTo(42,513);ctx.quadraticCurveTo(250,482,500,520);ctx.quadraticCurveTo(740,552,918,506);ctx.lineTo(918,578);ctx.lineTo(42,578);ctx.fillStyle='#d3e5cd';ctx.fill();
 plant(102,530,1.1,time,'#74baa9');plant(846,535,1.2,time,'#a7b0dc');plant(183,538,.65,time,'#b7d3b4');plant(787,540,.6,time,'#d6a1d5');
 art.canvasIcon(ctx,'coral',126,524,88);art.canvasIcon(ctx,'coral',859,540,78);
 for(let i=0;i<23;i++){const x=74+(i*137)%820+Math.sin(time/1300+i)*7,y=548-((time/28+i*79)%495);ellipse(x,y,3+i%5,3+i%5,'#ffffff10','#efffff66');}
 const items=state.memories || [];
 // Returned memories become little decorations, spread across the sand and water.
 items.slice(-24).forEach((item,i)=>{
  const slots=[[270,518],[390,554],[540,505],[660,547],[745,468],[186,446],[810,355],[310,394],[590,430],[400,453],[690,380],[226,346],[330,281],[650,245],[520,192],[765,225],[146,280],[855,463],[480,543],[610,330],[300,225],[760,530],[110,380],[850,280]];
  const [x,y]=slots[i];const floating=['fish','star','moon','lantern','ripple'].includes(item.icon);
  const bob=Math.sin(time/1100+i)*(floating?6:1);
  ellipse(x,y+24,22,6,'#5287a222');
  ctx.save();ctx.translate(x,y+bob);ctx.rotate(Math.sin(i*4)*.13);art.canvasMemory(ctx,item,0,0,45);ctx.restore();
 });
 const elapsed=(time-changedAt)/2200;
 let x=480+Math.sin(time/2300)*175,y=310+Math.sin(time/1600)*45,visible=state.phase==='aquarium';
 if(state.phase==='departing'){visible=true;x=480+Math.min(1,elapsed)*620;y=300-Math.sin(Math.min(1,elapsed)*Math.PI)*65;}
 if(state.phase==='returning'){visible=true;x=-90+Math.min(1,elapsed)*570;y=300+Math.sin(Math.min(1,elapsed)*Math.PI)*40;}
 if(visible&&jellyImage.complete&&jellyImage.naturalWidth){const scale=art.screenScale(canvas);ctx.save();ctx.translate(x,y);ctx.scale(scale.unit/scale.x,scale.unit/scale.y);ctx.rotate(Math.sin(time/1700)*.06);ctx.drawImage(jellyImage,-58,-69+Math.sin(time/330)*3,116,134);ctx.restore();}
 requestAnimationFrame(draw);
}
function updateImage(){const track=window.JOURNEYS[state.language],c=track&&(window.JourneyLearning?.selectedContent(track,state)||track),outfit=c?.outfits.find(x=>x.id===state.outfit);const image=new Image(),version=++imageVersion;image.onload=()=>{if(version===imageVersion)jellyImage=image;};image.src=art.jellyDataUrl(outfit);}
let awaitingSnapshot=true;
socket.on('disconnect',()=>{awaitingSnapshot=true;});
socket.on('journey-state',next=>{
 if(!awaitingSnapshot&&next.revision<state.revision)return;
 awaitingSnapshot=false;
 if(next.trip!==state.trip)art.clearMemoryCache();
 if(next.phase!==state.phase||next.trip!==state.trip)changedAt=performance.now();state=next;updateImage();
 const copy=status[next.phase] || status.aquarium;
 $('aquarium-status').textContent=next.phase==='aquarium' ? `Jelly is at home, swimming with ${next.memories.length} collected memories.` : copy[0];
 canvas.setAttribute('aria-label',next.phase==='aquarium'?`Jelly swimming in an aquarium with ${next.memories.length} collected memories`:`Jelly ${copy[0]}. The aquarium is waiting.`);
});
updateImage();requestAnimationFrame(draw);
})();
