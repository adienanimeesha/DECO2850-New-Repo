(function () {
"use strict";
const journey = window.JellyJourney;
let roomLocked = false, activeTrip = -1, activePhase = null, autoPath = [], autoTarget = null;
let festivalApproach = null, areaPending = false;
let storyProximityArmed = true;
let memoryProximityArmed = true;
let wardrobeProximityArmed = true;
let storyVoiceTimer = null, storyVoiceListener = null;
const art = window.OceanArt;
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
const wornJellyImages = new Map();
const festivalImages = new Map();
function festivalImage(path) {
 let image = festivalImages.get(path);
 if (!image) {
  image = new Image();
  image.src = path;
  festivalImages.set(path, image);
 }
 return image;
}
function drawFestivalImage(path,x,y,maxWidth,maxHeight,crop,keepScreenAspect=false) {
 const image=festivalImage(path);
 if(!image.complete||!image.naturalWidth||!image.naturalHeight)return false;
 const [sourceX,sourceY,sourceWidth,sourceHeight]=crop||[0,0,image.naturalWidth,image.naturalHeight];
 const scale=Math.min(maxWidth/sourceWidth,maxHeight/sourceHeight);
 const screen=keepScreenAspect?art.screenScale(canvas):null;
 const width=sourceWidth*scale*(screen?screen.unit/screen.x:1);
 const height=sourceHeight*scale*(screen?screen.unit/screen.y:1);
 if(crop)context.drawImage(image,sourceX,sourceY,sourceWidth,sourceHeight,x-width/2,y-height/2,width,height);
 else context.drawImage(image,x-width/2,y-height/2,width,height);
 return true;
}
function preloadFestivalArea(area) {
 const content=journey.content,zone=content?.festivalAreas?.[area];
 if(!zone?.background)return;
 for(const path of [zone.background,...(content.festivalItems||[]).filter(item=>item.area===area).map(item=>item.festivalImage),
  ...zone.distractors.map(item=>item.festivalImage),...Object.values(content.festivalNavigation||{})])
  if(path)festivalImage(path);
}
function wornJellyImage(outfit) {
 let image=wornJellyImages.get(outfit.id);
 if(!image){image=new Image();image.src=art.jellyDataUrl(outfit);wornJellyImages.set(outfit.id,image);}
 return image;
}
let learning = null, learningOptions = null, learningApproach = null;
let learningStoryUnlocked = false;
const learningBusy = () => Boolean(learning?.blocked);

// The original prototype's canvas loop, axis-by-axis movement, collision boxes,
// and pointer D-pad are kept here. Art is drawn directly so no assets are needed.
const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");
const dPad = document.querySelector("#d-pad");
const dPadButtons = dPad.querySelectorAll("[data-direction]");
const interaction = document.querySelector("#interaction");
const interactionText = document.querySelector("#interaction-text");
const feedback = document.querySelector("#feedback");
const backdrop = document.querySelector("#storybook-backdrop");
const progressCount = document.querySelector("#progress-count");
const objective = document.querySelector("#objective");
const world = { width: 960, height: 620, bounds: { left: 49, right: 911, top: 127, bottom: 567 } };
const player = { x: 486, y: 408, radius: 21, speed: 215, facingX: 0, facingY: 1, moving: false };
const roomFurniture = [
  { id: "memory-shelf", x: 83, y: 348, width: 179, height: 81 },
  { id: "pearl-shelf", x: 77, y: 155, width: 180, height: 63 },
  { id: "vanity", x: 731, y: 164, width: 152, height: 76 },
  { id: "story-table", x: 413, y: 239, width: 145, height: 77 },
  { id: "anemone-pot", x: 785, y: 441, width: 65, height: 63 },
];
let furniture = roomFurniture;
// Painted silhouettes extend beyond the physical collision boxes. Include the
// book's label/glow, furniture shadows, swaying plants, shells and floor coral.
const roomVisualObstacles = [
 {x:62,y:337,width:221,height:117}, {x:77,y:110,width:180,height:112},
 {x:717,y:103,width:180,height:179}, {x:373,y:196,width:226,height:184},
 {x:774,y:397,width:88,height:130}, {x:20,y:450,width:97,height:130},
 {x:812,y:452,width:116,height:130}, {x:278,y:500,width:515,height:80},
 ...Array.from({length:11},(_,i)=>({x:77+i*77,y:274+(i%3)*95,width:12,height:12}))
];
function learningGeometry() {
 const rect=canvas.getBoundingClientRect();
 const ui=[...document.querySelectorAll('.d-pad,.journey-tools,.mailbox-button,.mission-panel,.vocabulary-controls')]
  .filter(node=>!node.hidden&&node.getClientRects().length).map(node=>{
   const box=node.getBoundingClientRect();
   return {x:(box.left-rect.left)*960/rect.width,y:(box.top-rect.top)*620/rect.height,width:box.width*960/rect.width,height:box.height*620/rect.height};
  });
 return {bounds:world.bounds,furniture,player:{...player},visualObstacles:roomVisualObstacles,reserved:ui};
}
const keysDown = new Set();
const touchPointers = new Map();
const movementKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"]);
let lastFrameTime = performance.now();
let nearTarget = null;
let feedbackUntil = 0;
let storyOpen = false, storySubmission = null, storySaveError = false;
let pageIndex = 0;
let lastFocus = null;

// Every chapter uses the same five-beat stage: place, action, reaction,
// child interaction, and a spoken vocabulary response.
let chapters = window.JOURNEYS.indonesian.chapters;
let storyChapterCount = chapters.length;
let pageTurning = false;
let pageTurnTimer = 0;
const introState = {
  active: false, playing: true, beat: 0, elapsed: 0, totalTime: 0, lastTime: 0,
  narrationDone: false, speechStarted: false, speaking: false, speechToken: 0,
  interactionDone: false, invitedPrinces: new Set(), completed: false,
  completedChapters: chapters.map(() => false), reactionTime: 0, audioUnavailable: false, frame: 0,
};

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

window.addEventListener("keydown", (event) => {
  if (storyOpen) {
    if (event.key === "Tab") { journey.trapFocus(event, backdrop); return; }
    if (event.code === "Escape") { event.preventDefault(); closeStory(); }
    else if (event.code === "ArrowRight" && !event.repeat) { event.preventDefault(); nextPage(); }
    else if (event.code === "ArrowLeft" && !event.repeat) { event.preventDefault(); previousPage(); }
    return;
  }
  if (journey.locked || roomLocked || learningBusy()) return;
  autoPath = []; autoTarget = null;
  if (event.code === "KeyE" && !event.repeat) { event.preventDefault(); interact(); return; }
  if (!movementKeys.has(event.code)) return;
  event.preventDefault();
  keysDown.add(event.code);
});
window.addEventListener("keyup", (event) => keysDown.delete(event.code));
window.addEventListener("blur", clearMovement);
window.addEventListener('pagehide',()=>learning?.stop());
document.addEventListener('visibilitychange',()=>{if(document.hidden)learning?.cancelNarration();});
function clearMovement() {
  learning?.setTarget(null);
  autoPath = []; autoTarget = null;
  keysDown.clear();
  touchPointers.clear();
  dPadButtons.forEach((button) => button.classList.remove("is-pressed"));
}
canvas.addEventListener("pointerdown", () => canvas.focus());
dPadButtons.forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    if (journey.locked || storyOpen || roomLocked || learningBusy()) return;
    autoPath = []; autoTarget = null;
    touchPointers.set(event.pointerId, button.dataset.direction);
    button.classList.add("is-pressed");
  });
  function release(event) {
    touchPointers.delete(event.pointerId);
    button.classList.toggle("is-pressed", [...touchPointers.values()].includes(button.dataset.direction));
  }
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});
dPad.addEventListener("contextmenu", (event) => event.preventDefault());
document.querySelector("#interact-button").addEventListener("click", interact);
document.querySelector("#close-story").addEventListener("click", closeStory);
document.querySelector("#scene-play").addEventListener("click", toggleIntroPlayback);
document.querySelector("#scene-replay").addEventListener("click", replayIntroNarration);
document.querySelector("#scene-prev").addEventListener("click", previousPage);
document.querySelector("#scene-next").addEventListener("click", nextPage);
["story-shell", "story-fish", "story-flower", "prince-left", "prince-right",
  "peace-ripple", "nyale-target", "scene-boat"].forEach((name) => {
  const choice = document.querySelector("#" + name);
  choice.addEventListener("click", () => chooseIntroObject(name));
  choice.addEventListener("keydown", (event) => {
    if (event.code === "Enter" || event.code === "Space") {
      event.preventDefault();
      chooseIntroObject(name);
    }
  });
});
backdrop.addEventListener("pointerdown", (event) => { if (event.target === backdrop) closeStory(); });

