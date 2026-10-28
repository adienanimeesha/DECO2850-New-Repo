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
      { label: "Your turn", line: "Can you help me find the seashell beside the path? Please tap it!", minSeconds: 3 },
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
// A child-friendly retelling of one traditional version of Chang’e’s legend.
// Reference: https://lightsbythelake.nparks.gov.sg/files/LBTL_Handbook.pdf
const moonStory = [
 chapter("Hou Yi and the Ten Suns", "Tap the one sun left in the sky", [
  "Jelly has a Chinese legend to share: Chang’e Flies to the Moon. People tell different versions. Let’s take our time with this one.",
  "Long ago, ten suns shone together. The fields became too hot and dry. The people needed someone to help.",
  "An archer named Hou Yi stepped forward. He shot down nine suns, one by one. One sun remained, giving the Earth the warmth it needed.",
  "Take a look at the peaceful sky. Can you tap the one sun Hou Yi left behind?",
  "You found it! 太阳, tài yáng, means sun. The fields could grow again, and the people were safe."
 ]),
 chapter("A Precious Gift", "Tap Chang’e and Hou Yi to meet them", [
  "To thank Hou Yi, he was given a precious gift: a magical elixir. In this legend, drinking it could make someone live forever.",
  "Hou Yi loved his wife, Chang’e. He did not want to live forever without her. For now, he chose not to drink the gift.",
  "He left the elixir with Chang’e to keep it safe. Here they are together at home, before their lives changed.",
  "Let’s meet them before we go on. Tap Chang’e, then tap Hou Yi.",
  "You met them! 家人, jiā rén, means family members. Chang’e and Hou Yi cared deeply about each other. Remember that as we turn the page."
 ]),
 chapter("Chang’e Flies to the Moon", "Tap 月饼 or drag it to the table beneath the Moon", [
  "One day, Hou Yi went away. His apprentice, Peng Meng, came to their home and tried to take the elixir from Chang’e.",
  "Chang’e did not want Peng Meng to take the elixir. Drag the elixir to Chang’e to see what happens next.",
  "Chang’e drank the elixir herself. Her feet lifted from the ground. Slowly, she rose above the house, higher and higher, until she reached the Moon. Let’s pause with her there, far from home.",
  "Hou Yi would remember Chang’e with her favourite foods. Place this mooncake on the table: tap it, or drag it to the middle.",
  "Thank you for sharing. 月饼, yuè bǐng, means mooncake. Keep this round cake in mind. On the next page, we’ll find out why people share it today."
 ]),
 chapter("Remembering Chang’e", "Tap the lantern 灯笼, not the star", [
  "When Hou Yi came home, he searched for Chang’e. He looked up at the bright Moon and missed her very much.",
  "He placed her favourite foods outside beneath the Moon. In this legend, the offerings show his love for someone far away.",
  "Today, families celebrate Mid-Autumn by sharing mooncakes and admiring the full moon. Lanterns brighten some celebrations too. Old stories help people remember loved ones.",
  "Let’s light our way to the celebration. Tap the lantern, not the star.",
  "A warm light! 灯笼, dēng long, means lantern. We are leaving the old legend now and joining a festival today."
 ]),
 chapter("A Rabbit Lantern", "Tap the rabbit lantern to join the celebration", [
  "Our story has brought us to a Mid-Autumn celebration. Families share mooncakes beneath the Moon.",
  "There is another moon tale to discover. In that tale, the Jade Rabbit keeps Chang’e company on the Moon.",
  "Look! A rabbit-shaped lantern. It reminds us of the Jade Rabbit. Shall we bring it to the celebration?",
  "Tap the rabbit lantern to join Jelly.",
  "Together again! 团圆, tuán yuán, means reunion. Let’s celebrate with the people we love."
 ])
 ];
