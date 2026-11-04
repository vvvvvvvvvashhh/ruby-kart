// Surface artists draw once into the same atlas as track signage. GPU, CPU
// and the raster worker pick up the new tile with their normal atlas revision.
function finishTile(key,paint){
 const name='finish/'+key;
 if(tags.has(name))return tags.get(name);
 const id=tags.size,x=(id%8)*256,y=Math.floor(id/8)*64;
 if(y+64>atlas.height)throw new Error('Finish atlas exhausted');
 ac.save();
 try{
  ac.translate(x,y);ac.beginPath();ac.rect(0,0,256,64);ac.clip();ac.clearRect(0,0,256,64);
  if(typeof ac.canvas?.width==='number')paint(ac,256,64);
 }finally{ac.restore()}
 const rect=[(x+.5)/atlas.width,(y+.5)/atlas.height,(x+255.5)/atlas.width,(y+63.5)/atlas.height];
 tags.set(name,rect);return rect;
}