function readMovement() {
  const touch = new Set(touchPointers.values());
  const x = Number(keysDown.has("ArrowRight") || keysDown.has("KeyD") || touch.has("right")) -
    Number(keysDown.has("ArrowLeft") || keysDown.has("KeyA") || touch.has("left"));
  const y = Number(keysDown.has("ArrowDown") || keysDown.has("KeyS") || touch.has("down")) -
    Number(keysDown.has("ArrowUp") || keysDown.has("KeyW") || touch.has("up"));
  if (!x && !y) return { x: 0, y: 0 };
  const length = Math.hypot(x, y);
  return { x: x / length, y: y / length };
}
function circleIntersectsBox(point, radius, box) {
  const x = point.x - clamp(point.x, box.x, box.x + box.width);
  const y = point.y - clamp(point.y, box.y, box.y + box.height);
  return x * x + y * y < radius * radius;
}
function movePlayer(dx, dy) {
  const bounds = world.bounds;
  const next = {
    x: clamp(player.x + dx, bounds.left + player.radius, bounds.right - player.radius),
    y: clamp(player.y + dy, bounds.top + player.radius, bounds.bottom - player.radius),
  };
  if (!furniture.some((item) => circleIntersectsBox(next, player.radius, item))) {
    player.x = next.x;
    player.y = next.y;
  }
}
function update(delta) {
  if (!storyOpen && !journey.locked && !roomLocked && !learningBusy()) {
    tickAutoWalk(delta);
    const input = readMovement();
    player.moving = Boolean(input.x || input.y || autoPath.length);
    if (input.x || input.y) {
      player.facingX = input.x;
      player.facingY = input.y;
      movePlayer(input.x * player.speed * delta, 0);
      movePlayer(0, input.y * player.speed * delta);
    }
    updateInteraction();
  } else player.moving = false;
  if (!feedback.hidden && performance.now() > feedbackUntil) feedback.hidden = true;
}
function stations() {
 if (journey.state?.phase === 'festival') {
  const area=journey.state.festivalArea||0, c=journey.content;
  const objects=[...c.festivalItems.filter(x=>x.area===area&&!journey.state.festivalFound.includes(x.id)),...c.festivalAreas[area].distractors];
  return [...objects.map(x=>({...x,kind:'treasure',label:x.festivalImage?'Explore this object':x.word||'Explore this object',radius:x.festivalRadius??(x.festivalImage?110:65)})),
   ...(area>0?[{id:'area-left',kind:'portal',area:area-1,label:c.festivalAreas[area-1].name,x:80,y:450,radius:34}]:[]),
   ...(area<c.festivalAreas.length-1?[{id:'area-right',kind:'portal',area:area+1,label:c.festivalAreas[area+1].name,x:880,y:450,radius:34}]:[])];
 }
 if(learning?.active) return learning.objects.map(item=>({...item,id:'@vocabulary/'+item.id,vocabularyId:item.id}));
 const common = [
  {id:'book',kind:'book',label:'Read the cultural story',x:486,y:269,radius:104},
  {id:'learning-bookshelf',kind:'learning-bookshelf',label:'Choose a vocabulary level',x:180,y:214,radius:95},
  {id:'wardrobe',kind:'wardrobe',label:'Try on a festival outfit',x:810,y:212,radius:100},
  ...(journey.memories.length?[{id:'memories',kind:'memories',label:'Open your memory book',x:190,y:413,radius:112}]:[])
 ];
 if(!learningOptions)return common.filter(s=>s.kind!=='wardrobe'||(journey.wardrobeReady ?? (journey.state?.storyDone&&journey.state?.invited)));
 return common.filter(s=>(s.kind!=='book'||learningStoryUnlocked) && (s.kind!=='wardrobe'||journey.wardrobeReady));
}
function updateInteraction() {
 if (journey.locked || roomLocked || storyOpen || learningBusy()) { interaction.hidden=true; nearTarget=null; return; }
 if(learningOptions && journey.state?.phase==='room') {
  const nearby=stations().find(s=>(s.kind==='vocabulary'||s.kind==='learning-bookshelf')&&(!autoTarget||s.id===autoTarget)&&distance(player,s)<=s.radius);
  if(!nearby)learningApproach=null;
  const moving=keysDown.size>0||touchPointers.size>0||Boolean(autoTarget);
  if(nearby&&moving&&learningApproach!==nearby.id){learningApproach=nearby.id;nearTarget=nearby;interact();return;}
  if(learning?.active){interaction.hidden=true;nearTarget=nearby||null;return;}
 }
 if(journey.state?.phase==='festival') {
  interaction.hidden=true;
  const moving=keysDown.size>0||touchPointers.size>0||Boolean(autoTarget);
  const nearby=stations().find(s=>(!autoTarget||s.id===autoTarget)&&distance(player,s)<=s.radius);
  if(!nearby){festivalApproach=null;return;}
  if(moving && festivalApproach!==nearby.id && !areaPending) {
   festivalApproach=nearby.id;nearTarget=nearby;interact();
  }
  return;
 }
 const book=stations().find(s=>s.kind==='book');
 if(book) {
  const gap=distance(player,book);
  if(gap>book.radius+20) storyProximityArmed=true;
  const approaching=keysDown.size>0||touchPointers.size>0||autoTarget==='book';
  if(storyProximityArmed&&approaching&&gap<=book.radius) {
   storyProximityArmed=false;openStory();return;
  }
 }
 const shelf=stations().find(s=>s.kind==='memories');
 if(shelf) {
  const gap=distance(player,shelf);
  if(gap>shelf.radius+20) memoryProximityArmed=true;
  const approaching=keysDown.size>0||touchPointers.size>0||autoTarget==='memories';
  if(memoryProximityArmed&&approaching&&gap<=shelf.radius) {
   memoryProximityArmed=false;journey.openActivity('memories');return;
  }
 }
 const wardrobe=stations().find(s=>s.kind==='wardrobe');
 if(wardrobe) {
  const gap=distance(player,wardrobe);
  if(gap>wardrobe.radius+20)wardrobeProximityArmed=true;
  const approaching=keysDown.size>0||touchPointers.size>0||autoTarget==='wardrobe';
  if(wardrobeProximityArmed&&approaching&&gap<=wardrobe.radius) {
   wardrobeProximityArmed=false;journey.openActivity('wardrobe');return;
  }
 }
 nearTarget=stations().map(s => ({...s,dist:distance(player,s)})).filter(s => s.dist <= s.radius).sort((a,b) => a.dist-b.dist)[0] || null;
 interaction.hidden=!nearTarget||['book','memories','wardrobe'].includes(nearTarget.kind);
 if (nearTarget) { interactionText.textContent=nearTarget.label; document.querySelector('#interact-button').textContent=nearTarget.kind==='treasure' ? 'Collect' : 'Open'; }
}
function interact() {
 if (storyOpen || journey.locked || roomLocked || learningBusy() || !nearTarget || distance(player,nearTarget)>nearTarget.radius) return;
 autoPath=[];autoTarget=null;
 if (nearTarget.kind==='vocabulary') learning.select(nearTarget.vocabularyId);
 else if(nearTarget.kind==='learning-bookshelf') {
  clearMovement();learningApproach=nearTarget.id;
  learningOptions.onBookshelf?.('learning-bookshelf');
  window.dispatchEvent(new CustomEvent('ocean-room-interaction',{detail:{id:'learning-bookshelf'}}));
 }
 else if (nearTarget.kind==='book') openStory();
 else if (nearTarget.kind==='treasure') journey.send('journey-find',nearTarget.id);
 else if (nearTarget.kind==='portal') {areaPending=true;journey.send('journey-area',nearTarget.area);}
 else {
  if(nearTarget.kind==='memories') memoryProximityArmed=false;
  if(nearTarget.kind==='wardrobe') wardrobeProximityArmed=false;
  journey.openActivity(nearTarget.kind);
 }
}
function updateHud() {} // Shared journey state updates the HUD.
function walkTo(id) {
 if (journey.locked || storyOpen || roomLocked || learningBusy()) return;
 const target=stations().find(s => s.id===id); if (!target) return;
 clearMovement();
 // Breadth-first search across the room; click-to-walk respects the furniture.
 const grid=20, key=(x,y) => x+','+y;
 const valid=(x,y) => {
  const p={x:x*grid,y:y*grid}, b=world.bounds;
  return p.x>=b.left+player.radius && p.x<=b.right-player.radius && p.y>=b.top+player.radius && p.y<=b.bottom-player.radius && !furniture.some(f=>circleIntersectsBox(p,player.radius+3,f));
 };
 const sx=Math.round(player.x/grid),sy=Math.round(player.y/grid),queue=[[sx,sy]],seen=new Map([[key(sx,sy),null]]);
 let end=null;
 for (let i=0;i<queue.length;i++) {
  const [x,y]=queue[i];
  if (distance({x:x*grid,y:y*grid},target)<target.radius-12) {end=[x,y];break;}
  for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
   const nx=x+dx,ny=y+dy,k=key(nx,ny);
   if (!seen.has(k)&&valid(nx,ny)) {seen.set(k,[x,y]);queue.push([nx,ny]);}
  }
 }
 if (!end) { showFeedback('Use the arrows to swim a little closer.',3500);return; }
 const path=[];
 while(end) {path.unshift({x:end[0]*grid,y:end[1]*grid});end=seen.get(key(...end));}
 autoPath=path;autoTarget=id;
 if(target.kind==='vocabulary')learning?.setTarget(target.vocabularyId);
 canvas.focus();
}
function tickAutoWalk(delta) {
 if (!autoPath.length) return;
 const p=autoPath[0],dx=p.x-player.x,dy=p.y-player.y,d=Math.hypot(dx,dy),step=player.speed*delta;
 if (d<=step) { player.x=p.x;player.y=p.y;autoPath.shift(); }
 else { player.facingX=dx/d;player.facingY=dy/d;movePlayer(dx/d*step,0);movePlayer(0,dy/d*step); }
 if (!autoPath.length && autoTarget) {
  const target=stations().find(s=>s.id===autoTarget);autoTarget=null;
  updateInteraction();
  if(target) {nearTarget=target;interact();}
 }
}
function vocabularyPointer(event) {
 if(!learning?.active)return;
 const rect=canvas.getBoundingClientRect(),p={x:(event.clientX-rect.left)*960/rect.width,y:(event.clientY-rect.top)*620/rect.height};
 const item=learning.hitTest(p);learning.setHover(item?.id||null);canvas.style.cursor=item?'pointer':'';
}
canvas.addEventListener('pointermove',vocabularyPointer);
canvas.addEventListener('pointerdown',vocabularyPointer);
canvas.addEventListener('pointerleave',()=>{learning?.setHover(null);canvas.style.cursor='';});
canvas.addEventListener('pointerup', e => {
 if(journey.locked||storyOpen||roomLocked||learningBusy()) return;
 const rect=canvas.getBoundingClientRect(),p={x:(e.clientX-rect.left)*960/rect.width,y:(e.clientY-rect.top)*620/rect.height};
 if(learning?.active){const item=learning.hitTest(p);if(item)walkTo('@vocabulary/'+item.id);return;}
 const closest=stations().map(s=>({...s,d:distance(p,s)})).sort((a,b)=>a.d-b.d)[0];
 if(closest&&closest.d<85) walkTo(closest.id);
});
function showFeedback(message, duration = 4500) {
  feedback.textContent = message;
  feedback.hidden = false;
  feedbackUntil = performance.now() + duration;
}
function openStory(selected = false) {
  if (journey.state?.phase !== "room" || learning?.active || (learningOptions && !learningStoryUnlocked)) return;
  storyProximityArmed=false;
  if (!selected && learningOptions?.onStorybook) { clearMovement(); learningOptions.onStorybook(); return; }
  chapters = journey.content.chapters;storyChapterCount=chapters.length;
  pageIndex = Math.min(journey.state.storyPage, chapters.length-1);
  lastFocus = document.activeElement;
  storyOpen = true;
  clearMovement();
  stopNarration();
  backdrop.hidden = false;
  interaction.hidden = true;
  renderPage();
  document.querySelector("#close-story").focus();
}
function closeStory() {
  if (!storyOpen) return;
  clearTimeout(pageTurnTimer);
  pageTurning = false;
  document.querySelector(".storybook").classList.remove("is-turning", "next", "previous");
  introElement("book-turn-still").replaceChildren();
  introElement("turn-front").replaceChildren();
  document.querySelector(".turn-back").replaceChildren();
  storyOpen = false;
  storyProximityArmed=false;
  clearMovement();
  backdrop.hidden = true;
  leaveIntro();
  stopNarration();
  updateInteraction();
  (lastFocus || canvas).focus();
}
function captureStageImage() {
  const source = introElement("scene-stage").querySelector(journey.state?.language === "chinese" ? ".chinese-scene" : "svg");
  const copy = source.cloneNode(true);
  const sourceNodes = source.querySelectorAll("*");
  const copyNodes = copy.querySelectorAll("*");
  sourceNodes.forEach((node, index) => {
    if (node.hasAttribute("hidden") || getComputedStyle(node).display === "none")
      copyNodes[index].setAttribute("display", "none");
    if (node.classList.contains("scene-choice") || node.id === "scene-sparkles")
      copyNodes[index].setAttribute("opacity", getComputedStyle(node).opacity);
  });
  return "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(new XMLSerializer().serializeToString(copy));
}
function makeTurnLeaf(container, half, imageSource) {
  const book = document.querySelector(".storybook").getBoundingClientRect();
  const stage = introElement("scene-stage").getBoundingClientRect();
  const heading = document.querySelector(".scene-heading").getBoundingClientRect();
  const note = document.querySelector(".narrator-strip").getBoundingClientRect();
  const leafX = half === "left" ? 7 : book.width / 2;
  const top = (rect) => rect.top - book.top - 7;
  const headingCopy = document.createElement("div");
  headingCopy.className = "turn-leaf-heading";
  headingCopy.style.top = top(heading) + "px";
  headingCopy.textContent = half === "left"
    ? introElement("scene-chapter-title").textContent
    : introElement("scene-beat-label").textContent;
  const sceneCopy = document.createElement("div");
  sceneCopy.className = "turn-leaf-scene";
  sceneCopy.style.top = top(stage) + "px";
  sceneCopy.style.height = stage.height + "px";
  const picture = document.createElement("img");
  picture.alt = "";
  picture.src = imageSource;
  picture.style.width = stage.width + "px";
  picture.style.height = stage.height + "px";
  picture.style.left = stage.left - book.left - leafX + "px";
  sceneCopy.append(picture);
  const copy = document.createElement("div");
  copy.className = "turn-leaf-copy";
  copy.style.top = top(note) + "px";
  copy.style.height = note.height + "px";
  const small = document.createElement("small");
  small.textContent = half === "left"
    ? introElement("book-page-marker").textContent
    : "JELLY'S STORY";
  const body = document.createElement("span");
  body.textContent = half === "left"
    ? journey.content.storyTitle + " · " + introElement("book-note").textContent
    : introElement("scene-subtitle").textContent;
  copy.append(small, body);
  container.replaceChildren(headingCopy, sceneCopy, copy);
  return picture.decode().catch(() => {});
}
async function turnPage(target) {
  if (pageTurning || !storyOpen || target < 0 || target >= storyChapterCount) return;
  pageTurning = true;
  leaveIntro();
  stopNarration();
  const book = document.querySelector(".storybook");
  const direction = target > pageIndex ? "next" : "previous";
  const imageSource = captureStageImage();
  const fixedHalf = direction === "next" ? "left" : "right";
  const turningHalf = direction === "next" ? "right" : "left";
  const imagesReady = Promise.all([
    makeTurnLeaf(introElement("book-turn-still"), fixedHalf, imageSource),
    makeTurnLeaf(introElement("turn-front"), turningHalf, imageSource),
  ]);
  introElement("scene-prev").disabled = true;
  introElement("scene-next").disabled = true;
  await imagesReady;
  if (!storyOpen || !pageTurning) return;
  const current = pageIndex;
  pageIndex = target;
  renderPage(false); // The incoming page is visible beneath the turning leaf, but stays paused.
  const incomingImage = captureStageImage();
  pageIndex = current;
  await makeTurnLeaf(document.querySelector(".turn-back"), fixedHalf, incomingImage);
  if (!storyOpen || !pageTurning) return;
  book.classList.remove("next", "previous");
  void book.offsetWidth;
  book.classList.add("is-turning", direction);
  pageTurnTimer = setTimeout(() => {
    pageIndex = target;
    book.classList.remove("is-turning", "next", "previous");
    introElement("book-turn-still").replaceChildren();
    introElement("turn-front").replaceChildren();
    document.querySelector(".turn-back").replaceChildren();
    pageTurning = false;
    renderPage();
  }, 920);
}
function previousPage() { if (pageIndex > 0) turnPage(pageIndex - 1); }
function nextPage() {
  if (pageTurning || !storyOpen ||
      (!introState.completedChapters[pageIndex] && (!introState.completed || !introState.narrationDone))) return;
  if (pageIndex < storyChapterCount - 1) {
    turnPage(pageIndex + 1);
  } else {
    closeStory();
    if(journey.state?.storyDone&&!journey.state?.invited)journey.openActivity('mail');
    else showFeedback("Your story is complete! Your invitation is in the mailbox.", 6500);
  }
}
function renderPage(startNarration = true) {
  leaveIntro();
  stopNarration();
  const chapter = chapters[pageIndex];
  introElement("story-origin").textContent=journey.content.storyLabel;
  introElement("story-name").textContent=journey.content.storyTitle;
  document.querySelector(".storybook").setAttribute("aria-label",journey.content.storyTitle + " open storybook");
  const stage = introElement("scene-stage");
  document.querySelector(".storybook").classList.add("is-animated");
  introElement("animated-scene").hidden = false;
  introElement("scene-chapter-title").textContent =
    "CHAPTER " + (pageIndex + 1) + " · " + chapter.title.toUpperCase();
  introElement("scene-next").textContent =
    pageIndex === storyChapterCount - 1 ? "Finish story →" : "Next page →";
  introElement("book-page-marker").textContent = "PAGE " + (pageIndex + 1) + " OF " + storyChapterCount;
  introElement("book-note").textContent = pageIndex === storyChapterCount - 1
    ? "Our story and today’s festival come together."
    : "Watch the story, then tap the glowing choice.";
  introElement("scene-prev").disabled = pageIndex === 0;
  stage.dataset.chapter = String(pageIndex);
  configureChapterStage();
  configureChineseStage();
  stage.classList.remove("chapter-enter");
  document.querySelector(".storybook").scrollTop = 0;
  if (startNarration) enterIntro();
  else {
    introState.beat = 0;
    introState.elapsed = 0;
    introState.totalTime = 0;
    introState.playing = false;
    introState.speaking = false;
    introState.interactionDone = false;
    introState.invitedPrinces.clear();
    setSvgHidden("prince-left-invite", true);
    setSvgHidden("prince-right-invite", true);
    stage.classList.remove("can-choose", "choice-complete");
    introElement("scene-beat-label").textContent = chapter.beats[0].label;
    introElement("scene-subtitle").textContent = chapter.beats[0].line;
    introElement("scene-status").textContent = "Turning to the next page";
    introElement("scene-prompt").hidden = true;
    introElement("scene-prev").disabled = true;
    introElement("scene-next").disabled = true;
    applyIntroVisual();
  }
}
function stopNarration() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

