// Rectangular artwork occupies existing model faces. All brushwork is baked
// once into the signage atlas and is available to both racing backends.
function courseSkinFace(g,a,b,c,d,tile,x0=0,y0=0,x1=1,y1=1){
 const l=mix(tile[0],tile[2],x0),r=mix(tile[0],tile[2],x1);
 const t=mix(tile[1],tile[3],y0),v=mix(tile[1],tile[3],y1);
 g.face(a,b,c,d,'#ffffff',null,[[l,t],[r,t],[r,v],[l,v]]);
}
// Colour drifts continuously across neighbouring terrain triangles, including
// their shared edges. Steep exposed banks show blue-grey stone through the snow.
function snowpackPalette(grid,step){
 const h=grid.length,w=grid[0].length,frost=rgb('#dbe6e6'),slate=rgb('#93a8b8');
 return grid.map((row,z)=>row.map((p,x)=>{
  const sx=(row[Math.min(x+1,w-1)][1]-row[Math.max(0,x-1)][1])/(2*step);
  const sz=(grid[Math.min(z+1,h-1)][x][1]-grid[Math.max(0,z-1)][x][1])/(2*step);
  const exposure=clamp((Math.hypot(sx,sz)-.16)*.76+(.5+.5*Math.sin(.057*p[0]+.032*p[2]))*.14,0,.87);
  return frost.map((c,i)=>mix(c,slate[i],exposure));
 }));
}
function snowpackFace(g,a,b,c,ca,cb,cc){
 const n=faceNormal(a,b,c);g.push(a,ca,1,-1,0,g.mat,n);g.push(b,cb,1,-1,0,g.mat,n);g.push(c,cc,1,-1,0,g.mat,n);
}
function alpineIcePrint(){
 return finishTile('alpine-layered-ice',c=>{
  const bands=['#d9eaf0','#c7e5e9','#a4d4dc','#8ec5d1','#76b4c2','#64a5b7','#619daf','#679fb0'];
  c.fillStyle=bands[0];c.fillRect(0,0,256,64);
  // Subsurface horizons bend around inclusions rather than tracing a grid.
  for(let j=1;j<bands.length;j++){
   c.fillStyle=bands[j];c.beginPath();c.moveTo(0,64);
   for(let x=0;x<=256;x+=4)c.lineTo(x,j*7.3+2.4*Math.sin(x*.036+j*.64)+1.4*Math.sin(x*.073-j*.48));
   c.lineTo(256,64);c.closePath();c.fill();
  }
  for(let i=0;i<5;i++){
   let x=19+i*46,y=5+(i*13)%17;c.beginPath();c.moveTo(x,y);
   c.lineTo(x+9,y+12);c.lineTo(x+4,y+18);c.lineTo(x+19,y+34);
   c.strokeStyle='#adcfd8';c.lineWidth=1.3;c.stroke();
   c.beginPath();c.moveTo(x+4,y+18);c.lineTo(x-8,y+23);c.lineTo(x-12,y+29);
   c.strokeStyle='#7caab6';c.lineWidth=1.0;c.stroke();
  }
  c.fillStyle='#c9e1e6';for(let i=0;i<32;i++)c.fillRect(8+(i*71)%240,12+(i*11)%48,1.8+(i%4)*.6,1);
 });
}
function alpineWindowPrint(){
 return finishTile('alpine-lodge-windows',c=>{
  c.fillStyle='#483e3b';c.fillRect(0,0,256,64);
  for(let i=0;i<4;i++){
   const x=i*64+4,lit=i===0||i===3;
   c.fillStyle=lit?'#d9a96d':'#628891';c.fillRect(x,5,56,54);
   c.fillStyle=lit?'#f3dba4':'#98bec2';c.fillRect(x,5,56,17);
   c.fillStyle=lit?'#b37e52':'#436773';c.fillRect(x,43,56,16);
   c.beginPath();c.moveTo(x,41);c.lineTo(x+18,29);c.lineTo(x+32,37);c.lineTo(x+48,24);c.lineTo(x+56,30);c.lineTo(x+56,42);c.closePath();c.fill();
   c.fillStyle='#fff8d7';c.globalAlpha=.27;c.beginPath();c.moveTo(x+13,6);c.lineTo(x+25,6);c.lineTo(x+3,32);c.lineTo(x+3,22);c.closePath();c.fill();c.globalAlpha=1;
   c.fillStyle='#735942';c.fillRect(x+26,4,3,56);c.fillRect(x,25,57,3);
   c.fillStyle='#dbc2a1';c.fillRect(x+28,4,1,55);c.fillRect(x,26,56,1);
  }
  c.fillStyle='#b4cbd0';c.fillRect(0,59,256,5);c.fillStyle='#e9e8de';c.fillRect(0,58,256,3);
 });
}
function alpineFlagPrint(){
 return finishTile('alpine-two-slalom-pennants',c=>{
  for(let j=0;j<2;j++){
   const x=128*j;c.save();c.translate(x,0);
   c.fillStyle=j?'#256783':'#b84b48';c.fillRect(0,0,128,64);
   c.fillStyle=j?'#3a8fa8':'#de6254';c.beginPath();c.moveTo(0,0);c.lineTo(128,0);c.lineTo(128,18);c.lineTo(0,47);c.fill();
   c.fillStyle='#f4e9d1';c.fillRect(3,4,122,2);c.fillRect(3,58,122,2);
   for(let k=0;k<2;k++){const a=18+k*26;c.beginPath();c.moveTo(a,45);c.lineTo(a+23,15+k*6);c.lineTo(a+47,45);c.lineTo(a+40,45);c.lineTo(a+23,25+k*6);c.lineTo(a+6,45);c.fill()}
   for(let k=0;k<4;k++){c.fillStyle=k%2?'#fbebc8':'#31465e';c.fillRect(94+5*k,26,5,5);c.fillRect(94+5*k,31,5,5)}
   c.restore();
  }
 });
}
// A continuous ski-resort circuit. The ridge is high above the glacier bowl;
// the gondolas take the direct route back to the timber summit station.
function summitDefinition(){
 const knots=[[-42,-68],[-39,-37],[-49,-15],[-78,0],[-87,26],[-72,54],[-43,72],[-15,57],[5,68],[17,98],[42,109],[65,90],[61,67],[39,50],[39,30],[69,14],[84,-12],[69,-35],[40,-41],[19,-62],[18,-87],[-7,-97],[-32,-91]];
 const points=softenTourBends(tourSpline(knots,16),7), half=7.15;
 let length=0;for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];length+=Math.hypot(q[0]-p[0],q[1]-p[1])}
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
 const bell=(x,c,w)=>Math.exp(-(((x-c)/w)**2));
 const elev=[[0,24],[.061,26],[.125,22.5],[.208,12],[.285,6],[.42,-1.3],[.55,-.5],[.64,3.1],[.72,5],[.835,13.8],[.924,22],[.979,24],[1,24]];
 function height(f){for(let i=1;i<elev.length;i++){const [b,h]=elev[i];if(f<=b){const [a,base]=elev[i-1];return base+(h-base)*smooth((f-a)/(b-a))}}return 24}
 function width(f){return half+1.3*bell(f,.183,.04)+.9*bell(f,.503,.065)-.72*bell(f,.677,.036)}
 function bank(f){return .13*bell(f,.098,.024)-.14*bell(f,.208,.034)-.1*bell(f,.30,.032)+.105*bell(f,.38,.028)-.15*bell(f,.54,.033)-.09*bell(f,.635,.035)+.11*bell(f,.682,.028)-.105*bell(f,.81,.024)-.09*bell(f,.92,.035)}
 const pads=[{f:.158,l:-3.8,w:3.6},{f:.523,l:3.65,w:3.35},{f:.858,l:-3.40,w:3.5}];
 const ramps=[{f:.178,l0:-5.9,l1:-1.85,length:6.8,rise:1.35},{f:.544,l0:1.85,l1:5.50,length:5.7,rise:1.13}];
 function surfaceLift(f,l){
  for(const r of ramps){const d=(r.f-f)*length;if(d>=0&&d<=r.length&&l>=r.l0&&l<=r.l1)return r.rise*(1-d/r.length)}
  return 0
 }
 const sections=[[0,'山顶发车台'],[.082,'冰川速降'],[.235,'旗门连弯'],[.365,'白桦谷'],[.482,'冰湖发射台'],[.575,'冰蓝峡谷'],[.725,'缆车登山道'],[.91,'山脊终点弯']];
  function groundOffset(f,l){
   const u=Math.abs(l)-width(f);
   if(u<0)return -.22;
   const a=Math.min(u/4,1),b=Math.min(Math.max(0,u-4)/14,1),side=Math.sign(l);
   const lip=.35+.34*Math.sin(f*2*Math.PI*8+side*2);
   const lo=side>0?-.88+2.2*Math.sin(f*2*Math.PI*2-.55):-.8+2*Math.sin(f*2*Math.PI*3+1.5);
   return -.18+lip*a+lo*b;
  }
 const nets=[[.121,.216,-1],[.262,.325,1],[.491,.563,-1],[.865,.925,1]];
 const defs={id:'summit',name:'雪线速降',english:'Snowline Summit',laps:3,edgeKind:(f,side)=>nets.some(([a,b,d])=>side===d&&f>=a&&f<b)?'rail':'runoff',shoulder:()=>1.32,offroadHeight:groundOffset,half,width,points,height,bank,pads,ramps,sections,surfaceLift,
  coins:[[.072,.18,3],[.147,-.53,3],[.317,-.45,4],[.404,.37,3],[.512,.48,3],[.674,-.25,4],[.838,-.41,3],[.941,.35,3]],itemRows:[.108,.348,.608,.871],surfaces:[{f0:.402,f1:.552,grip:.88,name:'冰湖浅滩'}]};
 defs.build=function(api){
  const {L,at,pt,add}=api;
  const surfaces=new RoadSurfaceIndex();
  const verge=tourVergeLimit(api);
  const bankWidth=(f,side)=>clamp(verge(f,side)-width(f),1.32,20);
  // A continuous terrain grid gently descends away from the road shoulders.
  const step=7,nx=40,nz=41,x0=-140,z0=-135,grid=[];
  const stations=Array.from({length:240},(_,i)=>{const f=i/240,p=at(f*L);return{f,p}});
  function slopeY(x,z){
   let nearest=null,dist2=Infinity;
   for(const k of stations){const dx=x-k.p.x,dz=z-k.p.z,dd=dx*dx+dz*dz;if(dd<dist2){dist2=dd;nearest=k}}
   const p=nearest.p,d=Math.sqrt(dist2),l=(x-p.x)*Math.cos(p.yaw)-(z-p.z)*Math.sin(p.yaw);
   const blend=smooth((d-22)/28);
   return (p.y+Math.sin(p.bank)*l+groundOffset(nearest.f,l)-3.0)*(1-blend)-7.43*blend;
  }
  for(let z=0;z<=nz;z++){const row=[];for(let x=0;x<=nx;x++){const xx=x0+x*step,zz=z0+z*step;row.push([xx,slopeY(xx,zz),zz])}grid.push(row)}
  // Sample the valley in world coordinates. Across a hairpin the nearest
  // road parameter can belong to the other bank, several metres above it.
  function terrainY(xx,zz,maxY=Infinity){
   const base=Math.abs(xx)<=360&&Math.abs(zz)<=360&&maxY>=-7.4?-7.4:null;
   const gx=(xx-x0)/step,gz=(zz-z0)/step,x=Math.floor(gx),z=Math.floor(gz);
   if(x<0||z<0||x>=nx||z>=nz)return base;
   const u=gx-x,v=gz-z,A=grid[z][x][1],B=grid[z+1][x][1],C=grid[z+1][x+1][1],D=grid[z][x+1][1];
   const h=u+v<=1?A+(D-A)*u+(B-A)*v:C+(B-C)*(1-u)+(D-C)*(1-v);
   return h<=maxY&&(base===null||h>base)&&Math.max(A,B,C,D)>-7.4?h:base;
  }
  function landscape(x,z,maxY){
   const ground=terrainY(x,z,maxY),bank=surfaces.heightAt(x,z,maxY);
   return ground===null?bank:bank===null?ground:Math.max(ground,bank);
  }
  function sceneryLift(f,l){
   const p=at(f*L,l),y=landscape(p.x,p.z,Infinity);
   return (y??p.y)-p.y;
  }
  const snow='#f5f4ea',ice='#9bdcde',steel='#3e5465',red='#d94743',gold='#edb749',teal='#258695';
  let seed=36851;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
  const strata=alpineIcePrint(),panes=alpineWindowPrint(),cloth=alpineFlagPrint();
  tourRoad(api,{half,width,road:['#9cb8c9','#9fbacb'],curb:['#df8a70','#ead9c0'],edge:'#648ca6',line:'#f4f4e7',dash:false,pads,tile:3.8,deck:'#a2b8cd',support:surfaces});
  function localize(g,ox,oy,oz){
   let radius=0;
   for(let i=0;i<g.d.length;i+=9){g.d[i]-=ox;g.d[i+1]-=oy;g.d[i+2]-=oz;radius=Math.max(radius,g.d[i]**2+g.d[i+1]**2+g.d[i+2]**2)}
   add(g,ox,oy,oz,0,1,Math.sqrt(radius)+.2);
  }
  function beam(g,a,b,r,c,n=5){g.tube(...a,...b,r,r,c,n)}
  function surfacePoint(s,l,extra=0){return pt(s,l,groundOffset(((s/L)%1+1)%1,l)+extra)}
  // Near snowbanks share the road's elevation and bank. Long ribbons are split into
  // bounded sections, so the mobile renderer can leave the unseen valley walls alone.
  const segments=Math.ceil(L/3.65);
  for(let first=0;first<segments;first+=9){
   const g=new Geo(),last=Math.min(first+9,segments),origin=at((first+last)*.5*L/segments);
   for(let i=first;i<last;i++){
    const s=i*L/segments,t=(i+1)*L/segments,wa=width(i/segments),wb=width((i+1)/segments);
    for(const side of [-1,1]){
     const delta=(d,f)=>d<=1.3?d:1.3+(d-1.3)*(bankWidth(f,side)-1.3)/18.7;
     const rings=[-.12,1.3,4.2,11,20];
     for(let k=0;k<rings.length-1;k++){
      const l0=(wa+delta(rings[k],i/segments))*side,l1=(wa+delta(rings[k+1],i/segments))*side,
            m0=(wb+delta(rings[k],(i+1)/segments))*side,m1=(wb+delta(rings[k+1],(i+1)/segments))*side;
      const shaded=side*Math.cos(at(s).yaw+.66)<-.18;
      const col=(shaded?['#c2d4dc','#d6e0df','#c7d6db','#adbfcd']:['#d9e4e6','#edf0e7','#e1e8e8','#ccdce1'])[k];
      const start=g.d.length;
      g.quad(surfacePoint(s,l0),surfacePoint(s,l1),surfacePoint(t,m1),surfacePoint(t,m0),col);
      surfaces.addGeometry(g,start)
     }
     const rimA=surfacePoint(s,side*(wa+bankWidth(i/segments,side))),rimB=surfacePoint(t,side*(wb+bankWidth((i+1)/segments,side)));
     // Close the shoulder into the rolling terrain, including viewpoints from the valley floor.
     const aa=[rimA[0],rimA[1]-1.8,rimA[2]],bb=[rimB[0],rimB[1]-1.8,rimB[2]];
     g.quad(rimA,rimB,bb,aa,'#c1d2da');
     g.quad(aa,bb,[bb[0],-7.6,bb[2]],[aa[0],-7.6,aa[2]],'#acbdc6');
     // Sparse diagonal groomer strokes and blue course-edge dye are immediately
     // legible even at the native resolution of the lower-end phones.
     if(i%3===0){
      const l=(wa-1.55)*side,r=(wb-1.55)*side;
      for(let j=0;j<2;j++){const d=side*j*.32;
       g.quad(pt(s,l+d,.038),pt(s+.12,l+d+side*.11,.038),pt(t,r+d+side*.73,.038),pt(t-.70,r+d+side*.61,.038),'#bfd1d9')}
     }
     if(i%4<3&&(i/segments<.402||i/segments>.552)){
      const l=side*wa*(.30+.072*Math.sin(s*.029)),r=side*wb*(.30+.072*Math.sin(t*.029));
      g.quad(pt(s,l,.041),pt(s,l+.10,.041),pt(t,r+.12,.041),pt(t,r,.041),'#a0b8c5');
     }
     if(i%2===0&&i/segments>.09&&i/segments<.39){
      const l=(wa-.64)*side;
      g.quad(pt(s+.18,l,.044),pt(s+.18,l+.19*side,.044),pt(t-.35,l+.19*side,.044),pt(t-.35,l,.044),'#729ebf')
     }
    }
   }
   localize(g,origin.x,origin.y,origin.z);
  }
  // A frozen inlet actually crosses the racing line. Fine cracks and frosted sheets
  // distinguish the lower-grip lane from the packed blue snow on either approach.
  for(let j=0;j<4;j++){
   const fs=.402+.15*j/4,fe=fs+.15/4,mid=at((fs+fe)*.5*L),g=new Geo();
   for(let i=0;i<8;i++){const s=(fs+(fe-fs)*i/8)*L,t=(fs+(fe-fs)*(i+1)/8)*L,wa=width(s/L)-.48,wb=width(t/L)-.48;
    g.mat=3;g.quad(pt(s,-wa,.033),pt(s,wa,.033),pt(t,wb,.033),pt(t,-wb,.033),['#89c6d1','#91cbd4','#91cbd4','#91cbd4'][(i+j)%4]);
    if(i%3===1){g.mat=0;let ls=(rand()-.5)*9,first=s+.14;
     for(let k=0;k<3;k++){const end=first+.8+rand()*1.0,le=ls+(rand()-.3)*1.45;
      g.quad(pt(first,ls,.047),pt(first,ls+.047,.047),pt(end,le+.034,.047),pt(end,le,.047),'#c8e4e5');first=end;ls=le}
    }
   }localize(g,mid.x,mid.y,mid.z)
  }
  // Actual kickers and their painted nose: their surfaces and launch line use
  // the same dimensions as the driving model.
  for(const r of ramps){
   const s=r.f*L,r0=s-r.length,g=new Geo(),p=at(s);
   for(let i=0;i<4;i++){const a=r0+r.length*i/4,b=r0+r.length*(i+1)/4,ha=r.rise*i/4+.055,hb=r.rise*(i+1)/4+.055;
    g.quad(pt(a,r.l0,ha),pt(a,r.l1,ha),pt(b,r.l1,hb),pt(b,r.l0,hb),i%2?'#85cdda':'#a8dce4');
    for(const l of [r.l0,r.l1])g.quad(pt(a,l,.036),pt(b,l,.036),pt(b,l,hb),pt(a,l,ha),'#78a7b8');
    const mid=(r.l0+r.l1)/2;g.tri(pt(a+.22,mid-.71,ha+.12),pt(a+.22,mid+.71,ha+.12),pt(b-.04,mid,hb+.08),snow)
   }
   g.quad(pt(s,r.l0,.035),pt(s,r.l1,.035),pt(s,r.l1,r.rise+.057),pt(s,r.l0,r.rise+.057),'#488599');
   localize(g,p.x,p.y,p.z)
  }
  // Sculpted timber chalets. Both gables and the side facing the climb have architecture.
  function chalet(large,roofColor){
   const g=new Geo(),w=large?10.8:6.2,d=large?8.1:5.4,h=large?5.8:3.8,rise=large?3.55:2.45;
   g.box(0,-.28,0,w+1,2.36,d+.55,'#8d8b86');g.box(0,h*.5+.45,0,w,h,d,'#99644d');
   for(let y=1.05;y<h;y+=.67)for(let side of [-1,1])g.box(0,y,side*(d*.5+.035),w,.09,.07,'#b77952');
   for(const side of [-1,1]){
    const zz=side*(d/2+.045);g.tri([-w/2,h+.45,zz],[w/2,h+.45,zz],[0,h+rise+.45,zz],'#9f7357');
    g.box(0,h+.36,zz,w+.22,.22,.15,'#583e37');
    for(let k=-1;k<=1;k++){const x=k*w*.315,wy=h*.57,ww=w*.205;
     g.box(x,wy,zz*1.008,ww,h*.52,.11,'#523e38');
     const z=zz*1.008+side*.072,m=(ww-.23)*.5,n=(h*.52-.25)*.5,cell=(k+1+(large?1:0))%4;
     courseSkinFace(g,[x-m,wy+n,z],[x+m,wy+n,z],[x+m,wy-n,z],[x-m,wy-n,z],panes,cell/4,0,(cell+1)/4,1);
     g.box(x,wy-h*.26-.07,zz*1.04,ww+.28,.14,.28,'#f3e3c5')
    }
    beam(g,[-w*.41,1,zz],[0,h+.20,zz],.13,'#61463b');
    beam(g,[w*.41,1,zz],[0,h+.20,zz],.13,'#61463b');
    for(const x of [-w*.47,w*.47])g.box(x,h*.5+.48,zz,.27,h,.30,'#6d493a')
   }
   for(const side of [-1,1]){
    const x=side*(w/2+.77),z=d/2+.77;
    g.quad([x,h+.20,-z],[x,h+.20,z],[0,h+rise+.60,z],[0,h+rise+.60,-z],roofColor);
    g.quad([x,h+.59,-z],[x,h+.59,z],[0,h+rise+.95,z],[0,h+rise+.95,-z],snow);
    g.quad([x,h+.19,-z],[x,h+.19,z],[x,h+.59,z],[x,h+.59,-z],'#aac6d4');
    g.box(side*(w*.5+.11),h*.37,0,.18,h*.30,d*.55,'#7eacb0');
   }
   g.box(w*.25,h+rise*.65+1.20,d*.26,1.02,2.5,1.10,'#88796d');g.box(w*.25,h+rise*.65+2.5,d*.26,1.40,.32,1.40,snow);
   if(large){
    for(const side of [-1,1]){const z=side*(d*.5+1.6);g.box(0,1.50,z,w+.8,.32,2,'#785443');
     g.box(0,2.65,z+side*.82,w+.8,.13,.17,'#583e38');
     for(let i=0;i<11;i++)g.box((i/10-.5)*(w+.7),2.12,z+side*.82,.13,1.05,.16,'#a57957')
    }
   }
   return g;
  }
  function onBank(f,l,g,yaw=0,sc=1,r=12){
   const p=at(f*L,l);p.y+=sceneryLift(f,l);p.yaw+=yaw;add(g,p.x,p.y,p.z,p.yaw,sc,r*sc);return p
  }
  const lodge=chalet(true,'#863e49'),hut=chalet(false,'#486e7b');
  function placeChalet(f,l,large,a,sc){
   const p=onBank(f,l,large?lodge:hut,a,sc),w=large?10.8:6.2,d=large?8.1:5.4,h=large?5.8:3.8;
   api.solidLocal(p,p.yaw,0,-1.46*sc,0,{tag:'chaletFoundation',halfX:(w+1)*sc/2,halfZ:(d+.55)*sc/2,h:2.36*sc});
   api.solidLocal(p,p.yaw,0,.45*sc,0,{tag:'chaletWall',halfX:w*sc/2,halfZ:d*sc/2,h:h*sc});
   if(large)for(const side of [-1,1])
    api.solidLocal(p,p.yaw,0,1.34*sc,side*(d*.5+1.6)*sc,{tag:'chaletBalcony',halfX:(w+.8)*sc/2,halfZ:sc,h:.32*sc});
  }
  placeChalet(.009,-16.2,true,Math.PI*.5,1.04);placeChalet(.038,-16,false,1.58,.9);
  placeChalet(.402,14.25,false,-1.78,.87);placeChalet(.426,17.0,true,-1.31,.92);
  placeChalet(.795,-16.8,false,1.25,.94);placeChalet(.96,15.3,true,-1.71,.85);
  // Red race clock and a ridge-line emblem on a front-visible gantry.
  const gate=new Geo();for(let side of [-1,1]){
   const x=side*(half+1.6);gate.box(x,3.3,0,.57,6.6,1.08,red);gate.box(x,.55,0,1.13,1.1,1.46,steel);
   gate.box(x,6.9,0,1.6,.45,1.75,snow);gate.box(x,5.9,0,.67,.42,1.16,'#f3dac2');
   beam(gate,[x,4.5,0],[side*(half-1.2),6.25,0],.18,steel)
  }
  gate.box(0,6.25,0,half*2+3.7,1.22,.76,'#304f60');gate.box(0,6.91,0,half*2+4,.18,1.04,snow);
  gate.label('SNOWLINE',0,6.29,-.40,7.65,.99,'#fff0ca');
  for(const side of [-1,1]){let x=side*6;gate.tri([x-1,5.99,-.408],[x,6.68,-.408],[x+1.1,5.99,-.408],ice);gate.tri([x-.2,5.99,-.413],[x+.56,6.48,-.413],[x+1.38,5.99,-.413],snow)}
  const p0=at(0);add(gate,p0.x,p0.y,p0.z,p0.yaw,1,13);
  for(const side of [-1,1]){
   const x=side*(half+1.6);
   api.solidLocal(p0,p0.yaw,x,0,0,{tag:'snowGateFoot',halfX:.565,halfZ:.73,h:1.1});
   api.solidLocal(p0,p0.yaw,x,1.1,0,{tag:'snowGateMast',halfX:.285,halfZ:.54,h:5.5});
  }
  api.solidLocal(p0,p0.yaw,0,5.64,0,{tag:'snowGateSpan',halfX:half+1.85,halfZ:.38,h:1.22});
  // The ski-school penguin wears amber goggles and leans into a turn. It anchors
  // the start enclosure at the driver's-eye level before the lift appears above it.
  function skiPenguin(){
   const g=new Geo();
   for(const side of [-1,1]){
    g.box(side*.56,.11,0,.44,.16,2.62,red,.08*side);
    g.ell(side*.56,.21,-1.28,.22,.12,.33,'#d25952',8,3);
    g.ell(side*.49,.33,-.23,.38,.19,.53,'#e9af55',8,4);
   }
   g.ell(0,1.18,0,.86,1.05,.69,'#3c5669',12,6);
   g.ell(0,1.21,-.29,.70,.91,.52,'#fff0cf',12,6);
   g.ell(.02,2.31,0,.71,.71,.64,'#344e63',12,6);
   for(const side of [-1,1]){
    g.ell(side*.39,2.26,-.33,.33,.42,.29,'#f8efd7',9,5);
    g.ell(side*.76,1.53,.08,.23,.54,.32,'#3d586d',8,5);
   }
   g.ell(0,2.24,-.63,.23,.14,.23,'#eca84d',9,4);
   g.box(0,2.53,-.50,1.17,.29,.25,'#563e40');
   for(let side of [-1,1]){g.mat=3;g.ell(side*.29,2.55,-.58,.28,.17,.11,'#eab757',8,4);g.mat=0}
   g.tube(0,1.84,0,0,2.0,0,.51,.55,'#d75747',12);g.box(-.44,1.62,-.27,.29,.69,.11,'#dc6655');
   return g
  }
  const patrol=skiPenguin();for(const [f,l,a,sc] of [[.017,10.3,.12,1.43],[.39,-9.6,.55,1.02]]){
   const p=onBank(f,l,patrol,a,sc,5);api.solid(p.x,p.y,p.z,{tag:'skiMascot',r:.79*sc,h:2.9*sc});
  }
  // Slalom banners with separate pole, cloth and emblem. Keep gates out of the racing line.
  function banner(col){
   const g=new Geo();
   g.tube(-.67,0,0,-.67,3.35,0,.052,.038,col,5);g.tube(.67,0,0,.67,3.35,.08,.052,.038,col,5);
   const u=col==='#3885a5'?.5:0;
   courseSkinFace(g,[-.67,3.01,.002],[0,2.93,-.14],[0,1.75,-.14],[-.67,1.87,.002],cloth,u,0,u+.25,1);
   courseSkinFace(g,[0,2.93,-.14],[.67,3,.08],[.67,1.91,.08],[0,1.75,-.14],cloth,u+.25,0,u+.5,1);return g;
  }
  const flags=[banner('#d7504c'),banner('#3885a5')],flagFs=[.094,.133,.212,.243,.271,.30,.334,.367,.496,.561,.635,.678,.748,.787,.835,.875,.934];
  flagFs.forEach((f,i)=>{
   const side=i%2?1:-1,p=onBank(f,side*(width(f)+1.25),flags[i%2],i%2?-.18:.26,1,4);
   for(const x of [-.67,.67])api.solidLocal(p,p.yaw,x,0,0,{tag:'slalomPole',r:.052,h:3.35});
  });
  // The flag fabric hangs beyond the rim. Strung safety nets follow the slalom's outer bank.
  for(const [fa,fb,side] of nets){
   const count=Math.ceil((fb-fa)*L/7),g=new Geo(),m=at((fa+fb)*.5*L);
   for(let i=0;i<count;i++){let a=(fa+(fb-fa)*i/count)*L,b=(fa+(fb-fa)*(i+1)/count)*L,la=side*(width(a/L)+1.32),lb=side*(width(b/L)+1.32);
    const A=pt(a,la,.24),B=pt(b,lb,.24);beam(g,A,[A[0],A[1]+1.52,A[2]],.075,red);
    const point=(u,h)=>[A[0]+(B[0]-A[0])*u,A[1]+(B[1]-A[1])*u+h,A[2]+(B[2]-A[2])*u];
    for(let h of [.22,.97,1.42])beam(g,point(0,h),point(1,h),.028,'#dc856d',4);
    for(let j=0;j<3;j++){
     const u=j/3,v=(j+1)/3;
     g.quad(point(u,.20),point(v,1.40),point(v,1.45),point(u,.25),'#d18770');
     g.quad(point(u,1.40),point(v,.20),point(v,.25),point(u,1.45),'#dda38a');
    }
   }
   localize(g,m.x,m.y,m.z)
  }
  // Each spruce uses four chipped tiers. The top face is a snow load, the dark lip
  // underneath keeps the overlapping boughs readable against the mountains.
  function spruce(variant){
   const g=new Geo(),h=6+variant*.45;g.tube(0,0,0,0,h*.52,0,.25,.14,'#806955',6);
   for(let j=0;j<4;j++){
    const y=h*(.21+j*.185),r=h*(.273-j*.044),tip=[.12*Math.sin(j+variant),y+h*(.38-j*.018),0],base=[],upper=[];
    for(let k=0;k<7;k++){const a=k*Math.PI*2/7+j*.29+variant*.21,m=r*(.90+.12*Math.sin(k*2.7+j));
     const yy=y+(k%2?.14:-.05);base.push([Math.sin(a)*m,yy,Math.cos(a)*m]);upper.push([Math.sin(a)*m*.91,yy+.25,Math.cos(a)*m*.91])}
    for(let k=0;k<7;k++){
     const n=(k+1)%7;g.tri([0,y+.02,0],base[k],base[n],'#32585c');g.quad(base[k],base[n],upper[n],upper[k],k%3?'#416c68':'#4c7772');
     g.tri(upper[k],upper[n],tip,k%3===1?'#c1d7dc':k%3===0?'#e3e9e4':'#d1e0e0')
    }
   }
   return g
  }
  const trees=[spruce(0),spruce(1),spruce(2)];
  for(const [fa,fb,side,n] of [[.06,.13,1,5],[.22,.29,-1,5],[.33,.47,-1,10],[.43,.493,1,5],[.691,.811,1,8],[.80,.94,-1,9],[.951,.992,1,3]]){
   for(let j=0;j<n;j+=3){const g=new Geo(),midF=fa+(fb-fa)*(j+1.4)/n,p=at(midF*L,side*(half+9));
    for(let k=j;k<Math.min(j+3,n);k++){const f=fa+(fb-fa)*(k+.5*rand())/n,l=side*(width(f)+3.2+rand()*8.9),q=at(f*L,l),h=sceneryLift(f,l),sz=.79+rand()*.73;
     const dx=q.x-p.x,dy=q.y+h-p.y,dz=q.z-p.z;g.merge(trees[k%3],dx,dy,dz,rand()*6.28,sz);
     // Let the real boughs cast on the slope; a flat painted patch clips through the snow.
     api.solid(q.x,q.y+h,q.z,{tag:'spruceTrunk',r:.25*sz,h:3.4*sz});
    }
    add(g,p.x,p.y,p.z,0,1,25)
   }
  }
  // A fractured blue glacier: dark internal seams, milky aqua faces and a bright cornice.
  function glacier(v){
   const g=new Geo(),n=7,low=[],waist=[],shoulder=[],cap=[];
   const h=7.2+v*2.35,w=4.7+v*.32,d=3.3+v*.29;
   for(let j=0;j<n;j++){
    const a=j*2*Math.PI/n+.31+.17*v,xx=Math.sin(a),zz=Math.cos(a);
    const r=.86+.17*Math.sin(j*3.8+v);low.push([xx*w*r,-1.0,zz*d*r]);waist.push([xx*w*(.85+.13*r),h*.48+.45*Math.sin(j*2.9),zz*d]);shoulder.push([xx*w*.77+.55,h-.52+.52*Math.sin(j*2.5+v),zz*d*.84]);cap.push([xx*w*.57+.6,h+.58+.38*Math.sin(j*3.2),zz*d*.59])
   }
   for(let j=0;j<n;j++){const k=(j+1)%n;
    g.quad(low[j],low[k],waist[k],waist[j],['#659aa9','#70b7c1','#81bdc9'][j%3]);
    const u=(j+v)%3/3;courseSkinFace(g,shoulder[j],shoulder[k],waist[k],waist[j],strata,u,0,u+.32,1);
    g.quad(shoulder[j],shoulder[k],cap[k],cap[j],'#d7e9e6');g.tri(cap[j],cap[k],[.72,h+1.13,.12],snow)
   }
   return g
  }
  const walls=[glacier(0),glacier(1),glacier(2)];
  for(let i=0;i<12;i++){
   const f=.565+i*.0102,side=i%4===0?1:-1,l=side*(width(f)+5.4+rand()*1.8),variant=i%3;
   const yaw=rand()*1.25,sc=.73+.34*rand(),p=onBank(f,l,walls[variant],yaw,sc,13);
   const w=(4.7+variant*.32)*sc,d=(3.3+variant*.29)*sc;
   // Three overlapping lobes fit the chipped toe without boxing off the corners.
   for(const sign of [-1,0,1])api.solidLocal(p,p.yaw,sign*w*.45,-.8*sc,0,
    {tag:'glacierRock',r:(sign?d*.58:d*.86),h:(sign?5.0:7.3)*sc});
  }
  // The ski lift crosses high above the course and disappears into the valley
  // station. Two sagging cable runs use the same curve as the suspended cabins.
  const upper=at(.042*L,15.8),lower=at(.407*L,16.2);
  const A=[upper.x,upper.y+12.9,upper.z],B=[lower.x,lower.y+10.65,lower.z];
  const ex=B[0]-A[0],ez=B[2]-A[2],span=Math.hypot(ex,ez),yaw=Math.atan2(ex,ez),ux=ez/span,uz=-ex/span;
  function cable(u,side){
   const part=u*3,inside=part-Math.floor(part);
   return [A[0]+ex*u+ux*2.02*side,A[1]+(B[1]-A[1])*u-.81*4*inside*(1-inside),A[2]+ez*u+uz*2.02*side]
  }
  function valleyFloor(x,z){
   let nearest=null,best=Infinity;
   for(const s of stations){const d=(x-s.p.x)**2+(z-s.p.z)**2;if(d<best){best=d;nearest=s}}
   const f=nearest.f,p=nearest.p,l=((x-p.x)*Math.cos(p.yaw)-(z-p.z)*Math.sin(p.yaw))/Math.cos(p.bank);
   return at(f*L,l).y+sceneryLift(f,l);
  }
  for(let j=0;j<3;j++){
   const g=new Geo(),p=cable((j+.5)/3,0);
   for(let side of [-1,1])for(let k=0;k<5;k++){
    const a=cable((j+k/5)/3,side),b=cable((j+(k+1)/5)/3,side);
    beam(g,a,b,.075,'#445968',5)
   }
   localize(g,...p)
  }
  for(let i=0;i<4;i++){
   const p=cable(i/3,0),base=valleyFloor(p[0],p[2]),h=Math.max(6.0,p[1]-base),g=new Geo();
   g.box(0,.34,0,2.7,.68,2.65,'#bcc7c9');
   for(let side of [-1,1]){
    beam(g,[side*.99,.43,0],[side*.39,h-1,0],.19,'#667e83',6);
    beam(g,[side*1.48,.43,.68],[side*.40,h-1,0],.11,'#87999a',5);
    for(let k=1;k<4;k++){const y=k*(h-1)/4;beam(g,[side*.79,y,0],[-side*.69,y+(h-1)/4,0],.07,'#7c9194',4)}
    g.tube(side*1.89,h-.05,0,side*2.18,h-.05,0,.39,.39,'#374a58',8)
   }
   g.box(0,h-.36,0,5.1,.38,.59,'#596d76');
   if(i===0||i===3){g.box(0,h-.97,0,6.77,1.76,4.17,'#b03e43');g.box(0,h-.12,0,7.12,.24,4.56,snow);
    for(let k=-2;k<=2;k++)g.box(k*1.03,h-1.0,-2.12,.73,.69,.09,'#a7c8cc')}
   add(g,p[0],p[1]-h,p[2],yaw,1,h+5);
   const origin={x:p[0],y:p[1]-h,z:p[2]};
   api.solidLocal(origin,yaw,0,0,0,{tag:'liftFooting',halfX:1.35,halfZ:1.325,h:.68});
   for(const side of [-1,1])api.solidLocal(origin,yaw,side*.9,.43,0,{tag:'liftLeg',r:.25,h:Math.min(3,h-1)});
   if(i===0||i===3)api.solidLocal(origin,yaw,0,h-1.85,0,{tag:'liftStation',halfX:3.385,halfZ:2.085,h:1.76});
  }
  function gondola(col){
   const g=new Geo(),shape=[[-.86,-.9],[.86,-.9],[1.13,-.60],[1.13,.53],[.81,.91],[-.81,.91],[-1.13,.53],[-1.13,-.60]];
   const rings=[[-2.70,.77],[-2.40,.99],[-1.91,1],[-.96,.88],[-.77,.83]];
   for(let k=0;k<rings.length-1;k++){const [a,sc]=rings[k],[b,sc2]=rings[k+1];for(let j=0;j<8;j++){
    const v=shape[j],w=shape[(j+1)%8];g.mat=k===2?3:0;g.quad([v[0]*sc,a,v[1]*sc],[w[0]*sc,a,w[1]*sc],[w[0]*sc2,b,w[1]*sc2],[v[0]*sc2,b,v[1]*sc2],k===2?(j%2?'#6da8b1':'#87c3c9'):k===0||k===1?col:'#eef0e8');
    if(k===2)g.quad([v[0]*sc,a,v[1]*sc],[v[0]*sc*.94+w[0]*sc*.06,a,v[1]*sc*.94+w[1]*sc*.06],[v[0]*sc2*.94+w[0]*sc2*.06,b,v[1]*sc2*.94+w[1]*sc2*.06],[v[0]*sc2,b,v[1]*sc2],'#3f5964')
   }}
   g.mat=0;g.box(0,-.76,0,1.75,.13,1.52,snow);
   beam(g,[0,-.73,0],[.18,-.18,.12],.085,steel,6);beam(g,[.18,-.18,.12],[0,.005,0],.075,steel,5);
   g.box(0,-.02,0,.45,.15,.52,'#435663');return g;
  }
  const cars=[gondola('#dc6658'),gondola('#ecae48'),gondola('#358f9e')];
  for(let i=0;i<6;i++){
   const mid=cable(.5,0);
   const animate=t=>{
    const phase=(t*.021+i/6)%1;let u,side,turn;
    if(phase<.46){u=phase/.46;side=1;turn=0}
    else if(phase<.50){u=1;turn=(phase-.46)*Math.PI/.04;side=Math.cos(turn)}
    else if(phase<.96){u=1-(phase-.50)/.46;side=-1;turn=Math.PI}
    else{u=0;turn=Math.PI+(phase-.96)*Math.PI/.04;side=Math.cos(turn)}
    const p=cable(u,side);
    p[0]+=2.02*Math.sin(turn)*ex/span;p[2]+=2.02*Math.sin(turn)*ez/span;
    return{x:p[0]-mid[0],y:p[1]-mid[1],z:p[2]-mid[2],roll:.032*Math.sin(t*.93+i),yaw:turn}
   };
   add(cars[i%3],...mid,yaw,1,span*.60+8,animate)
  }
  // An uninterrupted valley floor keeps the track grounded from the high ridge.
  const valley=new Geo();valley.quad([-360,-7.4,-360],[360,-7.4,-360],[360,-7.4,360],[-360,-7.4,360],'#c6d8df');
  add(valley,0,0,0,0,1,512);
  const snowTints=snowpackPalette(grid,step);
  for(let j=0;j<nz;j+=7){for(let i=0;i<nx;i+=7){const g=new Geo(),cx=x0+(i+3.5)*step,cz=z0+(j+3.5)*step;
   for(let z=j;z<Math.min(nz,j+7);z++)for(let x=i;x<Math.min(nx,i+7);x++){
    const a=grid[z][x],b=grid[z+1][x],c=grid[z+1][x+1],d=grid[z][x+1];
    if(Math.max(a[1],b[1],c[1],d[1])<=-7.40)continue;
    snowpackFace(g,a,b,d,snowTints[z][x],snowTints[z+1][x],snowTints[z][x+1]);
    snowpackFace(g,b,c,d,snowTints[z+1][x],snowTints[z+1][x+1],snowTints[z][x+1])
   }
   if(g.d.length)localize(g,cx,0,cz);
  }}
  // The frozen lake lies below the fast half of the circuit. Deep and shallow ice
  // have distinct colors, and large faults branch into finer fissures.
  const lake=new Geo(),center=[-2,-7.05,35],shore=[],inlet=[];
  for(let j=0;j<27;j++){const a=2*Math.PI*j/27,r=1+.085*Math.sin(3*a+.3)+.06*Math.cos(5*a);
   shore.push([Math.sin(a)*28*r,0,Math.cos(a)*31*r]);inlet.push([Math.sin(a)*23*r,.025,Math.cos(a)*27*r])}
  for(let j=0;j<shore.length;j++){
   const k=(j+1)%shore.length;lake.quad(shore[j],shore[k],inlet[k],inlet[j],'#b7d3d9');
   lake.mat=3;lake.tri([-.7,.04,.4],inlet[j],inlet[k],j%4===1?'#81b5c8':'#8cc2d1');lake.mat=0
  }
  const iceWorld=v=>[v[0]+center[0],v[1]+center[1],v[2]+center[2]];
  for(let j=0;j<shore.length;j++){
   const k=(j+1)%shore.length;
   surfaces.addFace(iceWorld(shore[j]),iceWorld(shore[k]),iceWorld(inlet[k]),iceWorld(inlet[j]));
   surfaces.addFace(iceWorld([-.7,.04,.4]),iceWorld(inlet[j]),iceWorld(inlet[k]));
  }
  const crack=(a,b,w)=>{const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz),xx=-dz*w/l,zz=dx*w/l;
   lake.quad([a[0]-xx,.085,a[1]-zz],[b[0]-xx,.085,b[1]-zz],[b[0]+xx,.085,b[1]+zz],[a[0]+xx,.085,a[1]+zz],'#cee4e5')};
  for(let j=0;j<9;j++){const a=j*2*Math.PI/9+.4,b=[Math.sin(a)*19,Math.cos(a)*20],c=[b[0]*.59+1,b[1]*.53-.2],d=[c[0]*.72-1,c[1]*.69+.6];
   crack(b,c,.095);crack(c,d,.06);crack(c,[c[0]+3.7*Math.cos(a),c[1]-3.3*Math.sin(a)],.05)}
  add(lake,...center,0,1,36);
  function peak(h,w,phase){
   const g=new Geo(),sectors=10,rings=[],zs=w*.78;
   for(let level=0;level<4;level++){
    let ring=[];
    for(let j=0;j<sectors;j++){const a=j*2*Math.PI/sectors+.15*level+.1*phase, f=.84+.17*Math.cos(j*1.83+phase)+.09*Math.sin(j*3.2);
     const radii=[1,.57,.31,.125],base=[0,.45,.68,.89],r=radii[level]*f,p=.022*level;
     ring.push([w*(Math.sin(a)*r+p),h*(base[level]+(level?.06*Math.sin(j*3.5+phase):0)),zs*(Math.cos(a)*r-.012*level)])
    }rings.push(ring)
   }
   for(let j=0;j<sectors;j++){const k=(j+1)%sectors;for(let l=0;l<3;l++){const a=rings[l][j],b=rings[l][k],c=rings[l+1][k],d=rings[l+1][j];
    const rock=['#92a5b5','#a2b0be','#8d9eaf','#abbbc4'],fr=['#ccdce0','#e1e6e6','#d7e3e6','#ebebe5'];
    g.tri(a,b,c,l===0?rock[(j+1)%4]:l===1&&j%3===1?'#afc4d0':fr[j%4]);
    g.tri(a,c,d,l===0?rock[j%4]:l===1&&j%3===0?'#a6bac9':fr[(j+2)%4])
   }g.tri(rings[3][j],rings[3][k],[w*.09,h,-zs*.055],j%3?'#e2e9e7':snow)}
   return g;
  }
  for(let i=0;i<14;i++){
   const a=i*2*Math.PI/14+.08*Math.sin(i),r=210+22*Math.sin(i*2.4),w=38+20*rand(),h=58+37*rand()+(i%4===1?30:0);
   add(peak(h,w,i*.67),Math.sin(a)*r,-10.3,Math.cos(a)*r,a+rand()*.45,1,Math.hypot(w,h)+4)
  }
  return (x,z,p,maxY=Infinity)=>Math.abs(p.l)<p.w-.3&&maxY>=p.y?undefined:landscape(x,z,maxY);
 };
 return defs;
}
