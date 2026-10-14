(function () {
'use strict';
const socket = io({ auth: { journey: true } });
let state = null, selectedLanguage = null, activity = null, outfitChoice = null, activityFocus = null;
let collectedMemories = [];
let rhymeSelection = null, rhymeSuccess = null;

const $ = id => document.getElementById(id);
const art = window.OceanArt;
const content = () => window.JOURNEYS[state?.language || selectedLanguage || 'indonesian'];
const send = (name, data) => { if (socket.connected) socket.emit(name, data); };
const outfit = () => content().outfits.find(x => x.id === (outfitChoice || state?.outfit));
$('welcome-jelly').innerHTML = art.jelly();
$('travel-jelly').innerHTML = art.jelly();
$('mailbox-icon').innerHTML=art.svg('letter');
$('mailbox-button').addEventListener('click',()=>openActivity('mail'));
$('festival-home').addEventListener('click',()=>openActivity(state?.festivalFeedback?'festival-feedback':'festival-complete'));
document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => {
 selectedLanguage = button.dataset.language;
 document.querySelectorAll('[data-language]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
 $('start-adventure').disabled = !socket.connected;
}));
$('start-adventure').addEventListener('click', () => { $('start-adventure').disabled = true; send('journey-start', selectedLanguage); });
$('return-early').addEventListener('click', () => openActivity('exit'));
$('close-activity').addEventListener('click', closeActivity);
$('activity-screen').addEventListener('pointerdown', e => { if (e.target === $('activity-screen')) closeActivity(); });
document.addEventListener('keydown', e => {
 if (e.key === 'Escape' && activity) { e.preventDefault(); closeActivity(); }
 if (e.key === 'Tab') {
  const modal = activity ? $('activity-screen') : (!$('language-screen').hidden ? $('language-screen') : null);
  if (modal) trapFocus(e, modal);
 }
});
function trapFocus(e, root) {
 const nodes = [...root.querySelectorAll('button:not(:disabled),a[href], [tabindex="0"]')].filter(n => !n.hidden && n.getClientRects().length);
 const first = nodes[0], last = nodes.at(-1);
 if (!first) return;
 if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
 else if (!e.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
}
function stopAudio() {
 window.speechSynthesis?.cancel();
 window.JellySong?.destroy();
 window.JellyColour?.close();
}
function speak(text, language = 'en-US') {
 window.speechSynthesis?.cancel();
 if (!('speechSynthesis' in window)) return;
 const speech = new SpeechSynthesisUtterance(text);
 speech.lang = language; speech.rate = .85;
 window.speechSynthesis.speak(speech);
}
function closeActivity() {
 const was = activity;
 rhymeSelection=null;rhymeSuccess=null;
 activity = null; $('activity-screen').hidden = true; stopAudio();
 window.OceanRoom?.clearMovement();
 window.OceanRoom?.lock(false);
 if (was === 'wardrobe') outfitChoice = null;
 (activityFocus?.isConnected ? activityFocus : $('game')).focus();
}
function openActivity(type) {
 if (!state || !['room','festival'].includes(state.phase)) return;
 window.OceanRoom?.closeStory();
 if (!activity) activityFocus = document.activeElement;
 stopAudio(); activity = type; window.OceanRoom?.lock(true);
 $('activity-screen').hidden = false; renderActivity(); $('close-activity').focus();
}
function card(item) {
 return `<article class="memory-card"><div>${item.artwork ? `<img src="${item.artwork}" alt="${item.word}">` : art.svg(item.icon)}</div><strong>${item.word}</strong>${item.pronunciation ? `<small>${item.pronunciation}</small>` : ''}<span>${item.meaning}</span><small>${{story:'Storybook',rhyme:'Nursery rhyme',festival:'Festival'}[item.source] || 'Memory'} · ${window.JOURNEYS[item.language]?.shortLabel || ''}</small><button type="button" class="word-replay" data-word="${item.word}" data-lang="${item.language}" aria-label="Hear ${item.word}">Hear word ♫</button></article>`;
}
function renderActivity() {
 const c = content(), body = $('activity-body');
 const focused = document.activeElement, hadFocus = body.contains(focused);
 const focusId = focused?.id, focusAnswer = focused?.dataset.answer;
 if (activity === 'rhyme') {
  const line=c.rhyme.lines[state.rhymeStep];
  if(rhymeSuccess) {
   window.JellySong.destroy();window.JellyColour.close();
   const earned=rhymeSuccess;
   body.innerHTML=`<p class="eyebrow">MISSION 2 · WELL DONE · ${state.rhymeStep} / 3</p><div class="rhyme-correct-mark" aria-hidden="true">✓</div><h2 id="activity-title">Correct!</h2><p>You found <strong lang="${state.language==='chinese'?'zh-CN':'id'}">${earned.word}</strong>!</p><img class="rhyme-earned-art" src="${earned.artwork}" alt="Your coloured object"><p>Your coloured object is now in your memory book.</p><button class="primary" id="rhyme-next" type="button">${state.rhymeDone?'Finish nursery rhyme →':'Next question →'}</button>`;
   $('rhyme-next').addEventListener('click',()=>{rhymeSuccess=null;renderActivity();$('activity-title').setAttribute('tabindex','-1');$('activity-title').focus();});
  } else if(state.rhymeDone) {
   window.JellySong.destroy();window.JellyColour.close();
   body.innerHTML=`<p class="eyebrow">MISSION 2 · NURSERY RHYME</p><h2 id="activity-title">${c.rhyme.title}</h2><div class="completion-note">Three new words and your coloured objects are in the memory shelf!</div><button class="primary" id="rhyme-done" type="button">Back to the common room →</button>`;
   $('rhyme-done').addEventListener('click',closeActivity);
  } else if(!state.rhymeListened) {
   if(!body.querySelector('.song-video')) {
    body.innerHTML=`<p class="eyebrow">MISSION 2 · LISTEN & SING</p><h2 id="activity-title">${c.rhyme.title}</h2><p>Listen to the whole song and sing along. Questions appear when it finishes.</p><div id="song-slot"></div><p class="song-status" id="song-status" role="status">Press play in the video.</p><p class="song-source"><a id="external-song" href="https://www.youtube.com/watch?v=${c.rhyme.videoId}" target="_blank" rel="noopener">Watch on YouTube ↗</a> · ${c.rhyme.channel}</p><button class="secondary" id="song-external-done" type="button" hidden>I finished the song on YouTube →</button>`;
    const trip=state.trip;
    window.JellySong.mount($('song-slot'),c.rhyme,{
     onEnded(){if(activity==='rhyme'&&state.trip===trip)send('journey-rhyme-listened');},
     onUnavailable(){if(activity==='rhyme'&&state.trip===trip)$('song-external-done').hidden=false;}
    });
    $('song-external-done').addEventListener('click',()=>send('journey-rhyme-listened'));
   }
  } else if(rhymeSelection) {
   window.JellySong.destroy();
   if(!body.querySelector('#rhyme-paint')) {
    body.innerHTML=`<p class="eyebrow">MISSION 2 · COLOUR · ${state.rhymeStep+1} / 3</p><h2 id="activity-title">Colour your object</h2><div id="rhyme-colouring"></div><button class="secondary" id="change-rhyme-object" type="button">Choose another object</button>`;
    const selection=rhymeSelection,trip=state.trip,step=state.rhymeStep;
    window.JellyColour.mount($('rhyme-colouring'),selection,artwork=>{
     if(activity==='rhyme'&&state.trip===trip&&state.rhymeStep===step)send('journey-rhyme-answer',{icon:selection,artwork});
    });
    $('change-rhyme-object').addEventListener('click',()=>{rhymeSelection=null;window.JellyColour.close();renderActivity();});
   }
  } else {
   window.JellySong.destroy();window.JellyColour.close();
   body.innerHTML=`<p class="eyebrow">MISSION 2 · FIND & COLOUR · ${state.rhymeStep+1} / 3</p><h2 id="activity-title">What is <span lang="${state.language==='chinese'?'zh-CN':'id'}">${line.word}</span>?</h2><p id="rhyme-status" role="status">Choose an object, then colour it.</p><div class="rhyme-choices">${c.rhyme.lines.map(item=>`<button type="button" data-answer="${item.icon}" aria-label="${item.meaning}">${art.outline(item.icon)}</button>`).join('')}</div>`;
   body.querySelectorAll('[data-answer]').forEach(button=>button.addEventListener('click',()=>{rhymeSelection=button.dataset.answer;renderActivity();$('close-activity').focus();}));
  }
 } else if (activity === 'mail') {
  const ready = state.storyDone && state.rhymeDone;
  body.innerHTML = `<p class="eyebrow">JELLY'S MAILBOX</p><div class="mail-art">${art.svg('letter')}</div><h2 id="activity-title">${ready ? 'You’re invited!' : 'A little patience…'}</h2>` +
   (ready ? `<p class="invitation-to">Dear Jelly & friend,</p><p>Come celebrate <strong>${c.festival}</strong> at ${c.place}! Bring your curiosity and your favourite festival outfit.</p><p class="invitation-sign">With love, your festival friends ♡</p><button class="primary" id="accept-invite">${state.invited ? 'Visit the wardrobe →' : 'Accept invitation →'}</button>` : `<p>Finish the storybook and nursery rhyme to receive your festival invitation.</p><div class="checklist"><span>${state.storyDone ? '✓' : '○'} Cultural story</span><span>${state.rhymeDone ? '✓' : '○'} Nursery rhyme</span></div>`);
  $('accept-invite')?.addEventListener('click', () => { send('journey-invitation'); closeActivity(); window.OceanRoom?.walkTo('wardrobe'); });
 } else if (activity === 'wardrobe') {
  const selected = outfit();
  body.innerHTML = `<p class="eyebrow">THE PEARL WARDROBE</p><h2 id="activity-title">Dress for ${c.festival}</h2>` +
   (!state.invited ? `<div class="wardrobe-preview">${art.jelly()}</div><p>Your festival outfits unlock after you accept the invitation in the mailbox.</p>` :
   `<p>Try a colour on Jelly, then choose Done when you're ready.</p><div class="wardrobe-preview">${art.jelly(selected)}</div><div class="outfit-choices">${c.outfits.map(o => `<button type="button" data-outfit="${o.id}" aria-pressed="${selected?.id === o.id}"><span class="outfit-thumbnail">${art.clothing(o)}</span><strong>${o.name}</strong><small>${o.description}</small></button>`).join('')}</div><p class="small-note">Playful illustrations inspired by traditional clothing.</p><button class="primary" id="outfit-done" ${!state.outfit ? 'disabled' : ''}>Done · go to the festival →</button>`);
  body.querySelectorAll('[data-outfit]').forEach(b => b.addEventListener('click', () => { outfitChoice = b.dataset.outfit; send('journey-try-outfit', outfitChoice); renderActivity(); body.querySelector(`[data-outfit="${outfitChoice}"]`)?.focus(); }));
  $('outfit-done')?.addEventListener('click', () => { closeActivity(); send('journey-festival'); });
 } else if (activity === 'memories') {
  body.innerHTML = `<p class="eyebrow">LITTLE DISCOVERIES, BIG MEMORIES</p><h2 id="activity-title">My memory book</h2><p>Your learned words and collected items travel home with Jelly.</p><div class="memory-grid">${collectedMemories.map(card).join('') || '<p class="memory-empty">No discoveries yet. Words and items appear here after you earn them in a story, song, or festival.</p>'}</div>`;
  body.querySelectorAll('.word-replay').forEach(b => b.addEventListener('click', () => speak(b.dataset.word,window.JOURNEYS[b.dataset.lang].speech)));
 } else if (activity === 'festival-feedback') {
  const item=c.festivalItems[state.festivalMission||0];
  body.innerHTML=`<p class="eyebrow">A LITTLE FESTIVAL DISCOVERY</p><div class="festival-discovery">${art.jelly(outfit())}${art.svg(item.icon)}</div><h2 id="activity-title">${item.thanks}</h2><p>${item.fact}</p><p class="small-note">${item.word} is now in your memory book.</p><button class="primary" id="festival-next">${state.festivalMission===c.festivalItems.length-1?'Finish our festival adventure':'Next mission →'}</button>`;
  $('festival-next').addEventListener('click',()=>{closeActivity();send('journey-next-festival');});
 } else if (activity === 'festival-complete') {
  body.innerHTML = `<p class="eyebrow">WHAT A BEAUTIFUL ADVENTURE</p><div class="wardrobe-preview">${art.jelly(outfit())}</div><h2 id="activity-title">Let’s take our memories home.</h2><p>You found all three festival keepsakes! Jelly will carry ${state.bag.length} discoveries to the aquarium.</p><button class="primary" id="take-home">Swim home to the aquarium →</button>`;
  $('take-home').addEventListener('click', () => { closeActivity(); send('journey-return'); });
 } else if (activity === 'exit') {
  body.innerHTML = `<p class="eyebrow">HOME, SWEET OCEAN</p><h2 id="activity-title">Bring Jelly home?</h2><p>Jelly will keep the outfit and bring ${state.bag.length} discoveries into the aquarium. Starting a new adventure will clear them and begin from the start.</p><button class="primary" id="exit-confirm">Bring Jelly home →</button><button class="secondary" id="keep-playing">Keep exploring</button>`;
  $('exit-confirm').addEventListener('click', () => { closeActivity(); send('journey-exit'); });
  $('keep-playing').addEventListener('click', closeActivity);
 }
 if (hadFocus) {
  const target = (focusId && $(focusId)) || (focusAnswer && body.querySelector(`[data-answer="${focusAnswer}"]`));
  (target && !target.disabled ? target : $('close-activity')).focus();
 }
}
function updateMission() {
 if(!state)return;
 const c=content();let step=1,goal='',detail='';
 if(state.phase==='festival') {
  step=5;
  const mission=state.festivalMission||0,item=c.festivalItems[mission],area=state.festivalArea||0;
  goal=item?item.request:'All festival missions complete! Swim home.';
  detail=item?`Festival mission ${mission+1} / ${c.festivalItems.length} · ${c.festivalAreas[area].name} · ${state.festivalFeedback?'Read Jelly’s thank-you, then continue.':area===item.area?'Walk to the matching object.':`Walk ${area<item.area?'right →':'left ←'} to ${c.festivalAreas[item.area].name}.`}`:'Bring your discoveries back to the aquarium.';
 } else if(state.invited) {
  step=4;goal=`Swim to the wardrobe and dress for ${c.festival}.`;detail='Try on an outfit, then press Done to travel.';
 } else if(state.storyDone&&state.rhymeDone) {
  step=3;goal='You have a festival invitation!';detail='Tap the envelope in the top-left corner to read it.';
 } else if(state.storyDone) {
  step=2;goal='Swim to the coral radio and sing along.';detail=state.rhymeListened?`Choose and colour 3 objects · ${state.rhymeStep} / 3 done.`:'Listen to the whole song, then find and colour the objects.';
 } else {
  goal=`Swim to the storybook and read ${c.storyTitle}.`;detail=`The book opens when you get close · ${state.storyPage} / 5 chapters complete.`;
 }
 $('mission-step').textContent=`MISSION ${step} OF 5`;
 $('objective').textContent=goal;$('mission-detail').textContent=detail;
 $('mission-progress').innerHTML=Array.from({length:5},(_,i)=>`<i class="${i+1<step?'complete':i+1===step?'current':''}"></i>`).join('');
 const mailReady=state.phase==='room'&&state.storyDone&&state.rhymeDone;
 $('mailbox-button').disabled=!mailReady;
 $('mailbox-button').hidden=state.phase==='festival';
 $('mailbox-button').classList.toggle('has-mail',mailReady&&!state.invited);
 $('mailbox-button').setAttribute('aria-label',mailReady?'Read your festival invitation':'Mailbox · finish the story and song first');
 $('mail-badge').hidden=!mailReady||state.invited;
 $('festival-home').hidden=!(state.phase==='festival'&&(state.festivalFeedback||state.festivalMission===c.festivalItems.length));
 $('festival-home').textContent=state.festivalFeedback?'Read Jelly’s thank-you →':'All done! Swim home →';
}
socket.on('connect', () => { $('connection-status').textContent='Ocean connected'; $('connection-status').classList.add('online'); $('start-adventure').disabled=!selectedLanguage; });
socket.on('disconnect', () => { stopAudio(); $('connection-status').textContent='Reconnecting…'; $('connection-status').classList.remove('online'); $('start-adventure').disabled=true; });
socket.on('journey-hint', message => { window.OceanRoom?.feedback(message); if(activity==='rhyme'){rhymeSelection=null;window.JellyColour.close();renderActivity();if($('rhyme-status'))$('rhyme-status').textContent=message;} });
socket.on('journey-state', next => {
 const prev = state; state=next;
 if(!prev||prev.trip!==next.trip)rhymeSuccess=null;
 else if(activity==='rhyme'&&next.phase==='room'&&next.rhymeStep>prev.rhymeStep){
  const line=window.JOURNEYS[next.language].rhyme.lines[next.rhymeStep-1];
  rhymeSuccess=next.bag.find(item=>item.id==='rhyme-'+line.icon)||null;
 }
 if(!prev||prev.trip!==next.trip||prev.rhymeStep!==next.rhymeStep){rhymeSelection=null;window.JellyColour?.close();}
 if(next.language===null || (next.phase==='aquarium' && prev?.phase!=='aquarium')) {
  selectedLanguage=null;
  document.querySelectorAll('[data-language]').forEach(button=>button.setAttribute('aria-pressed','false'));
  $('start-adventure').disabled=true;
 }
 collectedMemories = [...new Map([...next.memories, ...next.bag].map(item => [JSON.stringify([item.language,item.id]),item])).values()];
 if (!prev || prev.trip !== next.trip) outfitChoice=null;
 const c=content();
 $('language-screen').hidden=next.phase!=='aquarium';
 const travelling=['departing','travelling','returning'].includes(next.phase);
 $('travel-screen').hidden=!travelling;
 const titles={departing:'Jelly is swimming over…',travelling:`Next stop: ${c.festival}`,returning:'Bringing our memories home…'};
 $('travel-title').textContent=titles[next.phase] || '';
 $('travel-copy').textContent=next.phase==='travelling' ? c.festivalIntro : next.phase==='returning' ? 'Follow Jelly on the aquarium screen.' : 'From the aquarium to your little ocean home.';
 $('travel-jelly').innerHTML=art.jelly(outfit());
 $('welcome-return').textContent=next.memories.length ? `${next.memories.length} discoveries are waiting in your aquarium. Ready for another adventure?` : '';
 if (!['room','festival'].includes(next.phase)) { if (activity) closeActivity(); window.OceanRoom?.closeStory(); }
 window.OceanRoom?.sync(next,prev);
 updateMission();
 if (activity) renderActivity();
 if (prev && !prev.storyDone && next.storyDone) window.OceanRoom?.feedback('Story complete! Your new words are in your memory book.');
 if (prev && !prev.rhymeDone && next.rhymeDone) window.OceanRoom?.feedback('Beautiful singing! Your nursery rhyme is complete.');
 if (prev && !(prev.storyDone&&prev.rhymeDone) && next.storyDone&&next.rhymeDone) window.OceanRoom?.feedback('You have mail! Tap the envelope in the top-left corner.',8000);
 if(next.phase==='festival'&&next.festivalFeedback&&activity!=='festival-feedback')openActivity('festival-feedback');
 if(next.phase==='festival'&&next.festivalMission===c.festivalItems.length&&(!prev||prev.festivalMission!==next.festivalMission))openActivity('festival-complete');
});
window.JellyJourney={get state(){return state;},get content(){return content();},get memories(){return collectedMemories;},get outfit(){return outfit();},get locked(){return !socket.connected||Boolean(activity)||Boolean(state?.festivalFeedback)||!state||!['room','festival'].includes(state.phase);},openActivity,send,speak,trapFocus};
window.addEventListener('ocean-room-ready', () => { if (state) window.OceanRoom.sync(state,null); updateMission(); });
})();