// The animated stage reuses the original Chapter 1 SVG character and narration
// system. Chapter-specific props are separate layers, animated on the same loop.
function introElement(id) { return document.querySelector("#" + id); }
function setSvgHidden(id, hidden) { introElement(id).toggleAttribute("hidden", hidden); }
function introStatus(message) { introElement("scene-status").textContent = message; }
function placeNarrator(side) {
  const book = document.querySelector(".storybook");
  book.dataset.narratorSide = side;
}
const chapterChoiceIds = [
  ["story-shell", "story-fish", "story-flower"],
  ["prince-left", "prince-right"],
  ["peace-ripple"],
  ["nyale-target", "story-fish"],
  ["scene-boat"],
];
function configureChapterStage() {
  const chapter = pageIndex;
  setSvgHidden("villager-left", chapter === 1);
  setSvgHidden("villager-right", chapter === 1);
  setSvgHidden("castle", chapter > 1);
  setSvgHidden("coast-flags", chapter !== 2);
  setSvgHidden("festival-decor", chapter !== 4);
  setSvgHidden("legend-stars", chapter !== 3);
  setSvgHidden("coast-crowd", chapter < 2);
  setSvgHidden("legend-mist", chapter !== 3);
  setSvgHidden("nyale-school", chapter < 3);
  setSvgHidden("prince-left", chapter !== 1);
  setSvgHidden("prince-right", chapter !== 1);
  setSvgHidden("scene-boat", chapter === 1 || chapter === 3);
  setSvgHidden("princess", chapter === 4);
  const sky = introElement("scene-sky").querySelectorAll("stop");
  const skyColors = [
    ["#a6eafb", "#d1e8ff", "#ffe4d2"],
    ["#b7ebfa", "#e1ddf5", "#ffe5d1"],
    ["#b5ecf7", "#d7f1ed", "#ffe6cf"],
    ["#6e83bd", "#b4a7d5", "#f4c7ba"],
    ["#ffc7bf", "#ffe0cb", "#b9eef0"],
  ][chapter];
  sky.forEach((stop, index) => stop.setAttribute("stop-color", skyColors[index]));
  introElement("scene-sun").setAttribute("fill", chapter === 3 ? "#fff7e5" : "#fff4b5");
  introElement("scene-sun").setAttribute("cy", chapter === 4 ? "142" : "93");
  introElement("scene-stage").querySelector("svg").setAttribute("aria-label",
    "Animated chapter " + (chapter + 1) + ": " + chapters[chapter].title);
}
function cancelIntroSpeech() {
  introState.speechToken += 1;
  introState.speaking = false;
  introState.continueSpeech = null;
  clearTimeout(storyVoiceTimer);
  storyVoiceTimer = null;
  if (storyVoiceListener) window.speechSynthesis?.removeEventListener?.('voiceschanged',storyVoiceListener);
  storyVoiceListener = null;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
function enterIntro() {
  storySubmission=null;storySaveError=false;
  introState.active = true;
  introState.playing = true;
  introState.totalTime = 0;
  introState.lastTime = performance.now();
  introState.audioUnavailable = false;
  introState.completed = false;
  introState.interactionDone = false;
  introState.invitedPrinces = new Set();
  setSvgHidden("prince-left-invite", !introState.invitedPrinces.has("prince-left"));
  setSvgHidden("prince-right-invite", !introState.invitedPrinces.has("prince-right"));
  startIntroBeat(0);
  introState.frame = requestAnimationFrame(tickIntro);
}
function leaveIntro() {
  storySubmission=null;storySaveError=false;
  if (!introState.active) return;
  introState.active = false;
  cancelAnimationFrame(introState.frame);
  cancelIntroSpeech();
  applyNarratorVisual();
}
function startIntroBeat(index, speak = true) {
  cancelIntroSpeech();
  introState.beat = index;
  introState.elapsed = 0;
  introState.playing = true;
  introState.narrationDone = !speak;
  introState.speechStarted = false;
  if (index === 3) {
    introState.interactionDone = false;
    introState.invitedPrinces.clear();
    setSvgHidden("prince-left-invite", true);
    setSvgHidden("prince-right-invite", true);
  }
  const beat = chapters[pageIndex].beats[index];
  introElement("scene-beat-label").textContent = beat.label;
  introElement("scene-subtitle").textContent = beat.line;
  introElement("scene-play").textContent = "⏸ Pause";
  introElement("scene-continue").textContent = index === 3 ? "Try the glowing object →" : "Continue story →";
  introElement("scene-next").disabled = !introState.completedChapters[pageIndex];
  syncChineseChoices();
  const startingSide = pageIndex % 2 === 0 ? "left" : "right";
  placeNarrator(index >= 2 ? (startingSide === "left" ? "right" : "left") : startingSide);
  const stage = introElement("scene-stage");
  stage.classList.toggle("can-choose", index === 3 && !introState.interactionDone);
  stage.classList.toggle("choice-complete", index === 4 || introState.interactionDone);
  chapterChoiceIds.flat().forEach((id) =>
    introElement(id).setAttribute("tabindex",
      index === 3 && !introState.interactionDone && chapterChoiceIds[pageIndex].includes(id) ? "0" : "-1"));
  introElement("scene-prompt").hidden = index !== 3 || introState.interactionDone;
  introElement("scene-prompt").textContent = chapters[pageIndex].prompt;
  introStatus(!("speechSynthesis" in window) || introState.audioUnavailable
    ? "Subtitles on · audio unavailable here" : "Jelly is telling the story");
  if (speak) speakIntroLine(beat.line);
  else {
    introStatus("Page complete · choose where to go next");
    introElement("scene-next").disabled = false;
  }
  applyIntroVisual();
}
function replayIntroNarration() {
  if (!introState.active) return;
  storySaveError=false;
  cancelIntroSpeech();
  introState.playing = true;
  introState.narrationDone = false;
  introState.speechStarted = false;
  if (!("speechSynthesis" in window) || introState.audioUnavailable) introState.elapsed = 0;
  introElement("scene-play").textContent = "⏸ Pause";
  introElement("scene-next").disabled = !introState.completedChapters[pageIndex];
  introStatus(!("speechSynthesis" in window) || introState.audioUnavailable
    ? "Subtitles on · audio unavailable here" : "Jelly is replaying this line");
  speakIntroLine(chapters[pageIndex].beats[introState.beat].line);
}
function storySpeechParts(line) {
  // Pinyin remains in the subtitle, but is not sent to an English voice.
  // Pronounce the Hanzi itself once with a Mandarin voice instead.
  if(journey.state?.language==='chinese') {
    for(const reward of journey.content.storyRewards) {
      if(reward.pronunciation) line=line.replaceAll(`${reward.word}, ${reward.pronunciation},`,`${reward.word},`);
    }
  }
  if(journey.state?.language==='indonesian') {
    const words=['Mandalika','Putri','Lombok','Sasak','Bau Nyale',...journey.content.storyRewards.map(reward=>reward.word)].sort((a,b)=>b.length-a.length);
    const pattern=new RegExp(`\\b(${words.join('|')})\\b`,'gi');
    return line.split(pattern).map(text=>({text:text.trim(),lang:words.some(word=>word.toLowerCase()===text.toLowerCase())?'id-ID':'en-US'})).filter(part=>/[\p{L}\p{N}]/u.test(part.text));
  }
  return line.split(/(\p{Script=Han}+)/u).map(text=>({text:text.trim(),lang:/\p{Script=Han}/u.test(text)?'zh-CN':'en-US'})).filter(part=>/[\p{L}\p{N}]/u.test(part.text));
}
function storyVoice(lang) {
  const voices=window.speechSynthesis.getVoices?.() || [];
  if (window.VocabularySpeech?.voiceFor) return window.VocabularySpeech.voiceFor(voices,lang);
  const normalize=voice=>voice.lang.toLowerCase().replaceAll('_','-');
  if(lang==='id-ID') return voices.find(voice=>normalize(voice)==='id-id') || voices.find(voice=>/^id(-|$)/.test(normalize(voice)));
  if(lang==='zh-CN') {
    const mandarin=voices.filter(voice=>/^(zh|cmn)(-|$)/.test(normalize(voice)) && !/-(hk|mo)(-|$)/.test(normalize(voice)) && !/canton|yue|粤|粵/i.test(voice.name));
    return mandarin.find(voice=>normalize(voice)==='zh-cn') || mandarin.find(voice=>/^(zh|cmn)-(cn|hans|sg)/.test(normalize(voice))) || mandarin[0];
  }
  return voices.find(voice=>normalize(voice)==='en-us') || voices.find(voice=>/^en(-|$)/.test(normalize(voice)));
}
function speakIntroLine(line,{hint=false}={}) {
  if (!("speechSynthesis" in window) || introState.audioUnavailable) return;
  const token=introState.speechToken,parts=storySpeechParts(line);
  let index=0;
  const current=()=>introState.active && token===introState.speechToken;
  function fail(message='Subtitles on · audio unavailable here') {
    if(!current())return;
    introState.audioUnavailable=true;introState.speaking=false;introStatus(message);
  }
  function next() {
    if(!current())return;
    if(!introState.playing){introState.continueSpeech=next;return;}
    if(index>=parts.length) {
      if(hint){introState.speaking=false;applyNarratorVisual();}
      else finishIntroSpeech(token);
      return;
    }
    const part=parts[index],voice=storyVoice(part.lang);
    if(part.lang!=='en-US'&&!voice) {
      // A device may publish its installed voices asynchronously. Wait briefly
      // before falling back to subtitles; never assign English to Mandarin.
      if(storyVoiceListener)return;
      function clean() {
        clearTimeout(storyVoiceTimer);storyVoiceTimer=null;
        window.speechSynthesis.removeEventListener?.('voiceschanged',storyVoiceListener);
        storyVoiceListener=null;
      }
      storyVoiceListener=()=>{if(current()&&storyVoice(part.lang)){clean();next();}};
      window.speechSynthesis.addEventListener?.('voiceschanged',storyVoiceListener);
      storyVoiceTimer=setTimeout(()=>{
        clean();if(!current())return;
        if(storyVoice(part.lang))next();
        else fail(`${part.lang==='zh-CN'?'Mandarin':'Indonesian'} voice unavailable on this device · use subtitles or install the language voice.`);
      },1000);
      return;
    }
    try {
      const speech=new SpeechSynthesisUtterance(part.text);
      speech.lang=part.lang;
      if(voice)speech.voice=voice;
      speech.rate=part.lang!=='en-US'?.82:.88;
      speech.pitch=part.lang!=='en-US'?1:1.15;
      let ended=false;
      speech.onstart=()=>{
        if(current()){introState.speechStarted=true;introState.speaking=true;introStatus('Jelly is speaking');}
      };
      speech.onend=()=>{
        if(ended||!current())return;
        ended=true;introState.speaking=false;index++;next();
      };
      speech.onerror=()=>{if(!ended){ended=true;fail();}};
      window.speechSynthesis.speak(speech);
    } catch {fail();}
  }
  next();
}
function finishIntroSpeech(token) {
  if (!introState.active || token !== introState.speechToken) return;
  introState.speaking = false;
  introState.narrationDone = true;
  if (introState.beat === 3 && !introState.interactionDone)
    introStatus("Your turn · " + chapters[pageIndex].prompt);
  else if (introState.beat === 4) introStatus("Jelly has finished this chapter");
  else introStatus("Jelly is ready for the next moment");
}
function toggleIntroPlayback() {
  if (!introState.active) return;
  introState.playing = !introState.playing;
  if ("speechSynthesis" in window) {
    if (introState.playing) window.speechSynthesis.resume();
    else window.speechSynthesis.pause();
  }
  if (introState.playing && introState.continueSpeech) {
    const next= introState.continueSpeech;
    introState.continueSpeech=null;
    next();
  }
  introState.lastTime = performance.now();
  introElement("scene-play").textContent = introState.playing ? "⏸ Pause" : "▶ Play";
  introStatus(introState.playing ? "Jelly is telling the story" : "Paused");
  applyNarratorVisual();
  syncChineseChoices();
}
function chooseIntroObject(name) {
  if (!introState.active || introState.beat !== 3 || introState.interactionDone) return;
  if (!introState.playing) { introStatus("Press Play to keep exploring"); return; }
  if (!chapterChoiceIds[pageIndex].includes(name)) return;
  if (journey.state.language === "chinese") { chooseChineseObject(name); return; }
  if (pageIndex === 1) {
    if (introState.invitedPrinces.has(name)) return;
    introState.invitedPrinces.add(name);
    setSvgHidden(name + "-invite", false);
    introElement(name).setAttribute("tabindex", "-1");
    introState.reactionTime = introState.totalTime;
    if (introState.invitedPrinces.size < 2) {
      introStatus("Invitation delivered! Tap the other prince.");
      introElement("scene-prompt").textContent = "Now tap the other prince ✉️";
      return;
    }
    completeIntroInteraction("Both princes received the invitation. Well done!");
    return;
  }
  if (pageIndex === 0 && name !== "story-shell") {
    introStatus(name === "story-fish" ? "That's a fish. Try the seashell!" : "That's a flower. Try the seashell!");
    speakIntroHint("Good try! Look for the seashell near the path.");
    return;
  }
  if (pageIndex === 3 && name !== "nyale-target") {
    introStatus("That's a fish. Look for the colourful nyale!");
    speakIntroHint("Good try! The nyale is the colourful wiggling creature.");
    return;
  }
  if (pageIndex === 0) completeIntroInteraction("Great find! Jelly has a new word for you.");
  if (pageIndex === 2) completeIntroInteraction("Your ripple reached the crowd. Beautiful!");
  if (pageIndex === 3) completeIntroInteraction("You spotted a nyale! Watch it wiggle.");
  if (pageIndex === 4) completeIntroInteraction("The boat is sailing! The coast is celebrating.");
}
function speakIntroHint(message) {
  if (!introState.narrationDone || !("speechSynthesis" in window) ||
      introState.audioUnavailable || window.speechSynthesis.speaking) return;
  cancelIntroSpeech();
  speakIntroLine(message,{hint:true});
}
function completeIntroInteraction(message) {
  introState.interactionDone = true;
  introState.reactionTime = introState.totalTime;
  introElement("scene-stage").classList.remove("can-choose");
  introElement("scene-stage").classList.add("choice-complete");
  chapterChoiceIds[pageIndex].forEach((choice) =>
    introElement(choice).setAttribute("tabindex", "-1"));
  introElement("scene-prompt").hidden = true;
  introStatus(message);
}
function tickIntro(time) {
  if (!introState.active) return;
  const delta = Math.min((time - introState.lastTime) / 1000, .06);
  introState.lastTime = time;
  if (introState.playing) {
    introState.elapsed += delta;
    introState.totalTime += delta;
    const beat = chapters[pageIndex].beats[introState.beat];
    // Some browsers expose speech synthesis but do not start a voice. In that
    // case subtitles still progress; an utterance that is speaking is never cut off.
    const fallbackSeconds = Math.max(7, beat.line.length * .095);
    if (!introState.narrationDone && introState.elapsed >= fallbackSeconds &&
        (!("speechSynthesis" in window) || !window.speechSynthesis.speaking)) {
      introState.narrationDone = true;
      introState.speaking = false;
      if (introState.beat === 3) introStatus("Your turn · " + chapters[pageIndex].prompt);
    }
    if (introState.narrationDone && introState.elapsed >= beat.minSeconds) {
      if (introState.beat < 3) startIntroBeat(introState.beat + 1);
      else if (introState.beat === 3 && introState.interactionDone) startIntroBeat(4);
      else if (introState.beat === 4) {
        if (introState.completedChapters[pageIndex]) {
          introState.completed=true;introElement('scene-next').disabled=false;
          introElement('scene-continue').textContent=pageIndex===storyChapterCount-1?'Finish story →':'Next page →';
        } else if (!storySubmission && !storySaveError) {
          const submission={page:pageIndex,trip:journey.state.trip,story:journey.state.activeStoryId};
          storySubmission=submission;introElement('scene-next').disabled=true;introStatus('Saving this page…');
          journey.completeStoryPage(pageIndex).then(()=>{
            if(storySubmission!==submission||!storyOpen)return;
            storySubmission=null;introState.completed=true;introState.completedChapters[submission.page]=true;
            introElement('scene-next').disabled=false;
            introElement('scene-continue').textContent=submission.page===storyChapterCount-1?'Finish story →':'Next page →';
            introStatus(submission.page===storyChapterCount-1?'Story complete · choose Finish story to return to the ocean':'Page complete · choose Next page');
          }).catch(error=>{
            if(storySubmission!==submission||!storyOpen)return;
            storySubmission=null;storySaveError=true;introState.completed=false;
            introElement('scene-next').disabled=true;introStatus(error.message+' Use Continue narration to retry.');
          });
        }
      }
    }
    applyIntroVisual();
  }
  introState.frame = requestAnimationFrame(tickIntro);
}
function introEase(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}
function applyNarratorVisual() {
  const state=introState,worldTime=state.totalTime;
  const speaking=state.active && state.playing && (state.speaking || ((!("speechSynthesis" in window) || state.audioUnavailable) && !state.narrationDone));
  introElement('narrator-mouth').setAttribute('ry',String(speaking?3+Math.abs(Math.sin(worldTime*13))*5:2));
  introElement('narrator-eye-a').setAttribute('ry',worldTime%4.6<.13?.6:4);
  introElement('narrator-eye-b').setAttribute('ry',worldTime%4.6<.13?.6:4);
  const narrator=document.querySelector('.narrator-avatar');
  narrator.classList.toggle('is-speaking',speaking);
  narrator.style.transform='translateY('+Math.sin(worldTime*3)*2+'px)';
}
function applyIntroVisual() {
  applyNarratorVisual();
  if (journey.state?.language === "chinese") { applyChineseVisual(); return; }
  const state = introState;
  const chapter = pageIndex;
  const beat = state.beat;
  const t = state.elapsed;
  const worldTime = state.totalTime;
  const step = Math.sin(worldTime * 12);
  const bob = Math.sin(worldTime * 3) * 2;
  const joy = beat === 4 ? Math.max(0, Math.sin(worldTime * 9)) * 7 : 0;
  const put = (id, x, y) => introElement(id).setAttribute("transform", `translate(${x} ${y})`);
  const turn = (id, degrees, x, y) => introElement(id).setAttribute("transform", `rotate(${degrees} ${x} ${y})`);
  const walk = (idA, idB, amount, x = 15, y = -15) => {
    turn(idA, step * amount, -x, y);
    turn(idB, -step * amount, x, y);
  };
  let princessX = 480, princessY = 435;
  let leftX = 315, rightX = 645, leftY = 430, rightY = 432;
  let princessWalk = 0, neighboursWalk = 0;
  let princessArm = 0, leftArm = 0, rightArm = 0;
  let mouth = "M-7-135 Q0-128 7-135";
  introElement("scene-background").setAttribute("transform", `translate(${-8 + Math.sin(worldTime * .32) * 7} 0) scale(1.02 1)`);
  introElement("cloud-a").setAttribute("transform", "translate(" + (worldTime * 5 % 38) + " 0)");
  introElement("cloud-b").setAttribute("transform", "translate(" + (-worldTime * 4 % 33) + " 0)");
  const sail = chapter === 4 && state.interactionDone
    ? 180 * introEase((worldTime - state.reactionTime) / 2.5) : 0;
  put("scene-boat", sail + Math.sin(worldTime * .8) * 9, Math.sin(worldTime * 1.3) * 3);
  introElement("scene-water").setAttribute("transform", "translate(0 " + (Math.sin(worldTime * 1.4) * 2) + ")");
  introElement("scene-plants").setAttribute("transform", "rotate(" + (Math.sin(worldTime * 1.5) * 1.2) + " 480 450)");
  if (chapter === 0) {
    princessX = beat === 0 ? -90 : beat === 1 ? -90 + 495 * introEase(t / 4.5) : 405;
    leftX = beat < 2 ? -80 : beat === 2 ? -80 + 395 * introEase(t / 3.5) : 315;
    rightX = beat < 2 ? 1040 : beat === 2 ? 1040 - 395 * introEase(t / 3.5) : 645;
    princessWalk = beat === 1 && t < 4.5 ? 21 : 0;
    neighboursWalk = beat === 2 && t < 3.5 ? 24 : 0;
    princessArm = beat >= 2 ? -33 - Math.sin(worldTime * 9) * 17 : 0;
    leftArm = beat >= 2 ? 27 + Math.sin(worldTime * 7) * 13 : 0;
    rightArm = beat >= 2 ? -27 - Math.sin(worldTime * 7) * 13 : 0;
  } else if (chapter === 1) {
    princessX = 415;
    leftX = beat === 0 ? 275 : 260;
    rightX = beat === 0 ? 690 : 695;
    const arriving = beat === 0 ? introEase(t / 3.8) : 1;
    put("prince-left", -120 + 420 * arriving, 435 + bob);
    put("prince-right", 1080 - 360 * arriving, 435 - bob);
    const princeStep = beat === 0 && t < 3.8 ? 22 : 0;
    walk("prince-left-leg-a", "prince-left-leg-b", princeStep);
    walk("prince-right-leg-a", "prince-right-leg-b", -princeStep);
    turn("prince-left-arm", beat === 1 ? -28 - Math.sin(worldTime * 8) * 21 : beat >= 2 ? -18 : 0, -27, -87);
    turn("prince-right-arm", beat === 1 ? 28 + Math.sin(worldTime * 8 + 2) * 21 : beat >= 2 ? 18 : 0, 26, -86);
    introElement("prince-left-mouth").setAttribute("d", beat === 1 && Math.sin(worldTime * 9) > 0 ? "M-3-115 Q0-109 3-115" : "M-6-115 Q0-110 6-115");
    introElement("prince-right-mouth").setAttribute("d", beat === 1 && Math.sin(worldTime * 9 + 2) > 0 ? "M-3-115 Q0-109 3-115" : "M-6-115 Q0-110 6-115");
    princessArm = beat === 1 ? -20 : beat >= 2 ? -54 - Math.sin(worldTime * 4) * 8 : 0;
    mouth = beat === 1 ? "M-5-131 Q0-135 5-131" : "M-7-135 Q0-128 7-135";
    const invitationBounce = state.invitedPrinces.size ? Math.sin((worldTime - state.reactionTime) * 12) * 4 : 0;
    put("prince-left-invite", 0, state.invitedPrinces.has("prince-left") ? invitationBounce : 0);
    put("prince-right-invite", 0, state.invitedPrinces.has("prince-right") ? invitationBounce : 0);
  } else if (chapter === 2) {
    princessX = beat === 0 ? -120 + 610 * introEase(t / 3.7) : 490;
    leftX = beat === 0 ? -100 + 400 * introEase(t / 4) : 300;
    rightX = beat === 0 ? 1070 - 410 * introEase(t / 4) : 660;
    princessWalk = beat === 0 && t < 3.7 ? 20 : 0;
    neighboursWalk = beat === 0 && t < 4 ? 23 : 0;
    princessArm = beat >= 2 ? -53 - Math.sin(worldTime * 5) * 10 : 0;
    leftArm = beat >= 2 ? 19 + Math.sin(worldTime * 5) * 8 : 0;
    rightArm = beat >= 2 ? -19 - Math.sin(worldTime * 5) * 8 : 0;
    mouth = beat >= 2 ? "M-4-134 Q0-125 4-134" : mouth;
    const ripple = state.interactionDone ? introEase((worldTime - state.reactionTime) / 1.7) : 0;
    introElement("ripple-ring-a").setAttribute("r", 18 + ripple * 67);
    introElement("ripple-ring-b").setAttribute("r", 30 + ripple * 105);
    introElement("peace-ripple").setAttribute("transform", `translate(0 ${Math.sin(worldTime * 3) * 3})`);
  } else if (chapter === 3) {
    princessX = beat === 0 ? 315 + 250 * introEase(t / 3.6) : beat === 1 ? 565 + 95 * introEase(t / 3.2) : 660;
    princessY = 430 + (beat === 1 ? 22 * introEase(t / 3.2) : beat > 1 ? 22 : 0);
    princessWalk = (beat === 0 && t < 3.6) || (beat === 1 && t < 3.2) ? 13 : 0;
    leftX = 260; rightX = 410;
    leftArm = beat >= 1 ? -35 - Math.sin(worldTime * 5) * 5 : 0;
    rightArm = beat >= 1 ? 37 + Math.sin(worldTime * 5) * 5 : 0;
    const vanish = beat === 1 ? introEase(t / 3.3) : beat > 1 ? 1 : 0;
    introElement("princess").setAttribute("opacity", String(1 - vanish));
    introElement("legend-mist").setAttribute("opacity", String(beat === 0 ? .08 : beat === 1 ? .2 + Math.sin(Math.PI * vanish) * .65 : .16));
    introElement("legend-mist").setAttribute("transform", `translate(${Math.sin(worldTime * 1.7) * 13} ${Math.sin(worldTime * 2) * 4})`);
    introElement("nyale-school").setAttribute("opacity", String(beat < 2 ? 0 : Math.min(1, beat === 2 ? t / 1.3 : 1)));
    put("nyale-school", Math.sin(worldTime * 1.9) * 9, Math.sin(worldTime * 2.6) * 7);
    put("nyale-target", Math.sin(worldTime * 2.4) * 13, Math.sin(worldTime * 3.3) * 7 - (state.interactionDone ? Math.abs(Math.sin((worldTime - state.reactionTime) * 10)) * 13 : 0));
    introElement("nyale-target-body").setAttribute("transform", `translate(0 ${Math.sin(worldTime * 9) * 5})`);
  } else {
    leftX = beat === 0 ? -90 + 395 * introEase(t / 3.5) : 305;
    rightX = beat === 0 ? 1070 - 410 * introEase(t / 3.5) : 660;
    neighboursWalk = beat === 0 && t < 3.5 ? 22 : 0;
    leftArm = beat >= 1 ? 25 + Math.sin(worldTime * 7) * 14 : 0;
    rightArm = beat >= 1 ? -25 - Math.sin(worldTime * 7 + 1) * 14 : 0;
  }
  introElement("princess").setAttribute("opacity", chapter === 3 ? introElement("princess").getAttribute("opacity") : "1");
  put("princess", princessX, princessY + bob - joy);
  put("villager-left", leftX, leftY + bob - joy * .65);
  put("villager-right", rightX, rightY - bob - joy * .7);
  walk("princess-leg-a", "princess-leg-b", princessWalk, 17, -25);
  walk("left-leg-a", "left-leg-b", neighboursWalk, 13, -12);
  walk("right-leg-a", "right-leg-b", -neighboursWalk, 13, -12);
  turn("princess-right-arm", princessArm, 27, -96);
  turn("villager-left-arm", leftArm, -22, -76);
  turn("villager-right-arm", rightArm, 22, -77);
  for (const [index, id] of ["crowd-one", "crowd-two", "crowd-three"].entries()) {
    const travel = chapter >= 2 && beat === 0 ? introEase(t / 3.8) : 1;
    const origin = index === 2 ? 310 : -300;
    const hop = chapter === 4 && beat >= 2 ? Math.abs(Math.sin(worldTime * 6 + index)) * 8 : 0;
    put(id, origin * (1 - travel), Math.sin(worldTime * 2.8 + index) * 2 - hop);
  }
  introElement("coast-flags").setAttribute("transform", `rotate(${Math.sin(worldTime * 3) * 1.7} 480 365)`);
  introElement("festival-decor").setAttribute("transform", `translate(0 ${Math.sin(worldTime * 2) * 2})`);
  introElement("legend-stars").setAttribute("opacity", String(.5 + Math.sin(worldTime * 3) * .35));
  const blink = worldTime % 3.4 < .12 ? .5 : 3.5;
  introElement("princess-eye-a").setAttribute("ry", blink);
  introElement("princess-eye-b").setAttribute("ry", blink);
  const neighbourBlink = worldTime % 4.1 < .12 ? .6 : 2.6;
  ["left-eye-a", "left-eye-b", "right-eye-a", "right-eye-b"].forEach((id) =>
    introElement(id).setAttribute("r", neighbourBlink));
  introElement("princess-mouth").setAttribute("d", mouth);
  introElement("story-shell").setAttribute("transform", "translate(0 " +
    (beat === 4 ? -Math.max(0, Math.sin(worldTime * 10)) * 17 : 0) + ")");
  introElement("scene-sparkles").setAttribute("opacity", String(.55 + Math.sin(worldTime * 8) * .4));

}

function roundedRect(x, y, width, height, radius, fill, stroke) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  if (fill) { context.fillStyle = fill; context.fill(); }
  if (stroke) { context.strokeStyle = stroke; context.lineWidth = 3; context.stroke(); }
}
function ellipse(x, y, rx, ry, fill, stroke, lineWidth = 3) {
  context.beginPath();
  context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) { context.fillStyle = fill; context.fill(); }
  if (stroke) { context.strokeStyle = stroke; context.lineWidth = lineWidth; context.stroke(); }
}
function line(points, color, width = 4) {
  context.beginPath();
  context.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) context.lineTo(points[i], points[i + 1]);
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.stroke();
}
function drawRoom(time) {
  if (journey.state?.phase === "festival") { drawFestival(time); return; }
  const water = context.createLinearGradient(0, 0, 0, 620);
  water.addColorStop(0, "#b7f5f7");
  water.addColorStop(0.4, "#84dce9");
  water.addColorStop(1, "#4cbbcf");
  context.fillStyle = water;
  context.fillRect(0, 0, 960, 620);
  // Light shafts and a sea view through a shell-shaped window.
  context.fillStyle = "#ffffff21";
  [[280, 0, 335, 560], [445, 0, 485, 620], [750, 0, 804, 550]].forEach(([x1, y1, x2, y2]) => {
    context.beginPath();
    context.moveTo(x1, y1); context.lineTo(x1 + 75, y1); context.lineTo(x2 + 100, y2); context.lineTo(x2, y2); context.fill();
  });
  roundedRect(22, 84, 916, 519, 30, "#a6eaf0", "#5399bc");
  roundedRect(45, 110, 870, 470, 18, "#75cddc");
  const floor = context.createLinearGradient(0, 126, 0, 590);
  floor.addColorStop(0, "#81d8de");
  floor.addColorStop(1, "#b9e3d4");
  context.fillStyle = floor;
  context.fillRect(48, 126, 864, 443);
  for (let i = 0; i < 4; i += 1) {
    context.beginPath();
    const y = 226 + i * 102;
    context.moveTo(50, y);
    context.quadraticCurveTo(480, y + 18, 910, y);
    context.strokeStyle = "#ffffff35";
    context.lineWidth = 5;
    context.stroke();
  }
  roundedRect(51, 113, 858, 23, 12, "#e6b8ef", "#956db4");
  roundedRect(48, 565, 864, 26, 14, "#e2b9ea", "#956db4");
  roundedRect(33, 114, 21, 465, 10, "#a792d5");
  roundedRect(906, 114, 21, 465, 10, "#a792d5");
  drawWindow(time);
  drawRoomDecor(time);
  for (let i = 0; i < 18; i += 1) {
    const bubble=art.roomBubble(i,time/1000);
    if(!bubble.alpha)continue;
    context.save();context.globalAlpha=bubble.alpha;
    ellipse(bubble.x,bubble.y,bubble.radius,bubble.radius,"#ffffff18","#eaffff66",1.5);
    context.restore();
  }
}
function drawWindow(time) {
  ellipse(483, 67, 105, 60, "#f5d2f2", "#916cb0", 6);
  ellipse(483, 67, 92, 49, "#73d9e5", "#ffffff", 5);
  ellipse(484, 73, 83, 38, "#5bc3d7");
  ellipse(535, 48, 18, 18, "#fff1b5");
  context.fillStyle = "#69bcae";
  context.beginPath(); context.moveTo(402, 93); context.quadraticCurveTo(445, 65, 486, 91); context.quadraticCurveTo(531, 64, 565, 96); context.fill();
  ellipse(442 + Math.sin(time / 900) * 5, 57, 7, 4, "#ffd0e4");
  ellipse(509 - Math.sin(time / 1000) * 6, 83, 8, 4, "#c1a8f7");
}
function drawRoomDecor(time) {
  // Hanging pearl strings and wall stars.
  [[132, 45], [230, 68], [714, 58], [814, 44]].forEach(([x, y], i) => {
    line([x, 0, x, y], "#e8fbff", 2);
    ellipse(x, y, 10, 10, ["#ffcbe6", "#fff4c1", "#b9f5ef", "#dcc5ff"][i], "#ffffff");
  });
  for (let i = 0; i < 11; i += 1) {
    const x = 83 + i * 77;
    const y = 280 + (i % 3) * 95;
    ellipse(x, y, 4, 4, "#fff8cc");
  }
  drawSeaweed(61, 489, 1, time);
  drawSeaweed(888, 510, 1.1, time);
  drawSeaweed(298, 523, .45, time);
  drawSeaweed(751, 526, .52, time);
  drawCoralCluster(70, 558, .8);
  drawCoralCluster(865, 561, .9);
  drawCoralCluster(365, 566, .38);
  drawCoralCluster(685, 566, .43);
  drawShellDecoration(405, 544, .75, "#ffe3a7");
  drawShellDecoration(580, 551, .58, "#ffb6db");
  drawShellDecoration(817, 552, .68, "#d5b9f3");
  drawStarfish(365, 545);
  drawStarfish(734, 557);
  [[350, 554, 20, 8], [382, 562, 13, 7], [753, 549, 21, 8], [777, 557, 14, 7]].forEach(([x, y, rx, ry]) => ellipse(x, y, rx, ry, "#a4b8dc", "#829aca", 2));
}
function drawShellDecoration(x, y, scale, color) {
  context.save(); context.translate(x, y); context.scale(scale, scale);
  context.beginPath();
  context.moveTo(-22, 14); context.quadraticCurveTo(-32, -15, 0, -24);
  context.quadraticCurveTo(32, -15, 22, 14); context.quadraticCurveTo(0, 25, -22, 14);
  context.fillStyle = color; context.fill();
  context.strokeStyle = "#af80b7"; context.lineWidth = 3; context.stroke();
  [-11, 0, 11].forEach((dx) => line([dx, -17, dx / 2, 16], "#fff8e7", 2));
  context.restore();
}
function drawStarfish(x, y) {
  context.save(); context.translate(x, y);
  context.fillStyle = "#ffca91";
  context.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    const radius = i % 2 ? 7 : 18;
    const px = Math.cos(angle) * radius, py = Math.sin(angle) * radius;
    if (i === 0) context.moveTo(px, py); else context.lineTo(px, py);
  }
  context.closePath(); context.fill();
  context.strokeStyle = "#dc899d"; context.lineWidth = 2; context.stroke();
  context.restore();
}
function drawSeaweed(x, y, scale, time) {
  context.save(); context.translate(x, y); context.scale(scale, scale);
  const sway = Math.sin(time / 700 + x) * 7;
  for (let i = -2; i <= 2; i += 1) {
    context.beginPath(); context.moveTo(i * 5, 69);
    context.quadraticCurveTo(i * 18 + sway, 15, i * 10 + sway, -30 - Math.abs(i) * 6);
    context.strokeStyle = i % 2 ? "#378ca3" : "#63c2ae";
    context.lineWidth = 11; context.lineCap = "round"; context.stroke();
  }
  ellipse(0, 69, 26, 9, "#a8b2d0"); context.restore();
}
function drawCoralCluster(x, y, scale) {
  context.save(); context.translate(x, y); context.scale(scale, scale);
  line([0, 0, 0, -76, -23, -103], "#f394ae", 14);
  line([0, -48, 22, -79, 29, -108], "#f394ae", 13);
  line([0, -20, -31, -56, -37, -78], "#f394ae", 12);
  line([2, -18, 38, -49, 47, -66], "#f394ae", 12);
  ellipse(0, 3, 45, 14, "#cc9bd9"); context.restore();
}
function drawFurniture(item, time) {
  if(item.id === "vanity") {drawWardrobe(item,time);return;}
  const { x, y, width, height } = item;
  if (item.id === "memory-shelf") {
    ellipse(x + width / 2, y + height, 110, 24, "#407eaa55");
    roundedRect(x + 8, y + 4, width - 16, height + 5, 35, "#d783bc", "#805b9e");
    roundedRect(x + 18, y + 14, width - 36, 30, 12, "#f8d9eb", "#b57aad");
    roundedRect(x + 18, y + 46, width - 36, 30, 12, "#f8d9eb", "#b57aad");
    // The shelf and memory book use the same earned entries, with no preview
    // objects. Draw after the furniture so collected icons remain visible.
    journey.memories.slice(-6).forEach((entry,index) => {
      art.canvasMemory(context,entry,x+34+(index%3)*56,y+33+Math.floor(index/3)*30,25);
    });
  } else if (item.id === "pearl-shelf") {
    roundedRect(x, y - 36, width, height + 39, 17, "#8b71b7", "#5d649d");
    roundedRect(x + 10, y - 24, width - 20, 30, 11, "#c1b0e8");
    roundedRect(x + 10, y + 14, width - 20, 32, 11, "#c1b0e8");
    art.canvasIcon(context,'bookshelf',x+width/2,y+4,90);
    if(learningOptions)return;
    for (let i = 0; i < 5; i += 1) {
      ellipse(x + 29 + i * 31, y - 7, 11, 11, ["#fff4c8", "#fcbadf", "#aaf1e3"][i % 3]);
      ellipse(x + 29 + i * 31, y + 36, 9, 9, ["#c9b3f2", "#fff4c8", "#fcbadf"][i % 3]);
    }
  } else if (item.id === "vanity") {
    roundedRect(x + 9, y + 20, width - 18, height + 18, 20, "#a876ba", "#655b9d");
    roundedRect(x, y + 10, width, 29, 14, "#f5b9dc", "#835fa2");
    ellipse(x + width / 2, y - 16, 43, 48, "#fce9fb", "#8b70b8", 7);
    ellipse(x + width / 2, y - 16, 33, 37, "#a8eaf0", "#ffffff");
    ellipse(x + 39, y + 26, 9, 9, "#fff1b8");
    ellipse(x + 109, y + 26, 8, 8, "#e3c3fb");
  } else if (item.id === "story-table") {
    ellipse(x + 73, y + 98, 113, 43, "#e5bbeb55");
    roundedRect(x + 64, y + 35, 17, 63, 6, "#946ca9");
    ellipse(x + 73, y + 37, 79, 40, "#b583c9", "#7d5f9d", 5);
    ellipse(x + 73, y + 27, 72, 32, "#f8cee9", "#ffffff", 4);
    if(!learningOptions||learningStoryUnlocked)drawBook(x + 72, y + 20, time);
  } else if (item.id === "anemone-pot") {
    ellipse(x + 33, y + 66, 40, 14, "#508ea355");
    for (let i = 0; i < 7; i += 1) {
      const dx = -25 + i * 8;
      context.beginPath();
      context.moveTo(x + 33 + dx / 2, y + 54);
      context.quadraticCurveTo(x + 34 + dx + Math.sin(time / 650 + i) * 5, y + 15, x + 33 + dx, y - 17 - i % 3 * 9);
      context.strokeStyle = i % 2 ? "#f499c8" : "#c48cdb";
      context.lineWidth = 10; context.lineCap = "round"; context.stroke();
    }
    roundedRect(x + 10, y + 46, 46, 28, 11, "#b9a1d6", "#7c70a6");
  }
}
function drawBook(x, y, time) {
  context.save(); context.translate(x, y + Math.sin(time / 470) * 2);
  context.shadowColor = "#fff7b5"; context.shadowBlur = 28;
  roundedRect(-49, -25, 98, 55, 9, "#fff4ca", "#915da7");
  context.shadowBlur = 0;
  line([0, -24, 0, 29], "#a46ab8", 3);
  line([-39, -6, -12, -6], "#d39bc5", 2);
  line([12, -6, 39, -6], "#d39bc5", 2);
  line([-35, 2, -17, 2], "#d39bc5", 2);
  line([17, 2, 35, 2], "#d39bc5", 2);
  ellipse(0, -27, 6, 6, "#ffe78d");
  context.fillStyle = "#fff9dd";
  context.font = "900 14px Trebuchet MS, sans-serif";
  context.textAlign = "center";
  context.fillText("STORYBOOK", 0, -46);
  ellipse(-58, -18, 3, 3, "#fff5a5");
  ellipse(60, -37, 4, 4, "#fff5a5");
  context.restore();
}
function drawJellyfish(time) {
  const bob = Math.sin(time / 420) * (player.moving ? 5 : 3);
  const pulse = 1 + Math.sin(time / (player.moving ? 190 : 400)) * .045;
  ellipse(player.x, player.y + 17, 24, 8, "#2c789661");
  const outfit=journey.outfit;
  if(outfit?.id.startsWith('sasak-')||outfit?.id.startsWith('hanfu-')){
    const image=wornJellyImage(outfit);
    if(image.complete&&image.naturalWidth){
      const scale=art.screenScale(canvas);
      context.save();context.translate(player.x,player.y-25+bob);
      context.scale(scale.unit/scale.x,scale.unit/scale.y);context.scale(pulse,1/pulse);
      const festival=journey.state?.phase==='festival';
      context.drawImage(image,festival?-58:-44,festival?-69:-55,festival?116:88,festival?133:101);
      if(learning?.speaking)ellipse(0,-7,2.6,3+Math.sin(time/85)**2*2,'#544770');
      context.restore();
      return;
    }
  }
  const scale=art.screenScale(canvas);
  context.save(); context.translate(player.x, player.y - 25 + bob); context.scale(1.17*scale.unit/scale.x, 1.17*scale.unit/scale.y);
  for (let i = -2; i <= 2; i += 1) {
    const x = i * 10;
    context.beginPath(); context.moveTo(x, 8);
    context.quadraticCurveTo(x + Math.sin(time / 320 + i) * 7, 25, x + Math.sin(time / 280 + i) * 6, 37 + (i % 2) * 4);
    context.strokeStyle = i % 2 ? "#c780d9" : "#e7a0ec";
    context.lineWidth = 6; context.lineCap = "round"; context.stroke();
  }
  context.scale(pulse, 1 / pulse);
  context.beginPath(); context.moveTo(-32, 6);
  context.bezierCurveTo(-34, -32, -18, -49, 0, -49);
  context.bezierCurveTo(22, -49, 37, -25, 32, 6);
  context.quadraticCurveTo(24, 16, 16, 9);
  context.quadraticCurveTo(8, 17, 0, 9);
  context.quadraticCurveTo(-9, 17, -16, 9);
  context.quadraticCurveTo(-25, 16, -32, 6);
  context.fillStyle = "#d59be9"; context.fill();
  context.strokeStyle = "#875baa"; context.lineWidth = 3; context.stroke();
  ellipse(-12, -9, 5, 4, "#ffbadb"); ellipse(13, -9, 5, 4, "#ffbadb");
  const lookX = player.facingX * 2;
  const lookY = player.facingY;
  ellipse(-10 + lookX, -15 + lookY, 2.8, 3.5, "#544770");
  ellipse(10 + lookX, -15 + lookY, 2.8, 3.5, "#544770");
  if(learning?.speaking) ellipse(lookX,-3+lookY,3.5,2+Math.sin(time/85)**2*2,'#544770');
  else {
   context.beginPath(); context.moveTo(-4 + lookX, -5 + lookY);
   context.quadraticCurveTo(0 + lookX, 1 + lookY, 4 + lookX, -5 + lookY);
   context.strokeStyle = "#544770"; context.lineWidth = 2; context.stroke();
  }
  ellipse(-19, -31, 11, 5, "#ffffff6b");
  context.restore();
  drawWornOutfit(time);
}
function draw() {
  const time = performance.now();
  drawRoom(time);
  drawStations(time);
  const drawables = furniture.map((item) => ({ depth: item.y + item.height, render: () => drawFurniture(item, time) }));
  if(journey.state?.phase==='room' && learning?.active)drawables.push({depth:0,render:()=>learning.draw(context,time,player)});
  if(journey.state?.phase === "festival") stations().filter(i=>i.kind==='treasure').forEach(item=>drawables.push({depth:item.y,render:()=>drawFestivalItem(item,time)}));
  drawables.push({ depth: player.y + player.radius, render: () => drawJellyfish(time) });
  drawables.sort((a, b) => a.depth - b.depth);
  drawables.forEach((drawable) => drawable.render());
}
function gameLoop(time) {
  const delta = Math.min((time - lastFrameTime) / 1000, .05);
  lastFrameTime = time;
  update(delta);
  draw();
  requestAnimationFrame(gameLoop);
}
updateHud();
updateInteraction();
draw();
requestAnimationFrame(gameLoop);

