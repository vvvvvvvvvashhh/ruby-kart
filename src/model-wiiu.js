// White WUP-010 GamePad. Dimensions are millimetres. The top and bottom
// fittings sit in their own planes; the rear finger rail is part of the hull.
function buildRubyWiiU(g){
 const pearl='#f1f1ec',lower='#d5d9d6',joint='#939e9a';
 const milk='#eceee8',ink='#76817f',dark='#263236';
 const black='#182429',lens='#112027',front=9.4;
 const pi=Math.PI;
 // Tiny recesses and pad printing use short profiles. At this scale a full
 // shell bevel per stripe would add thousands of triangles to the serial tag.
 function detail(x,y,z,w,h,d,r,c,finish,bevel=0){
  r=Math.min(r,w*.49,h*.49);
  if(r<.24){g.slab(x,y,z,w,h,d,0,0,c,finish);return;}
  const p=[];
  for(let q=0;q<4;q++){
   const cx=(q===0||q===3?1:-1)*(w/2-r),cy=(q<2?1:-1)*(h/2-r);
   for(let j=0;j<=2;j++){const a=(q+j/2)*pi/2;p.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}
  }
  g.sweep(x,y,z,p,d,bevel,c,finish);
 }
 function disc(x,y,z,r,d,c,finish,n=12){
  const p=[];
  for(let i=0;i<n;i++){const a=i*2*pi/n;p.push([r*Math.cos(a),r*Math.sin(a)]);}
  g.sweep(x,y,z,p,d,0,c,finish);
 }

 // Four tangent-continuous sweeps make the two upper brow peaks, nearly
 // straight bottom and the rounded, tapering outer sides of the casting.
 function bezier(path,a,b,c,n=5){
  const p=path[path.length-1];
  for(let i=1;i<=n;i++){
   const t=i/n,s=1-t;
   path.push([s*s*s*p[0]+3*s*s*t*a[0]+3*s*t*t*b[0]+t*t*t*c[0],s*s*s*p[1]+3*s*s*t*a[1]+3*s*t*t*b[1]+t*t*t*c[1]]);
  }
 }
 const half=[[0,-65.15]];
 bezier(half,[47,-64.9],[84,-64.2],[100,-63.7],4);
 bezier(half,[115,-62.6],[123,-57.8],[125.1,-43],6);
 bezier(half,[129.2,-17],[128.7,19],[123.8,36.7],7);
 bezier(half,[118.6,55.8],[110.6,64.8],[95.8,65],7);
 bezier(half,[84.4,65],[78.9,61.8],[66.3,61.5],5);
 bezier(half,[42,60.6],[22,60.55],[0,60.55],4);
 const profile=half.concat(half.slice(1,-1).reverse().map(([x,y])=>[-x,y]));
 const xFit=127.7/Math.max(...half.map(p=>p[0]));
 const outline=(sx,sy)=>profile.map(([x,y])=>[x*xFit*sx,y*sy]);
 g.sweep(0,0,-3.3,outline(.996,.996),17.8,5.05,lower,'satin','edgeCoat');
 g.sweep(0,0,3.76,outline(.9985,.9985),.36,0,'#899691','matte');
 g.sweep(0,0,5.65,outline(1,1),7.50,3.48,pearl,'pearl','edgeCoat');

 // A single moulded surface blends the raised finger rest into both palms.
 // Its lower edge dips towards the hands while the middle stays high enough
 // to leave the battery cover unobstructed.
 function ridge(x,v){
  const ax=Math.abs(x),hand=Math.exp(-Math.pow((ax-94)/24.8,2));
  const end=Math.max(0,Math.min(1,(ax-106)/17));
  const fade=1-end*end*(3-2*end);
  const y0=26.4-20.3*hand, y1=59.0+2.75*hand-20.3*(1-fade);
  const wave=Math.pow(Math.max(0,Math.sin(pi*v)),1.48);
  return [x,y0+(y1-y0)*v,-12.12-(9.45+10.05*hand)*fade*wave];
 }
 const cols=36,rows=12,grid=[],color=[213/255,217/255,214/255];
 for(let i=0;i<=cols;i++){
  const row=[];grid.push(row);
  for(let j=0;j<=rows;j++){
   const x=-123+246*i/cols,v=j/rows,p=ridge(x,v);
   const a=ridge(x-.06,v),b=ridge(x+.06,v),c=ridge(x,Math.max(0,v-.001)),d=ridge(x,Math.min(1,v+.001));
   const dzdy=(d[2]-c[2])/(d[1]-c[1]),dzdx=((b[2]-a[2])-dzdy*(b[1]-a[1]))/.12;
   const inv=1/Math.hypot(dzdx,dzdy,1);row.push({p,n:[dzdx*inv,dzdy*inv,-inv]});
  }
 }
 for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){
  const a=grid[i][j],b=grid[i][j+1],c=grid[i+1][j+1],d=grid[i+1][j];
  g.tri(a.p,b.p,c.p,a.n,b.n,c.n,color,2);g.tri(a.p,c.p,d.p,a.n,c.n,d.n,color,2);
 }
 // ZL/ZR are large rounded paddles under the index-finger shoulders.
 const backPaddle=[[-17.6,3.2]];
 bezier(backPaddle,[-18.8,8],[-16.1,12.8],[-9.4,13.3],4);
 bezier(backPaddle,[-.1,14.4],[11.8,11.8],[17.9,5.3],5);
 bezier(backPaddle,[20.9,1],[19.7,-3.4],[16.0,-6.4],4);
 bezier(backPaddle,[10.1,-9.7],[1.0,-12.7],[-7.8,-12.7],4);
 bezier(backPaddle,[-12.0,-12.8],[-14.5,-10.7],[-15.5,-6.4],3);
 bezier(backPaddle,[-16.4,-3.2],[-17.18,.6],[-17.6,3.2],3);
 backPaddle.pop();
 for(const side of [-1,1]){
  const flip=backPaddle.map(([x,y])=>[x*side,y]);
  g.part({x:side*95.3,y:52.3,z:-19.8,rx:-.38,rz:-side*.20},()=>{
   g.sweep(0,0,.37,flip,9.1,2.8,'#c6ccc5','satin');
   g.sweep(0,0,-2.4,flip.map(([x,y])=>[x*.968,y*.955]),9.6,3.05,'#e6e9e3','satin');
   g.part({x:0,y:0,z:-7.25,ry:pi},()=>g.label(side<0?'ZL':'ZR',0,0,0,7.8,3.15,ink));
  });
  g.part({x:side*97,y:61.62,z:-1.2,rz:-side*.12},()=>{
   detail(0,-.5,0,35,8.7,13,4.1,joint,'matte',2.15);
   detail(0,.55,.45,32.9,8.05,12.6,3.8,milk,'satin',2.2);
   g.part({x:0,y:3.55,z:1.1,rx:-pi/2},()=>g.label(side<0?'L':'R',0,0,.09,3.1,2.7,ink));
  });
 }

 // A single continuous rebated frame. The pearl shoulder rolls up from the
 // face and down through the grey seal to the actual 6.2-inch LCD opening.
 const lcdY=-2.50,lcdW=137.3,lcdH=77.23;
 const rings=[
  [145.7,85.72,4.25,9.415,[.855,.882,.853],10],
  [144.6,84.60,3.69,9.99,[.912,.926,.896],13],
  [143.4,83.40,3.09,10.36,[.906,.922,.895],13],
  [142.6,82.60,2.69,10.26,[.852,.873,.842],10],
  [140.7,80.70,1.77,10.15,[.689,.729,.709],2],
  [139.2,79.20,1.18,10.095,[.521,.558,.550],2],
  [137.34,77.27,.27,10.045,[.212,.238,.238],6]
 ];
 const count=24;
 function rimPoint(k,i){
  const [w,h,r,z,c,m]=rings[k],quarter=Math.floor(i/6),j=i%6,th=(quarter+j/5)*pi*.5;
  const nx=Math.cos(th),ny=Math.sin(th);
  const cx=(quarter===0||quarter===3?1:-1)*(w/2-r),cy=(quarter<2?1:-1)*(h/2-r);
  const prev=rings[Math.max(0,k-1)],next=rings[Math.min(rings.length-1,k+1)];
  const slope=(next[3]-prev[3])/((prev[0]-next[0])*.5),nz=1/Math.hypot(1,slope);
  return {p:[cx+r*nx,lcdY+cy+r*ny,z],n:[nx*slope*nz,ny*slope*nz,nz],c,m};
 }
 for(let k=1;k<rings.length;k++)for(let i=0;i<count;i++){
  const j=(i+1)%count,a=rimPoint(k-1,i),b=rimPoint(k-1,j),c=rimPoint(k,j),d=rimPoint(k,i);
  for(const v of [a,b,c,a,c,d])g.vertex(v.p,v.n,v.c,c.m);
 }
 g.slab(0,lcdY,9.675,138.55,78.56,.45,1.55,.12,'#0d191e','glass');
 g.screen('upper',0,lcdY,10.025,lcdW,lcdH);

 // White sensor housing with separate smoked IR windows: only the lens
 // and ends show dark on this colorway.
 const visorY=45.20;
 g.slab(0,visorY,9.63,69.8,12.8,.66,4.18,.23,'#b8c0bd','satin');
 g.slab(0,visorY,10.03,68.65,11.85,.66,3.85,.24,'#e6e9e2','pearl');
 for(const side of [-1,1]){
  g.slab(side*28.6,visorY,10.40,8.58,8.14,.32,2.45,.1,'#666d6c','matte');
  g.slab(side*28.6,visorY,10.59,7.85,7.40,.28,2.24,.10,lens,'glass');
  // Paired receivers sit behind each smoked IR window.
  for(const dx of [-1.67,1.67])disc(side*28.6+dx,visorY+.18,10.745,.62,.018,'#383238','glass',10);
 }
 g.lathe(0,visorY,10.40,[[2.63,-.08],[2.59,.12],[2.22,.27],[1.95,.23]],'#8d9898','satin',24);
 disc(0,visorY,10.69,1.99,.33,black,'glass');
 disc(0,visorY,10.89,1.15,.17,'#20353f','glass');
 disc(-.29,visorY+.38,11.01,.27,.11,'#96b7bd','glass');

 function stick(id,x){
  const y=44.05;
  g.socketShadow(x,y,front+.025,13.76,2.05,pearl,'pearl');
  g.lathe(x,y,front,[[14.2,-.06],[14.14,.17],[13.58,.79],[12.75,.98],[11.78,.48]],'#d2d8d4','satin',24);
  g.lathe(x,y,front+.15,[[11.92,.00],[11.67,.33],[10.52,.19],[9.6,.03]],'#75817e','matte',24);
  g.key(id,()=>{
   g.lathe(x,y,front,[[10.72,.12],[10.03,1.20],[8.14,2.44],[5.60,3.14]],'#939b97','rubber',24);
   g.lathe(x,y,front+2.6,[[5.28,-1.18],[5.28,.36],[7.36,1.12],[9.08,2.07],[9.48,2.77],[9.26,3.42],[8.36,3.75],[6.74,3.62]],'#d6dad3','rubber',24);
   g.lathe(x,y,front+2.6,[[8.42,3.58],[8.17,3.83],[7.82,3.86],[7.55,3.68]],'#e1e4dd','rubber',24);
  });
  g.control(id,x,y,front+6.52,26.4,26.4);
 }
 stick('steer',-104.05);stick('stickRear',104.05);

 const dx=-94.85,dy=10.88;
 const cross=(len,arm,r)=>{
  const verts=[[-arm,len],[arm,len],[arm,arm],[len,arm],[len,-arm],[arm,-arm],[arm,-len],[-arm,-len],[-arm,-arm],[-len,-arm],[-len,arm],[-arm,arm]];
  return verts.flatMap((pt,i)=>{
   const prev=verts[(i+11)%12],next=verts[(i+1)%12],lenA=Math.hypot(prev[0]-pt[0],prev[1]-pt[1]),lenB=Math.hypot(next[0]-pt[0],next[1]-pt[1]);
   const a=[pt[0]+(prev[0]-pt[0])*r/lenA,pt[1]+(prev[1]-pt[1])*r/lenA];
   const b=[pt[0]+(next[0]-pt[0])*r/lenB,pt[1]+(next[1]-pt[1])*r/lenB];
   return [a,[.25*a[0]+.5*pt[0]+.25*b[0],.25*a[1]+.5*pt[1]+.25*b[1]],b];
  });
 };
 g.sweep(dx,dy,front+.27,cross(12.85,4.15,1.0),.58,0,'#a4afab','satin');
 g.sweep(dx,dy,front+.61,cross(12.38,3.87,.84),.60,0,'#4d5956','matte');
 g.key('dpad',()=>{
  g.sweep(dx,dy,front+1.64,cross(11.82,3.58,.56),2.15,.66,'#e1e4dd','satin');
  for(const ang of [0,pi/2,pi,3*pi/2]){
   g.part({x:dx,y:dy,z:front+2.74,rz:ang},()=>{
    detail(0,8.75,0,2.6,.34,.05,.14,'#a5afa9','ink');
    detail(0,8.40,0,1.45,.30,.05,.12,'#b7bdb7','ink');
   });
  }
 });
 g.control('dpad',dx,dy,front+2.8,26,26);

 function cap(id,x,y,r,text,legendSize,capCol=milk){
  g.socketShadow(x,y,front+.025,r+.22,.90,pearl,'pearl');
  g.lathe(x,y,front,[[r+.69,0],[r+.77,.26],[r+.32,.50],[r-.07,.26]],'#9da7a4','satin',18);
  disc(x,y,front+.38,r+.14,.48,'#606d69','matte',18);
  g.key(id,()=>{
   g.lathe(x,y,front+.42,[[r-.13,0],[r-.13,1.06],[r-.37,1.49],[r-.91,1.67]],capCol,'satin',18);
   if(text==='power'){
    const ring=[],radius=1.74;
    for(let i=0;i<=12;i++){const a=(128+284*i/12)*pi/180;ring.push([radius*Math.cos(a),radius*Math.sin(a)]);}
    for(let i=12;i>=0;i--){const a=(128+284*i/12)*pi/180;ring.push([(radius-.43)*Math.cos(a),(radius-.43)*Math.sin(a)]);}
    g.sweep(x,y,front+2.12,ring,.03,0,'#b8857f','ink');
    detail(x,y+1.48,front+2.12,.44,1.87,.03,.09,'#b8857f','ink');
   }else if(text==='+'||text==='−'){
    detail(x,y,front+2.12,3.25,.58,.045,.18,'#89928d','ink');
    if(text==='+')detail(x,y,front+2.126,.58,3.25,.045,.18,'#89928d','ink');
   }else{
    const paint=text==='TV'?'#88a9b7':r>4.5?'#929b98':'#7e8984';
    g.label(text,x,y,front+2.12,legendSize,text==='TV'?2.78:legendSize,paint,{font:'bold 64px sans-serif'});
   }
  });
  g.control(id,x,y,front+2.16,2*r+1.1,2*r+1.1);
 }
 cap('brakeBtn',94.9,21.22,4.95,'X',4.28);
 cap('rearBtn',83.8,10.50,4.95,'Y',4.28);
 cap('itemBtn',106.3,10.50,4.95,'A',4.28);
 cap('driftBtn',94.9,-.92,4.95,'B',4.28);
 for(const [id,y,icon,word] of [['startKey',-11.26,'+','START'],['settingsKey',-24.20,'−','SELECT']]){
  cap(id,84.52,y,3.58,icon,3.95);
  g.label(word,95.0,y,front+.16,10.3,2.22,'#82908b',{font:'bold 48px sans-serif'});
 }

 // NFC is pad printing. Keep these nested marks on the face plane instead
 // of creating another raised button.
 g.part({x:-94.9,y:-14.2,z:front+.14,rz:.10},()=>{
  for(const [y,w,h] of [[1.5,7.0,5.5],[-1.3,6.3,4.8]]){
   const x=y<0?-1.3:0,th=.48,c='#a6b0aa';
   detail(x,y+h/2,0,w,th,.10,.16,c,'ink');detail(x,y-h/2,0,w,th,.10,.16,c,'ink');
   detail(x-w/2,y,0,th,h,.10,.16,c,'ink');detail(x+w/2,y,0,th,h,.10,.16,c,'ink');
  }
 });
 for(const side of [-1,1]){
  // Three narrow, radiused acoustic slots under each hand in the white face.
  for(let j=0;j<3;j++){
   const x=side*(102.4+2.42*j),y=-50.4,len=[9.0,15.2,11.6][j];
   detail(x,y,front+.20,1.67,len,.42,.79,'#c2c9c4','satin',.17);
   detail(x,y+.05,front+.39,.83,len-.94,.09,.39,'#727d76','matte');
  }
 }
 g.label('Wii',-84.55,-52.75,front+.22,13.50,5.05,'#a0a9a6',{font:'bold 56px sans-serif'});
 // The blue U is the asymmetrical open mark printed next to the grey Wii.
 const uMark=[[-2.62,2.35],[.35,2.35],[.35,1.56],[-1.73,1.56],[-1.73,-1.00],[-1.40,-1.48],[1.29,-1.48],[1.68,-1.05],[1.68,2.35],[2.62,2.35],[2.62,-1.32],[2.30,-2.02],[1.51,-2.34],[-1.62,-2.34],[-2.40,-1.96],[-2.62,-1.26]];
 g.sweep(-74.50,-52.70,front+.22,uMark,.045,0,'#72b8cb','ink');
 // Leave a continuous strip of pearl between the screen lip, legends and key collars.
 const stripY=-54.80,legendY=-46.86;
 g.label('MIC',-19.95,stripY+.77,front+.16,4.75,1.8,ink);
 disc(-15.50,stripY,front+.12,.54,.18,dark,'matte');
 g.label('HOME',0,legendY,front+.16,7.00,1.65,ink);
 g.lathe(0,stripY,front,[[6.52,0],[6.41,.27],[5.86,.59],[5.37,.36],[5.22,-.08]],'#acb7b7','satin',28,false);
 g.lathe(0,stripY,front+.26,[[5.66,0],[5.61,.18],[5.13,.29],[5.09,-.25]],'#bed5d9','glass',24,false);
 g.key('homeKey',()=>{
  g.lathe(0,stripY,front+.30,[[5.06,.00],[4.94,.85],[4.58,1.11]],milk,'satin',24);
  // The printed five-sided house rides the cap through its full travel.
  const outer=[[-2.2,-1.80],[2.2,-1.80],[2.2,.16],[0,2.03],[-2.2,.16]];
  const inner=[[-1.81,-1.42],[1.81,-1.42],[1.81,-.01],[0,1.50],[-1.81,-.01]];
  for(let i=0;i<5;i++){
   const j=(i+1)%5;
   for(const [x,y] of [outer[i],outer[j],inner[j],outer[i],inner[j],inner[i]])
    g.vertex([x,stripY+y+.08,front+1.47],[0,0,1],[.53,.65,.68],7);
  }
 });
 g.control('homeKey',0,stripY,front+1.57,13.4,13.2);
 g.label('BATTERY',19.95,legendY,front+.15,10.25,1.65,ink);
 detail(19.95,stripY+.28,front+.15,2.26,1.02,.24,.45,'#7d8179','glass');
 cap('mapKey',50.20,stripY,4.27,'TV',4.65);
 g.label('TV CONTROL',50.20,legendY,front+.15,12.30,1.65,ink);
 cap('powerKey',68.26,stripY,4.27,'power',0);
 g.label('POWER',68.26,legendY,front+.15,7.75,1.65,ink);

 // The upper edge seen in the manual: stylus socket, VOL slider, DC in,
 // IR transceiver and headphone jack. Ports use inset rims and contact faces.
 function edgePart(x,top,z,fn){
  g.part({x,y:top?60.74:-65.12,z,rx:top?-pi/2:pi/2},fn);
 }
 edgePart(0,true,-.5,()=>{
  detail(0,0,.13,15.4,7.1,.2,1.45,'#bac1bc','satin');
  detail(0,0,.28,12.4,5.25,.14,1.10,'#323a39','matte');
  detail(0,-.65,.37,8.75,1.2,.06,.34,'#b4b6aa','metal');
 });
 edgePart(-23.1,true,0,()=>{
  detail(0,0,.24,13.5,5.85,.45,1.1,'#949f98','satin');
  detail(0,0,.50,12.2,4.73,.16,.79,'#20282a','glass');
 });
 edgePart(-46.3,true,.5,()=>{
  disc(0,0,.34,3.08,.54,'#aeb7ae','metal');
  disc(0,0,.70,2.19,.24,'#273331','matte');
 });
 edgePart(59.1,true,-.22,()=>{
  detail(0,0,.72,30,5.55,.30,1.27,'#a9b4ad','matte');
  g.slab(2.3,0,1.32,13.9,4.63,1.2,1.05,.36,milk,'satin');
  for(let i=0;i<5;i++)detail(-2.50+i*2.07,0,1.98,.42,3.3,.13,.18,'#cad2ca','satin');
 });
 g.part({x:109.4,y:60.75,z:-10.3,rx:-pi/2,rz:-.43},()=>{
  g.slab(0,0,.39,6.4,10.3,.7,2,.28,'#a1ada7','satin');
  g.slab(0,0,.92,5.52,9.45,.68,1.59,.24,milk,'satin');
 });

 // Local coordinates here are those of a viewer looking at the rear.
 g.part({x:0,y:0,z:-12.17,ry:pi},()=>{
  const hatch=[[-83,23],[-5,23],[-1,27],[3,28],[18,28],[22,26],[26,23],[69,23],[75,19],[75,-24],[70,-29],[-83,-29],[-88,-25],[-88,19]];
  g.sweep(-15.6,10.3,.19,hatch,.54,.20,'#929d96','matte');
  g.sweep(-15.6,10.3,.61,hatch.map(([x,y])=>[x*.987,y*.974]),.50,.19,'#dce1d9','satin');
  function screw(x,y,z,r=1.5){
   g.lathe(x,y,z,[[r,0],[r,.12],[r*.82,.23]],'#a5afa6','satin',10);
   disc(x,y,z+.24,r*.69,.16,'#9aaba1','metal');
   detail(x,y,z+.37,r*.92,.28,.07,.11,'#63716b','ink');
   detail(x,y,z+.37,.28,r*.92,.07,.11,'#63716b','ink');
  }
  for(const x of [-95.2,53.0])screw(x,-12.4,.87,1.42);
  for(const [x,y] of [[-108,-48],[108,-48],[-84,45],[84,45],[-60,-49],[59,-49]])screw(x,y,.11,1.55);
  // Compliance marks are printed on the shell. Only the lower-right serial
  // number is on a separate paper label.
  g.label('Wii U GamePad',-49.4,-27.4,.14,29.4,2.82,'#849188',{font:'bold 58px sans-serif'});
  g.label('MODEL NO. WUP-010',-48.9,-31.3,.14,30,1.87,'#8d978f');
  g.label('Nintendo Co., Ltd.   •   4.75 V',-44.1,-35.7,.14,39.4,1.65,'#929a90');
  g.label('CE',-41.6,-45.15,.16,10.2,4.55,'#86938a',{font:'bold 56px sans-serif'});
  detail(32.0,-44.8,.19,40.1,9.5,.33,.72,'#e7e9de','matte');
  g.label('WUP-010',20.2,-47.1,.40,10.0,1.18,'#839086');
  for(let i=0;i<34;i++){
   const x=14.8+i*1.04,w=i%6===0?.69:i%3===0?.38:.23;
   for(const [dx,dy] of [[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]]){
    g.vertex([x+dx*w*.5,-44+dy*2.46,.40],[0,0,1],[.47,.525,.48],7);
   }
  }
  disc(-18.5,-45.5,.18,2.10,.32,'#a4afa6','satin');
  disc(-18.5,-45.5,.43,1.36,.21,'#bc6c63','satin');
  g.label('SYNC',-18.5,-41.65,.56,7.40,1.7,'#849087');
  for(const x of [-61,61])disc(x,-53.4,.16,.90,.21,'#8e9a90','matte');
 });
 // A shallow, raised maker's mark follows the local slope of the rear finger shelf.
 function shelfDetail(x,v,fn){
  const p=ridge(x,v),a=ridge(x-.06,v),b=ridge(x+.06,v),c=ridge(x,v-.001),d=ridge(x,v+.001);
  const dy=(d[2]-c[2])/(d[1]-c[1]),dx=((b[2]-a[2])-dy*(b[1]-a[1]))/.12;
  const inv=1/Math.hypot(dx,dy,1);
  g.part({x:p[0],y:p[1],z:p[2]-.10,ry:Math.atan2(dx,-1),rx:-Math.asin(dy*inv)},fn);
 }
 shelfDetail(0,.57,()=>{
  detail(0,0,.06,22.8,5.84,.23,2.85,'#b7c0b8','satin');
  detail(0,0,.205,21.65,4.93,.16,2.33,'#d3d8d0','satin');
  g.label('Nintendo',0,0,.33,17.5,2.83,'#a0ada2',{font:'bold 64px sans-serif'});
 });
 for(const x of [-68,68])shelfDetail(x,.84,()=>{
  disc(0,0,.10,2.13,.22,'#c1c7c1','satin');
  disc(0,0,.24,1.59,.12,'#a1aba5','matte');
  detail(0,0,.33,1.24,.27,.055,.12,'#839087','ink');
 });
 // Bottom docking contacts are separate metal pads either side of the
 // extension connector, facing downward so they read correctly from below.
 edgePart(0,false,-1.9,()=>{
  detail(0,0,.10,34.4,10.6,.27,2.25,'#bcc4ba','satin');
  detail(0,0,.28,12.65,4.6,.20,.75,'#525e57','matte');
  detail(0,.05,.43,10.6,2.1,.14,.4,'#25332e','matte');
  for(let k=0;k<5;k++)detail(-3.4+1.7*k,-.19,.54,.61,.74,.10,.10,'#bbab78','metal');
  for(const x of [-11.7,11.7]){
   detail(x,0,.37,4.4,4.4,.20,.8,'#909a8e','satin');
   detail(x,0,.54,3.45,3.25,.15,.48,'#c4a763','metal');
  }
 });
}
