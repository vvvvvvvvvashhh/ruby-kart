'use strict';
// Two-dimensional signed depth residuals, split into byte planes for LZ4.
function packDepth(data,size){
 const n=data.length,bytes=new Uint8Array(2*n);
 for(let i=0;i<n;i++){
  const left=i%size>0,up=i>=size;
  const d=(data[i]-(left?data[i-1]:0)-(up?data[i-size]:0)+(up&&left?data[i-size-1]:0))<<16>>16;
  const zig=(d<<1)^(d>>15);bytes[i]=zig;bytes[i+n]=zig>>8;
 }
 // LZ4 block, with a bounded hash chain to find runs in ramps and flat roofs.
 const heads=new Int32Array(1<<16).fill(-1),chain=new Int32Array(1<<16),out=[];
 function remember(i){
  const word=bytes[i]|bytes[i+1]<<8|bytes[i+2]<<16|bytes[i+3]<<24;
  const hash=Math.imul(word,0x9e3779b1)>>>16,previous=heads[hash];
  chain[i&65535]=previous;heads[hash]=i;return previous;
 }
 function ext(n){while(n>=255){out.push(255);n-=255}out.push(n)}
 function literals(begin,end){if(end-begin>=15)ext(end-begin-15);for(let i=begin;i<end;i++)out.push(bytes[i])}
 const stop=bytes.length-5;let anchor=0,i=0;
 while(i+12<=bytes.length){
  let cand=remember(i),best=3,target=-1,depth=48;
  while(cand>=0&&i-cand<65536&&depth--){
   if(bytes[cand]===bytes[i]&&bytes[cand+best]===bytes[i+best]){
    let k=1;while(i+k<stop&&bytes[cand+k]===bytes[i+k])k++;
    if(k>best){best=k;target=cand;if(i+k===stop)break}
   }
   cand=chain[cand&65535];
  }
  if(target<0){i++;continue}
  const run=best-4,dist=i-target;
  out.push(Math.min(i-anchor,15)<<4|Math.min(run,15));literals(anchor,i);
  out.push(dist&255,dist>>8);if(run>=15)ext(run-15);
  const end=i+best;
  for(i++;i<end;i++)remember(i);
  anchor=end;
 }
 out.push(Math.min(15,bytes.length-anchor)<<4);literals(anchor,bytes.length);
 return Buffer.from(out);
}
module.exports={packDepth};
