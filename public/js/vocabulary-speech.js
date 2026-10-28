(function () {
'use strict';
const recordings = new Map();
const recordingFor = (text, lang, role='jelly') => recordings.get(`${role==='narrator'?'narrator\n':''}${lang}\n${text.trim()}`);
let activeCancel=null;
if (window.fetch) window.fetch('/api/voice/manifest').then(response => response.ok ? response.json() : null).then(manifest => {
 if (!manifest?.clips) return;
 for (const [key, source] of Object.entries(manifest.clips)) {
  if (typeof source === 'string' && source.startsWith('/audio/elevenlabs/')) recordings.set(key, source);
  else if(Array.isArray(source)&&source.length&&source.every(p=>typeof p.text==='string'&&['en-US','id-ID','zh-CN'].includes(p.lang)&&typeof p.audio==='string'&&p.audio.startsWith('/audio/elevenlabs/')))recordings.set(key,source);
 }
}).catch(() => {});
// UI-only speech service. Audio URLs must be verified, same-origin recordings.
function voiceFor(voices, lang) {
 const code = v => String(v.lang || '').toLowerCase().replaceAll('_', '-');
 const name = v => String(v.name || '');
 if (lang === 'id-ID') {
  const candidates = voices.filter(v => /^(id|in)(-|$)/.test(code(v)));
  return candidates.find(v => /damayanti/i.test(name(v))) ||
   candidates.find(v => code(v) === 'id-id') || candidates[0];
 }
 if (lang === 'zh-CN') {
  const candidates = voices.filter(v => /^(zh|cmn)(-|$)/.test(code(v)) &&
   !/-(hk|mo)(-|$)/.test(code(v)) && !/canton|yue|粤|粵/i.test(name(v)));
  // macOS lists several English-persona multilingual voices before Tingting.
  // Prefer its dedicated Mandarin voice when it is installed.
  return candidates.find(v => /tingting/i.test(name(v))) ||
   candidates.find(v => /meijia/i.test(name(v))) ||
   candidates.find(v => /mandarin|putonghua|普通话|普通話/i.test(name(v))) ||
   candidates.find(v => code(v) === 'zh-cn') || candidates[0];
 }
 return voices.find(v => code(v) === 'en-us') || voices.find(v => /^en(-|$)/.test(code(v)));
}
function create({ onSpeaking = () => {}, onStatus = () => {},role='jelly' } = {}) {
 let speakingRole=role;
 const speaking=value=>{onSpeaking(value,speakingRole);if(value||!activeCancel||activeCancel===cancel)window.dispatchEvent(new CustomEvent('jelly-speech',{detail:{speaking:value,role:speakingRole}}));};
 let generation = 0, audio = null, utterance = null, timer = null, listener = null, paused = false, resumePlayback = null, cancelCallback=null;
 const synth = window.speechSynthesis;
 function clearWait() {
  clearTimeout(timer); timer = null;
  if (listener) synth?.removeEventListener?.('voiceschanged', listener);
  listener = null;
 }
 function cancel() {
  const cancelled=cancelCallback;cancelCallback=null;
  generation++; clearWait();paused=false;resumePlayback=null;
  if(activeCancel===cancel)activeCancel=null;
  if (audio) { audio.onplaying = audio.onpause = audio.onended = audio.onerror = null; audio.pause(); audio = null; }
  if(utterance)try { synth?.cancel(); } catch {}
  utterance = null;
  speaking(false);cancelled?.({cancelled:true});
 }
 function play(parts, {onComplete = () => {},onCancel = () => {}} = {}) {
  const playbackGroup={audio:null};
  if(activeCancel&&activeCancel!==cancel)activeCancel();
  cancel();try{synth?.cancel();}catch{}activeCancel=cancel; const token = generation; let index = 0, unavailable = false;cancelCallback=onCancel;
  const current = () => token === generation;
  function next() {
   if (!current()) return;
   if (paused) { resumePlayback=next; return; }
   clearWait(); speaking(false);
   if (index >= parts.length) { cancelCallback=null;if(activeCancel===cancel)activeCancel=null;if (!unavailable) onStatus(''); onComplete({unavailable}); return; }
   const part = {...parts[index++],playbackGroup};speakingRole=part.role||role;
   // A punctuation-only segment (for example, the visible closing ”?) must
   // never become a spoken "question mark" on some platform voices.
   if (!/[\p{L}\p{N}]/u.test(part.text)) { next(); return; }
   function advance(){if(part.pauseAfterMs){clearWait();speaking(false);timer=setTimeout(next,part.pauseAfterMs);}else next();}
   function missing() {
    unavailable = true;
    const language = part.lang === 'zh-CN' ? 'Mandarin' : part.lang === 'id-ID' ? 'Indonesian' : 'English';
    onStatus(`${language} playback unavailable. Install a ${language} voice in your device speech settings, then tap Replay narration.`);
    advance();
   }
   function synthetic(waited = false) {
    if (!current()) return;
    const voice = voiceFor(synth?.getVoices?.() || [], part.lang);
    if (!voice && synth && !waited) {
     listener = () => { if (current() && voiceFor(synth.getVoices(), part.lang)) { clearWait(); synthetic(true); } };
     synth.addEventListener?.('voiceschanged', listener);
     timer = setTimeout(() => { clearWait(); synthetic(true); }, 1000);
     return;
    }
    if (!voice || !window.SpeechSynthesisUtterance) { missing(); return; }
    try {
     const speech = new SpeechSynthesisUtterance(part.text); utterance = speech;
     speech.lang = part.lang; speech.voice = voice; speech.rate = part.lang === 'en-US' ? .88 : .82;
     let ended = false;
     const valid = () => current() && utterance === speech && !ended;
     speech.onstart = () => { if (valid()) { clearWait(); speaking(true); timer = setTimeout(() => { if (valid()) { ended = true; synth.cancel(); missing(); } }, Math.max(15000, part.text.length * 350)); } };
     speech.onend = () => { if (valid()) { ended = true;utterance=null; clearWait(); advance(); } };
     speech.onerror = () => { if (valid()) { ended = true;utterance=null; clearWait(); missing(); } };
     timer = setTimeout(() => { if (valid()) { ended = true; synth.cancel(); missing(); } }, 5000);
     synth.speak(speech);
    } catch { clearWait(); missing(); }
   }
   const saved=part.audio||recordingFor(part.text,part.lang,part.role||role);
   if(Array.isArray(saved)){parts.splice(index,0,...saved.map(p=>({...p,role:part.role||role,playbackGroup:part.playbackGroup})));next();return;}
   let source;
   try { const candidate=saved; if (candidate) { const url = new URL(candidate, location.href); if (url.origin === location.origin) source = url.href; } } catch {}
   if (!source || !window.Audio) { if(part.fallbackParts){parts.splice(index,0,...part.fallbackParts);next();}else synthetic(); return; }
   // Safari grants playback permission per media element. Reuse the element
   // when a mixed-language sentence advances to its next recording.
   const recording=part.playbackGroup?.audio||new Audio(source);
   if(part.playbackGroup){if(part.playbackGroup.audio){recording.onplaying=recording.onpause=recording.onended=recording.onerror=null;recording.src=source;}part.playbackGroup.audio=recording;}
   audio = recording; let finished = false;
   const valid = () => current() && audio === recording && !finished;
   const fallback = () => {
    if (!valid()) return;
    finished = true; clearWait(); recording.pause(); audio = null; speaking(false);
    if(part.fallbackParts){parts.splice(index,0,...part.fallbackParts);next();}
    else synthetic();
   };
   recording.onplaying = () => { if (valid()) { if(paused){recording.pause();return;} clearWait(); speaking(true); timer = setTimeout(fallback, 120000); } };
   recording.onpause = () => { if (valid()) speaking(false); };
   recording.onended = () => { if (valid()) { finished = true; audio = null; advance(); } };
   recording.onerror = fallback;
   timer = setTimeout(fallback, 60000);
   try { recording.play()?.catch(fallback); } catch { fallback(); }
  }
  onStatus(''); next();
 }
 function pause() {
  paused=true;
  if(audio){clearWait();audio.pause();speaking(false);}
  else if(utterance)synth?.pause?.();
 }
 function resume() {
  paused=false;
  if(resumePlayback){const next=resumePlayback;resumePlayback=null;next();}
  else if(audio){try{audio.play()?.catch(()=>audio?.onerror?.());}catch{audio?.onerror?.();}}
  else if(utterance)synth?.resume?.();
 }
 return { play, cancel, pause, resume };
}
window.VocabularySpeech = { create, voiceFor, recordingFor, cancelActive:()=>activeCancel?.() };
})();
