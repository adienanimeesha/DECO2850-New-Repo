// Shared content: the server owns progress; both screens use these descriptions.
(function (root) {
"use strict";
const mandalika = [
  {
    title: "The Kind Princess", prompt: "Tap the seashell beside the path 🐚",
    beats: [
      { label: "The kingdom", line: "Once upon a time, in a Sasak legend from Lombok, we meet a kind princess named Mandalika.", minSeconds: 4 },
      { label: "Mandalika arrives", line: "Here comes Putri Mandalika. Putri means princess in Indonesian. She walks through her home with a warm smile.", minSeconds: 5 },
      { label: "A kind greeting", line: "Mandalika cared for her community. She greeted her neighbours and listened when they spoke.", minSeconds: 5 },
      { label: "Your turn", line: "Can you help me find the seashell beside the path? Tap it to join our story.", minSeconds: 3 },
      { label: "A new word", line: "You found it! Kerang means seashell in Indonesian. Thank you for exploring with me. Let's see what happens next.", minSeconds: 4 },
    ],
  },
  {
    title: "A Difficult Choice", prompt: "Tap both princes to share the invitation ✉️",
    beats: [
      { label: "Visitors arrive", line: "Several princes came to Mandalika's kingdom. Each hoped to marry her, and they began to disagree.", minSeconds: 4 },
      { label: "A disagreement", line: "The princes spoke over one another. Mandalika listened, but she worried their rivalry could hurt the peace of her community.", minSeconds: 5 },
      { label: "A thoughtful plan", line: "Mandalika invited everyone to meet at the coast. She wanted to speak to all the people together.", minSeconds: 5 },
      { label: "Your turn", line: "Will you help me share the invitation? Tap each prince so both know where to meet.", minSeconds: 3 },
      { label: "An invitation", line: "Thank you! Undangan means invitation in Indonesian. Now everyone can travel to the coast and listen to Mandalika.", minSeconds: 4 },
    ],
  },
  {
    title: "The Gathering at the Sea", prompt: "Tap the glowing water to send a peaceful ripple 🌊",
    beats: [
      { label: "Toward the coast", line: "The people travelled toward the shore. The sea sparkled as the crowd gathered on Lombok's coast.", minSeconds: 4 },
      { label: "Everyone listens", line: "Mandalika stood before the people. The princes and neighbours quieted down to hear her words.", minSeconds: 5 },
      { label: "A wish for peace", line: "She said she cared for everyone and wished for peace among them. Her choice was her own.", minSeconds: 5 },
      { label: "Your turn", line: "Let's send a peaceful ripple across the sea. Tap the glowing water beside the crowd.", minSeconds: 3 },
      { label: "Peace", line: "Beautiful! Damai means peace in Indonesian. Mandalika's wish for harmony is an important part of this legend.", minSeconds: 4 },
    ],
  },
  {
    title: "The Legend of the Nyale", prompt: "Tap the colourful nyale swimming in the water ✨",
    beats: [
      { label: "A legendary moment", line: "In the traditional legend, Mandalika stepped toward the sea. Soft waves and mist surrounded her.", minSeconds: 4 },
      { label: "The sea holds a mystery", line: "She disappeared beneath the waves. The people looked for her, but could not find her.", minSeconds: 5 },
      { label: "Colours in the water", line: "Soon, many colourful nyale appeared in the sea. In the legend, people connect the nyale with Mandalika.", minSeconds: 5 },
      { label: "Your turn", line: "Can you find a nyale? Tap the colourful wiggling sea creature, not the fish.", minSeconds: 3 },
      { label: "A story remembered", line: "You found the nyale! Nyale is a Sasak name for these sea worms. This is a legend, and the nyale are real animals.", minSeconds: 4 },
    ],
  },
  {
    title: "Bau Nyale Festival", prompt: "Tap the boat to join the coastal celebration ⛵",
    beats: [
      { label: "Today in Lombok", line: "Now our story moves from legend to life today. People in Lombok gather on the coast for Bau Nyale.", minSeconds: 4 },
      { label: "A community gathering", line: "Families come together by the sea. They remember Mandalika's story and watch for the seasonal nyale.", minSeconds: 5 },
      { label: "The festival", line: "Boats glide nearby, and people share the celebration. Bau Nyale is a living Sasak tradition.", minSeconds: 5 },
      { label: "Your turn", line: "Can you help the little boat join the celebration? Tap it and watch it sail past the shore.", minSeconds: 3 },
      { label: "Our story ends", line: "Wonderful! In Sasak, bau means catch. Bau Nyale remembers Mandalika's legend and brings people together by the sea.", minSeconds: 4 },
    ],
  },
];
function chapter(title, prompt, lines) {
 return { title, prompt, beats: lines.map((line,i) => ({label: ["A new beginning", "Watch the story", "Discover together", "Your turn", "A new word"][i], line, minSeconds: 2})) };
}
const moonStory = [
 chapter("The Moon Rabbit", "Tap the bright moon 月亮", [
  "Look up at the night sky. In Chinese folklore, a rabbit lives on the moon. This is an imagined journey inspired by that legend.",
  "Jelly follows a silver path toward a bright round moon. What might we discover there?",
  "A little rabbit waves hello from a moonlit garden. Its long ears bounce as it welcomes us.",
  "Can you point to the moon? Tap the round moon shining above the garden.",
  "You found it! 月亮, yuè liang, means moon. The moon lights our story tonight."
 ]),
 chapter("A Family Invitation", "Tap both family members to invite them", [
  "Back on Earth, a family is getting ready for the Mid-Autumn Festival.",
  "They think about people they love, near and far. They want to celebrate together.",
  "Jelly has two invitations to share. The moon will shine above the gathering.",
  "Tap both family members to give each one an invitation.",
  "Both are invited! 家人, jiā rén, means family members. Everyone has a place at our table."
 ]),
 chapter("A Mooncake to Share", "Tap the mooncake 月饼", [
  "The family gathers around a table in the moonlit garden.",
  "A round mooncake sits in the middle. Mooncakes are shared during the Mid-Autumn Festival.",
  "Sharing a treat gives everyone a chance to enjoy it together.",
  "Tap the mooncake on the table to help us share it.",
  "Lovely! 月饼, yuè bǐng, means mooncake. Sharing makes our celebration warmer."
 ]),
 chapter("Light the Lantern", "Tap the lantern 灯笼, not the star", [
  "The garden grows darker, and the family brings colourful lanterns.",
  "Jelly finds a lantern waiting to be lit. A little star twinkles beside it.",
  "Soft lantern light makes a path through the garden.",
  "Which one is the lantern? Tap the lantern, not the star.",
  "You found it! 灯笼, dēng long, means lantern. Look at its warm glow."
 ]),
 chapter("Together Under the Moon", "Tap the rabbit lantern to join the celebration", [
  "Our imagined moon rabbit joins a real celebration: the Mid-Autumn Festival.",
  "Families admire the moon, share mooncakes, and enjoy the evening together.",
  "A rabbit lantern bobs along the garden path. Jelly is ready to join in.",
  "Tap the rabbit lantern to send it into the celebration.",
  "Wonderful! 团圆, tuán yuán, means reunion. Our story ends with people coming together."
 ])
];
// One name and one transparent illustration per Bau Nyale object, reused in
// the festival scene and in the response to a child's selection.
const bauNyaleFestivalArt = {
 ayam: {word:'ayam Taliwang',meaning:"Lombok's traditional grilled chicken",festivalImage:'/assetNEW/ayam_taliwang.png'},
 gendang: {word:'gendang',meaning:'a drum',festivalImage:'/assetNEW/gendang.png'},
 perahu: {word:'perahu',meaning:'a boat',festivalImage:'/assetNEW/perahu.png'},
 kerang: {word:'kerang',meaning:'a seashell',festivalImage:'/assetNEW/seashell.png'},
 guci: {word:'guci',meaning:'a pottery jar',festivalImage:'/assetNEW/pottery_jar.png'},
 keranjang: {word:'keranjang tanaman',meaning:'a basket of plants',festivalImage:'/assetNEW/plant_basket.png'},
 bintangLaut: {word:'bintang laut',meaning:'a starfish',festivalImage:'/assetNEW/starfish.png'},
 peti: {word:'peti kayu',meaning:'a wooden crate',festivalImage:'/assetNEW/crate.png'},
 tong: {word:'tong kayu',meaning:'a wooden barrel',festivalImage:'/assetNEW/barrel.png'}
};
const bauNyaleChoice = (area, key, x, y) => ({id:`${area}-${key}`,...bauNyaleFestivalArt[key],x,y});
const learningRetryMessage = 'Good try! Look closely at the pictures and try again.';
const journeys = {
 indonesian: {
  label: "Bahasa Indonesia", shortLabel: "Indonesian", speech: "id-ID", learningRetryMessage, storyTitle: "Putri Mandalika", storyLabel: "A Sasak legend from Lombok, Indonesia", chapters: mandalika,
  festival: "Bau Nyale", place: "Lombok's shore", festivalIntro: "Follow Jelly to a colourful seaside celebration. Help Jelly with three requests across the food courtyard, music gathering, and harbour.",
  storyRewards: [
   {id:"kerang", word:"kerang", meaning:"seashell", icon:"shell"}, {id:"undangan",word:"undangan",meaning:"invitation",icon:"letter"},
   {id:"damai",word:"damai",meaning:"peace",icon:"ripple"}, {id:"nyale-story",word:"nyale",meaning:"sea worm (Sasak)",icon:"nyale"},
   {id:"bau",word:"bau",meaning:"catch (Sasak)",icon:"boat"}
  ],
  rhyme: { title: "Bintang Kecil", subtitle: "Sing along with Lintang Media", videoId:"NXad9gFbCLI", channel:"Lintang Media", lines:[
   {word:"bintang",meaning:"star",icon:"star"},
   {word:"langit",meaning:"sky",icon:"sky"},
   {word:"terbang",meaning:"fly",icon:"fly"}
  ]},
  outfits:[{id:"sasak-lilac",name:"Lilac woven wrap",description:"A stylised Sasak-inspired woven wrap and headcloth.",colour:"#aa7cce",accent:"#ffe3a0"},{id:"sasak-rose",name:"Rose woven wrap",description:"The same festival outfit in warm rose and gold.",colour:"#e392b7",accent:"#fff0bb"}],
  festivalNavigation:{left:'/assetNEW/ArrowPointingToTheLeft.png',right:'/assetNEW/ArrowPointingRight.png'},
  festivalAreas:[
   {name:'Food courtyard',decor:'food',background:'/assetNEW/foodcourtyard(baunyale).jpeg',distractors:[
    bauNyaleChoice('food','kerang',220,315),bauNyaleChoice('food','guci',350,520),bauNyaleChoice('food','keranjang',630,520)
   ]},
   {name:'Music gathering',decor:'music',background:'/assetNEW/musicgathering(baunyale).jpeg',distractors:[
    bauNyaleChoice('music','kerang',760,315),bauNyaleChoice('music','guci',350,520),bauNyaleChoice('music','bintangLaut',630,520)
   ]},
   {name:'Seaside harbour',decor:'harbour',background:'/assetNEW/seasideharbour(baunyale).jpeg',distractors:[
    bauNyaleChoice('harbour','bintangLaut',220,315),bauNyaleChoice('harbour','peti',350,520),bauNyaleChoice('harbour','tong',630,520)
   ]}
  ],
  festivalItems:[
   {id:'ayam-taliwang',...bauNyaleFestivalArt.ayam,icon:'chicken',area:0,x:760,y:315,request:"Find ayam Taliwang, Lombok's traditional grilled chicken, in the Food courtyard.",thanks:'You found ayam Taliwang!',fact:"This is Lombok's traditional grilled chicken."},
   {id:'gendang',...bauNyaleFestivalArt.gendang,icon:'drum',area:1,x:220,y:315,request:'Find gendang in the Music gathering.',thanks:'You found gendang!',fact:'A gendang is a drum played at celebrations.'},
   {id:'perahu',...bauNyaleFestivalArt.perahu,icon:'boat',area:2,x:760,y:315,request:'Find perahu in the Seaside harbour.',thanks:'You found perahu!',fact:'A perahu is a boat used by coastal communities.'}
  ]
 },
 chinese: {
  label:"中文 · Chinese",shortLabel:"Chinese",speech:"zh-CN",learningRetryMessage,storyTitle:"The Moon Rabbit",storyLabel:"An imagined journey inspired by Chinese moon folklore",chapters:moonStory,
  festival:"Mid-Autumn Festival",place:"the moonlit garden",festivalIntro:"Follow Jelly to a lantern-lit garden. Help Jelly with three requests across the mooncake courtyard, lantern walk, and moon garden.",
  storyRewards:[{id:"moon-story",word:"月亮",pronunciation:"yuè liang",meaning:"moon",icon:"moon"},{id:"family",word:"家人",pronunciation:"jiā rén",meaning:"family members",icon:"letter"},{id:"mooncake-story",word:"月饼",pronunciation:"yuè bǐng",meaning:"mooncake",icon:"mooncake"},{id:"lantern-story",word:"灯笼",pronunciation:"dēng long",meaning:"lantern",icon:"lantern"},{id:"reunion",word:"团圆",pronunciation:"tuán yuán",meaning:"reunion",icon:"rabbit"}],
  rhyme:{title:"小星星",subtitle:"Sing along with BabyBus",videoId:"GxtknJ9KFKY",channel:"BabyBus",lines:[
   {word:"星星",pronunciation:"xīng xing",meaning:"star",icon:"star"},
   {word:"天空",pronunciation:"tiān kōng",meaning:"sky",icon:"sky"},
   {word:"眼睛",pronunciation:"yǎn jing",meaning:"eyes",icon:"eyes"}
  ]},
  outfits:[{id:"hanfu-lilac",name:"Lilac hanfu",description:"A playful hanfu-inspired robe for our moonlit gathering.",colour:"#a889cf",accent:"#fff0b8"},{id:"hanfu-rose",name:"Rose hanfu",description:"A rose-coloured version with a golden sash.",colour:"#e799bd",accent:"#ffedac"}],
  festivalAreas:[{name:'Mooncake courtyard',decor:'food',distractors:[{id:'food-star',icon:'star',x:310,y:440}]},{name:'Lantern walk',decor:'lanterns',distractors:[{id:'walk-mooncake',icon:'mooncake',x:710,y:500}]},{name:'Moon garden',decor:'garden',distractors:[{id:'garden-moon',icon:'moon',x:320,y:430}]}],
  festivalItems:[
   {id:'mooncake-festival',word:'月饼',pronunciation:'yuè bǐng',meaning:'mooncake',icon:'mooncake',area:0,x:660,y:420,request:"I'm hungry! Can you find 月饼 and bring it to me?",thanks:'Thank you for feeding me 月饼!',fact:'月饼 is a mooncake, a pastry enjoyed during the Mid-Autumn Festival. Sharing mooncakes is part of celebrating together with family.'},
   {id:'lantern-festival',word:'灯笼',pronunciation:'dēng long',meaning:'lantern',icon:'lantern',area:1,x:300,y:370,request:"I'd love to light up our evening! Find me a 灯笼 on the lantern walk.",thanks:'Thank you for finding a 灯笼!',fact:'灯笼 means lantern. Children carry colourful lanterns during Mid-Autumn celebrations, lighting up the evening together.'},
   {id:'rabbit-festival',word:'兔子',pronunciation:'tù zi',meaning:'rabbit',icon:'rabbit',area:2,x:660,y:400,request:"Let's remember our story! Find me the 兔子 decoration in the moon garden.",thanks:'Thank you for finding the 兔子!',fact:'兔子 means rabbit. This decoration reminds us of the Moon Rabbit from our storybook and the bright moon above our festival.'}
  ]
 }
};
// A story and its festival are a single selectable adventure. More entries can be
// added here once their chapters, rewards, areas and items actually exist.
for (const [language, entry] of Object.entries(journeys)) {
 entry.festivalId = language === 'indonesian' ? 'bau-nyale' : 'mid-autumn';
 entry.stories = [{
  id: language === 'indonesian' ? 'putri-mandalika' : 'moon-rabbit',
  language, title: entry.storyTitle, festivalId: entry.festivalId,
  chapters: entry.chapters, rewards: entry.storyRewards,
 }];
 entry.festivals = [{ id: entry.festivalId, language, title: entry.festival,
  place: entry.place, intro: entry.festivalIntro, areas: entry.festivalAreas,
  items: entry.festivalItems, outfits: entry.outfits }];
}

// Each row names something present in the story, its celebration, or the
// existing festival scene. Asset keys are reusable illustration requests; the
// frontend may render a richer asset but must keep the item IDs unchanged.
const vocabulary = {
 indonesian: [
  { title: 'Meet Mandalika', words: [
   ['putri','princess','princess','Mandalika is the princess in our story.'],
   ['kerang','seashell','shell','A kerang is a shell you might find beside the shore.'],
   ['laut','sea','sea','Laut is the sea beside Lombok.'],
   ['nyale','sea worm','nyale','Nyale are the colourful sea worms in the Sasak legend.'],
   ['perahu','boat','boat','A perahu is a boat that sails by the shore.'],
  ]},
  { title: "Explore Lombok's Coast", words: [
   ['pantai','beach','beach','Pantai is the beach where people gather.'],
   ['ombak','wave','wave','Ombak are the waves moving across the sea.'],
   ['pasir','sand','sand','Pasir is the sand beneath your feet at the beach.'],
   ['pesisir','coast','coast','Pesisir is the land along the sea.'],
   ['air','water','water','Air is the water around the colourful nyale.'],
  ]},
  { title: 'Celebrate Bau Nyale', words: [
   ['ayam Taliwang','Taliwang grilled chicken','chicken','Ayam Taliwang is the grilled chicken dish in our festival.'],
   ['gendang','drum','drum','A gendang is the drum you find at the music gathering.'],
   ['kain tenun','woven cloth','woven-cloth','Kain tenun is the woven cloth in the Sasak-inspired outfit.'],
   ['ikat kepala','headcloth','headcloth','An ikat kepala is cloth worn around the head.'],
   ['perayaan','celebration','celebration','A perayaan is a celebration shared by people together.'],
  ]},
 ],
 chinese: [
  { title: 'Discover the Moon Story', words: [
   ['月亮','yuè liang','moon','moon','月亮 is the bright moon above the garden.'],
   ['兔子','tù zi','rabbit','rabbit','兔子 is the rabbit in our moon story.'],
   ['月饼','yuè bǐng','mooncake','mooncake','月饼 is a round cake shared at Mid-Autumn Festival.'],
   ['灯笼','dēng long','lantern','lantern','灯笼 is a lantern glowing along the garden path.'],
   ['家人','jiā rén','family members','family','家人 are the family members gathering together.'],
  ]},
  { title: 'Under the Moonlight', words: [
   ['花园','huā yuán','garden','garden','花园 is the garden where the family celebrates.'],
   ['夜晚','yè wǎn','evening','evening','夜晚 is the evening when the moon shines.'],
   ['星星','xīng xing','stars','stars','星星 are the stars twinkling near the moon.'],
   ['小路','xiǎo lù','path','path','小路 is the path lined with lanterns.'],
   ['光','guāng','light','light','光 is the warm light coming from a lantern.'],
  ]},
  { title: 'Celebrate the Moon Festival', words: [
   ['糕点','gāo diǎn','pastry','pastry','糕点 is a pastry; a mooncake is one kind.'],
   ['汉服','hàn fú','hanfu clothing','hanfu','汉服 is the clothing that inspired our festival outfit.'],
   ['团圆','tuán yuán','reunion','reunion','团圆 is family coming together again.'],
   ['赏月','shǎng yuè','admire the moon','moon-viewing','赏月 means to enjoy looking at the moon.'],
   ['中秋节','zhōng qiū jié','Mid-Autumn Festival','mid-autumn','中秋节 is the festival in our moonlit garden.'],
  ]},
 ],
};
for (const [language, levels] of Object.entries(vocabulary)) {
 journeys[language].learningLevels = levels.map((level, levelIndex) => ({
  id: `${language}-level-${levelIndex + 1}`, level: levelIndex + 1,
  title: level.title, required: levelIndex === 0,
  questions: level.words.map((row, questionIndex) => {
   const chinese = language === 'chinese';
   const [targetWord, pronunciationOrMeaning, meaningOrAsset, assetOrHint, maybeHint] = row;
   const translation = chinese ? meaningOrAsset : pronunciationOrMeaning;
   const colouringAsset = chinese ? assetOrHint : meaningOrAsset;
   const hint = chinese ? maybeHint : assetOrHint;
   const itemId = index => `${language}-level-${levelIndex + 1}-item-${index + 1}`;
   const distractors = [1, 2].map(offset => (questionIndex + offset) % 5);
   return {
    id: `${language}-level-${levelIndex + 1}-question-${questionIndex + 1}`,
    language, level: levelIndex + 1, targetWord, translation,
    ...(chinese ? { pinyin: pronunciationOrMeaning } : {}),
    pronunciationLocale: chinese ? 'zh-CN' : 'id-ID',
    sentenceBefore: 'Can you find the picture for “',
    sentenceAfter: '”?', hint,
    correctItemId: itemId(questionIndex),
    distractorItemIds: distractors.map(itemId), colouringAsset,
    options: [questionIndex, ...distractors].map(index => ({
     itemId: itemId(index), label: chinese ? level.words[index][2] : level.words[index][1],
     asset: chinese ? level.words[index][3] : level.words[index][2],
    })),
   };
  }),
 }));
}
if (typeof module !== "undefined" && module.exports) module.exports = journeys;
else root.JOURNEYS = journeys;
})(typeof window !== "undefined" ? window : globalThis);