function drawWardrobe(item,time) {
 const {x,y,width,height}=item;
 ellipse(x+width/2,y+height+20,90,22,'#3e819733');
 roundedRect(x+7,y-43,width-14,height+65,20,'#c69dd6','#8966a7');
 roundedRect(x+18,y-31,width-36,height+42,12,'#e9c5ee','#a479b9');
 line([x+width/2,y-27,x+width/2,y+height+8],'#ae7fbb',4);
 ellipse(x+width/2-13,y+31,4,4,'#fff2bc');ellipse(x+width/2+13,y+31,4,4,'#fff2bc');
 stationLabel('WARDROBE',x+width/2,y-57);
}
function stationLabel(text,x,y) {
 const scale=art.screenScale(canvas);
 context.save();context.translate(x,y);context.scale(scale.unit/scale.x,scale.unit/scale.y);
 context.font='900 13px Trebuchet MS,sans-serif';context.textAlign='center';
 context.fillStyle='#fffef1';context.strokeStyle='#5d689b';context.lineWidth=3;
 context.strokeText(text,0,0);context.fillText(text,0,0);context.restore();
}
function drawStations(time) {
 if(journey.state?.phase === 'festival') return;
 stationLabel('LEARNING BOOKSHELF',180,161);
 if(journey.memories.length) stationLabel('MEMORY SHELF',179,347);
}
function drawWornOutfit(time) {
 const o=journey.outfit; if(!o||o.id.startsWith('sasak-')||o.id.startsWith('hanfu-')) return;
 const x=0,y=9,scale=art.screenScale(canvas);
 context.save();
 context.translate(player.x,player.y-25+Math.sin(time/420)*3);context.scale(scale.unit/scale.x,scale.unit/scale.y);
 context.fillStyle=o.colour;context.strokeStyle='#875baa';context.lineWidth=2;
 context.beginPath();context.moveTo(x-26,y);context.lineTo(x-31,y+28);context.quadraticCurveTo(x,y+41,x+31,y+28);context.lineTo(x+26,y);context.closePath();context.fill();context.stroke();
 line([x-24,y+25,x+24,y+25],o.accent,5);
 line([x-15,y+1,x+7,y+23],o.accent,3);line([x+15,y+1,x-7,y+23],o.accent,3);
 context.restore();
}
function drawFestivalNavigation(zone) {
 for(const portal of stations().filter(s=>s.kind==='portal')) {
  const path=journey.content.festivalNavigation?.[portal.id==='area-right'?'right':'left'];
  if(path) {
   if(!drawFestivalImage(path,portal.x,portal.y,86,80,undefined,true))
    stationLabel(portal.id==='area-right'?'→':'←',portal.x,portal.y+4);
  }
  else {
   roundedRect(portal.x-27,portal.y-32,54,62,12,'#fff0cd','#b394b8');
   stationLabel(portal.id==='area-right'?'→':'←',portal.x,portal.y+4);
  }
  stationLabel(portal.label,portal.x,portal.y+(path?62:53));
  if(portal.id==='area-right')stationLabel('MORE TO EXPLORE →',portal.x,portal.y-63);
 }
 stationLabel(`${journey.content.festival.toUpperCase()} · ${zone.name}`,480,185);
}
function drawFestival(time) {
 const chinese=journey.state.language==='chinese', area=journey.state.festivalArea||0, zone=journey.content.festivalAreas[area];
 if(zone.background) {
  const image=festivalImage(zone.background);
  if(image.complete&&image.naturalWidth>0) {
   const sourceRatio=image.naturalWidth/image.naturalHeight, canvasRatio=960/620;
   if(sourceRatio>canvasRatio) {
    const width=image.naturalHeight*canvasRatio;
    context.drawImage(image,(image.naturalWidth-width)/2,0,width,image.naturalHeight,0,0,960,620);
   } else {
    const height=image.naturalWidth/canvasRatio;
    context.drawImage(image,0,(image.naturalHeight-height)/2,image.naturalWidth,height,0,0,960,620);
   }
   drawFestivalNavigation(zone);
   return;
  }
  context.fillStyle='#fceacb';context.fillRect(0,0,960,620);
  drawFestivalNavigation(zone);
  return;
 }
 const g=context.createLinearGradient(0,0,0,620);g.addColorStop(0,chinese?'#7179b3':'#ffc6c1');g.addColorStop(1,chinese?'#d7c6e4':'#ffebce');context.fillStyle=g;context.fillRect(0,0,960,620);
 ellipse(780,95,48,48,'#fff3c8');
 for(let i=0;i<20;i++)ellipse(50+(i*157)%880,30+(i*71)%160,2,2,'#fff6cd');
 context.fillStyle=chinese?'#bad9d0':'#63c3d0';context.beginPath();context.moveTo(0,280);context.quadraticCurveTo(300,240,550,295);context.quadraticCurveTo(750,320,960,270);context.lineTo(960,620);context.lineTo(0,620);context.fill();
 if(!chinese){context.fillStyle='#f9dcc3';context.beginPath();context.moveTo(0,360);context.quadraticCurveTo(300,320,600,380);context.quadraticCurveTo(800,390,960,350);context.lineTo(960,620);context.lineTo(0,620);context.fill();
  for(let i=0;i<5;i++){context.beginPath();context.moveTo(0,280+i*15);context.quadraticCurveTo(480,260+i*15+Math.sin(time/800+i)*8,960,280+i*15);context.strokeStyle='#ffffff65';context.lineWidth=3;context.stroke();}}
 else {roundedRect(200,310,560,65,25,'#d4acbe','#a487b0');}
 if(zone.decor==='food') {
  roundedRect(580,280,165,65,12,'#e5b4d9','#a480ad');
  context.fillStyle='#fff0be';context.beginPath();context.moveTo(558,278);context.lineTo(768,278);context.lineTo(730,225);context.lineTo(595,225);context.closePath();context.fill();
  art.canvasIcon(context,chinese?'mooncake':'chicken',665,310,52);
 } else if(zone.decor==='music'||zone.decor==='lanterns') {
  roundedRect(200,295,220,55,15,'#ba9dd2','#9275ad');
  for(let i=0;i<3;i++)art.canvasIcon(context,chinese?'lantern':'drum',235+i*70,300,48);
 } else if(zone.decor==='harbour') {
  roundedRect(535,280,230,45,10,'#c6a5b2','#a27e98');
  art.canvasIcon(context,'boat',665,275,82);
 } else {
  for(let i=0;i<3;i++)art.canvasIcon(context,'rabbit',570+i*65,315,45);
  drawSeaweed(500,365,.5,time);
 }
 line([55,116,470,146,905,112],'#ae83b1',3);
 for(let i=0;i<7;i++) {const x=90+i*130;art.canvasIcon(context,chinese?'lantern':'star',x,150+Math.sin(time/900+i)*3,chinese?63:39);}
 drawFestivalNavigation(zone);
 drawSeaweed(75,560,.6,time);drawSeaweed(888,565,.5,time);
 for(const [x,y] of [[140,320],[845,340],[400,530]]) {
  ellipse(x,y,18,18,'#ffddb9','#c58f9e',2);roundedRect(x-20,y+18,40,44,15,'#c89ccf','#a57bac');
 }
}
function drawFestivalItem(item,time) {
 const bob=reducedMotion?.matches?0:Math.sin(time/400+item.x)*4;
 if(item.festivalImage) {
  const x=item.x,y=item.y+(item.festivalCenterOffset??-8)+bob;
  const chinese=journey.state?.language==='chinese';
  const screen=art.screenScale(canvas);
  context.save();
  context.beginPath();context.ellipse(x,y,48*screen.unit/screen.x,48*screen.unit/screen.y,0,0,Math.PI*2);
  context.fillStyle=chinese?'#f0e2ffbf':'#fff8dfb8';
  context.shadowColor=chinese?'#e7d1ff':'#fff4b8';context.shadowBlur=22;
  context.fill();
  context.shadowBlur=0;context.strokeStyle='#ffffffeb';context.lineWidth=3;
  context.stroke();context.restore();
  drawFestivalImage(item.festivalImage,x,y,item.festivalSize||82,item.festivalSize||78,item.festivalCrop,true);
  return;
 }
 ellipse(item.x,item.y+26,27,8,'#7274a133');
 ellipse(item.x,item.y-8+bob,41,41,'#fff8df66','#ffffffaa',2);
 art.canvasIcon(context,item.icon,item.x,item.y-8+bob,64);
 stationLabel(item.word||'?',item.x,item.y+57);
}
function configureChineseStage() {
 const stage=introElement('scene-stage'),original=stage.querySelector(':scope > svg:not(.chinese-scene)');
 original.toggleAttribute('hidden',journey.state.language==='chinese');
 stage.querySelector('.chinese-scene')?.remove();
 if(journey.state.language!=='chinese')return;
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.classList.add('chinese-scene');svg.setAttribute('viewBox','0 0 960 520');svg.setAttribute('role','group');svg.setAttribute('aria-label',chapters[pageIndex].title);
 const icon=(id,x,y,size)=>`<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">${art.svg(id).split('>').slice(1).join('>').replace(/<\/svg>$/,'')}</svg>`;
 const choice=(name,label,artwork)=>`<g class="chinese-scene-choice" data-chinese-choice="${name}" role="button" tabindex="-1" aria-disabled="true" aria-label="${label}">${artwork}</g>`;
 const family=(name,x,colour,label,interactive=false)=>{
  const drawing=`<ellipse cx="0" cy="445" rx="44" ry="12" fill="#75979d33"/><path d="M-33 354Q0 333 33 354L43 439H-43Z" fill="${colour}" stroke="#a382ac" stroke-width="3"/><circle cx="0" cy="328" r="30" fill="#f1c3a6" stroke="#b88a9e" stroke-width="3"/><path d="M-29 326Q-37 283 3 291Q34 290 29 319Q11 304-3 313Z" fill="#7b668f"/><circle cx="-10" cy="328" r="3" fill="#62517b"/><circle cx="10" cy="328" r="3" fill="#62517b"/><path d="M-7 342Q0 348 7 342" fill="none" stroke="#b27d98" stroke-width="2"/><path d="M-30 369L-46 395M30 369L46 395" stroke="#edbaa1" stroke-width="10" stroke-linecap="round"/>${interactive?`<g data-delivered="${name}" hidden>${icon('letter',14,372,45)}</g>`:''}`;
  return `<g data-family="${name}" transform="translate(${x} 0)">${interactive?choice(name,label,drawing):`<g data-story-explore="family" role="button" tabindex="-1" aria-label="Family member">${drawing}</g>`}</g>`;
 };
 const moon=icon('moon',688,47,124);
 const stars=`<g fill="#fff7d9">${Array.from({length:17},(_,i)=>`<circle cx="${40+i*53}" cy="${35+i*41%160}" r="${2+i%3}"/>`).join('')}</g>`;
 const starsTarget=pageIndex===0||pageIndex===3?choice('story-fish','Stars in the sky',stars):stars;
 const moonTarget=pageIndex===0?choice('story-shell','Moon',moon):`<g data-story-explore="moon" role="button" tabindex="-1" aria-label="Moon">${moon}</g>`;
 const rabbit=pageIndex===2?'':icon('rabbit',pageIndex===4?420:400,255,140);
 const rabbitTarget=pageIndex===4?choice('scene-boat','Rabbit lantern',`<path d="M490 239V269" stroke="#b69bbc" stroke-width="3"/>${rabbit}`):`<g data-story-explore="rabbit" role="button" tabindex="-1" aria-label="Moon rabbit">${rabbit}</g>`;
 const prop=pageIndex===2?choice('peace-ripple','Mooncake',icon('mooncake',625,327,95)):pageIndex===3?choice('nyale-target','Lantern',icon('lantern',625,327,95)):'';
 const familyScene=[1,2,3,4].includes(pageIndex)?family('prince-left',265,'#c5a3da','First family member',pageIndex===1)+family('prince-right',700,'#eab4cc','Second family member',pageIndex===1):'';
 const table=[2,4].includes(pageIndex)?`<g data-story-explore="table" role="button" tabindex="-1" aria-label="Family table"><ellipse cx="490" cy="447" rx="148" ry="23" fill="#75979d44"/><path d="M376 390Q490 370 604 390L591 421Q490 438 389 421Z" fill="#f7dcdd" stroke="#9e78a8" stroke-width="5"/><path d="M404 420V461M576 420V461" stroke="#9e78a8" stroke-width="13"/><ellipse cx="490" cy="390" rx="114" ry="28" fill="#fff0d9" stroke="#9e78a8" stroke-width="5"/>${pageIndex===4?icon('mooncake',460,351,57):''}</g>`:'';
 svg.innerHTML=`<defs><linearGradient id="moon-sky" x2="0" y2="1"><stop stop-color="#858cc5"/><stop offset="1" stop-color="#ddd1ec"/></linearGradient></defs><rect width="960" height="520" fill="url(#moon-sky)"/>${moonTarget}${starsTarget}<path d="M0 340Q200 285 430 340T960 320V520H0Z" fill="#a5cecd"/><path d="M0 441Q300 365 500 455T960 418V520H0Z" fill="#d4e4d4"/><path d="M30 310H225L205 265H60Z" fill="#a288b8"/><path d="M60 310V399M205 310V399" stroke="#a288b8" stroke-width="14"/><path d="M0 230Q480 280 960 225" stroke="#b195bd" stroke-width="3" fill="none"/><g data-moon-lanterns>${[90,290,480,680,875].map(x=>`<g data-story-explore="lantern" role="button" tabindex="-1" aria-label="Lantern">${icon('lantern',x-23,230,45)}</g>`).join('')}</g>${familyScene}${table}${pageIndex===2?`<ellipse cx="670" cy="419" rx="64" ry="17" fill="#fff0d9" stroke="#a382ac" stroke-width="3"/>`:''}<ellipse cx="486" cy="438" rx="93" ry="16" fill="#8daeb544"/><g data-moon-rabbit>${rabbitTarget}</g><g data-moon-prop>${prop}</g><text data-chinese-success hidden x="480" y="480" text-anchor="middle" font-size="24" fill="#855d98" font-family="Trebuchet MS">A little discovery, a lovely memory ♡</text>`;
 // These are the objects in the illustration itself, with keyboard semantics
 // and a glow during the interaction beat. No separate choice controls.
 let draggedMooncake=false,mooncakeDrag=null;
 const exploreMessages={moon:'The full moon shines above everyone at the festival.',rabbit:'This rabbit comes from our moon story.',lantern:'A lantern lights the garden path.',family:'A family member is ready to celebrate together.',table:'The family shares mooncakes at this table.'};
 const exploreObject=kind=>{const message=exploreMessages[kind];if(!message)return;introStatus(message);speakIntroHint(message);};
 svg.addEventListener('click',event=>{
  if(draggedMooncake){draggedMooncake=false;return;}
  const object=event.target.closest('[data-chinese-choice]');
  if(object?.getAttribute('aria-disabled')==='false')chooseIntroObject(object.dataset.chineseChoice);
  else {const decoration=event.target.closest('[data-story-explore]');if(decoration?.getAttribute('aria-disabled')==='false')exploreObject(decoration.dataset.storyExplore);}
 });
 svg.addEventListener('keydown',event=>{
  if(event.key!=='Enter'&&event.key!==' ')return;
  const object=event.target.closest('[data-chinese-choice]');
  if(object?.getAttribute('aria-disabled')==='false'){event.preventDefault();chooseIntroObject(object.dataset.chineseChoice);}
  else {const decoration=event.target.closest('[data-story-explore]');if(decoration?.getAttribute('aria-disabled')==='false'){event.preventDefault();exploreObject(decoration.dataset.storyExplore);}}
 });
 svg.addEventListener('pointerdown',event=>{
  const object=event.target.closest('[data-chinese-choice="peace-ripple"]');
  if(pageIndex!==2||object?.getAttribute('aria-disabled')!=='false')return;
  mooncakeDrag={object,x:event.clientX,y:event.clientY,dx:0,dy:0};svg.setPointerCapture?.(event.pointerId);
 });
 svg.addEventListener('pointermove',event=>{
  if(!mooncakeDrag)return;
  const rect=svg.getBoundingClientRect();
  mooncakeDrag.dx=(event.clientX-mooncakeDrag.x)*960/rect.width;
  mooncakeDrag.dy=(event.clientY-mooncakeDrag.y)*520/rect.height;
  if(Math.hypot(mooncakeDrag.dx,mooncakeDrag.dy)>10)
   mooncakeDrag.object.setAttribute('transform',`translate(${mooncakeDrag.dx} ${mooncakeDrag.dy})`);
 });
 svg.addEventListener('pointerup',()=>{
  if(!mooncakeDrag)return;
  const {object,dx,dy}=mooncakeDrag;mooncakeDrag=null;
  if(Math.hypot(dx,dy)<=10)return;
  draggedMooncake=true;setTimeout(()=>{draggedMooncake=false;},0);
  if(Math.hypot(672+dx-490,374+dy-390)<125){object.setAttribute('transform','translate(-182 16)');chooseIntroObject('peace-ripple');}
  else {object.removeAttribute('transform');introStatus('The family table is in the middle. Try bringing the mooncake there.');}
 });
 svg.addEventListener('pointercancel',()=>{mooncakeDrag?.object.removeAttribute('transform');mooncakeDrag=null;});
 stage.insertBefore(svg,stage.firstChild);syncChineseChoices();
}
function syncChineseChoices() {
 const svg=document.querySelector('.chinese-scene');if(!svg)return;
 svg.querySelectorAll('[data-chinese-choice]').forEach(object=>{
  const active=introState.active && introState.playing && introState.beat===3 && !introState.interactionDone && !introState.invitedPrinces.has(object.dataset.chineseChoice);
  object.setAttribute('tabindex',active?'0':'-1');object.setAttribute('aria-disabled',String(!active));object.classList.toggle('choice-active',active);
 });
 svg.querySelectorAll('[data-story-explore]').forEach(object=>{
  const active=introState.active&&introState.playing&&introState.beat===3&&!introState.interactionDone;
  object.setAttribute('tabindex',active?'0':'-1');object.setAttribute('aria-disabled',String(!active));
 });
 svg.querySelectorAll('[data-delivered]').forEach(item=>item.toggleAttribute('hidden',!introState.invitedPrinces.has(item.dataset.delivered)));
 svg.querySelector('[data-chinese-success]').toggleAttribute('hidden',!introState.interactionDone);
}
function chooseChineseObject(name) {
 if(pageIndex===1) {
  if(introState.invitedPrinces.has(name))return;
  introState.invitedPrinces.add(name);syncChineseChoices();
  if(introState.invitedPrinces.size<2){introStatus('One invitation delivered! Tap the other family member.');return;}
 } else if(name!==chapterChoiceIds[pageIndex][0]) {
  const message=pageIndex===0?'You found the stars twinkling beside the moon. Look around the night sky.':'You found a star beside the lantern. Look along the garden path.';
  introStatus(message);speakIntroHint(message);return;
 }
 completeIntroInteraction('Wonderful! You helped our story along.');syncChineseChoices();
}
function applyChineseVisual() {
 const svg=document.querySelector('.chinese-scene');if(!svg)return;
 const t=introState.totalTime,bob=Math.sin(t*2)*4;
 const travel=pageIndex===4&&introState.interactionDone?180*introEase((t-introState.reactionTime)/3):0;
 svg.querySelector('[data-moon-rabbit]').setAttribute('transform',`translate(${travel} ${-bob})`);
 svg.querySelector('[data-moon-prop]').setAttribute('transform',`translate(0 ${bob})`);
 svg.querySelector('[data-moon-lanterns]').setAttribute('transform',`translate(0 ${Math.sin(t)*2})`);
 svg.querySelectorAll('[data-family]').forEach((person,i)=>person.setAttribute('transform',`translate(${i===0?265:700} ${i===0?bob:-bob})`));
 syncChineseChoices();
}
// Read-along mode lets children advance narration at their own pace, while the
// chapter's interaction is still required before Next page unlocks.
const continueButton=introElement('scene-continue');
continueButton.addEventListener('click',()=>{
 if(!introState.active)return;
 if(introState.completed&&introState.beat===4){nextPage();return;}
 if(!introState.playing)toggleIntroPlayback();
 cancelIntroSpeech();storySaveError=false;introState.narrationDone=true;introState.elapsed=100;
});
window.OceanRoom={
 // Called by Person 3 after scripts and popup hosts are mounted. No wire events
 // or backend fields are assumed: adapter callbacks wrap the shared contract.
 configureLearning(options){
  if(!window.VocabularyGameplay)throw new Error('Load vocabulary gameplay modules before configuring the room.');
  learning?.destroy();learning=null;learningOptions=null;closeStory();clearMovement();learningStoryUnlocked=false;learningApproach=null;
  learning=window.VocabularyGameplay.create({...options,room:{
   clearMovement,
   geometry:learningGeometry, walkTo,
   isNear:item=>journey.state?.phase==='room'&&!journey.locked&&!roomLocked&&!storyOpen&&distance(player,item)<=item.radius
  }});
  const controller=learning;learningOptions=options;
  return {
   sync(view,{storyUnlocked=false}={}){
    if(learning!==controller)return;
    learningStoryUnlocked=storyUnlocked===true;
    if(!learningStoryUnlocked)closeStory();
    if(journey.state?.phase!=='room'){learning.stop();return;}
    const prior=learning.active;learning.sync(view);
    if(prior!==learning.active)clearMovement();
    if(!learning.active){learningApproach=null;canvas.style.cursor='';}
   },
   stop(){controller.stop();if(learning===controller)learningApproach=null;},
   destroy(){controller.destroy();if(learning===controller){learning=null;learningOptions=null;learningApproach=null;}},
   get controller(){return controller;}
  };
 },
 startStory(){openStory(true);},learningGeometry,
 lock(value){roomLocked=value;clearMovement();if(value)learning?.cancelNarration();},clearMovement,walkTo,closeStory,feedback:showFeedback,
 sync(next,prev){
  if(next.phase==='travelling'||next.phase==='festival')preloadFestivalArea(next.festivalArea||0);
  if(next.phase==='festival')preloadFestivalArea((next.festivalArea||0)+1);
  if(learning && (next.phase!=='room'||next.trip!==activeTrip)){canvas.style.cursor='';learning.stop();learningApproach=null;learningStoryUnlocked=false;}
  chapters=journey.content.chapters;storyChapterCount=chapters.length;
  if (storyOpen && (next.activeStoryId !== prev?.activeStoryId || next.storyPage < (prev?.storyPage || 0) || next.learning?.active)) closeStory();
  if(next.trip!==activeTrip) {
   activeTrip=next.trip;festivalApproach=null;areaPending=false;closeStory();pageIndex=0;introState.completedChapters=chapters.map((_,i)=>i<next.storyPage);
   player.x=486;player.y=408;clearMovement();storyProximityArmed=true;memoryProximityArmed=true;wardrobeProximityArmed=true;
  }
  if(next.phase!==activePhase){clearMovement();if(next.phase==='festival'){player.x=480;player.y=450;}activePhase=next.phase;}
  if(next.phase==='festival'&&prev?.phase==='festival'&&next.festivalArea!==prev.festivalArea){
   clearMovement();player.x=next.festivalArea>prev.festivalArea?140:820;player.y=450;festivalApproach=null;areaPending=false;
  }
  if(next.festivalMission!==prev?.festivalMission)festivalApproach=null;
  furniture=next.phase==='festival'?[]:roomFurniture.filter(item=>{
   if(item.id==='memory-shelf')return (next.memories?.length||0)+(next.bag?.length||0)>0;
   if(item.id==='vanity')return next.invited===true;
   if(item.id==='story-table')return next.learning?.storybookUnlocked===true||next.storyDone===true;
   return true;
  });
  introState.completedChapters=chapters.map((_,i)=>i<next.storyPage);
  updateInteraction();
 }
};
window.dispatchEvent(new Event('ocean-room-ready'));
})();
