const journeys = require('./public/js/journey-content');
const guidance = require('./public/js/guidance-content');
const keyFor = (text, lang, role='jelly') => `${role==='narrator'?'narrator\n':''}${lang}\n${text.trim()}`;
function catalog() {
  const entries = new Map();
  function add(text, lang = 'en-US', mixed = false, role='jelly') {
    text = text.trim();
    if (/[\p{L}\p{N}]/u.test(text)) entries.set(keyFor(text, lang, role), {text, lang, mixed,...(role==='narrator'?{role}:{})});
  }
  for(const text of Object.values(guidance))add(text,'en-US',false,'narrator');
  for (const content of Object.values(journeys)) {
    for (const level of content.learningLevels) for (const q of level.questions) {
      add(q.sentenceBefore.replace(/[“"'‘\s]+$/u, ''));
      add(q.targetWord, content.speech);
      const feedback=guidance.vocabularyFeedback(q,content.speech==='zh-CN'?'chinese':'indonesian');
      add(feedback.narration,content.speech,true,'narrator');
      add(feedback.thankYou,content.speech,true);
      add(q.sentenceAfter.replace(/^[”"'’\s]+/u, '').replace(/[?.!\s]+$/u, ''));
    }
    add(content.learningRetryMessage,'en-US',false,'narrator');
    for (const story of content.stories) {
      for (const chapter of story.chapters) {
        add(chapter.prompt, content.speech, true);
        for (const beat of chapter.beats) add(beat.line,content.speech,true);
      }
      for (const reward of story.rewards) add(reward.word, content.speech);
    }
    for (const festival of content.festivals){
      add(guidance.wardrobe(festival.title),'en-US',false,'narrator');
      add(guidance.invitation(festival.title),'en-US',false,'narrator');
      for (const item of festival.items){
        add(item.word, content.speech);
        add(item.request,content.speech,true);
        add(guidance.festivalRequest(item,festival.areas[item.area]),content.speech,true,'narrator');
        add(guidance.festivalRetry(item),content.speech,true,'narrator');
        add(item.thanks,content.speech,true);
        add(item.fact,content.speech,true,'narrator');
      }
    }
  }
  for (const text of [
    'Good try! Look for the seashell near the path.',
    'Good try! The nyale is the colourful wiggling creature.'
  ]) add(text, 'id-ID', true,'narrator');
  for (const text of [
    'You found the stars. Look for the one bright sun Hou Yi left in the sky.',
    'You found a star beside the lantern. Look along the garden path.',
    'The full moon shines above everyone at the festival.',
    'This rabbit-shaped lantern reminds us of related tales about the Jade Rabbit. The extra discovery on the last page explains more.',
    'A lantern lights the garden path.',
    'A family member is ready to celebrate together.',
    'The family shares mooncakes at this table.'
  ]) add(text, 'zh-CN', true,'narrator');
  return [...entries.values()];
}
function spokenText(text) {
  text=guidance.spokenText(text);
  // Match the existing narrator: Hanzi is spoken once; displayed pinyin is not.
  for (const reward of journeys.chinese.storyRewards) {
    if (reward.pronunciation) text = text.replaceAll(`${reward.word}, ${reward.pronunciation},`, `${reward.word},`);
  }
  return text.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').trim();
}
// Keep native words out of English-language generations, including names and
// vocabulary embedded in praise, requests and story narration.
function speechSegments(clip) {
  const praise=clip.role==='narrator'&&clip.text.match(/^(Good job! You found [^!]+!)\s+([\s\S]+)$/);
  if(praise){const first=speechSegments({...clip,text:praise[1]});first[first.length-1].pauseAfterMs=650;return [...first,...speechSegments({...clip,text:praise[2]})];}

  const text=spokenText(clip.text);
  if(!clip.mixed)return [{text,lang:clip.lang}];
  if(clip.lang==='zh-CN')return text.split(/(\p{Script=Han}+)/u).filter(t=>/[\p{L}\p{N}]/u.test(t)).map(t=>({text:t.trim(),lang:/\p{Script=Han}/u.test(t)?'zh-CN':'en-US'}));
  const c=journeys.indonesian;
  const words=[...new Set(['Mandalika','Putri','Lombok','Sasak','Bau Nyale',...c.storyRewards.map(r=>r.word),...c.festivalItems.map(i=>i.word),...c.learningLevels.flatMap(l=>l.questions.map(q=>q.targetWord))])].sort((a,b)=>b.length-a.length);
  const pattern=new RegExp('\\b('+words.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')\\b','gi');
  return text.split(pattern).filter(t=>/[\p{L}\p{N}]/u.test(t)).map(t=>({text:t.trim(),lang:words.some(w=>w.toLowerCase()===t.trim().toLowerCase())?'id-ID':'en-US'}));
}
module.exports = {catalog, keyFor, spokenText, speechSegments};
