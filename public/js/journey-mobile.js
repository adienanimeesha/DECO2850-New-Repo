(function () {
'use strict';
const socket = io({ auth: { journey: true } });
let state = null, selectedLanguage = null, activity = null, outfitChoice = null, activityFocus = null;
let collectedMemories = [];
let learningInterface = null, awaitingSnapshot = true, invitationWalkPending = false;

const $ = id => document.getElementById(id);
const art = window.OceanArt;
const content = () => { const track = window.JOURNEYS[state?.language || selectedLanguage || 'indonesian']; return window.JourneyLearning?.selectedContent(track,state) || track; };
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
 updateContinue();
}));
function updateContinue() {
 $('continue-adventure').hidden = !selectedLanguage || state?.language !== selectedLanguage;
 $('continue-adventure').disabled = !socket.connected;
}
$('start-adventure').addEventListener('click', () => { $('start-adventure').disabled = true; send('journey-start', {language:selectedLanguage,fresh:true}); });
$('continue-adventure').addEventListener('click', () => { $('continue-adventure').disabled = true; send('journey-start', selectedLanguage); });
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
 activity = null; $('activity-screen').hidden = true; stopAudio();
 window.OceanRoom?.clearMovement();
 window.OceanRoom?.lock(false);
 if (was === 'wardrobe') outfitChoice = null;
 (activityFocus?.isConnected ? activityFocus : $('game')).focus();
}
function wardrobeReady() {
 const progress=state?.stories?.find(item=>item.id===state.activeStoryId);
 const selected=window.JOURNEYS[state?.language]?.stories?.find(item=>item.id===state.activeStoryId);
 return state?.phase==='room' && state.storyDone && state.invited && (state.learning ? state.festivalId===selected?.festivalId : true) && (!state.learning || (progress?.completed && progress?.invited)) && !state.learning?.active;
}
function openActivity(type) {
 if (!['mail','wardrobe','memories','festival-feedback','festival-complete','exit'].includes(type)) return;
 if (!state || !['room','festival'].includes(state.phase)) return;
 if (state.learning?.active && type !== 'exit') return;
 if (type === 'wardrobe' && !wardrobeReady()) return;
 window.OceanRoom?.closeStory();
 if (!activity) activityFocus = document.activeElement;
 stopAudio(); activity = type; window.OceanRoom?.lock(true);
 $('activity-screen').hidden = false; renderActivity(); $('close-activity').focus();
}
function card(item) {
 return `<article class="memory-card"><div>${item.artwork ? `<img src="${item.artwork}" alt="${item.word}">` : art.svg(item.icon)}</div><strong>${item.word}</strong>${item.pronunciation ? `<small>${item.pronunciation}</small>` : ''}<span>${item.meaning}</span><small>${{story:'Storybook',learning:'Vocabulary',vocabulary:'Vocabulary',festival:'Festival'}[item.source] || 'Memory'} · ${window.JOURNEYS[item.language]?.shortLabel || ''}</small><button type="button" class="word-replay" data-word="${item.word}" data-lang="${item.language}" aria-label="Hear ${item.word}">Hear word ♫</button></article>`;
}
function renderActivity() {
 const c = content(), body = $('activity-body');
 const focused = document.activeElement, hadFocus = body.contains(focused);
 const focusId = focused?.id, focusAnswer = focused?.dataset.answer;
 if (activity === 'mail') {
  const ready = state.storyDone;
  body.innerHTML = `<p class="eyebrow">JELLY'S MAILBOX</p><div class="mail-art">${art.svg('letter')}</div><h2 id="activity-title">${ready ? 'You’re invited!' : 'A little patience…'}</h2>` +
   (ready ? `<p class="invitation-to">Dear Jelly & friend,</p><p>Come celebrate <strong>${c.festival}</strong> at ${c.place}! Bring your curiosity and your favourite festival outfit.</p><p class="invitation-sign">With love, your festival friends ♡</p><button class="primary" id="accept-invite">${state.invited ? 'Visit the wardrobe →' : 'Accept invitation →'}</button>` : `<p>Finish a cultural story to receive your festival invitation.</p><div class="checklist"><span>${state.storyDone ? '✓' : '○'} Cultural story</span></div>`);
  $('accept-invite')?.addEventListener('click', () => {
   closeActivity();
   if (wardrobeReady()) window.OceanRoom?.walkTo('wardrobe');
   else { invitationWalkPending=true; send('journey-invitation'); }
  });
 } else if (activity === 'wardrobe') {
  const selected = outfit();
  body.innerHTML = `<p class="eyebrow">THE PEARL WARDROBE</p><h2 id="activity-title">Dress for ${c.festival}</h2>` +
   (!state.invited ? `<div class="wardrobe-preview">${art.jelly()}</div><p>Your festival outfits unlock after you accept the invitation in the mailbox.</p>` :
   `<p>Try a colour on Jelly, then choose Done when you're ready.</p><div class="wardrobe-preview">${art.jelly(selected)}</div><div class="outfit-choices">${c.outfits.map(o => `<button type="button" data-outfit="${o.id}" aria-pressed="${selected?.id === o.id}"><span class="outfit-thumbnail">${art.clothing(o)}</span><strong>${o.name}</strong><small>${o.description}</small></button>`).join('')}</div><p class="small-note">Playful illustrations inspired by traditional clothing.</p><button class="primary" id="outfit-done" ${!state.outfit ? 'disabled' : ''}>Done · go to the festival →</button>`);
  body.querySelectorAll('[data-outfit]').forEach(b => b.addEventListener('click', () => { outfitChoice = b.dataset.outfit; send('journey-try-outfit', outfitChoice); renderActivity(); body.querySelector(`[data-outfit="${outfitChoice}"]`)?.focus(); }));
  $('outfit-done')?.addEventListener('click', () => { closeActivity(); send('journey-festival'); });
 } else if (activity === 'memories') {
  body.innerHTML = `<p class="eyebrow">LITTLE DISCOVERIES, BIG MEMORIES</p><h2 id="activity-title">My memory book</h2><p>Your learned words and collected items travel home with Jelly.</p><div class="memory-grid">${collectedMemories.map(card).join('') || '<p class="memory-empty">No discoveries yet. Words and items appear here after you earn them in vocabulary levels, stories, or festivals.</p>'}</div>`;
  body.querySelectorAll('.word-replay').forEach(b => b.addEventListener('click', () => speak(b.dataset.word,window.JOURNEYS[b.dataset.lang].speech)));
 } else if (activity === 'festival-feedback') {
  const item=c.festivalItems[state.festivalMission||0];
  body.innerHTML=`<p class="eyebrow">A LITTLE FESTIVAL DISCOVERY</p><div class="festival-discovery">${art.jelly(outfit())}${art.svg(item.icon)}</div><h2 id="activity-title">${item.thanks}</h2><p>${item.fact}</p><p class="small-note">${item.word} is now in your memory book.</p><button class="primary" id="festival-next">${state.festivalMission===c.festivalItems.length-1?'Finish our festival adventure':'Next mission →'}</button>`;
  $('festival-next').addEventListener('click',()=>{closeActivity();send('journey-next-festival');});
 } else if (activity === 'festival-complete') {
  body.innerHTML = `<p class="eyebrow">WHAT A BEAUTIFUL ADVENTURE</p><div class="wardrobe-preview">${art.jelly(outfit())}</div><h2 id="activity-title">Let’s take our memories home.</h2><p>You found all three festival keepsakes! Jelly will carry ${state.bag.length} discoveries to the aquarium.</p><button class="primary" id="take-home">Swim home to the aquarium →</button>`;
  $('take-home').addEventListener('click', () => { closeActivity(); send('journey-return'); });
 } else if (activity === 'exit') {
  body.innerHTML = `<p class="eyebrow">HOME, SWEET OCEAN</p><h2 id="activity-title">Bring Jelly home?</h2><p>Jelly will keep the outfit and bring ${state.bag.length} discoveries into the aquarium. Choose Continue adventure to keep this language’s discoveries, or Start new adventure for a clean beginning.</p><button class="primary" id="exit-confirm">Bring Jelly home →</button><button class="secondary" id="keep-playing">Keep exploring</button>`;
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
 const learning=state.learning||state.vocabularyLearning;
 if(state.phase==='festival') {
  step=5;
  const mission=state.festivalMission||0,item=c.festivalItems[mission],area=state.festivalArea||0;
  goal=item?item.request:'All festival missions complete! Swim home.';
  detail=item?`Festival mission ${mission+1} / ${c.festivalItems.length} · ${c.festivalAreas[area].name} · ${state.festivalFeedback?'Read Jelly’s thank-you, then continue.':area===item.area?'Walk to the matching object.':`Walk ${area<item.area?'right →':'left ←'} to ${c.festivalAreas[item.area].name}.`}`:'Bring your discoveries back to the aquarium.';
 } else if(state.invited) {
  step=4;goal=`Swim to the wardrobe and dress for ${c.festival}.`;detail='Try on an outfit, then press Done to travel.';
 } else if(state.storyDone) {
  step=3;goal='You have a festival invitation!';detail='Tap the envelope in the top-left corner to read it.';
 } else if(learning) {
  const levels=learning.levels||state.vocabularyLevels||[];
  const first=levels[0];
  const unlocked=learning.storybookUnlocked===true||learning.storyUnlocked===true||state.storyUnlocked===true||first?.completed===true||first?.status==='completed';
  const view=window.JourneyLearning?.presentation(state,c)||learning.presentation||learning.currentQuestion||state.vocabularyPresentation;
  if(view) {
   goal=`Learn ${view.question?.word || 'the new word'}.`;
   detail=`Level ${view.level} · Question ${(view.index ?? 0)+1} of 5 · Move Jelly to the matching object.`;
  } else if(unlocked) {
   goal='Swim to the storybook and choose a cultural story.';
   detail='The storybook opened after you completed Level 1.';
  } else {
   goal='Move your jellyfish towards the bookshelf to begin.';
   detail='Level 1 introduces the words you need for your first story.';
  }
 } else {
  goal=`Swim to the storybook and read ${c.storyTitle}.`;detail=`The book opens when you get close · ${state.storyPage} / 5 chapters complete.`;
 }
 $('mission-step').textContent=`MISSION ${step} OF 5`;
 $('objective').textContent=goal;$('mission-detail').textContent=detail;
 $('mission-progress').innerHTML=Array.from({length:5},(_,i)=>`<i class="${i+1<step?'complete':i+1===step?'current':''}"></i>`).join('');
 const mailReady=state.phase==='room'&&state.storyDone&&!state.learning?.active;
 $('mailbox-button').disabled=!mailReady;
 $('mailbox-button').hidden=state.phase==='festival';
 $('mailbox-button').classList.toggle('has-mail',mailReady&&!state.invited);
 $('mailbox-button').setAttribute('aria-label',mailReady?'Read your festival invitation':'Mailbox · finish a cultural story first');
 $('mail-badge').hidden=!mailReady||state.invited;
 $('festival-home').hidden=!(state.phase==='festival'&&(state.festivalFeedback||state.festivalMission===c.festivalItems.length));
 $('festival-home').textContent=state.festivalFeedback?'Read Jelly’s thank-you →':'All done! Swim home →';
}
const learningBackend = window.JourneyLearning?.create({socket,
 onError: message => { invitationWalkPending=false; window.OceanRoom?.feedback(message); }
});
function learningRequest(name, payload) {
 return learningBackend ? learningBackend.request(name, payload) : Promise.reject(new Error('Learning could not load. Please reload.'));
}
learningInterface=window.JellyLearningInterface?.create({
 action:learningRequest,
 getContent:value=>window.JOURNEYS[value?.language||selectedLanguage||'indonesian'],
 room:()=>window.OceanRoom
});
socket.on('connect', () => { updateContinue(); $('connection-status').textContent='Ocean connected'; $('connection-status').classList.add('online'); $('start-adventure').disabled=!selectedLanguage; });
socket.on('disconnect', () => { awaitingSnapshot=true; stopAudio(); learningInterface?.stop(); $('connection-status').textContent='Reconnecting…'; $('connection-status').classList.remove('online'); $('start-adventure').disabled=true; updateContinue(); });
socket.on('connect_error', () => { awaitingSnapshot=true; stopAudio(); learningInterface?.stop(); });
socket.on('journey-hint', message => { window.OceanRoom?.feedback(message); });
socket.on('journey-state', next => {
 if (!awaitingSnapshot && state && next.revision < state.revision) return;
 const prev = awaitingSnapshot ? null : state; awaitingSnapshot=false; state=next;
 if(next.language===null) {
  selectedLanguage=null;
  document.querySelectorAll('[data-language]').forEach(button=>button.setAttribute('aria-pressed','false'));
  $('start-adventure').disabled=true;
 } else if(next.phase==='aquarium') {
  // Keep the completed track selected so returning players can continue to
  // the optional levels without choosing their language again.
  selectedLanguage=next.language;
  document.querySelectorAll('[data-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.language===selectedLanguage)));
  $('start-adventure').disabled=!socket.connected;
 }
 collectedMemories = [...new Map([...next.memories, ...next.bag].map(item => [JSON.stringify([item.language,item.id]),item])).values()];
 if (!prev || prev.trip !== next.trip) outfitChoice=null;
 const c=content();
 if (!prev || prev.trip !== next.trip || prev.language !== next.language) {
  invitationWalkPending=false;art.clearMemoryCache();
  if (activity) closeActivity();
  window.OceanRoom?.closeStory();
 }
 if (activity === 'wardrobe' && !wardrobeReady()) closeActivity();
 updateContinue();
 if (activity === 'festival-feedback' && !next.festivalFeedback) closeActivity();
 if (next.learning?.active && activity && activity !== 'exit') closeActivity();
 $('language-screen').hidden=next.phase!=='aquarium';
 const travelling=['departing','travelling','returning'].includes(next.phase);
 $('travel-screen').hidden=!travelling;
 const titles={departing:'Jelly is swimming over…',travelling:`Next stop: ${c.festival}`,returning:'Bringing our memories home…'};
 $('travel-title').textContent=titles[next.phase] || '';
 $('travel-copy').textContent=next.phase==='travelling' ? c.festivalIntro : next.phase==='returning' ? 'Follow Jelly on the aquarium screen.' : 'From the aquarium to your little ocean home.';
 $('travel-jelly').innerHTML=art.jelly(outfit());
 $('welcome-return').textContent=next.mainAdventureCompleted && next.phase==='aquarium'
  ? `Welcome home, Jelly! You've unlocked Level 2! Continue the adventure to return to the common room and visit the bookshelf.`
  : next.memories.length ? `${next.memories.length} discoveries are waiting in your aquarium. Ready for another adventure?` : '';
 if (!['room','festival'].includes(next.phase)) { if (activity) closeActivity(); window.OceanRoom?.closeStory(); }
 window.OceanRoom?.sync(next,prev);
 learningInterface?.sync(next,prev);
 if (invitationWalkPending && wardrobeReady()) { invitationWalkPending=false; window.OceanRoom?.walkTo('wardrobe'); }
 updateMission();
 if (activity) renderActivity();
 if (prev && !prev.storyDone && next.storyDone) window.OceanRoom?.feedback('Story complete! You have mail in the top-left corner.',8000);
 if(next.phase==='festival'&&next.festivalFeedback&&activity!=='festival-feedback')openActivity('festival-feedback');
 if(next.phase==='festival'&&next.festivalMission===c.festivalItems.length&&(!prev||prev.festivalMission!==next.festivalMission))openActivity('festival-complete');
});
window.JellyJourney={get state(){return state;},get content(){return content();},get memories(){return collectedMemories;},get outfit(){return outfit();},get locked(){return !socket.connected||Boolean(activity)||Boolean(learningInterface?.activePopup)||Boolean(state?.festivalFeedback)||!state||!['room','festival'].includes(state.phase);},openActivity,send,speak,trapFocus,get wardrobeReady(){return wardrobeReady();},
 completeStoryPage(page) {
  if (learningBackend) return learningBackend.request('storyPage',{page});
  // Compatibility with older embedders that synchronously supply snapshots.
  send('journey-story-page',page);
  return state?.storyPage > page ? Promise.resolve() : Promise.reject(new Error('The page was not confirmed. Please try again.'));
 },
 openLearning:id=>learningInterface?.approach(id)};
window.addEventListener('ocean-room-ready', () => { if (state) { window.OceanRoom.sync(state,null); learningInterface?.sync(state,null); } updateMission(); });
})();
