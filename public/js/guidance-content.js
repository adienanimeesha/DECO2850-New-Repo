(function(root){
'use strict';
const lines={
 memoryShelf:'Great job! Your first discovery is on the memory shelf! You can visit it anytime to look again at the items you’ve collected. Let’s find another word together!',
 bookshelf:'Let’s learn some new words! Move Jelly towards the bookshelf to begin.',
 levels:'Let’s practise together! Listen to a word, then swim to the picture you think matches. It’s okay to guess — Jelly will help if you need another try. Colour each object after you find it. Choose a level and press Start when you’re ready.',
 storybook:'Your storybook is ready! Swim toward the book to read it.',
 stories:'Choose a story. Revisit a favourite adventure or discover a story that is ready to play.',
 unlock:'You did it! You’ve unlocked the storybook! A new story is waiting for you. You can also try Level 2 at the bookshelf.',
 colouring:'Colour this word to continue your story adventure. Choose a colour and draw. Press Done when you are ready.',
 festivalIntro:'Welcome to the festival! Help Jelly find three special treasures. Swim to a glowing picture and tap it to take a look.',
 festivalComplete:'You found all three festival treasures! Well done! Help Jelly swim home to the aquarium with the new memories.',
};
const uses={book:'read my book',ball:'play',cup:'have a drink',chair:'sit down and rest',apple:'enjoy some fruit',table:'put my cup on the table',pencil:'draw a picture',bag:'carry my books',shoe:'put on my shoe',hat:'wear my hat',fish:'watch it swim',rabbit:'meet my fluffy friend',water:'fill my cup',rice:'enjoy my rice with vegetables',vegetables:'add some greens to my plate'};
Object.defineProperties(lines,{
 spokenText:{value:text=>text
  .replace(/\bMandalika['’]s (kingdom|wish|story|legend)\b/gi,(_match,noun)=>`the ${noun.toLowerCase()} of Mandalika`)
  .replace(/\bLombok['’]s traditional grilled chicken\b/gi,'traditional grilled chicken from Lombok')
  .replace(/\bLombok['’]s (coast|shore)\b/gi,(_match,noun)=>`the ${noun.toLowerCase()} of Lombok`)
 },
 vocabularyFeedback:{value:(question,language)=>{
  const word=question.targetWord,name=word.charAt(0).toUpperCase()+word.slice(1);
  const praise=`Good job! You found ${word}!`;
  const meaning=`${name} means ${question.translation} in ${language==='chinese'?'Mandarin Chinese':'Indonesian'}.`;
  const instruction='Let’s colour it for Jelly.';
  return{praise,meaning,instruction,
   narration:`${praise} ${meaning} ${instruction} Choose a colour and draw. Press Done when you’re ready.`,
   thankYou:`Thank you for giving me ${word}! Now I can ${uses[question.colouringAsset]||'enjoy my new discovery'}!`};
 }},
 vocabularyParts:{value:(text,word,language,role)=>{
  const praise=text.match(/^(Good job! You found [^!]+!)\s+([\s\S]+)$/);
  if(praise){const first=lines.vocabularyParts(praise[1],word,language,role);first[first.length-1].pauseAfterMs=650;return [...first,...lines.vocabularyParts(praise[2],word,language,role)];}
  const lang=language==='chinese'?'zh-CN':'id-ID';
  const pattern=language==='chinese'?/(\p{Script=Han}+)/u:new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'gi');
  return text.split(pattern).filter(t=>/[\p{L}\p{N}]/u.test(t)).map(t=>({text:t.trim(),lang:(language==='chinese'?/\p{Script=Han}/u.test(t):t.toLowerCase()===word.toLowerCase())?lang:'en-US',role}));
 }},
 festivalRequest:{value:(item,area)=>`Help Jelly find ${item.word} in the ${area.name}. Swim towards a glowing picture, then tap it.`},
 festivalRetry:{value:item=>`Good try! That’s a different picture. Let’s help Jelly find ${item.word}. Try another one!`},
 wardrobe:{value:festival=>`Help Jelly get ready for ${festival}. Choose an outfit, then press Done to join the festival!`},
 invitation:{value:festival=>`You’re invited to celebrate ${festival}! Help Jelly choose an outfit, then swim to the celebration.`},
 parts:{value:(text,content,role='narrator')=>{
  text=lines.spokenText(text);
  if(content.speech==='zh-CN')return text.split(/(\p{Script=Han}+)/u).filter(t=>/[\p{L}\p{N}]/u.test(t)).map(t=>({text:t.trim(),lang:/\p{Script=Han}/u.test(t)?'zh-CN':'en-US',role}));
  const words=content.festivalItems.map(item=>item.word).sort((a,b)=>b.length-a.length);
  const pattern=new RegExp(`(${words.map(word=>word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')})`,'gi');
  return text.split(pattern).filter(t=>/[\p{L}\p{N}]/u.test(t)).map(t=>({text:t.trim(),lang:words.some(word=>word.toLowerCase()===t.trim().toLowerCase())?'id-ID':'en-US',role}));
 }},
});
if(typeof module!=='undefined'&&module.exports)module.exports=lines;
else root.JellyGuidanceContent=lines;
})(typeof window!=='undefined'?window:globalThis);
