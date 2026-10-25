(function () {
'use strict';
const icons = {
 bookshelf:'<rect x="9" y="10" width="82" height="80" rx="8" fill="#c6a5dc" stroke="#8866a5" stroke-width="4"/><path d="M13 48H87M13 82H87" stroke="#8866a5" stroke-width="5"/><path d="M23 18V43M36 20V43M50 17L59 42M70 19V42M25 56V77M39 54V77M54 57V77M68 54L77 77" stroke="#fff0bc" stroke-width="9"/><path d="M20 93V87M80 93V87" stroke="#8866a5" stroke-width="5"/>',
 chicken:'<ellipse cx="50" cy="78" rx="43" ry="13" fill="#fff0d7" stroke="#b699bf" stroke-width="3"/><path d="M20 66Q13 27 51 28Q78 23 82 62Q68 81 20 66Z" fill="#dca174" stroke="#a97972" stroke-width="4"/><path d="M46 51Q60 31 75 43Q84 52 66 64L82 77" fill="#e8b282" stroke="#a97972" stroke-width="4"/><path d="M82 77L91 79M82 77L85 86" stroke="#fff4dc" stroke-width="7" stroke-linecap="round"/><path d="M26 51Q37 35 44 41M28 61L39 55" fill="none" stroke="#bc856b" stroke-width="3"/><path d="M12 75L22 70M14 82L28 76" stroke="#8ebf8a" stroke-width="4"/>', 
 sky:'<rect x="8" y="8" width="84" height="84" rx="23" fill="#a9ddf3"/><path d="M20 61Q14 43 31 40Q37 21 55 32Q72 23 77 45Q91 49 81 62Z" fill="#fffaf5" stroke="#9bbccf" stroke-width="3"/><circle cx="72" cy="23" r="10" fill="#ffe5a3"/>',
 eyes:'<ellipse cx="31" cy="51" rx="22" ry="28" fill="#fffcf5" stroke="#b99ec8" stroke-width="4"/><ellipse cx="70" cy="51" rx="22" ry="28" fill="#fffcf5" stroke="#b99ec8" stroke-width="4"/><ellipse cx="36" cy="52" rx="11" ry="16" fill="#836897"/><ellipse cx="66" cy="52" rx="11" ry="16" fill="#836897"/><circle cx="40" cy="45" r="4" fill="#fff"/><circle cx="70" cy="45" r="4" fill="#fff"/>',
 fly:'<path d="M38 46C30 34 17 27 8 33C17 40 19 54 37 61" fill="#d0afe3" stroke="#9874b4" stroke-width="2.5" stroke-linejoin="round"/><path d="M62 46C70 34 83 27 92 33C83 40 81 54 63 61" fill="#d0afe3" stroke="#9874b4" stroke-width="2.5" stroke-linejoin="round"/><path d="M37 49C37 34 42 28 50 28C58 28 63 34 63 49L63 61C63 72 56 79 50 82C44 79 37 72 37 61Z" fill="#f4c0df" stroke="#9874b4" stroke-width="2.5"/><circle cx="44" cy="45" r="2" fill="#68517e"/><circle cx="56" cy="45" r="2" fill="#68517e"/><path d="M45 54L50 60L55 54Z" fill="#ffe5a5" stroke="#be9b88" stroke-width="1.5"/>', 

 shell:'<path d="M18 75Q4 27 50 17Q96 27 82 75Q50 96 18 75Z" fill="#ffb8d8" stroke="#aa5f9e" stroke-width="5"/><path d="M50 23V79M28 36L44 79M72 36L56 79" stroke="#fff0f8" stroke-width="4"/>',
 nyale:'<path d="M12 65Q27 15 47 57T88 35" fill="none" stroke="#cf94e5" stroke-width="18" stroke-linecap="round"/><circle cx="86" cy="35" r="3" fill="#544770"/>',
 star:'<path d="M50 9L62 35L91 39L70 60L75 90L50 75L25 90L30 60L9 39L38 35Z" fill="#ffe293" stroke="#cfa767" stroke-width="4"/>',
 moon:'<circle cx="50" cy="50" r="37" fill="#fff0b9" stroke="#d5b782" stroke-width="4"/><circle cx="37" cy="38" r="7" fill="#efdbaa"/><circle cx="61" cy="64" r="10" fill="#efdbaa"/><path d="M39 56Q50 67 61 56" fill="none" stroke="#b18779" stroke-width="3"/>',
 fish:'<path d="M68 42L90 24V76L68 58" fill="#b0dbf6" stroke="#7295bd" stroke-width="4"/><ellipse cx="42" cy="50" rx="31" ry="24" fill="#ffbfda" stroke="#b676a9" stroke-width="4"/><circle cx="27" cy="44" r="4" fill="#544770"/><path d="M40 35L53 50L40 65" fill="#d69cce"/>',
 lantern:'<path d="M50 5V19M50 82V97" stroke="#b78962" stroke-width="5"/><rect x="27" y="16" width="46" height="9" rx="4" fill="#ffd889"/><ellipse cx="50" cy="52" rx="31" ry="30" fill="#f6a6bf" stroke="#b9739c" stroke-width="4"/><path d="M40 25Q26 52 40 78M60 25Q74 52 60 78" stroke="#ffe0a0" stroke-width="4" fill="none"/><rect x="28" y="79" width="44" height="7" rx="3" fill="#ffd889"/>',
 mooncake:'<path d="M20 30Q20 12 38 19Q50 3 62 19Q80 12 80 30Q98 35 88 50Q98 65 80 70Q80 88 62 81Q50 97 38 81Q20 88 20 70Q2 65 12 50Q2 35 20 30Z" fill="#efc291" stroke="#c9926f" stroke-width="4"/><circle cx="50" cy="50" r="25" fill="#f8d9a9" stroke="#dba77d" stroke-width="3"/><path d="M36 40H64M40 50H60M36 60H64M50 34V67" stroke="#cc9876" stroke-width="4"/>',
 rabbit:'<ellipse cx="37" cy="24" rx="10" ry="22" fill="#fff1e8" stroke="#bc99bc" stroke-width="3"/><ellipse cx="65" cy="24" rx="10" ry="22" fill="#fff1e8" stroke="#bc99bc" stroke-width="3"/><ellipse cx="50" cy="66" rx="33" ry="28" fill="#fff1e8" stroke="#bc99bc" stroke-width="3"/><circle cx="38" cy="60" r="4" fill="#544770"/><circle cx="63" cy="60" r="4" fill="#544770"/><path d="M45 72Q50 80 55 72" fill="none" stroke="#b580a4" stroke-width="3"/>',
 boat:'<path d="M8 66H93L78 89H24Z" fill="#b88acb" stroke="#87649f" stroke-width="4"/><path d="M49 65V10L84 59Z" fill="#fff0bc" stroke="#be9b88" stroke-width="3"/><path d="M45 60H15L45 27Z" fill="#f8bada"/>',
 drum:'<ellipse cx="50" cy="25" rx="33" ry="14" fill="#ffe4b1" stroke="#b57d9a" stroke-width="4"/><path d="M17 25V74Q50 95 83 74V25Q50 43 17 25Z" fill="#c795c8" stroke="#9e6f9e" stroke-width="4"/><path d="M22 37L36 77L50 43L66 77L80 36" fill="none" stroke="#fff0c4" stroke-width="4"/>',
 letter:'<rect x="9" y="23" width="82" height="58" rx="10" fill="#fff1c6" stroke="#b78caf" stroke-width="4"/><path d="M12 28L50 58L88 28" fill="none" stroke="#d5aac5" stroke-width="4"/><path d="M42 51Q50 41 58 51Q67 62 50 72Q33 62 42 51Z" fill="#eda5c3"/>',
 ripple:'<ellipse cx="50" cy="64" rx="40" ry="17" fill="#b1e9ef" stroke="#63aaba" stroke-width="4"/><ellipse cx="50" cy="58" rx="25" ry="11" fill="#d2f5f2" stroke="#8ac8d0" stroke-width="3"/><path d="M50 13Q29 37 50 46Q71 37 50 13Z" fill="#98dbe7"/>',
 radio:'<rect x="9" y="33" width="82" height="52" rx="12" fill="#bda1da" stroke="#85679f" stroke-width="4"/><path d="M65 33L81 7" stroke="#85679f" stroke-width="4"/><circle cx="35" cy="59" r="17" fill="#f6d9ea" stroke="#946baf" stroke-width="4"/><path d="M26 54H44M25 61H45M29 68H41" stroke="#ac87be" stroke-width="3"/><rect x="61" y="45" width="20" height="8" rx="3" fill="#fff0bb"/><circle cx="68" cy="68" r="6" fill="#f8bfdb"/>',
 book:'<path d="M8 20Q29 12 50 23Q71 12 92 20V81Q71 72 50 85Q29 72 8 81Z" fill="#fff1c4" stroke="#9873aa" stroke-width="4"/><path d="M50 24V83M19 34H39M61 34H81M19 46H36M64 46H81" stroke="#cc9bbc" stroke-width="3"/>',
 wardrobe:'<rect x="19" y="9" width="62" height="83" rx="10" fill="#c6a5dc" stroke="#8866a5" stroke-width="4"/><path d="M50 13V87" stroke="#9572ad" stroke-width="3"/><circle cx="42" cy="54" r="3" fill="#ffedb6"/><circle cx="59" cy="54" r="3" fill="#ffedb6"/>',
 coral:'<path d="M50 85V25M50 52L25 28V13M50 66L78 40V25" stroke="#f29bbd" stroke-width="13" stroke-linecap="round" fill="none"/>',
};
// Vocabulary scenes share the aquarium's palette and outline primitives. Abstract
// words use scenes from the stories (sharing food, family reunion, coastal catch).
const shape = (d, fill = '#b1e9ef') => `<path d="${d}" fill="${fill}" stroke="#8866a5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
const circle = (x,y,r,fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="#8866a5" stroke-width="2"/>`;
const person = (x,y,scale=1,colour='#c6a5dc') => `<g transform="translate(${x} ${y}) scale(${scale})">${circle(0,0,10,'#f1c3a6')}${shape('M-11 13Q0 7 11 13L15 39H-15Z',colour)}${shape('M-6 39V48M6 39V48M-11 18L-22 30M11 18L22 30','none')}</g>`;
const waves = shape('M7 46Q18 33 29 46T51 46T73 46T95 46M7 65Q18 52 29 65T51 65T73 65T95 65M7 84Q18 71 29 84T51 84T73 84T95 84','none');
const shore = shape('M8 88V61Q34 43 55 57T94 45V88Z','#f8d9bd');
const family = person(25,24,.85)+person(73,24,.85,'#f2a6ca')+person(49,48,.65,'#a9ddd2');
const robe = shape('M35 14L18 27L6 53L22 62L31 43L23 91Q50 99 77 91L69 43L78 62L94 53L82 27L65 14Z','#c6a5dc')+shape('M35 14L58 47L65 14M31 57H70M29 64H71','none');
const plate = shape('M8 64Q50 92 92 64L84 83Q50 99 16 83Z','#fff1c6');
const garden = shape('M5 88Q50 54 95 88Z','#b7d3b4')+shape('M20 77V42M78 78V36M14 58L20 64L29 54M69 51L78 59L88 47','none')+circle(20,33,12,'#f2a6ca')+circle(78,28,12,'#e6b8ef')+circle(20,33,4,'#fff1c6')+circle(78,28,4,'#fff1c6');
const lanternSmall = `<g transform="translate(26 10) scale(.55)">${icons.lantern}</g>`;
Object.assign(icons, {
 princess: person(50,36,.95,'#f2a6ca')+shape('M34 20L31 7L44 15L50 3L57 15L70 7L66 20Z','#fff1c6')+shape('M39 52L22 91H78L61 52Z','#f2a6ca'),
 sea: circle(77,17,11,'#fff1c6')+waves,
 beach: circle(78,18,11,'#fff1c6')+waves+shore+shape('M20 75V33M6 41Q20 14 36 41Z','#f2a6ca'),
 wave: shape('M8 79Q26 75 34 48Q45 10 73 24Q93 35 77 52Q78 34 64 38Q56 42 62 53Q71 70 93 78V88H8Z'),
 sand: shape('M6 80Q25 54 48 71Q73 47 94 76V91H6Z','#f8d9bd')+[18,34,48,62,78,86].map((x,i)=>circle(x,77+i%3*5,2,'#d5aac5')).join(''),
 coast: shape('M6 8H94V91H6Z')+shape('M6 8H57Q37 28 61 46T48 91H6Z','#b7d3b4')+shape('M57 8Q37 28 61 46T48 91','none')+shape('M73 31H85M72 70H87','none'),
 water: shape('M50 8Q19 46 20 63A30 30 0 0 0 80 63Q81 46 50 8Z')+shape('M31 61Q30 76 45 80','none'),
 rice: plate+shape('M18 62Q21 25 50 25Q79 25 82 62Z','#fff9ed')+shape('M29 51L35 46M42 38L48 34M57 48L63 42M66 57L72 52M39 59L45 54','none'),
 vegetables: plate+shape('M17 59Q5 33 23 29Q17 10 36 17Q49 7 56 23Q75 13 81 32Q98 36 82 61Z','#86bc96')+shape('M28 65L44 31M56 66L70 33','none'),
 'woven-cloth': shape('M15 12H85V88H15Z','#f2a6ca')+shape('M15 27H85M15 47H85M15 67H85M29 12V88M49 12V88M69 12V88','none')+shape('M15 88V96M29 88V96M43 88V96M57 88V96M71 88V96M85 88V96','none'),
 headcloth: shape('M14 45Q50 18 86 45L81 64Q50 39 19 64Z','#c6a5dc')+shape('M15 45L48 52L68 40L58 24L74 15L80 39L86 45M48 52L70 80L78 64','none'),
 'drum-ensemble': `<g transform="translate(0 20) scale(.58)">${icons.drum}</g><g transform="translate(40 0) scale(.62)">${icons.drum}</g>`+shape('M13 16L32 32M49 9L63 19','none'),
 music: shape('M31 69V23L78 12V61M31 37L78 26','none')+shape('M31 64Q9 58 10 75Q14 88 31 77Z','#c6a5dc')+shape('M78 56Q56 50 57 67Q61 80 78 69Z','#f2a6ca'),
 storybook: icons.book,
 tradition: `<g transform="translate(0 16) scale(.65)">${icons.drum}</g>`+person(76,23,.85)+shape('M59 71L72 60L85 71L72 82Z','#f2a6ca'),
 invitation: icons.letter,
 gathering: family+shape('M11 89Q50 99 89 89','none'),
 catch: shape('M12 15L51 46M51 46L87 76Q48 100 31 68Z','none')+shape('M46 51L71 86M39 59L60 91M39 76L66 58M46 88L77 67','none')+`<g transform="translate(42 50) scale(.35)">${icons.nyale}</g>`,
 peace: shape('M12 55Q36 51 43 28L57 49Q80 34 89 46L79 58Q64 82 43 67L24 76L29 60Z','#fff9ed')+shape('M76 59L91 76M83 66L91 62M86 70L80 77','none'),
 celebration: shape('M15 87L30 44L58 72Z','#f2a6ca')+shape('M39 40L46 22M59 48L78 39M55 27L65 11M68 64L90 69','none')+circle(23,21,5,'#fff1c6')+circle(83,20,5,'#c6a5dc')+circle(76,86,4,'#b7d3b4'),
 family,
 garden,
 evening: shape('M8 9H92V91H8Z','#989bce')+`<g transform="translate(36 9) scale(.48)">${icons.moon}</g>`+shape('M8 78Q28 62 48 78T92 78V91H8Z','#a9ddd2')+circle(23,28,3,'#fff1c6'),
 stars: `<g transform="translate(7 0) scale(.6)">${icons.star}</g><g transform="translate(49 46) scale(.45)">${icons.star}</g><g transform="translate(5 60) scale(.3)">${icons.star}</g>`,
 path: garden+shape('M30 94Q70 73 53 57Q38 44 59 19H68Q50 45 68 56Q91 78 69 94Z','#f8d9bd'),
 light: lanternSmall+shape('M13 13L24 22M78 21L88 12M8 43H19M80 43H92M15 72L25 63M76 64L87 74','none'),
 pastry: shape('M15 72Q5 49 24 43Q14 17 39 26Q51 3 65 27Q94 19 83 47Q102 63 81 78Q50 95 15 72Z','#f2c66e')+shape('M29 40Q49 25 72 43M27 57Q51 42 76 60M32 73Q50 63 68 73','none'),
 table: shape('M10 34H90V48H10ZM17 48H28V91H17ZM72 48H83V91H72Z','#d5aac5')+shape('M27 62H73','none'),
 hanfu: robe+shape('M33 27L20 57M67 27L80 57M47 61L38 85M54 61L63 85','none'),
 robe,
 sash: shape('M9 32Q50 46 91 32V56Q50 70 9 56Z','#f2a6ca')+shape('M46 42L66 36L64 58L46 51L28 58L28 36Z','#fff1c6')+shape('M47 53L36 91L53 85L61 92L58 54Z','#f2a6ca'),
 reunion: family+shape('M9 17Q50-5 91 17M9 17L10 7M9 17L20 17M91 17L80 17M91 17L90 7','none'),
 sharing: `<g transform="translate(30 24) scale(.42)">${icons.mooncake}</g>`+shape('M7 67L23 61L40 66L43 74H26M93 67L77 61L60 66L57 74H74M6 67L12 87L39 86L49 76M94 67L88 87L61 86L51 76','none'),
 'moon-viewing': `<g transform="translate(44 0) scale(.55)">${icons.moon}</g>`+person(25,41,.75)+shape('M39 58L58 40','none'),
 'lantern-carrying': person(28,22,1)+`<g transform="translate(58 37) scale(.4)">${icons.lantern}</g>`+shape('M48 52L78 29L78 39','none'),
 'mid-autumn': `<g transform="translate(47 0) scale(.5)">${icons.moon}</g><g transform="translate(0 35) scale(.6)">${icons.mooncake}</g><g transform="translate(55 48) scale(.42)">${icons.lantern}</g>`,
 'moon-rabbit': `<g transform="translate(23 0) scale(.77)">${icons.moon}</g><g transform="translate(3 40) scale(.56)">${icons.rabbit}</g>`,
 'rabbit-lantern': shape('M49 5V23M39 6H59','none')+`<g transform="translate(10 20) scale(.8)">${icons.rabbit}</g>`+shape('M47 84V95M40 95H54','none'),
 'family-gathering': family+shape('M15 82H85V91H15Z','#f8d9bd')
});
function svg(icon) { return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true">${icons[icon] || icons.shell}</svg>`; }
function outline(icon,fill='#fff') {
 // A stroked worm needs an enclosed body for brush/fill colouring.
 const source=icon==='nyale'?`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${shape('M5 62Q21 6 46 39Q52 47 57 62Q66 91 80 32Q83 24 91 29Q98 32 95 40Q76 107 51 83Q43 75 38 57Q27 17 19 68Q15 80 7 75Q2 72 5 62Z','#cf94e5')}${circle(87,35,2,'#544770')}</svg>`:svg(icon);
 const document=new DOMParser().parseFromString(source,'image/svg+xml');
 document.querySelectorAll('path,rect,circle,ellipse').forEach(node=>{
  if(node.getAttribute('fill')!=='none')node.setAttribute('fill',fill);
  node.setAttribute('stroke','#685775');
  const width=Number(node.getAttribute('stroke-width')||2.5);
  node.setAttribute('stroke-width',String(Math.max(1,Math.min(2.2,width*.65))));
  node.setAttribute('stroke-linejoin','round');
  node.setAttribute('stroke-linecap','round');
 });
 return new XMLSerializer().serializeToString(document.documentElement);
}
function jelly(outfit, time = 0) {
 const c = outfit?.colour || '#d59be9', a = outfit?.accent || '#fff0bb';
 const robe = outfit ? `<path d="M30 58L23 90Q50 104 77 90L70 58Z" fill="${c}" stroke="#875baa" stroke-width="2"/><path d="M35 62L59 83M65 62L41 83" stroke="${a}" stroke-width="3"/><path d="M26 85H74" stroke="${a}" stroke-width="5"/>` : '';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 115" aria-hidden="true"><g transform="translate(0 ${Math.sin(time)*2})"><path d="M29 65Q18 88 30 99M43 67Q34 95 44 106M57 67Q66 95 57 106M70 65Q81 87 70 99" fill="none" stroke="#d998e5" stroke-width="6" stroke-linecap="round"/>${robe}<path d="M19 59C16 20 33 7 50 7S85 25 81 59Q73 72 66 62Q58 72 50 62Q41 72 34 62Q25 72 19 59Z" fill="#d59be9" stroke="#875baa" stroke-width="3"/><ellipse cx="33" cy="49" rx="6" ry="4" fill="#ffbadb"/><ellipse cx="68" cy="49" rx="6" ry="4" fill="#ffbadb"/><circle cx="38" cy="42" r="3" fill="#544770"/><circle cx="62" cy="42" r="3" fill="#544770"/><path d="M44 53Q50 61 56 53" stroke="#544770" stroke-width="2" fill="none"/><ellipse cx="34" cy="25" rx="12" ry="5" fill="#ffffff65"/>${outfit?.id.startsWith('sasak') ? `<path d="M21 24Q50 7 79 24L76 34Q50 20 24 34Z" fill="${c}" stroke="#875baa" stroke-width="2"/><path d="M25 27Q50 16 75 27" fill="none" stroke="${a}" stroke-width="3"/>` : ''}</g></svg>`;
}
function clothing(outfit) {
 const c=outfit.colour,a=outfit.accent,sasak=outfit.id.startsWith('sasak');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 130" aria-hidden="true"><path d="M44 20L29 31L13 67L29 75L38 57L31 111Q60 123 89 111L82 57L91 75L107 67L91 31L76 20Z" fill="${c}" stroke="#88649f" stroke-width="3"/><path d="M44 21L65 63L77 21M47 36L58 60" fill="none" stroke="${a}" stroke-width="4"/><path d="M36 74H85M32 104Q60 114 88 104" fill="none" stroke="${a}" stroke-width="6"/>${sasak ? `<path d="M26 8Q60-1 94 8L90 18Q60 11 30 18Z" fill="${c}" stroke="#88649f" stroke-width="2"/><path d="M40 82L45 92L50 82M59 82L64 92L69 82M78 82L83 92" fill="none" stroke="${a}" stroke-width="2"/>` : `<path d="M41 77L36 111M80 77L87 111" fill="none" stroke="${a}" stroke-width="2"/>`}</svg>`;
}
function screenScale(canvas) {
 const rect=typeof canvas?.getBoundingClientRect==='function'?canvas.getBoundingClientRect():null;
 const x=rect?.width>0?rect.width/960:1,y=rect?.height>0?rect.height/620:1;
 return {x,y,unit:Math.min(x,y)};
}
function canvasIcon(ctx, icon, x, y, size) {
 const im = images[icon],scale=screenScale(ctx.canvas);
 const w=size*scale.unit/scale.x,h=size*scale.unit/scale.y;
 if (im?.complete && im.naturalWidth) ctx.drawImage(im,x-w/2,y-h/2,w,h);
}
const images = {};
for (const key of Object.keys(icons)) { const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg(key)); images[key]=im; }
const artworkImages=new Map();
function canvasMemory(ctx,item,x,y,size) {
 if(!item.artwork){canvasIcon(ctx,item.icon,x,y,size);return;}
 let im=artworkImages.get(item.artwork);
 if(!im){im=new Image();im.src=item.artwork;artworkImages.set(item.artwork,im);}
 const scale=screenScale(ctx.canvas),w=size*scale.unit/scale.x,h=size*scale.unit/scale.y;
 if(im.complete&&im.naturalWidth)ctx.drawImage(im,x-w/2,y-h/2,w,h);
}
// Wrap outside the room, with a soft fade at both edges. No visible teleport.
function roomBubble(index, seconds) {
 const speed=12+index%4*4, span=500;
 const travel=(index*73+seconds*speed)%span;
 const y=600-travel;
 const alpha=Math.max(0,Math.min(1,(560-y)/32,(y-126)/32));
 return {x:74+(index*127)%810+Math.sin(seconds*.6+index)*4,y,radius:3+index%4,alpha};
}
window.OceanArt = { clearMemoryCache:()=>artworkImages.clear(), hasIcon: icon => Object.prototype.hasOwnProperty.call(icons,icon), roomBubble, svg, outline, jelly, clothing, canvasIcon, canvasMemory, screenScale };
})();