// Leave room for the illustrations and a quiet pause after Chang’e’s flight.
for (const page of moonStory) for (const [index, beat] of page.beats.entries()) {
 beat.minSeconds = index === 3 ? 2 : Math.max(7, beat.line.length * .065);
}
moonStory[0].beats[2].minSeconds = 11;
moonStory[2].beats[2].minSeconds = 15;
moonStory[2].beats[2].pauseAfterSeconds = 2;
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
// Crops describe the visible artwork inside the supplied 1254px transparent PNGs.
// They only affect drawing; all festival item IDs and world positions stay fixed.
const midAutumnPicture = (file, crop) => ({
 festivalImage:`/assetNEW/${file}`,festivalCrop:crop,festivalSize:64,festivalRadius:65,festivalCenterOffset:0
});
const midAutumnFestivalArt = {
 mooncake:midAutumnPicture('mission-01-mooncake.png',[132,196,991,887]),
 lantern:midAutumnPicture('mission-02-lantern.png',[256,62,742,1141]),
 rabbit:midAutumnPicture('mission-03-rabbit-decoration.png',[289,60,677,1134]),
 star:midAutumnPicture('distractor-01-star.png',[157,163,940,912]),
 extraMooncake:midAutumnPicture('distractor-02-mooncake.png',[132,196,991,887]),
 moon:midAutumnPicture('distractor-03-moon.png',[169,177,914,899])
};
const learningRetryMessage = 'Good try! Look closely at the pictures and try again.';
const festivalNavigationArt = {
 left:'/assetNEW/ArrowPointingToTheLeft.png',
 right:'/assetNEW/ArrowPointingRight.png'
};
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
  festivalNavigation:festivalNavigationArt,
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
  label:"中文 · Chinese",shortLabel:"Chinese",speech:"zh-CN",learningRetryMessage,storyTitle:"Chang’e Flies to the Moon",storyLabel:"A traditional Chinese legend · one of several versions",chapters:moonStory,
  festival:"Mid-Autumn Festival",place:"the moonlit garden",festivalIntro:"Follow Jelly to a lantern-lit garden. Help Jelly with three requests across the mooncake courtyard, lantern walk, and moon garden.",
  storyRewards:[{id:"moon-story",word:"太阳",pronunciation:"tài yáng",meaning:"sun",icon:"sun"},{id:"family",word:"家人",pronunciation:"jiā rén",meaning:"family members",icon:"letter"},{id:"mooncake-story",word:"月饼",pronunciation:"yuè bǐng",meaning:"mooncake",icon:"mooncake"},{id:"lantern-story",word:"灯笼",pronunciation:"dēng long",meaning:"lantern",icon:"lantern"},{id:"reunion",word:"团圆",pronunciation:"tuán yuán",meaning:"reunion",icon:"rabbit"}],
  rhyme:{title:"小星星",subtitle:"Sing along with BabyBus",videoId:"GxtknJ9KFKY",channel:"BabyBus",lines:[
   {word:"星星",pronunciation:"xīng xing",meaning:"star",icon:"star"},
   {word:"天空",pronunciation:"tiān kōng",meaning:"sky",icon:"sky"},
   {word:"眼睛",pronunciation:"yǎn jing",meaning:"eyes",icon:"eyes"}
  ]},
  outfits:[{id:"hanfu-lilac",name:"Lilac hanfu",description:"A playful hanfu-inspired robe for our moonlit gathering.",colour:"#a889cf",accent:"#fff0b8"},{id:"hanfu-rose",name:"Rose hanfu",description:"A rose-coloured version with a golden sash.",colour:"#e799bd",accent:"#ffedac"}],
  festivalNavigation:festivalNavigationArt,
  festivalAreas:[
   {name:'Mooncake courtyard',decor:'food',background:'/assetNEW/mooncakecourtyard.png',distractors:[{id:'food-star',word:'星星',pronunciation:'xīng xing',meaning:'stars',icon:'star',...midAutumnFestivalArt.star,x:310,y:440}]},
   {name:'Lantern walk',decor:'lanterns',background:'/assetNEW/lanternwalk.png',distractors:[{id:'walk-mooncake',word:'月饼',pronunciation:'yuè bǐng',meaning:'mooncake',icon:'mooncake',...midAutumnFestivalArt.extraMooncake,x:710,y:500}]},
   {name:'Moon garden',decor:'garden',background:'/assetNEW/moongarden.png',distractors:[{id:'garden-moon',word:'月亮',pronunciation:'yuè liang',meaning:'moon',icon:'moon',...midAutumnFestivalArt.moon,x:320,y:430}]}
  ],
  festivalItems:[
   {id:'mooncake-festival',word:'月饼',pronunciation:'yuè bǐng',meaning:'mooncake',icon:'mooncake',...midAutumnFestivalArt.mooncake,area:0,x:660,y:420,request:"I'm hungry! Can you find 月饼 and bring it to me?",thanks:'Thank you for feeding me 月饼!',fact:'月饼 is a mooncake, a pastry enjoyed during the Mid-Autumn Festival. Sharing mooncakes is part of celebrating together with family.'},
   {id:'lantern-festival',word:'灯笼',pronunciation:'dēng long',meaning:'lantern',icon:'lantern',...midAutumnFestivalArt.lantern,area:1,x:300,y:370,request:"I'd love to light up our evening! Find me a 灯笼 on the lantern walk.",thanks:'Thank you for finding a 灯笼!',fact:'灯笼 means lantern. Children carry colourful lanterns during Mid-Autumn celebrations, lighting up the evening together.'},
   {id:'rabbit-festival',word:'兔子',pronunciation:'tù zi',meaning:'rabbit',icon:'rabbit',...midAutumnFestivalArt.rabbit,area:2,x:660,y:400,request:"Let's remember our story! Find me the 兔子 decoration in the moon garden.",thanks:'Thank you for finding the 兔子!',fact:'兔子 means rabbit. This decoration reminds us of the Moon Rabbit from our storybook and the bright moon above our festival.'}
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

// Basic learning uses familiar everyday objects; story and festival content stays separate.
const vocabulary = {
 "indonesian": [
  {
   "title": "Everyday objects · Tutorial",
   "words": [
    [
     "buku",
     "book",
     "book",
     "buku means book.",
     "I want to read. Can you find"
    ],
    [
     "bola",
     "ball",
     "ball",
     "bola means ball.",
     "I want to play. Can you find"
    ],
    [
     "cangkir",
     "cup",
     "cup",
     "cangkir means cup.",
     "I want a drink. Can you find"
    ],
    [
     "kursi",
     "chair",
     "chair",
     "kursi means chair.",
     "I want to sit down. Can you find"
    ],
    [
     "apel",
     "apple",
     "apple",
     "apel means apple.",
     "I want some fruit. Can you find"
    ]
   ]
  },
  {
   "title": "Things we use",
   "words": [
    [
     "meja",
     "table",
     "table",
     "meja means table.",
     "I need somewhere to put my cup. Can you find"
    ],
    [
     "pensil",
     "pencil",
     "pencil",
     "pensil means pencil.",
     "I want to draw. Can you find"
    ],
    [
     "tas",
     "bag",
     "bag",
     "tas means bag.",
     "I need to carry my books. Can you find"
    ],
    [
     "sepatu",
     "shoe",
     "shoe",
     "sepatu means shoe.",
     "I need something for my foot. Can you find"
    ],
    [
     "topi",
     "hat",
     "hat",
     "topi means hat.",
     "I need something for my head. Can you find"
    ]
   ]
  },
  {
   "title": "Food and animal friends",
   "words": [
    [
     "ikan",
     "fish",
     "fish",
     "ikan means fish.",
     "I see something swimming. Can you find"
    ],
    [
     "kelinci",
     "rabbit",
     "rabbit",
     "kelinci means rabbit.",
     "I see long ears and a fluffy tail. Can you find"
    ],
    [
     "air",
     "water",
     "water",
     "air means water.",
     "I want to fill my cup. Can you find"
    ],
    [
     "nasi",
     "rice",
     "rice",
     "nasi means rice.",
     "I want something to eat with vegetables. Can you find"
    ],
    [
     "sayuran",
     "vegetables",
     "vegetables",
     "sayuran means vegetables.",
     "I want some greens on my plate. Can you find"
    ]
   ]
  }
 ],
 "chinese": [
  {
   "title": "Everyday objects · Tutorial",
   "words": [
    [
     "书",
     "shū",
     "book",
     "book",
     "书 means book.",
     "I want to read. Can you find"
    ],
    [
     "球",
     "qiú",
     "ball",
     "ball",
     "球 means ball.",
     "I want to play. Can you find"
    ],
    [
     "杯子",
     "bēi zi",
     "cup",
     "cup",
     "杯子 means cup.",
     "I want a drink. Can you find"
    ],
    [
     "椅子",
     "yǐ zi",
     "chair",
     "chair",
     "椅子 means chair.",
     "I want to sit down. Can you find"
    ],
    [
     "苹果",
     "píng guǒ",
     "apple",
     "apple",
     "苹果 means apple.",
     "I want some fruit. Can you find"
    ]
   ]
  },
  {
   "title": "Things we use",
   "words": [
    [
     "桌子",
     "zhuō zi",
     "table",
     "table",
     "桌子 means table.",
     "I need somewhere to put my cup. Can you find"
    ],
    [
     "铅笔",
     "qiān bǐ",
     "pencil",
     "pencil",
     "铅笔 means pencil.",
     "I want to draw. Can you find"
    ],
    [
     "书包",
     "shū bāo",
     "bag",
     "bag",
     "书包 means bag.",
     "I need to carry my books. Can you find"
    ],
    [
     "鞋子",
     "xié zi",
     "shoe",
     "shoe",
     "鞋子 means shoe.",
     "I need something for my foot. Can you find"
    ],
    [
     "帽子",
     "mào zi",
     "hat",
     "hat",
     "帽子 means hat.",
     "I need something for my head. Can you find"
    ]
   ]
  },
  {
   "title": "Food and animal friends",
   "words": [
    [
     "鱼",
     "yú",
     "fish",
     "fish",
     "鱼 means fish.",
     "I see something swimming. Can you find"
    ],
    [
     "兔子",
     "tù zi",
     "rabbit",
     "rabbit",
     "兔子 means rabbit.",
     "I see long ears and a fluffy tail. Can you find"
    ],
    [
     "水",
     "shuǐ",
     "water",
     "water",
     "水 means water.",
     "I want to fill my cup. Can you find"
    ],
    [
     "米饭",
     "mǐ fàn",
     "rice",
     "rice",
     "米饭 means rice.",
     "I want something to eat with vegetables. Can you find"
    ],
    [
     "蔬菜",
     "shū cài",
     "vegetables",
     "vegetables",
     "蔬菜 means vegetables.",
     "I want some greens on my plate. Can you find"
    ]
   ]
  }
 ]
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
   const [promptBefore, sentenceAfter = '?'] = row.slice(chinese ? 5 : 4);
   const sentenceBefore = `${promptBefore} `;
   const itemId = index => `${language}-level-${levelIndex + 1}-item-${index + 1}`;
   const distractors = [1, 2].map(offset => (questionIndex + offset) % 5);
   return {
    id: `${language}-level-${levelIndex + 1}-question-${questionIndex + 1}`,
    language, level: levelIndex + 1, targetWord, translation,
    ...(chinese ? { pinyin: pronunciationOrMeaning } : {}),
    pronunciationLocale: chinese ? 'zh-CN' : 'id-ID',
    sentenceBefore, sentenceAfter, hint,
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
