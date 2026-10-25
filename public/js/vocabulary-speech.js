(function () {
'use strict';
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
function create({ onSpeaking = () => {}, onStatus = () => {} } = {}) {
 let generation = 0, audio = null, utterance = null, timer = null, listener = null;
 const synth = window.speechSynthesis;
 function clearWait() {
  clearTimeout(timer); timer = null;
  if (listener) synth?.removeEventListener?.('voiceschanged', listener);
  listener = null;
 }
 function cancel() {
  generation++; clearWait();
  if (audio) { audio.onplaying = audio.onpause = audio.onended = audio.onerror = null; audio.pause(); audio = null; }
  utterance = null;
  try { synth?.cancel(); } catch {}
  onSpeaking(false);
 }
 function play(parts) {
  cancel(); const token = generation; let index = 0, unavailable = false;
  const current = () => token === generation;
  function next() {
   if (!current()) return;
   clearWait(); onSpeaking(false);
   if (index >= parts.length) { if (!unavailable) onStatus(''); return; }
   const part = parts[index++];
   // A punctuation-only segment (for example, the visible closing ”?) must
   // never become a spoken "question mark" on some platform voices.
   if (!/[\p{L}\p{N}]/u.test(part.text)) { next(); return; }
   function missing() {
    unavailable = true;
    const language = part.lang === 'zh-CN' ? 'Mandarin' : part.lang === 'id-ID' ? 'Indonesian' : 'English';
    onStatus(`${language} playback unavailable. Install a ${language} voice in your device speech settings, then tap Replay narration.`);
    next();
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
     speech.onstart = () => { if (valid()) { clearWait(); onSpeaking(true); timer = setTimeout(() => { if (valid()) { ended = true; synth.cancel(); missing(); } }, Math.max(15000, part.text.length * 350)); } };
     speech.onend = () => { if (valid()) { ended = true; clearWait(); next(); } };
     speech.onerror = () => { if (valid()) { ended = true; clearWait(); missing(); } };
     timer = setTimeout(() => { if (valid()) { ended = true; synth.cancel(); missing(); } }, 5000);
     synth.speak(speech);
    } catch { clearWait(); missing(); }
   }
   let source;
   try { if (part.audio) { const url = new URL(part.audio, location.href); if (url.origin === location.origin) source = url.href; } } catch {}
   if (!source || !window.Audio) { synthetic(); return; }
   const recording = new Audio(source); audio = recording; let finished = false;
   const valid = () => current() && audio === recording && !finished;
   const fallback = () => { if (!valid()) return; finished = true; clearWait(); recording.pause(); audio = null; onSpeaking(false); synthetic(); };
   recording.onplaying = () => { if (valid()) { clearWait(); onSpeaking(true); timer = setTimeout(fallback, 120000); } };
   recording.onpause = () => { if (valid()) onSpeaking(false); };
   recording.onended = () => { if (valid()) { finished = true; audio = null; next(); } };
   recording.onerror = fallback;
   timer = setTimeout(fallback, 5000);
   try { recording.play()?.catch(fallback); } catch { fallback(); }
  }
  onStatus(''); next();
 }
 return { play, cancel };
}
window.VocabularySpeech = { create, voiceFor };
})();
