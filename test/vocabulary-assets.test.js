const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const zlib=require('node:zlib');
const frames=require('../data/vocabulary-frames.json');

function png(path){
 const bytes=fs.readFileSync(path),chunks=[];let width,height;
 for(let offset=8;offset<bytes.length;){
  const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8),data=bytes.subarray(offset+8,offset+8+length);
  if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);assert.equal(data[9],6);}
  if(type==='IDAT')chunks.push(data);
  offset+=length+12;
 }
 return{width,height,raw:zlib.inflateSync(Buffer.concat(chunks))};
}
test('all prepared vocabulary pairs have matching square canvases and a clear margin around the complete artwork',()=>{
 for(const item of frames){
  const color=png(`public/jelly_vocabulary_assets/prepared/color/level_${item.level}/${item.name}.png`);
  const outline=png(`public/jelly_vocabulary_assets/prepared/black_and_white/level_${item.level}/${item.name}.png`);
  assert.equal(color.width,color.height);assert.equal(color.width,outline.width);assert.equal(color.height,outline.height);
  for(const [variant,picture]of [['color',color],['outline',outline]]){
   const {width,height,raw}=picture;let ink=0;
   for(let y=0;y<height;y++){
    assert.equal(raw[y*(width*4+1)],0,'prepared PNG uses unfiltered rows');
    for(let x=0;x<width;x++){
     const i=y*(width*4+1)+1+x*4;
     if(raw[i+3]&&Math.min(raw[i],raw[i+1],raw[i+2])<180)ink++;
     if(x<16||y<16||x>=width-16||y>=height-16){
      if(variant==='color')assert.equal(raw[i+3],0,`${item.name}: floor art has a transparent safety margin`);
      else assert.ok(Math.min(raw[i],raw[i+1],raw[i+2])>=235,`${item.name}: outline is clear of every edge`);
     }
    }
   }
   assert.ok(ink>100,`${item.name}: artwork is present`);
  }
 }
});
