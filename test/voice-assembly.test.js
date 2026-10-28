const test=require('node:test');
const assert=require('node:assert/strict');
const {readWave,joinWaves}=require('../scripts/assemble-voice');
function wave(samples,rate=44100){
 const data=Buffer.from(samples),b=Buffer.alloc(44+data.length);
 b.write('RIFF');b.writeUInt32LE(36+data.length,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);
 b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);
 b.write('data',36);b.writeUInt32LE(data.length,40);data.copy(b,44);return b;
}
test('continuous voice recordings preserve every segment in order with one WAV header',()=>{
 const result=joinWaves([wave([1,0,2,0]),wave([3,0]),wave([4,0,5,0])]);
 assert.deepEqual([...readWave(result).data],[1,0,2,0,3,0,4,0,5,0]);
 assert.equal(result.length,54);assert.equal(result.readUInt32LE(4),46);
});
test('corrupt or differently sampled voice clips cannot become a continuous recording',()=>{
 assert.throws(()=>readWave(Buffer.from('invalid')),/Expected/);
 assert.throws(()=>readWave(wave([1,0]).subarray(0,45)),/Truncated/);
 assert.throws(()=>joinWaves([wave([1,0]),wave([2,0],22050)]),/formats must match/);
});

test('a praise pause becomes actual silence in the continuous recording',()=>{
 const a=wave([1,0]),b=wave([2,0]);
 const plain=readWave(joinWaves([a,b])),paused=readWave(joinWaves([a,b],[650,0]));
 const silenceBytes=44100*2*.65;
 assert.equal(paused.data.length-plain.data.length,silenceBytes);
 assert.deepEqual([...paused.data.subarray(0,2)],[1,0]);assert.deepEqual([...paused.data.subarray(-2)],[2,0]);
 assert.ok(paused.data.subarray(2,-2).every(value=>value===0));
});
