// Each part contributes to both the assembled mesh and the vehicle's handling.
const GARAGE = {
  bodies: [
    {name:'标准赛车',en:'Standard Kart',axles:[.81,.76,-.78,.79],kg:91,power:2670,mu:1.50,drag:.79,boost:1.12,lock:.52},
    {name:'水管车架',en:'Pipe Frame',axles:[.81,.76,-.78,.79],kg:76,power:2400,mu:1.57,drag:.84,boost:1.28,lock:.54},
    {name:'马赫八号',en:'Mach 8',axles:[.87,.83,-.85,.84],kg:98,power:3000,mu:1.44,drag:.69,boost:.99,lock:.475},
    {name:'瓢虫车',en:'Biddybuggy',axles:[.72,.64,-.69,.68],kg:69,power:2290,mu:1.60,drag:.90,boost:1.42,lock:.556},
    {name:'运动摩托',en:'Sport Bike',axles:[0,0,-.92,.91],kg:73,power:2710,mu:1.60,drag:.715,boost:1.14,lock:.54},
    {name:'陆行帆船',en:'Landship',axles:[.79,.775,-.72,.77],kg:108,power:2940,mu:1.49,drag:.875,boost:1.24,lock:.504}
  ],
  tires: [
    {name:'标准胎',en:'Standard',r:.350,w:.320,rim:'#d1d7d4',side:'#393f45',type:0,kg:14,mu:.06,drag:.01,boost:0,turn:0},
    {name:'小滚轮',en:'Roller',r:.285,w:.249,rim:'#f8cd48',side:'#aa3437',type:1,kg:8,mu:.16,drag:.028,boost:.15,turn:.021},
    {name:'光头胎',en:'Slick',r:.387,w:.384,rim:'#b2c0cf',side:'#272a3b',type:2,kg:17,mu:.11,drag:-.035,boost:-.09,turn:-.012},
    {name:'越野巨胎',en:'Monster',r:.475,w:.455,rim:'#e9a641',side:'#29363e',type:3,kg:32,mu:.24,drag:.080,boost:-.10,turn:-.034},
    {name:'海绵胎',en:'Sponge',r:.387,w:.341,rim:'#b2afc1',side:'#dbae38',type:4,kg:11,mu:.10,drag:.039,boost:.095,turn:.009}
  ],
  wings: [
    {name:'超级滑翔翼',en:'Super Glider',kg:4,drag:.014,lift:1,boost:0},
    {name:'云朵气球',en:'Cloud Glider',kg:3,drag:.038,lift:1.15,boost:.065},
    {name:'瓦里奥翼',en:'Wario Wing',kg:6,drag:-.020,lift:.94,boost:-.015},
    {name:'纸飞机',en:'Paper Glider',kg:2,drag:-.004,lift:1.09,boost:.055}
  ],
  paints: [
    {name:'宝石红',en:'Ruby',hex:'#d9263b',trim:'#ffdaa0'},
    {name:'海湾蓝',en:'Cobalt',hex:'#277bc5',trim:'#e5f5f3'},
    {name:'常青绿',en:'Viridian',hex:'#338e62',trim:'#ffe9a8'},
    {name:'柑橘黄',en:'Saffron',hex:'#efa727',trim:'#344965'},
    {name:'珠光白',en:'Pearl',hex:'#dfdfce',trim:'#d73742'},
    {name:'熏衣紫',en:'Iris',hex:'#8171c7',trim:'#f3d8a8'},
    {name:'桃花粉',en:'Peony',hex:'#e679a6',trim:'#fff0cc'},
    {name:'曜石黑',en:'Graphite',hex:'#424759',trim:'#e9c267'}
  ]
};
function tune(cfg) {
  const b=GARAGE.bodies[cfg.body]||GARAGE.bodies[0], t=GARAGE.tires[cfg.tire]||GARAGE.tires[0],w=GARAGE.wings[cfg.wing]||GARAGE.wings[0];
  const driverKg=[64,58,55,44,60,98,86,48,93,88,60,44][cfg.driver]||64;
  return {mass:b.kg+t.kg+w.kg+driverKg,engine:b.power+(driverKg-60)*5.4,grip:b.mu+t.mu+(driverKg-60)*.0005,
    aero:b.drag+t.drag+w.drag,turbo:b.boost+t.boost+w.boost,steer:b.lock+t.turn-(driverKg-60)*.00024,lift:w.lift};
}
function garageTone(c,f,white=0) {
  const n=parseInt(c.slice(1),16);
  const ch=(shift)=>Math.floor(Math.min(255,((n>>shift)&255)*f+white)).toString(16).padStart(2,'0');
  return '#'+ch(16)+ch(8)+ch(0);
}
// Four painted 64-pixel panels share each atlas cell. Facial features and
// garment details follow the existing sculpt, including in the software path.
const driverPaintCache=[];
function driverPaint(slot){
 if(driverPaintCache[slot])return driverPaintCache[slot];
 const row=slot>>2,col=slot%4;
 const cell=finishTile('driver-art-'+row,(ctx)=>{
  for(let k=0;k<4;k++){
   ctx.save();ctx.translate(k*64,0);ctx.beginPath();ctx.rect(0,0,64,64);ctx.clip();
   paintDriverPanel(ctx,row*4+k);ctx.restore();
  }
 });
 const dx=(cell[2]-cell[0])/255,dy=(cell[3]-cell[1])/63;
 return driverPaintCache[slot]=[cell[0]+dx*col*64,cell[1],cell[0]+dx*(col*64+63),cell[1]+dy*63];
}
function paintDriverPanel(c,slot){
 const brush=(color,points)=>{
  c.beginPath();c.moveTo(...points[0]);
  for(let i=1;i<points.length;i++){const p=points[i];if(p.length===2)c.lineTo(...p);else c.bezierCurveTo(...p)}
  c.closePath();c.fillStyle=color;c.fill();
 };
 const line=(color,w,pts)=>{c.beginPath();c.lineCap='round';c.lineJoin='round';c.moveTo(...pts[0]);for(let i=1;i<pts.length;i++){const p=pts[i];if(p.length===2)c.lineTo(...p);else c.bezierCurveTo(...p)}c.strokeStyle=color;c.lineWidth=w;c.stroke()};
 const oval=(color,x,y,a,b)=>{c.beginPath();c.ellipse(x,y,a,b,0,0,TAU);c.fillStyle=color;c.fill()};
 const base=(top,middle,bottom)=>{
  const grad=c.createLinearGradient(10,0,40,64);
  if(grad){grad.addColorStop(0,top);grad.addColorStop(.55,middle);grad.addColorStop(1,bottom)}
  c.fillStyle=grad||middle;c.fillRect(0,0,64,64);
 };
 if(slot<=3||slot===6||slot===8||slot===9){
  const peach=slot===2||slot===9,toad=slot===3,gorilla=slot===6,metal=slot===8||slot===9;
  const contour=metal?(slot===8?'#485866':'#744656'):gorilla?'#6b4433':'#743d36';
  const dark=metal?contour:'#282431',white=metal?(slot===8?'#d6e1e6':'#ffd6c6'):'#fff9e7';
  if(metal)base(slot===8?'#c7d4da':'#e6ab9f',slot===8?'#b4c2ca':'#d29a92',slot===8?'#7f8a97':'#ae7674');
  else if(gorilla)base('#a86445','#d09a67','#ba8056');
  else if(peach)base('#f8ca9c','#ffd6b0','#edaf8e');
  else base('#efaa82','#ffc497','#ecaa80');
  if(toad){
   for(const side of [-1,1]){const x=32+side*12.4;oval('#72493a',x,28,3.05,6.0);oval('#302836',x,27.1,2.35,5);oval(white,x-.65,24.8,.88,1.52);oval('#ec9d82',32+side*20,41,4.1,1.55)}
   brush('#7b433e',[[23,42],[27,44,37,44,41,40],[40,50,28,54,23,42]]);
   brush('#e97672',[[27,47],[31,44,36,44,38,45],[34,50,29,50,27,47]]);
  }else{
   for(const side of [-1,1]){
    c.save();c.translate(32,0);c.scale(side,1);
    const x=gorilla?10.1:peach?12:12.7,ey=gorilla?23:peach?27:24.5,sx=peach?6.35:gorilla?5.0:6.0,sy=gorilla?6:peach?7.6:8.4;
    oval(contour,x,ey+.5,sx+.52,sy+.72);oval(white,x,ey,sx,sy);
    oval(gorilla?'#875b3d':metal?contour:'#489ab9',x-.25,ey+.4,sx*.62,sy*.82);
    oval(dark,x-.2,ey-.25,sx*.33,sy*.62);oval(white,x-1.5,ey-2.6,sx*.20,sy*.22);
    if(peach){
     line(contour,1.1,[[x-sx,ey-2],[x-2,ey-sy-2,x+sx-1,ey-sy-2,x+sx,ey-2.5]]);
     line(contour,1.3,[[x+sx-1,ey-4],[x+sx+2.5,ey-7.2]]);line(contour,.95,[[x+sx-2,ey-5],[x+sx+.8,ey-8.9]]);
     line(metal?contour:'#cf9255',1.12,[[x-4.6,ey-11.0],[x-.2,ey-14,x+3.0,ey-13,x+5.2,ey-10.7]]);
    }else{
     const h=(slot===1?1.1:0);
     brush(contour,[[x-sx,ey-sy-2+h],[x-2,ey-sy-6+h,x+3,ey-sy-6,x+sx+1,ey-sy-3],[x+sx,ey-sy-1.4],[x+1,ey-sy-3.9,x-1.3,ey-sy-2.8,x-sx,ey-sy+.6+h]]);
    }
    if(!metal&&!gorilla)oval(peach?'#f0aa99':'#ed9e7d',21,37,4.0,1.51);
    c.restore();
   }
   if(peach){
    line(metal?contour:'#c48a74',.9,[[30.8,36],[31.4,37.6,33.5,37.5,34.3,36.7]]);
    brush(metal?'#a97678':'#bf6469',[[26,44],[29,43,30,42,32,43],[34,42,35,43,38,43.3],[36,46,29,48,26,44]]);
    line(metal?'#ecc3bc':'#ffd1bb',1,[[30,45.3],[34.4,45.1]]);
   }else if(!gorilla)line(contour,1.25,[[24.5,48],[29,51,35,50.3,39.3,46.4]]);
  }
  return;
 }
 if(slot===4||slot===5||slot===7){
  const bowser=slot===5;
  base(bowser?'#e5be8a':'#f6e9c7','#fff9df',bowser?'#dbb77e':'#e4d6b5');
  const x=bowser?33:31;
  oval(bowser?'#b52f29':'#344037',x,32,slot===7?9:10,slot===5?17:20.8);
  oval(bowser?'#4c2727':'#18252e',x,31.1,slot===7?5.2:6.2,slot===5?12:16.4);
  oval('#fff7dd',x-2.7,23.3,2.5,3.8);oval(bowser?'#e87542':'#81ad9c',x+2.2,43.6,2.25,1.6);
  if(bowser){brush('#a6402e',[[0,0],[64,0],[64,14],[3,30]]);line('#652d28',1.8,[[2,30],[62,14]])}
  return;
 }
 if(slot===10||slot===11||slot===12){
  const color=slot===11?'#18813b':slot===12?'#637584':'#ce2437';
  c.clearRect(0,0,64,64);oval(slot===12?'#8999a6':'#d4b995',32,34,25.5,23);
  oval(slot===12?'#d0dfe0':'#fff5d9',32,31.8,25,22.2);
  if(slot===11)brush(color,[[23,17],[30,17],[28.5,39],[42,39],[41,46],[20,46]]);
  else brush(color,[[14,44],[18,18],[25,18],[32,30],[40,18],[47,18],[50,44],[42,44],[40,29],[32,41],[24,29],[22,44]]);
  return;
 }
 if(slot===13){
  base('#e73a36','#c72c2d','#b0252a');line('#e85748',1,[[4,2],[32,59],[61,1]]);
  brush('#ffd353',[[11,20],[25,20],[35,23,36,39,24,42],[11,42]]);brush('#c33230',[[18,25],[23,25],[29,26,29,35,22,37],[18,37]]);
  brush('#ffd353',[[36,20],[42,20],[42,29],[49,20],[56,20],[48,30],[57,42],[49,42],[42,33],[42,42],[36,42]]);return;
 }
 if(slot===14||slot===15){
  const spiked=slot===15; base(spiked?'#82914c':'#6da947',spiked?'#527a43':'#44954d',spiked?'#385a39':'#307544');
  const points=[[32,12],[47,21],[47,39],[32,49],[17,39],[17,21],[32,12]];
  brush(spiked?'#628548':'#4e9b4d',points);
  line(spiked?'#3a5836':'#286b3c',1.5,points);
  line(spiked?'#8eaa67':'#88be6d',.85,[[18,22],[32,13],[46,21]]);
  for(const [x,y,ex,ey] of [[32,12,32,0],[47,21,63,14],[47,39,63,52],[32,49,32,64],[17,39,1,52],[17,21,0,14]])line('#316640',1.16,[[x,y],[ex,ey]]);
  return;
 }
 if(slot===16){
  base('#245e9d','#265f9c','#184a80');
  line('#e2ae68',1.05,[[13,22],[51,22],[49,38],[32,45],[15,39],[13,22]]);
  line('#6a8fb3',1,[[14,25],[50,25]]);
  for(const x of [13,51])oval('#d8b17b',x,22,1.6,1.6);return;
 }
 if(slot===17){
  base('#e6a42c','#ffc849','#e8a82e');
  for(let k=0;k<6;k++){const x=4+k*11;line(k%2?'#e9aa38':'#f9dd76',1.35,[[x,4],[x+8,20,x-7,37,x-1,59]])}
  return;
 }
 if(slot===18){
  base('#945a39','#8c5134','#78452e');
  for(let i=0;i<17;i++){const x=5+(i*17%56),y=6+(i*13%49);line(i%3?'#955e3c':'#aa724b',1.45,[[x-2,y],[x+.4,y+3],[x+2.7,y-.5]])}
  return;
 }
 base('#2364a2','#326fae','#20538d');
 line('#86a8bb',1,[[5,47],[15,51,24,52,32,51],[45,55,54,51,60,47]]);
}
// Bind the paint to the front (or back) hemisphere of an existing ellipsoid.
// The silhouettes, smooth normals, instancing and shadow footprint stay intact.
function driverSkin(g,from,slot,x,y,z,rx,ry,side=1){
 const uv=driverPaint(slot),d=g.d;
 for(let i=from;i<d.length;i+=27){
  if(side*(d[i+2]+d[i+11]+d[i+20]-3*z)<0)continue;
  for(let k=i;k<i+27;k+=9){
   d[k+3]=d[k+4]=d[k+5]=1;
   const u=clamp(.5-side*(d[k]-x)/(2*rx),0,1),v=clamp(.5-(d[k+1]-y)/(2*ry),0,1);
   d[k+6]=mix(uv[0],uv[2],u);d[k+7]=mix(uv[1],uv[3],v);
  }
 }
}

// The cap texture uses the cap's own normals. Its spots continue across the
// crown and shoulder rather than becoming polygon discs on the silhouette.
function mushroomFinish(g,from,blue,x,y,z,rx,ry,rz){
 const t=finishTile('driver-mushroom-caps',(c)=>{
  const image=c.createImageData(256,64);if(!image)return;
  const centers=Array.from({length:5},(_,i)=>[Math.sin(i*TAU/5)*.985,.172,Math.cos(i*TAU/5)*.985]);
  for(let row=0;row<64;row++){
   const phi=Math.PI*(.5-row/63),py=Math.sin(phi),cp=Math.cos(phi);
   for(let col=0;col<256;col++){
    const cool=col>=128,theta=(col%128)/127*TAU-Math.PI,px=Math.sin(theta)*cp,pz=Math.cos(theta)*cp;
    let dot=py;for(const n of centers)dot=Math.max(dot,px*n[0]+py*n[1]+pz*n[2]);
    const d=clamp((dot-.902)/.024,0,1),rim=clamp((py+.62)/.52,0,1),shine=.92+.092*py-.035*px;
    const cloth=[255,244,216],spot=cool?[44,116,204]:[213,48,51],under=[181,145,125];
    const i=4*(row*256+col);
    for(let a=0;a<3;a++)image.data[i+a]=mix(under[a],mix(cloth[a],spot[a],d),.68+.32*rim)*shine;
    image.data[i+3]=255;
   }
  }
  // putImageData ignores the current transform. A local offscreen surface
  // lets finishTile position this complete pattern in the shared atlas.
  const temp=document.createElement('canvas');temp.width=256;temp.height=64;
  temp.getContext('2d').putImageData(image,0,0);c.drawImage(temp,0,0);
 });
 const D=g.d,u0=t[0]+(t[2]-t[0])*(blue?128:0)/255,u1=t[0]+(t[2]-t[0])*(blue?255:127)/255;
 for(let i=from;i<D.length;i+=27){
  const angles=[],heights=[];
  for(let k=0;k<3;k++){
   const a=i+k*9,h=clamp((D[a+1]-y)/ry,-1,1);
   heights.push(h);angles.push(Math.atan2((D[a]-x)/rx,(D[a+2]-z)/rz)/TAU+.5);
  }
  const side=angles.some((u,j)=>Math.abs(heights[j])<.9999&&u<.25);
  for(let j=0;j<3;j++)if(side&&angles[j]>.75)angles[j]-=1;
  for(let j=0;j<3;j++){
   const k=i+j*9,u=Math.abs(heights[j])>.9999?(angles[(j+1)%3]+angles[(j+2)%3])*.5:angles[j];
   D[k+3]=D[k+4]=D[k+5]=1;
   D[k+6]=mix(u0,u1,clamp(u,0,1));D[k+7]=mix(t[1],t[3],.5-Math.asin(heights[j])/Math.PI);
  }
 }
}

function driverDecal(g,slot,point,nx,ny){
 const uv=driverPaint(slot),white=rgb('#fff');
 const grid=Array.from({length:ny+1},(_,y)=>Array.from({length:nx+1},(_,x)=>point(x/nx,y/ny)));
 const surface=grid.map((row,y)=>row.map((p,x)=>{
  const a=row[Math.max(0,x-1)],b=row[Math.min(nx,x+1)],c=grid[Math.max(0,y-1)][x],d=grid[Math.min(ny,y+1)][x];
  const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=d[0]-c[0],vy=d[1]-c[1],vz=d[2]-c[2];
  return rubyNormal(uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx);
 }));
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  for(const [i,j] of [[x,y],[x+1,y],[x+1,y+1],[x,y],[x+1,y+1],[x,y+1]])
   g.push(grid[j][i],white,1,mix(uv[0],uv[2],i/nx),mix(uv[1],uv[3],j/ny),g.mat,surface[j][i]);
 }
}
// Character and vehicle meshes. The eight different silhouettes also read from a chase camera.
function rubyRider(driverIndex, lod = 0) {
  const g = new Geo();
  const k = [0,1,2,3,4,5,6,7,0,2,4,3][driverIndex] ?? 0;
  g.mat=.25; // Rider surfaces retain skylight under the cap and scenery.
  const high = !lod, low = lod >= 2;
  const WHITE='#fff4d7', skin='#ffb984', hair='#663622';
  const E=(x,y,z,rx,ry,rz,c,n=10,m=5)=>g.ell(x,y,z,rx,ry,rz,c,Math.max(low?5:6,n-(low?4:lod?2:n>=9?1:0)),Math.max(3,m-(low?3:lod?1:0)));
  const C=(a,b,r,s,c,n=8)=>g.tube(...a,...b,r,s,c,Math.max(low?4:5,n-(low?3:lod?2:0)));
  const Q=(a,b,c,d,col)=>g.quad(a,b,c,d,col);
  const T=(a,b,c,col)=>g.tri(a,b,c,col);
  function painted(slot,x,y,z,rx,ry,rz,color,n=10,m=5,side=1){
    const from=g.d.length;E(x,y,z,rx,ry,rz,color,n,m);
    if((driverIndex!==8&&driverIndex!==9)||slot===8||slot===9)driverSkin(g,from,slot,x,y,z,rx,ry,side);
  }
  function arm(s, shoulderY, cloth, glove, long=false) {
    const first=g.d.length,shoulder=[s*.27,shoulderY,-.04],elbow=[s*(long?.43:.37),shoulderY-.15,.205],hand=[s*.245,1.04,.48];
    // Five cross-sections shape the sleeve's turn into the forearm. The
    // exterior keeps one normal field across the elbow when the light moves.
    const mixPoint=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
    const centers=[shoulder,mixPoint(shoulder,elbow,.48),elbow,mixPoint(elbow,hand,.63),hand];
    const radii=[long?.143:.130,long?.146:.13,long?.126:.110,.093,.077];
    const col=rgb(cloth),n=low?5:7,rings=centers.map((v,i)=>{
      const p=centers[Math.max(0,i-1)],q=centers[Math.min(4,i+1)];
      let dx=q[0]-p[0],dy=q[1]-p[1],dz=q[2]-p[2],len=Math.hypot(dx,dy,dz);
      dx/=len;dy/=len;dz/=len;const flat=Math.hypot(dx,dz),ax=dz/flat,az=-dx/flat;
      return Array.from({length:n},(_,j)=>{
        const a=j*TAU/n,cs=Math.cos(a),sn=Math.sin(a),x=ax*cs+dy*az*sn,y=(dz*ax-dx*az)*sn,z=az*cs-dy*ax*sn,r=radii[i];
        return [[v[0]+x*r,v[1]+y*r,v[2]+z*r],rubyNormal(x,y,z)];
      });
    });
    for(let k=0;k<4;k++)for(let j=0;j<n;j++){
      const next=(j+1)%n;
      for(const [row,it] of [[k,j],[k,next],[k+1,next],[k,j],[k+1,next],[k+1,j]]){
        const v=rings[row][it];g.push(v[0],col,1,-1,0,g.mat,v[1]);
      }
    }
    E(...hand,.110,.095,.124,glove,8,4);
    if(high){
      if(glove===WHITE){
        C([s*.290,1.044,.388],[s*.267,1.044,.443],.111,.117,'#e1dac4',7);
        E(s*.175,1.063,.455,.063,.053,.072,glove,7,3);
        for(const d of [-1,1]){
          const x=s*(.248+d*.021);
          Q([x-.006,1.131,.466],[x+.005,1.131,.466],[x+.004,1.127,.508],[x-.005,1.127,.508],'#adafa9');
        }
      }else{
        E(s*.177,1.069,.463,.057,.048,.066,glove,6,3);
      }
    }
    (g.arms||=[]).push({first,last:g.d.length,shoulder,hand});
  }
  // The peaked cap has a fitted band, an asymmetric crown and sewn gores. Coloured
  // seams follow the actual surface instead of hovering above the back of the head.
  function racingCap(h,cloth,luigi){
    const n=20;
    const profile=[[-.132,.272,.251,-.058],[-.111,.322,.283,-.052],[-.062,.350,.313,-.042],
      [.035,.365,.332,-.022],[.122,.337,.316,-.006],[.196,.257,.245,.002],[.231,.141,.134,.001],[.240,.012,.013,.001]];
    const ring=(row,a,swell=1)=>{
      const [y,rx,rz,z]=profile[row],front=Math.cos(a);
      return [rx*Math.sin(a)*swell,1.867+h+y+front*.020*Math.sin(row*Math.PI/7),z+rz*front*swell];
    };
    const ns=profile.map((_,i)=>Array.from({length:n},(_,j)=>{
      const a=j*TAU/n,p=ring(Math.max(0,i-1),a),q=ring(Math.min(i+1,profile.length-1),a);
      return rubyNormal(Math.sin(a)*(q[1]-p[1]),-((q[0]-p[0])*Math.sin(a)+(q[2]-p[2])*Math.cos(a)),Math.cos(a)*(q[1]-p[1]));
    }));
    for(let i=0;i<profile.length-1;i++)for(let j=0;j<n;j++){
      const next=(j+1)%n,shade=i<2?.74+.08*i:1+(j%5===4?-.025:0),col=rgb(garageTone(cloth,shade,0));
      for(const [k,v] of [[i,j],[i,next],[i+1,next],[i,j],[i+1,next],[i+1,j]])g.push(ring(k,v*TAU/n),col,1,-1,0,g.mat,ns[k][v]);
    }
    for(const a of [-2.13,2.13,Math.PI])for(let i=2;i<profile.length-2;i++){
      const spread=.019;Q(ring(i,a-spread,1.009),ring(i,a+spread,1.009),ring(i+1,a+spread,1.009),ring(i+1,a-spread,1.009),garageTone(cloth,.83,9));
    }
    const slot=driverIndex===8?12:luigi?11:10;
    driverDecal(g,slot,(u,v)=>{
      const y=.181-.133*v,sampling=y-.014,idx=profile.findIndex(p=>p[0]>=sampling);
      const t=clamp((sampling-profile[idx-1][0])/(profile[idx][0]-profile[idx-1][0]),0,1);
      const theta=(.5-u)*1.11,p=ring(idx-1,theta,1.019),q=ring(idx,theta,1.019);
      return p.map((a,k)=>mix(a,q[k],t));
    },4,3);
    E(0,1.804+h,.225,.345,.067,.233,garageTone(cloth,.68),16,5);
    E(0,1.821+h,.228,.345,.067,.234,cloth,16,5);
    E(0,2.114+h,.006,.046,.020,.041,garageTone(cloth,.85),8,3);
    const band=luigi?'#137c36':'#b91e2d';
    E(0,1.761+h,-.077,.317,.05,.252,band,14,4);
    for(const s of [-1,1])E(s*.309,1.777+h,.081,.024,.027,.025,'#e8aa50',6,3);
  }
  if(k===0 || k===1){
    const luigi=k===1,h=luigi?.085:0, shirt=luigi?'#1aab4b':'#ec2932', denim='#1758a6';
    E(0,1.09,0,.315,.405+h*.4,.245,shirt,12,6);
    E(0,.915,-.003,.327,.26,.26,denim);
    // Bib overalls continue across the back, distinct from the red engine cover.
    painted(16,0,1.012,-.173,.273,.206,.087,'#18509a',10,5,-1);
    for(const s of [-1,1]){
      C([s*.166,1.04,-.21],[s*.193,1.29+h*.4,-.189],.053,.048,denim,7);
      C([s*.193,1.29+h*.4,-.189],[s*.199,1.315+h*.4,.12],.046,.047,denim,7);
      if(high) E(s*.177,1.13,.221,.034,.035,.019,'#f4b938',6,4);
      arm(s,1.26+h*.4,shirt,WHITE);
      E(s*.14,.704,.42,.145,.12,.237,'#7b4529',8,4);
    }
    if(high){
      // The front bib is broad enough to read in the menu's three-quarter view.
      E(0,1.055,.187,.223,.215,.072,denim,12,6);
      for(const side of [-1,1]){
        C([side*.194,1.32+h*.4,.095],[side*.168,1.176,.220],.044,.045,denim,7);
        E(side*.155,1.166,.240,.037,.036,.014,'#f3bd48',7,4);
      }
      Q([-.173,1.02,-.242],[0,.989,-.268],[.171,1.02,-.242],[0,.954,-.266],'#3468a5');
      for(const side of [-1,1]){
        E(side*.153,1.055,-.241,.079,.065,.019,'#1d5392',8,3);
        C([side*.108,1.103,-.250],[side*.181,1.111,-.225],.012,.012,'#e2a739',5);
        E(side*.24,1.259+h*.4,-.149,.114,.105,.106,garageTone(shirt,1,8),9,4);
      }
    }
    const headStart=g.d.length;
    painted(driverIndex===8?8:luigi?1:0,0,1.595+h,.005,.300,.314,.277,skin,14,8);
    E(0,1.676+h,-.096,.299,.238,.233,'#70412b',12,6);
    for(const s of [-1,1]){
      E(s*.277,1.59+h,.002,.095,.123,.070,skin,9,5);
      E(s*.293,1.547+h,.102,.042,.084,.076,hair,8,4);
    }
    for(let i=-2;i<=2;i++){
      E(i*.102,1.527+h+Math.abs(i)*.015,-.24+Math.abs(i)*.038,.083,.099,.065,hair,8,4);
    }
    if(high){
      racingCap(h,shirt,luigi);
      for(const sign of [-1,1]){
        E(sign*.313,1.59+h,.023,.064,.074,.058,'#e29574',8,4);
      }

      // Luigi's whisker sweeps up in a single point. Mario has a fuller,
      // scalloped silhouette under his nose.
      const lip=luigi?'#51372a':'#4e2e24';
      for(const sign of [-1,1]){
        const edge=luigi?[[.013,1.546,.294],[.082,1.55,.288],[.151,1.55,.266],[.236,1.594,.196],[.189,1.534,.231],[.106,1.518,.272],[.034,1.522,.292]]:
          [[.012,1.555,.299],[.094,1.557,.285],[.170,1.565,.255],[.237,1.591,.207],[.225,1.547,.215],[.193,1.526,.243],[.164,1.539,.257],[.135,1.508,.270],[.102,1.53,.280],[.070,1.505,.286],[.028,1.525,.297]];
        E(sign*.079,1.54+h,.280,.102,.057,.043,lip,8,4);
        const mid=[sign*.106,1.542+h,.317];
        for(let i=0;i<edge.length;i++){
          const pts=[edge[i],edge[(i+1)%edge.length]].map(([x,y,z])=>[sign*x,y+h,z]);
          T(mid,pts[0],pts[1],lip);
        }
      }
      E(0,1.621+h,.322,luigi?.123:.145,luigi?.111:.119,.129,skin,12,6);
      E(-.016,1.655+h,.433,.039,.020,.016,'#ffce9f',8,3);
    }else{
      E(0,1.864+h,-.025,.351,.243,.331,shirt,14,7);
      E(0,1.785+h,.217,.333,.073,.224,shirt,12,5);
      E(0,1.783+h,-.065,.320,.063,.272,luigi?'#16863b':'#b51f2c',12,4);
      E(0,1.608+h,.30,.132,.107,.114,skin);
      for(const sign of [-1,1])E(sign*.098,1.533+h,.262,.126,.060,.056,'#4a2a22',9,4);
    }
    if(!high)driverDecal(g,driverIndex===8?12:luigi?11:10,(u,v)=>{
      const x=(.5-u)*.30,y=1.99+h-v*.15;
      return [x,y,-.025+.342*Math.sqrt(Math.max(.02,1-(x/.351)**2-((y-1.864-h)/.243)**2))];
    },3,2);
    const headX=luigi?1.18:1.27,headY=luigi?1.19:1.13;
    for(let n=headStart;n<g.d.length;n+=9){
      g.d[n]*=headX;g.d[n+1]=1.42+(g.d[n+1]-1.42)*headY;g.d[n+2]*=1.20;
      const i=n/9,normal=g.norm[i];
      g.norm[i]=rubyNormal(((normal&255)-128)/headX,(((normal>>8)&255)-128)/headY,(((normal>>16)&255)-128)/1.20,!!(normal&(1<<24)));
    }

  } else if(k===2){
    const gold='#f6b82c';
    E(0,.90,-.03,.39,.28,.34,'#f67caf');
    E(0,1.215,.014,.265,.308,.208,'#f489bb');
    painted(driverIndex===9?9:2,0,1.62,.025,.268,.311,.246,'#ffd2a5',13,7);
    E(0,1.68,-.080,.317,.342,.252,gold,12,6);
    for(const s of [-1,1]){
      E(s*.236,1.55,-.046,.104,.258,.136,'#ffd04a');
      E(s*.276,1.56,.122,.052,.071,.040,'#43c7dd');
      E(s*.257,1.29,0,.148,.14,.13,'#ed62a6');
      arm(s,1.263,'#ffe4bb',WHITE);
      E(s*.105,1.80,.204,.139,.090,.092,'#ffcd42');
    }
    painted(17,0,1.302,-.264,.234,.36,.19,'#ffc83c',12,6,-1);
    E(0,1.587,.257,.049,.046,.048,'#ffc39d',8,4);
    // Pearl collar and a raised blue brooch read clearly above the cockpit.
    C([0,1.347,.05],[0,1.37,.05],.183,.147,'#fff2db',10);
    E(0,1.48,-.35,.124,.075,.099,'#df6782');
    E(0,1.315,.225,.081,.089,.027,'#e5ac36',8,4);
    E(0,1.319,.245,.065,.073,.026,'#329bbf',8,4);
    // A single crenellated gold circlet, open between its points; side
    // gems have visible settings and a narrow warm return along the inside.
    const crownPoint=(j,inner=false)=>{
      const a=j*TAU/10,tip=j%2===0,r=(tip?.183:.151)-(inner?.016:0);
      return [r*Math.sin(a),tip?2.205:2.035,-.006+r*Math.cos(a)];
    };
    const band=(j,y,r)=>{const a=j*TAU/10;return [r*Math.sin(a),y,-.006+r*Math.cos(a)]};
    for(let j=0;j<10;j++){
      const l=(j+1)%10,A=band(j,1.945,.138),B=band(l,1.945,.138),D=crownPoint(j),C=crownPoint(l);
      Q(A,B,C,D,j%2?'#f7bf3a':'#ffd76b');Q(D,C,crownPoint(l,true),crownPoint(j,true),'#ffea99');
      Q(crownPoint(j,true),crownPoint(l,true),band(l,1.956,.124),band(j,1.956,.124),'#c58633');
    }
    if(high){
      C([0,1.974,-.006],[0,1.997,-.006],.164,.165,'#ffe294',12);
      for(const s of [-1,1]){
        E(s*.116,1.35,-.399,.089,.241,.074,'#f3b030',10,5);
        E(s*.167,1.386,-.336,.095,.195,.087,'#ffcf4a',10,5);
        E(s*.265,1.63,-.05,.084,.042,.077,'#ecc335',8,4);
      }
      E(0,1.45,-.42,.073,.062,.059,'#9c5091',8,4);
    }
    for(let i=0;i<5;i++){
      const t=i*TAU/5,x=.154*Math.sin(t),z=-.006+.154*Math.cos(t);
      E(x,2.014,z,.043,.054,.039,gold,8,4);
      E(x*1.065,2.014,z*1.065,.034,.041,.036,i%2?'#2a98bf':'#c64b66',7,4);
      if(Math.cos(t)>.15){
        const px=x*1.08-.008,pz=z*1.08+.024;
        T([px-.009,2.027,pz],[px,2.042,pz],[px+.009,2.029,pz],'#ffedcf');
      }
    }
  } else if(k===3){
    E(0,.913,0,.304,.24,.25,'#f5efdc');
    E(0,1.155,0,.279,.244,.247,skin);
    painted(19,0,1.16,-.092,.293,.215,.196,'#275ec5',10,5,-1);
    for(const s of [-1,1]){
      C([s*.21,1.30,.07],[s*.165,1.025,.198],.044,.042,'#ecc245',7);
      arm(s,1.19,skin,skin);
      E(s*.14,.71,.36,.148,.12,.216,'#966033',8,4);
    }
    painted(3,0,1.52,.015,.267,.25,.246,skin,12,6);
    const capStart=g.d.length;E(0,1.85,-.018,.461,.35,.427,'#fff2d8',16,8);
    mushroomFinish(g,capStart,driverIndex===11,0,1.85,-.018,.461,.35,.427);
  } else if(k===4){
    const green='#51ad39';
    E(0,1.03,-.018,.286,.355,.245,green);
    E(0,1.03,.128,.202,.29,.166,'#fff2c9');
    E(0,1.125,-.241,.20,.16,.074,WHITE);
    E(0,1.125,-.29,.166,.126,.047,'#e64a36');
    E(0,1.33,.023,.196,.262,.18,green);
    E(0,1.61,.043,.282,.297,.231,green);
    for(const s of [-1,1]){
      painted(4,s*.13,1.808,.103,.13,.205,.112,'#f8f3d7',11,6);
      E(s*.177,1.596,.103,.14,.13,.117,'#fff2cf');
      arm(s,1.19,green,green);
      E(s*.149,.723,.397,.146,.149,.219,'#e88020');
    }
    E(0,1.646,.294,.257,.198,.20,green);
    for(const s of [-1,1]){
      Q([s*.09,1.521,.446],[s*.186,1.528,.386],[s*.191,1.536,.382],[s*.09,1.527,.446],'#4c6b32');
    }
    for(const s of [-1,1]) E(s*.074,1.706,.469,.025,.024,.014,'#477331',7,4);
    for(let i=0;i<3;i++) C([0,1.44+i*.122,-.135],[0,1.484+i*.13,-.321],.100-i*.012,.009,'#df6432',7);
    C([0,.89,-.19],[0,.99,-.522],.165,.018,green,8);
  } else if(k===5){
    const gold='#eab043',green='#51813d',spikes='#f7ddb0';
    E(0,1.048,0,.396,.37,.286,gold);
    E(0,1.29,-.196,.491,.443,.286,spikes,12,7);
    painted(15,0,1.29,-.235,.449,.406,.283,green,12,7,-1);
    for(const [x,y,z,ex,ey,ez,r] of [[0,1.51,-.412,0,1.63,-.654,.125],[-.269,1.40,-.40,-.37,1.46,-.605,.11],[.269,1.40,-.40,.37,1.46,-.605,.11],[-.24,1.17,-.43,-.345,1.13,-.606,.101],[.24,1.17,-.43,.345,1.13,-.606,.101],[0,1.22,-.491,0,1.22,-.695,.113]]){
      C([x,y,z],[(3*x+ex)/4,(3*y+ey)/4,(3*z+ez)/4],r*1.11,r*.94,'#ce8d3a',7);
      C([(3*x+ex)/4,(3*y+ey)/4,(3*z+ez)/4],[ex,ey,ez],r*.93,.009,spikes,7);
    }
    E(0,1.698,.064,.342,.30,.28,gold);
    E(0,1.757,.064,.317,.233,.281,green);
    for(const s of [-1,1]){
      C([s*.229,1.864,.054],[s*.366,2.080,.023],.095,.01,spikes);
      arm(s,1.335,gold,gold,true);
      C([s*.352,1.175,.216],[s*.337,1.139,.295],.126,.123,'#37363b',8);
      painted(5,s*.144,1.768,.299,.095,.102,.048,'#fff3c8',10,5);
      E(s*.124,1.868,.272,.129,.056,.065,'#cc5429');
    }
    E(0,1.545,.262,.251,.122,.17,'#9b573b');
    E(0,1.59,.286,.29,.15,.174,'#f1c273');
    for(const s of [-1,1]){
      C([s*.18,1.527,.398],[s*.162,1.451,.405],.042,.003,'#fff1c6',6);
      E(s*.102,1.655,.433,.035,.025,.014,'#976339',7,3);
    }
    for(let i=0;i<4;i++) C([0,1.73+i*.062,-.165+i*.052],[0,1.84+i*.075,-.263+i*.060],.108,.015,'#db532d',8);
  } else if(k===6){
    const brown='#865034',tan='#e8ac73';
    painted(18,0,1.12,-.034,.42,.43,.33,brown,12,6,-1);
    E(0,1.215,.163,.305,.267,.165,tan);
    painted(6,0,1.637,-.01,.331,.325,.30,brown,14,7);
    E(0,1.565,.246,.275,.17,.157,tan);
    for(const s of [-1,1]){
      E(s*.304,1.634,0,.089,.113,.062,tan);



      E(s*.304,1.27,-.012,.231,.224,.23,brown);
      E(s*.080,1.633,.383,.046,.027,.015,'#624031',7,3);
      T([s*.027,1.798,.257],[s*.182,1.835,.199],[s*.170,1.863,.189],'#764631');
      T([s*.027,1.798,.257],[s*.170,1.863,.189],[s*.049,1.826,.244],'#865037');
      arm(s,1.31,brown,tan,true);
    }
    C([-.074,1.9,-.023],[.035,2.038,-.059],.123,.014,brown,8);
    E(0,1.381,.116,.28,.067,.148,'#c73430');
    driverDecal(g,13,(u,v)=>{
      const half=v<.68?.052+v*.059:.29*(1-v)+.006;
      return [(1-2*u)*half,1.375-.38*v,.299+.105*v];
    },1,3);
  } else {
    const skin='#f1bb48', shell='#48a64a';
    E(0,1.10,0,.264,.325,.216,skin);
    E(0,1.11,-.143,.313,.322,.183,'#f7edc8');
    painted(14,0,1.123,-.177,.287,.292,.177,shell,12,7,-1);
    E(0,1.582,.043,.284,.339,.257,skin);
    E(0,1.509,.229,.224,.155,.178,skin);
    for(const s of [-1,1]){
      painted(7,s*.103,1.731,.176,.107,.184,.082,'#fff5dd',11,6);
      arm(s,1.20,skin,skin);
      E(s*.139,.716,.394,.137,.141,.214,'#64aa50');
    }
  }
  if(driverIndex>=8) {
    for(let j=0;j<g.d.length;j+=9){
      const r=g.d[j+3],green=g.d[j+4],b=g.d[j+5];
      if(driverIndex===8||driverIndex===9) {
        if(g.d[j+6]>=0){g.d[j+8]=4.25;continue}
        const lum=.26*r+.53*green+.21*b, polished=.37+Math.sqrt(Math.max(lum,0))*.58;
        const shaded=lum<.14?polished*.59:polished;
        if(driverIndex===8){g.d[j+3]=shaded*.86;g.d[j+4]=shaded*.955;g.d[j+5]=Math.min(1,shaded*1.046)}
        else {g.d[j+3]=Math.min(1,shaded*1.13);g.d[j+4]=shaded*.76;g.d[j+5]=shaded*.70}
        g.d[j+8]=4.25;
      } else if(driverIndex===10&&green>r*1.48&&green>b*1.8){
        g.d[j+3]=Math.min(1,green*1.23);g.d[j+4]=r*.62;g.d[j+5]=b*.92;
      } else if(driverIndex===11&&g.d[j+6]<0&&r>green*2&&r>b*1.9){
        g.d[j+3]=b*.68;g.d[j+4]=r*.61;g.d[j+5]=Math.min(1,r*1.08);
      }
    }
  }
  return g;
}

const rubyRiderLibrary = new Map();
// Form the painted skins from a series of transverse sections. Adjacent panels share
// their surface normals, so a stripe of light follows the compound curvature.
function garageCowling(g,sections,xOffset,paint,sides=14) {
  const loops=sections.map(([z,width,floor,roof])=>{
    const ring=[];
    for(let i=0;i<sides;i++){
      const a=i*TAU/sides,cs=Math.cos(a),sn=Math.sin(a);
      const shoulder=Math.sign(cs)*Math.abs(cs)**.79, crown=Math.sign(sn)*Math.abs(sn)**.74;
      ring.push([xOffset+width*shoulder,(floor+roof)*.5+(roof-floor)*.5*crown,z]);
    }
    return ring;
  });
  const norms=loops.map((ring,k)=>ring.map((p,j)=>{
    const before=ring[(j+sides-1)%sides],after=ring[(j+1)%sides];
    const a=loops[Math.max(0,k-1)][j],b=loops[Math.min(k+1,loops.length-1)][j];
    const dx=after[0]-before[0],dy=after[1]-before[1],dz=b[2]-a[2];
    return rubyNormal(dy*dz,-dx*dz,dx*(b[1]-a[1])-dy*(b[0]-a[0]));
  }));
  const col=rgb(paint);
  g.mat=3;
  for(let k=0;k<loops.length-1;k++){
    for(let j=0;j<sides;j++){
      const h=(j+1)%sides;
      for(const [row,index] of [[k,j],[k,h],[k+1,h],[k,j],[k+1,h],[k+1,j]]){
        g.push(loops[row][index],col,1,-1,0,3,norms[row][index]);
      }
    }
  }
  for(const k of [0,loops.length-1]){
    const ring=loops[k],y=(sections[k][2]+sections[k][3])*.5;
    for(let j=0;j<sides;j++)g.face([xOffset,y,sections[k][0]],ring[j],ring[(j+1)%sides],null,paint,[0,0,k===0?-1:1]);
  }
}
const garageFleetProfiles=[
  [[-1.15,.43,.24,.6],[-.82,.67,.225,.75],[-.24,.61,.22,.62],[.44,.49,.23,.66],[.86,.51,.26,.72],[1.19,.27,.32,.53]],
  [[-.98,.40,.25,.46],[-.54,.58,.22,.37],[.50,.52,.22,.39],[1.04,.33,.30,.54]],
  [[-1.28,.23,.28,.64],[-.8,.59,.22,.76],[-.24,.49,.21,.65],[.69,.36,.26,.72],[1.44,.07,.34,.49]],
  [[-1.07,.29,.26,.58],[-.68,.65,.22,.79],[.02,.60,.22,.7],[.65,.47,.27,.7],[1.01,.28,.31,.52]],
  [[-1.23,.13,.55,.73],[-.8,.31,.44,.83],[-.26,.25,.28,.68],[.41,.29,.29,.81],[.91,.25,.54,.93],[1.14,.14,.56,.78]],
  [[-1.18,.36,.38,.73],[-.78,.61,.23,.79],[-.25,.63,.22,.78],[.46,.54,.27,.81],[.93,.35,.36,.90],[1.24,.045,.52,.96]]
];
// Beyond the first few grid positions, the symbols and outline survive longer than
// fine bolts and grooves. Each rider retains their characteristic silhouette.
function garageGridDriver(driver,far) {
  const g=new Geo(), k=[0,1,2,3,4,5,6,7,0,2,4,3][driver]??0;
  const metal=driver===8,rose=driver===9,skin='#ffc08e';g.mat=metal||rose?4.25:.25;
  const shirt=['#df2a35','#159e4d','#ed79b1','#e9e1bf',driver===10?'#d93c3e':'#61bb41','#f0bc4a','#865033','#e8b33c'][k];
  const shell=[shirt,shirt,'#f7bf4d',driver===11?'#3990d4':'#e53e43',shirt,'#58874d','#845031','#60a44c'][k];
  function E(x,y,z,a,b,c,col,n=7,h=3){
    if(metal||rose){const lum=rgb(col),v=.27+.55*Math.sqrt(.27*lum[0]+.53*lum[1]+.20*lum[2]);col=garageTone(metal?'#ccedff':'#ffc2ab',v)}
    g.ell(x,y,z,a,b,c,col,far?Math.min(n,6):n,far?Math.min(h,3):h)
  }
  function C(a,b,r,s,col,n=5){g.tube(...a,...b,r,s,metal?'#abb9c1':rose?'#e5ac97':col,k===5&&!far?Math.min(n,4):n)}
  function painted(slot,x,y,z,rx,ry,rz,color,n=7,h=3,side=1){
    const from=g.d.length;E(x,y,z,rx,ry,rz,color,n,h);
    if(slot===8||slot===9||(!metal&&!rose))driverSkin(g,from,slot,x,y,z,rx,ry,side);
  }
  if(k<=1){
    const h=k===1?.075:0;
    E(0,1.05,0,.32,.35,.24,shirt,8,4);
    painted(16,0,.96,-.115,.315,.22,.21,'#2364a7',8,4,-1);
    painted(metal?8:k,0,1.64+h,.045,.365,.345,.335,skin,8,4);
    E(0,1.63+h,-.135,.35,.22,.257,'#70402d',8,4);
    E(0,1.91+h,-.021,.425,.237,.388,shirt,10,5);
    E(0,1.83+h,.213,.41,.074,.29,shirt,9,4);
    E(0,1.65+h,.317,.143,.122,.119,skin,7,4);
    E(0,1.56+h,.29,.224,.06,.051,'#513327',7,3);
    for(const s of [-1,1]){
      E(s*.336,1.635+h,-.005,.096,.112,.087,skin);
      if(!far){C([s*.19,1.07,-.237],[s*.20,1.29,-.185],.044,.041,'#2364a7');}
    }
    if(!far)driverDecal(g,metal?12:k===1?11:10,(u,v)=>{
      const x=(.5-u)*.31,y=2.045+h-v*.17;return [x,y,-.021+.400*Math.sqrt(Math.max(.05,1-(x/.425)**2-((y-1.91-h)/.237)**2))];
    },3,2);
  }else if(k===2){
    E(0,1.06,0,.315,.38,.26,shirt);painted(rose?9:2,0,1.65,.036,.27,.29,.247,skin,8,4);
    E(0,1.71,-.08,.32,.32,.26,shell,8,4);painted(17,0,1.36,-.27,.226,.32,.19,'#ffce49',7,4,-1);
    C([0,1.935,0],[0,2.09,0],.135,.175,'#f5bb35',7);
    for(const s of [-1,0,1])C([s*.105,2.065,-.007],[s*.15,2.20,-.009],.063,.006,'#fac83f',4);
  }else if(k===3){
    E(0,1.02,0,.29,.30,.24,'#e4d9b8');E(0,1.16,-.085,.29,.20,.19,'#315bb4');
    painted(3,0,1.52,.02,.274,.25,.247,skin);
    const capStart=g.d.length;E(0,1.846,-.018,.47,.345,.43,'#fff3da',10,5);
    mushroomFinish(g,capStart,driver===11,0,1.846,-.018,.47,.345,.43);
  }else if(k===4){
    E(0,1.04,0,.285,.36,.245,shell);E(0,1.61,.035,.287,.29,.24,shell,8,4);E(0,1.65,.28,.257,.195,.204,shell);
    for(const s of [-1,1]){painted(4,s*.13,1.81,.10,.13,.204,.113,'#f8ecd7')}
    for(let i=0;i<3;i++)C([0,1.44+i*.122,-.13],[0,1.48+i*.13,-.32],.094,.008,'#dc6032',4);
    C([0,.90,-.18],[0,.99,-.52],.162,.02,shell,5);
    E(0,1.12,-.235,.20,.155,.085,'#ed6848');
  }else if(k===5){
    E(0,1.08,0,.40,.37,.29,shirt);E(0,1.29,-.193,.49,.45,.29,'#e4c795',8,4);painted(15,0,1.30,-.25,.445,.39,.27,shell,8,4,-1);
    E(0,1.69,.07,.344,.30,.28,shirt);E(0,1.72,.11,.315,.23,.23,shell);
    if(!far){
      const uv=driverPaint(5),N=6;
      for(const s of [-1,1])for(let j=0;j<N;j++){
        const x=s*.141,point=a=>[x+.093*Math.cos(a),1.762+.082*Math.sin(a),.319];
        const tex=a=>[mix(uv[0],uv[2],.5-.5*Math.cos(a)),mix(uv[1],uv[3],.5-.5*Math.sin(a))];
        const a=j*TAU/N,b=(j+1)*TAU/N;
        g.face([x,1.762,.345],point(a),point(b),null,'#ffffff',[0,0,1],[[mix(uv[0],uv[2],.5),mix(uv[1],uv[3],.5)],tex(a),tex(b)]);
      }
    }E(0,1.57,.29,.27,.16,.17,'#f0c17b');
    for(const s of [-1,1]){C([s*.26,1.83,.05],[s*.36,2.08,.03],.1,.005,'#efe0bd');C([s*.233,1.37,-.40],[s*.33,1.45,-.63],.113,.005,'#f4d8ac')}
    C([0,1.52,-.42],[0,1.66,-.65],.13,.006,'#f4d8ac');C([0,1.77,-.1],[0,2.0,-.16],.132,.008,'#d6532e');
  }else if(k===6){
    painted(18,0,1.13,-.03,.416,.435,.335,shirt,8,4,-1);painted(6,0,1.64,.005,.334,.34,.30,shirt,8,4);
    E(0,1.56,.24,.27,.17,.16,'#e3a56d');E(0,1.32,.16,.27,.09,.16,'#c94335',6,3);
    if(!far)driverDecal(g,13,(u,v)=>[(1-2*u)*(v<.7?.068:.22*(1-v)+.004),1.34-.31*v,.307+.10*v],1,2);
    C([-.07,1.90,-.02],[.04,2.055,-.05],.12,.005,shirt,5);
  }else{
    E(0,1.09,0,.267,.327,.22,shirt);E(0,1.13,-.16,.30,.307,.173,'#f2e4bd');
    painted(14,0,1.13,-.20,.273,.275,.16,shell,7,3,-1);E(0,1.61,.05,.28,.33,.25,shirt,8,4);E(0,1.51,.23,.22,.15,.17,shirt);
    for(const s of [-1,1])painted(7,s*.105,1.73,.18,.107,.184,.082,'#f8ecd8');
  }
  if(!far)for(const s of [-1,1]){
    const first=g.d.length,shoulder=[s*.25,1.27,0],hand=[s*.263,1.052,.465];
    C(shoulder,[s*.32,1.045,.44],.124,.08,shirt);
    E(...hand,.113,.096,.114,k<=3?'#fbf1db':shirt,6,3);
    (g.arms||=[]).push({first,last:g.d.length,shoulder,hand});
  }
  return g;
}
// A shared normal at each shoulder vertex lets the contact patch turn smoothly
// into the sidewall. Hubs, rim lips and tread lugs keep their own hard normals.
function garageRubber(g,w,r,profile,n,ax,ry,point,tread,sidewall){
  const rings=profile.map(([d,rad],i)=>{
    const a=profile[Math.max(i-1,0)],b=profile[Math.min(i+1,profile.length-1)];
    const axial=(a[1]-b[1])*r,radial=(b[0]-a[0])*w;
    return Array.from({length:n},(_,j)=>{
      const theta=j*TAU/n,c=Math.cos(theta)*radial;
      return [point(w*d,r*rad,theta),rubyNormal(ax[0]*axial+ry[0]*c,ax[1]*axial+ry[1]*c,Math.sin(theta)*radial)];
    });
  });
  for(let k=0;k<rings.length-1;k++){
    const col=rgb(profile[k][1]===1&&profile[k+1][1]===1?tread:sidewall),left=rings[k],right=rings[k+1];
    for(let i=0;i<n;i++){
      const j=(i+1)%n;
      for(const v of [left[i],left[j],right[j],left[i],right[j],right[i]])g.push(v[0],col,1,-1,0,0,v[1]);
    }
  }
}
// A low-cost closed tire with its selected compound, rim and antigravity rotor.
function garagePackWheel(g,x,y,z,r,w,t,side,anti,far,accent,bike){
  const n=far?7:10,angle=anti?1.43:0,cs=Math.cos(angle),sn=Math.sin(angle),sgn=side||1;
  function point(axial,radius,a){const along=radius*Math.cos(a);
    return [x+sgn*(cs*axial+sn*along),y-sn*axial+cs*along,z+radius*Math.sin(a)]}
  const loc=(axial,radius,i)=>point(axial,radius,i*TAU/n);
  const band=(a,ra,b,rb,color,material)=>{g.mat=material;
    for(let j=0;j<n;j++)g.face(loc(a,ra,j),loc(a,ra,j+1),loc(b,rb,j+1),rb?loc(b,rb,j):null,color)};
  garageRubber(g,w,r,[[-.47,.84],[-.31,1],[.31,1],[.49,.75]],n,[sgn*cs,-sn],[sgn*sn,cs],point,
    t.type===4?'#e2b850':t.type===1?'#aa3941':'#282e35',t.side);
  for(const sign of anti||bike?[-1,1]:[1]){
    const d=w*.49*sign;g.mat=4;
    for(let j=0;j<n;j++){
      g.tri(loc(d,r*.76,j),loc(d,r*.76,j+1),loc(d,0,j),anti?'#4de2f9':t.rim);
    }
    if(!far){band(d+sign*.004,r*.55,d+sign*.005,r*.25,'#353e49',0);band(d+sign*.008,r*.25,d+sign*.011,0,accent,4);}
  }
  if(!anti&&!bike){g.mat=0;for(let j=0;j<n;j++)g.tri(loc(-w*.47,r*.84,j),loc(-w*.47,r*.84,j+1),loc(-w*.47,0,j),'#292f36')}
}
// Lateral offset, height, tail plane, sleeve radius and pipe length. Both the
// pipe builder and the flame socket use the same dark aperture in every LOD.
const garageTailpipes=[
  [.36,.423,-1.32,.098,.46], [.20,.57,-1.24,.113,.38],
  [.22,.49,-1.39,.123,.45], [.24,.35,-1.16,.080,.38],
  [.285,.525,-1.04,.099,.64], [.252,.52,-1.28,.092,.31]
];
function garageFitTailpipes(mesh,body,id,lift,lod,anti){
  mesh.gliderLift=lift;
  const [offset,y,z,r,length]=garageTailpipes[id], aperture=r*.72, mouth=z-.007;
  const sides=lod===2?6:lod===1?8:10;
  mesh.kartAnchors={outlets:[],wheels:[],anti};
  for(const sign of id===4?[1]:[-1,1]){
    const x=sign*offset;
    body.mat=4;
    if(lod===2){
      // The small sleeve shares its rim with the dark cap. No invisible end
      // caps or nested cylinders on the distant grid.
      const outer=[],inner=[];
      for(let i=0;i<sides;i++){
        const angle=i*TAU/sides,cs=Math.cos(angle),sn=Math.sin(angle);
        outer.push([x+cs*r*1.08,y+sn*r*1.08,z]);
        inner.push([x+cs*aperture,y+sn*aperture,mouth]);
      }
      for(let i=0;i<sides;i++){
        const j=(i+1)%sides,o=outer[i],n=outer[j];
        body.quad([o[0],o[1],z+.19],[n[0],n[1],z+.19],n,o,'#aebecb');
        body.face(o,n,inner[j],inner[i],'#e2ebe4',[0,0,-1]);
      }
      body.mat=0;
      for(let i=1;i<sides-1;i++)body.face(inner[0],inner[i+1],inner[i],null,'#2e3944',[0,0,-1]);
    }else{
      body.tube(x,y+.045,z+length,x,y,z+.085,r*.80,r,'#aebecb',sides);
      body.tube(x,y,z+.085,x,y,z,r*1.05,r*1.08,'#e2ebe4',sides);
      if(!lod)body.tube(x,y+.026,z+length*.53,x,y+.022,z+length*.46,r*.98,r*.98,'#8b724c',9);
      body.mat=0;
      body.tube(x,y,z-.002,x,y,mouth,aperture,aperture,'#2e3944',sides);
    }
    mesh.kartAnchors.outlets.push({x,y:y+lift,z:mouth,radius:aperture});
  }
}
// Read the emitted tire span before suspension hardware is added. In normal
// drive the footprint is centred on the axle even when a tread block is offset.
// The hover wheel's lowest support moves sideways with its nearly flat camber.
function garageRearContact(mesh,start,x,z,width,side,anti){
  const verts=mesh.d,end=verts.length;
  let low=Infinity;
  for(let j=start+1;j<end;j+=9)if(verts[j]<low)low=verts[j];
  if(anti){
    let min=Infinity,max=-Infinity;
    for(let j=start;j<end;j+=9)if(verts[j+1]<=low+.00001){
      min=Math.min(min,verts[j]);max=Math.max(max,verts[j]);
    }
    x=(min+max)*.5;
  }
  mesh.kartAnchors.wheels.push({x,y:low,z,width,side});
}
function garageDistantKart(cfg,anti) {
  const g=new Geo(),body=new Geo(),id=cfg.body||0,k=cfg.driver||0,pa=GARAGE.paints[cfg.paint]||GARAGE.paints[0],t=GARAGE.tires[cfg.tire]||GARAGE.tires[0];
  const bike=id===4,sec=garageFleetProfiles[id],lift=(anti?.14:0)+(t.r-.35)*.72;
  garageCowling(body,sec,0,pa.hex,8);
  const strip=(a,b,c,d,col)=>{body.mat=3;body.quad(a,b,c,d,col)};
  for(let i=1;i<sec.length;i++){
    const before=sec[i-1],after=sec[i];
    if(id===1&&i<sec.length-1)continue;
    strip([-.065,before[3]+.003,before[0]],[.065,before[3]+.003,before[0]],[.065,after[3]+.003,after[0]],[-.065,after[3]+.003,after[0]],pa.trim);
  }
  if(id===2){
    body.mat=3;body.box(0,.84,-1.17,1.30,.08,.23,pa.trim);
    for(const s of [-1,1])body.tri([s*.29,.55,1.09],[s*1.02,.42,.84],[s*.81,.41,.60],pa.trim);
  }else if(id===3){
    for(const s of [-1,1]){body.ell(s*.29,.64,-.59,.335,.235,.48,pa.hex,6,3);body.ell(s*.33,.77,.70,.092,.07,.12,pa.trim,5,3)}
  }else if(id===5){
    body.mat=4;body.tube(0,.71,-.86,0,1.22,-.86,.14,.13,'#48505a',6);
    body.tube(0,1.16,-.86,0,1.24,-.86,.15,.15,pa.trim,6);
  }else if(id===1){
    body.mat=4;body.box(0,.48,-.76,.7,.30,.48,'#505d67');body.box(0,.64,-.75,.66,.045,.43,'#bfccd0');
  }
  body.mat=0;body.ell(0,.69,bike?-.04:-.19,bike?.24:.36,.13,.28,'#2e3941',6,3);
  const riderKey=k+'/2';if(!rubyRiderLibrary.has(riderKey))rubyRiderLibrary.set(riderKey,garageGridDriver(k,true));
  const riderStart=body.d.length;
  body.merge(rubyRiderLibrary.get(riderKey),0,bike?.034:0,bike?.04:0);
  g.occupant={first:riderStart,last:body.d.length,y:1.04+lift+(bike?.034:0)};
  if(!bike){
    body.mat=4;body.box(0,.385,-1.10,1.07,.095,.16,'#8398a6');
    body.mat=3;body.box(0,.78,-.59,.40,.06,.13,['#cb4e46','#dae8eb','#f1ce68','#eee7d5'][cfg.wing]||'#cb4e46');
  }
  garageFitTailpipes(g,body,id,lift,2,anti);
  g.merge(body,0,lift,0);
  const trackWidth=[.80,.78,.85,.69,0,.78][id],length=[.79,.79,.84,.69,.92,.75][id];
  for(const front of [false,true]){
    const rr=t.r*(bike?1.11:front?.90:1.055),ww=t.w*(bike?.80:front?.90:1.04),cy=anti?.37+(t.r-.35)*.28:rr;
    for(const side of bike?[1]:[-1,1]){
      const x=bike?0:side*(trackWidth+(anti?.15:0)),z=front?length:-length,start=g.d.length;
      garagePackWheel(g,x,cy,z,rr,ww,t,side,anti,true,pa.trim,bike);
      if(!front)garageRearContact(g,start,x,z,ww,bike?0:side,anti);
    }
  }
  // At a few pixels across the tyre sockets and wing rig still follow the full model.
  detailCopy(g,.18);
  return g;
}

function garageTire(g,x,cy,z,r,w,t,side,anti,lod,bike,accent) {
  const n=lod?8:18, ang=anti?1.43:0,sgn=side||1;
  const ax=[sgn*Math.cos(ang),-Math.sin(ang)],ry=[sgn*Math.sin(ang),Math.cos(ang)];
  const point=(d,rad,theta)=>[x+ax[0]*d+ry[0]*rad*Math.cos(theta),cy+ax[1]*d+ry[1]*rad*Math.cos(theta),z+rad*Math.sin(theta)];
  const tread=t.type===4?'#e4b94c':t.type===1?'#ad3435':'#272c35';
  garageRubber(g,w,r,[[-.50,.73],[-.41,.96],[-.29,1],[.29,1],[.41,.96],[.50,.73]],n,ax,ry,point,tread,t.side);
  const ring=(d0,r0,d1,r1,col)=>{
    g.mat=col==='#7ef8ff'||col==='#21bafd'||col==='#a4faff'||col==='#27bff4'?5:col===t.rim||col===accent?4:0;
    for(let i=0;i<n;i++){
      const a=TAU*i/n,b=TAU*(i+1)/n;
      // A hub ends at one point. A fourth corner there adds an empty
      // triangle to every sector, most visibly on both faces in hover mode.
      g.face(point(d0,r0,a),point(d0,r0,b),point(d1,r1,b),r1?point(d1,r1,a):null,col);
    }
  };
  for(const face of (anti||bike?[-1,1]:[1])){
    const u=w*.50*face;
    ring(u,r*.73,u+face*.012,r*.665,t.type===2?'#e8d34d':t.type===0?'#b7afa1':t.rim);
    ring(u+face*.014,r*.665,u+face*.017,r*.53,t.rim);
    ring(u+face*.015,r*.526,u+face*.008,0,'#283644');
    const ns=lod?3:t.type===1?3:t.type===3?6:5;
    for(let i=0;i<ns;i++){
      const a=i*2*Math.PI/ns+Math.PI*.08,b=.15,dp=u+face*.027;
      g.quad(point(dp,r*.16,a-.30),point(dp,r*.49,a-b),point(dp,r*.53,a+b),point(dp,r*.16,a+.30),anti?'#65e3fa':garageTone(t.rim,.85,18));
    }
    if(!lod)ring(u+face*.030,r*.25,u+face*.040,r*.22,anti?'#27bff4':t.rim);
    ring(u+face*.041,r*.22,u+face*.044,0,anti?'#a4faff':accent);
    if(!lod){
      // Offset valve and contrasting sidewall chevron make rolling direction visible
      // from behind as well as in the showroom.
      const depth=u+face*.029;g.mat=0;
      for(let i=0;i<2;i++){
        const a=-1.02+i*.23,b=a+.15;
        g.quad(point(depth,r*.77,a),point(depth,r*.77,b),point(depth,r*.72,b+.05),point(depth,r*.72,a+.05),t.type===2?'#e8c452':'#9d9b90');
      }
      g.mat=4;
      const va=point(u+face*.023,r*.482,2.22),vb=point(u+face*.06,r*.473,2.22);
      g.tube(...va,...vb,.012,.009,'#a8a599',5);
    }
    if(anti){ring(u+face*.021,r*.71,u+face*.024,r*.64,'#7ef8ff');ring(u+face*.025,r*.61,u+face*.027,r*.584,'#21bafd')}
  }
  if(!anti&&!bike){ring(-w*.50,r*.73,-w*.5,0,'#262c31')}
  g.mat=0;
  if(!lod){
    for(let i=0;i<n;i+=(t.type===3?1:2)){
      const a=i*2*Math.PI/n,wid=t.type===3?.078:.022, rr=r*(t.type===3?1.032:1.005);
      if(t.type===2) continue;
      const co=t.type===4?'#ce9f36':t.type===1?'#8f302f':t.type===3?'#424c52':'#373b40';
      for(const si of [-1,1])g.quad(point(0,rr,a),point(si*w*.34,rr,a+.12),point(si*w*.34,rr,a+.12+wid),point(0,rr,a+wid),co);
    }
  }
}
function rubyKart(cfg,lod=0,anti=false) {
  if(lod>=2)return garageDistantKart(cfg,anti);
  const g=new Geo(), id=(cfg.body||0)%GARAGE.bodies.length,driver=cfg.driver||0,ti=GARAGE.tires[cfg.tire]||GARAGE.tires[0],pa=GARAGE.paints[cfg.paint]||GARAGE.paints[0];
  const c=pa.hex,trim=pa.trim,lit=garageTone(c,.97,25),dark=garageTone(c,.60,2),dim=garageTone(c,.78,3),black='#26323e',rubber='#29323a',chrome='#aebecb',bright='#e2ebe4',gold='#ecb55b';
  g.smoothActor=true;
  const bike=id===4,high=!lod,ww=ti.r*.03,bodyLift=(anti?.14:0)+(ti.r-.35)*.72;
  const body=new Geo();
  const metal=new Set([chrome,bright,gold,'#7890a0','#475461','#899cae','#8b724c','#6e7b7d']);
  const lamps=new Set(['#fff1b9','#ff655e','#fff5cb','#f8966c','#fb887c','#ef6764']);
  const mat=p=>metal.has(p)?4:lamps.has(p)?5:[c,lit,trim,dim,dark].includes(p)?3:0;
  const el=(x,y,z,rx,ry,rz,p,n=12,h=5)=>(body.mat=mat(p),body.ell(x,y,z,rx,ry,rz,p,lod?Math.max(7,n-4):n,lod?Math.max(3,h-2):h));
  const tu=(a,b,r1,r2,p,n=8)=>(body.mat=mat(p),body.tube(...a,...b,r1,r2,p,lod?Math.max(4,n-2):n));
  const box=(x,y,z,w,h,d,p,yaw=0)=>(body.mat=mat(p),body.box(x,y,z,w,h,d,p,yaw));
  const quad=(...args)=>(body.mat=mat(args[4]),body.quad(...args));
  function hull(sections,p=c){
    const loops=sections.map(([z,w,y0,y1])=>[
      [-w*.7,y0,z],[-w,y0+.065,z],[-w,y1-.064,z],[-w*.74,y1,z],[w*.74,y1,z],[w,y1-.064,z],[w,y0+.065,z],[w*.70,y0,z]
    ]);
    const colors=[rubber,garageTone(p,.73),garageTone(p,.98,10),p,garageTone(p,.94),garageTone(p,.71),rubber,'#29343a'];
    // Smooth each longitudinal sheet across its stations, without welding
    // the creases between the top panel, bevels and vertical side panels.
    body.mat=3;
    for(let j=0;j<8;j++){
      const h=(j+1)%8,col=rgb(colors[j]);
      const normals=loops.map((row,i)=>{
        const back=loops[Math.max(0,i-1)],front=loops[Math.min(loops.length-1,i+1)];
        const ex=row[h][0]-row[j][0],ey=row[h][1]-row[j][1];
        return [j,h].map(v=>{
          const dx=front[v][0]-back[v][0],dy=front[v][1]-back[v][1],dz=front[v][2]-back[v][2];
          return rubyNormal(-dz*ey,dz*ex,dx*ey-dy*ex);
        });
      });
      for(let i=1;i<loops.length;i++){
        for(const [row,edge] of [[i-1,0],[i,0],[i,1],[i-1,0],[i,1],[i-1,1]])
          body.push(loops[row][edge?h:j],col,1,-1,0,3,normals[row][edge]);
      }
    }
    for(let i=1;i<7;i++){body.tri(loops[0][0],loops[0][i],loops[0][i+1],garageTone(p,.80));const l=loops.at(-1);body.tri(l[0],l[i+1],l[i],p)}
  }
  function stripe(ys,offset,width,col){
    for(let i=1;i<ys.length;i++){const [a,y]=ys[i-1],[b,q]=ys[i];quad([offset-width/2,y+.003,a],[offset+width/2,y+.003,a],[offset+width/2,q+.003,b],[offset-width/2,q+.003,b],col)}
  }
  function winglet(x0,y0,z0,x1,y1,z1,x2,y2,z2,p){
    const a=[x0,y0,z0],b=[x1,y1,z1],cc=[x2,y2,z2];body.tri(a,b,cc,p);
    const down=a=>[a[0],a[1]-.047,a[2]];body.tri(down(a),down(cc),down(b),dim);
    for(const [u,v] of [[a,b],[b,cc],[cc,a]])quad(u,down(u),down(v),v,dark);
  }
  function emblem(x,y,z,letter,p=trim,r=.13){
    el(x,y,z,r,.80*r,.027,'#f9eee0',10,4);body.label(letter,x,y,z-.032,r*1.44,r*1.18,p);
  }
  function suspension(x,z,front){
    const sign=Math.sign(x);const axleY=.30+(front?-.014:0);
    tu([sign*.36,axleY+.14,z-.17],[x,axleY,z],.036,.041,'#7890a0',6);
    tu([sign*.41,axleY-.035,z+.13],[x,axleY,z],.035,.040,chrome,6);
    if(high){tu([sign*.46,.51,z-.10],[x*.96,.32,z],.051,.045,'#262f3b',7);for(let i=1;i<5;i++){const k=i/6,X=sign*.46+(x*.96-sign*.46)*k,Y=.51-.19*k,Z=z-.1+.1*k;tu([X-.014*sign,Y+.012,Z],[X+.015*sign,Y-.012,Z+.008],.057,.057,gold,6)}}
  }
  function badgeStroke(x0,y0,x1,y1,z,w,col){
    const dx=x1-x0,dy=y1-y0,n=Math.hypot(dx,dy)||1,k=w*.5/n;
    quad([x0-dy*k,y0+dx*k,z],[x1-dy*k,y1+dx*k,z],[x1+dy*k,y1-dx*k,z],[x0+dy*k,y0-dx*k,z],col);
  }
  function tailMedallion(y,z,scale){
    const sym=['M','L','P','T','Y','B','D','K','M','P','Y','T'][driver],r=scale;
    el(0,y,z,r,r*.74,.018,chrome,12,4);el(0,y,z-.015,r*.90,r*.66,.016,'#f9edcf',12,4);
    const letters={M:[[-.62,-.46,-.49,.47],[-.49,.47,0,-.08],[0,-.08,.49,.47],[.49,.47,.62,-.46]],
      L:[[-.31,.45,-.31,-.42],[-.31,-.42,.44,-.42]],T:[[-.52,.38,.53,.38],[0,.40,0,-.47]],
      P:[[-.38,-.48,-.38,.44],[-.38,.44,.32,.44],[.32,.44,.39,.09],[.39,.09,-.36,.04]],
      Y:[[-.52,.45,0,-.01],[.52,.45,0,-.01],[0,0,0,-.47]],B:[[-.40,-.48,-.40,.46],[-.40,.46,.27,.46],[.27,.46,.42,.09],[.42,.09,-.36,0],[-.36,0,.4,-.07],[.4,-.07,.29,-.43],[.29,-.43,-.4,-.43]],
      D:[[-.39,-.46,-.39,.46],[-.39,.46,.22,.43],[.22,.43,.44,.07],[.44,.07,.24,-.38],[.24,-.38,-.39,-.46]],
      K:[[-.39,-.46,-.39,.46],[-.36,-.06,.46,.46],[-.11,.14,.44,-.45]]};
    for(const [x0,y0,x1,y1] of letters[sym])badgeStroke(x0*r,y+y0*r,x1*r,y+y1*r,z-.032,.145*r,dark);
  }
  function diffuser(z,span) {
    const ink='#263039',titanium='#83929a';
    box(0,.311,z+.01,span,.105,.135,ink);
    for(let i=-2;i<=2;i++){
      const x=i*span*.159,h=.079*(1-.1*Math.abs(i));
      quad([x,.33,z-.05],[x,.239-h*.42,z-.10],[x,.261,z+.19],[x,.335,z+.19],titanium);
      quad([x,.33,z-.05],[x+.014,.33,z-.05],[x+.014,.239-h*.42,z-.10],[x,.239-h*.42,z-.10],black);
    }
  }
  // A continuous stamped sidepod sweeps around the rear tire and narrows into the
  // rocker panel. The contrasting inlet shares the same silhouette as the shell.
  function sidepods(){
    for(const side of [-1,1]){
      let x=side*.565;
      garageCowling(body,[[-1.111,.068,.40,.64],[-.96,.177,.36,.74],[-.79,.214,.345,.79],[-.54,.194,.33,.78],[-.25,.147,.31,.67],[.11,.125,.31,.57],[.34,.060,.34,.49]],x,c,high?14:8);
      const vents=[[.18,.398,.13],[.035,.415,.112],[-.11,.435,.10]];
      for(const [z,yy,len] of vents){
        const xx=side*(z>0?.677:z>-.05?.70:.709);
        quad([xx,yy,z],[xx,yy+.067,z-.049],[xx,yy+.067,z-len],[xx,yy,z-len+.015],black);
      }
      const xTip=side*.623;
      quad([xTip,.649,-1.095],[side*.72,.724,-.934],[side*.698,.737,-.925],[side*.606,.65,-1.087],trim);
      // Flush tapered red LED set in a graphite rear light bezel.
      const lensZ=-1.116;
      box(x,.545,lensZ,.186,.089,.024,black);
      box(x,.548,lensZ-.015,.143,.044,.013,'#ff655e');
    }
  }
  const [rear,front,zRear,zFront]=GARAGE.bodies[id].axles;
  let seatY=0,riderZ=0,ex=0;
  if(id===0) {
    garageCowling(body,garageFleetProfiles[0],0,c,high?18:10);
    garageCowling(body,[[-1.20,.41,.43,.61],[-1.10,.50,.48,.67],[-.91,.54,.51,.779],[-.68,.51,.50,.78],[-.47,.38,.48,.68]],0,lit,high?18:10);
    const deck=[[-1.195,.613],[-1.10,.671],[-.91,.781],[-.68,.782],[-.47,.683]];
    stripe(deck,-.112,.07,trim);stripe(deck,.112,.07,trim);
    if(high){
      sidepods();diffuser(-1.19,.98);
      for(let j=0;j<3;j++){
        const z=-.853+j*.083;
        box(0,.784,z,.137,.014,.045,black);box(0,.790,z+.015,.129,.009,.009,chrome);
      }
    }
    stripe([[.45,.666],[.86,.723],[1.19,.534]],0,.11,trim);
    for(const side of [-1,1]){
      el(side*.337,.57,.99,.116,.066,.091,black,9,4);
      el(side*.337,.579,1.015,.099,.048,.078,'#fff1b9',9,4);
      tu([side*.49,.27,-.99],[side*.62,.285,.70],.042,.047,chrome);
      if(high){tu([side*.39,.646,.72],[side*.42,.735,.45],.019,.018,'#475461',5);el(side*.427,.75,.441,.093,.04,.061,c,8,3);}
    }
    if(high)tailMedallion(.562,-1.204,.150);
    else emblem(0,.565,-1.204,['M','L','P','T','Y','B','D','K','M','P','Y','T'][driver],dark,.12);
  } else if(id===1) {
    hull([[-.89,.39,.245,.31],[-.50,.62,.21,.32],[.44,.55,.21,.34],[.99,.35,.29,.38]],'#6e7b7d');
    for(const s of [-1,1]){
      const verts=[[s*.52,.38,-1.06],[s*.66,.38,-.68],[s*.57,.34,.18],[s*.52,.36,.71],[s*.40,.48,1.04]];
      for(let i=1;i<verts.length;i++)tu(verts[i-1],verts[i],.072,.072,c,9);
      tu([s*.53,.38,-.80],[s*.42,.70,-.50],.052,.047,lit,8);
      tu([s*.51,.36,.62],[s*.22,.71,.49],.042,.041,c);
      tu([s*.63,.33,-.63],[s*.63,.33,.47],.048,.048,chrome);
    }
    tu([-.42,.48,1.04],[.42,.48,1.04],.07,.07,lit,8);
    tu([-.54,.37,-1.06],[.54,.37,-1.06],.070,.070,c,8);
    box(0,.46,-.74,.77,.24,.50,black);box(0,.61,-.74,.60,.12,.39,'#475461');
    for(let i=0;i<6;i++)box(0,.51+i*.037,-.79,.68+(i%2)*.04,.021,.35,chrome);
    for(const s of [-1,1])el(s*.47,.57,-.75,.097,.14,.13,'#d1a54e',8,4);
    if(high){for(const s of [-1,1]){
      box(s*.32,.651,-.82,.108,.107,.32,black);
      for(let j=0;j<4;j++)box(s*.32,.709,-.96+j*.078,.149,.016,.025,bright);
      tu([s*.28,.53,-.86],[s*.315,.62,-1.02],.033,.033,'#8b724c',6);
    }}
    hull([[.48,.24,.34,.62],[.68,.32,.35,.635],[.98,.22,.38,.54]],c);
    stripe([[.5,.623],[.68,.635],[.98,.54]],0,.085,trim);
  } else if(id===2){
    hull([[-1.25,.28,.29,.67],[-.99,.53,.21,.80],[-.52,.52,.23,.69],[.42,.40,.25,.68],[.86,.295,.27,.75],[1.43,.085,.35,.49]]);
    stripe([[.47,.69],[.86,.75],[1.43,.49]],0,.071,trim);
    for(const s of [-1,1]){
      el(s*.56,.48,-.17,.217,.205,.66,lit,12,5);el(s*.575,.48,.388,.169,.152,.121,black,9,4);
      winglet(s*.29,.55,1.09,s*1.03,.425,.83,s*.93,.416,.59,trim);
      winglet(s*.37,.48,-.3,s*.92,.36,-.52,s*.39,.47,.36,c);
      winglet(s*.38,.63,-.81,s*.49,1.03,-1.10,s*.48,.66,-1.24,lit);
      tu([s*.38,.63,-1.05],[s*.45,.855,-1.22],.041,.042,black,6);
      box(s*.475,.861,-1.18,.026,.11,.31,dim);
    }
    hull([[-1.32,.65,.824,.879],[-1.15,.62,.813,.86],[-1.09,.52,.810,.835]],trim);
    body.mat=0;body.label('08',0,.641,-1.255,.38,.15,trim);
    if(high){diffuser(-1.27,1.03);
      for(const side of [-1,1]){
        for(let j=0;j<4;j++)box(side*.566,.656,-.42+j*.102,.225,.017,.042,black,-side*.20);
        el(side*.46,.85,-1.308,.145,.027,.032,'#ff655e',8,3);
      }
    }
  } else if(id===3){
    hull([[ -1.02,.32,.24,.52],[-.73,.58,.21,.68],[-.17,.62,.23,.63],[.57,.51,.25,.65],[.98,.29,.33,.55]],trim);
    for(const s of [-1,1]){
      el(s*.275,.60,-.62,.337,.25,.51,c,14,6);el(s*.31,.775,-.68,.125,.070,.153,trim,9,4);
      el(s*.52,.625,-.50,.090,.079,.12,trim,9,4);
      el(s*.28,.61,.57,.29,.195,.4,lit,12,5);
      el(s*.34,.69,.85,.115,.094,.093,'#fffcdf',9,4);
      tu([s*.265,.68,.62],[s*.39,.97,.88],.031,.022,'#454250',7);
      el(s*.39,.98,.88,.076,.074,.075,trim,9,4);
      el(s*.48,.51,-.94,.093,.080,.096,'#f8966c',8,4);
    }
    el(0,.56,.82,.36,.151,.235,trim,12,5);
    if(high){tailMedallion(.55,-1.048,.143);for(const side of [-1,1]){
      el(side*.405,.703,-.865,.092,.052,.075,dark,8,3);
      el(side*.423,.744,-.486,.106,.049,.12,trim,8,3);
    }}else emblem(0,.554,-1.048,'B',dark,.155);
  } else if(id===4){
    seatY=.035;riderZ=-.058;
    hull([[-1.25,.13,.59,.72],[-.87,.31,.51,.81],[-.48,.265,.41,.70],[.16,.276,.27,.65],[.61,.33,.33,.78],[.96,.26,.54,.91],[1.14,.15,.60,.79]]);
    hull([[-.18,.212,.46,.75],[.22,.261,.42,.83],[.48,.192,.5,.78]],lit);
    stripe([[.64,.79],[.96,.91],[1.14,.79]],0,.064,trim);
    el(0,.912,.78,.178,.14,.12,'#7aa7b2',10,4);
    for(const s of [-1,1]){
      tu([s*.115,.69,.702],[s*.14,.32,.95],.047,.040,chrome,7);
      tu([s*.14,.39,-.25],[s*.155,.36,-.91],.050,.064,chrome,7);
      tu([s*.17,.39,-.20],[s*.15,.59,-.62],.055,.067,c,7);
      tu([s*.15,.99,.43],[s*.32,.99,.41],.040,.052,black,7);
      el(s*.21,.765,.974,.071,.048,.086,'#fff5cb',8,4);
      winglet(s*.17,.67,.59,s*.385,.52,.39,s*.28,.39,.59,trim);
    }
    el(0,.716,-1.12,.107,.061,.162,'#ef6764',9,4);
    box(0,.68,-1.225,.22,.07,.035,'#fb887c');
    if(high){for(const side of [-1,1]){
      for(let j=0;j<3;j++)box(side*.27,.553+j*.048,.352,.027,.027,.23,'#475461',side*.13);
      box(side*.145,.76,-.96,.09,.029,.15,trim,side*.13);
    }}
  } else {
    hull([[-1.17,.35,.38,.74],[-.88,.60,.24,.79],[-.31,.634,.22,.76],[.40,.57,.27,.78],[.94,.34,.33,.875],[1.23,.047,.56,.98]],c);
    for(const s of [-1,1]){
      const rail=[[s*.38,.756,-1.16],[s*.595,.805,-.86],[s*.631,.775,-.31],[s*.566,.796,.40],[s*.332,.888,.94],[s*.04,.989,1.23]];
      for(let i=1;i<rail.length;i++)tu(rail[i-1],rail[i],.039,.042,trim,6);
      for(const zz of [-.52,.04,.56]){
        const xx=s*(zz>.5?.493:.613);
        tu([xx*.985,.60,zz],[xx*1.049,.60,zz],.103,.103,gold,10);
        tu([xx*1.051,.60,zz],[xx*1.064,.60,zz],.067,.067,'#304a54',9);
      }
    }
    tu([0,.67,-.86],[0,1.23,-.86],.145,.125,black,10);
    tu([0,1.16,-.86],[0,1.25,-.86],.155,.156,trim,10);
    tu([0,1.251,-.86],[0,1.257,-.86],.103,.103,'#3c4347',9);
    box(0,.80,-1,.74,.065,.21,'#b48659');body.mat=0;body.label('MK',0,.64,-1.181,.39,.145,trim);
    el(0,.915,1.035,.125,.15,.185,gold,9,4);
    if(high){for(const side of [-1,1]){tu([side*.35,.74,-1.13],[side*.36,.94,-1.13],.019,.019,gold,5);
      tu([side*.36,.91,-1.13],[side*.54,.92,-.87],.021,.021,trim,6);
      for(let j=0;j<3;j++)box(side*.28,.838,-.94+j*.082,.30,.019,.034,'#a4784f',side*.08);
    }}
  }
  // Centre controls, stitching and a separate folded sail cartridge behind the bucket.
  const cartridge=['#cb4e46','#c5dce3','#edc94f','#f2ebcc'][cfg.wing]||'#cb4e46';
  if(!bike){box(0,.565,-.40,.72,.12,.22,black);tu([0,.58,.52],[0,1.0,.47],.046,.036,chrome,6);
    if(high){for(let i=0;i<10;i++){const p=a=>[.267*Math.cos(a),1.02+.122*Math.sin(a),.468+.117*Math.sin(a)];tu(p(i*Math.PI/5),p((i+1)*Math.PI/5),.034,.032,black,6)}}
    else{
      const rim=(a,r)=>[r*.267*Math.cos(a),1.02+r*.122*Math.sin(a),.468+r*.117*Math.sin(a)];
      for(let i=0;i<8;i++){const a=i*TAU/8,b=(i+1)*TAU/8;quad(rim(a,1.10),rim(b,1.10),rim(b,.86),rim(a,.86),black)}
    }
    if(id!==5){for(let k=-1;k<=1;k++)box(k*.13,.77,-.59,.099,.054,.17,cartridge);box(0,.786,-.59,.46,.021,.037,black)}
  }
  el(0,.63+seatY,-.05+riderZ,bike?.255:.425,.104,.38,black,12,5);
  if(!bike)el(0,.75,-.406,.38,.24,.095,'#343d47',12,5);
  const key=driver+'/'+lod;
  if(!rubyRiderLibrary.has(key))rubyRiderLibrary.set(key,lod?garageGridDriver(driver,false):rubyRider(driver,0));
  const occupant=rubyRiderLibrary.get(key),riderStart=body.d.length;
  if(!bike)body.merge(occupant,0,seatY,riderZ);
  else {
    const start=body.d.length,lean=.25,sy=Math.sin(lean),cy=Math.cos(lean);
    body.merge(occupant,0,0,0);
    for(let j=start;j<body.d.length;j+=9){
      const y=body.d[j+1]-.73,z=body.d[j+2];body.d[j+1]=.73+seatY+y*cy-z*sy;body.d[j+2]=riderZ+z*cy+y*sy;
      if(body.norm){const k=j/9,p=body.norm[k],nx=(p&255)-128,ny=((p>>>8)&255)-128,nz=((p>>>16)&255)-128;
        body.norm[k]=rubyNormal(nx,ny*cy-nz*sy,nz*cy+ny*sy,Boolean(p&(1<<24)));}
    }
  }
  // Local roll pivots between the two grips. On the motorcycle the driver
  // already pitches forward from the hip, so transform the grip height too.
  const gripY=bike?.73+(1.04-.73)*Math.cos(.25)-.48*Math.sin(.25):1.04;
  const seatPoint=([x,y,z])=>bike?[x,.73+seatY+bodyLift+(y-.73)*Math.cos(.25)-z*Math.sin(.25),
    riderZ+z*Math.cos(.25)+(y-.73)*Math.sin(.25)]:[x,y+seatY+bodyLift,z+riderZ];
  g.occupant={first:riderStart,last:body.d.length,y:gripY+seatY+bodyLift,
   arms:occupant.arms.map(a=>({first:riderStart+a.first,last:riderStart+a.last,hand:seatPoint(a.hand),shoulder:seatPoint(a.shoulder)}))};
  if(!bike)for(const s of [-1,1]){suspension(s*rear,zRear,false);suspension(s*front,zFront,true)}
  garageFitTailpipes(g,body,id,bodyLift,lod,anti);
  g.merge(body,0,bodyLift,0);
  if(high)g.wheelSpans=[];
  for(const [isFront,z,span] of [[false,zRear,rear],[true,zFront,front]]){
    const r=ti.r*(bike?1.11:isFront?.90:1.055),w=ti.w*(bike?.80:isFront?.90:1.04);
    const cy=anti?.37+(ti.r-.35)*.28:r;
    for(const s of (bike?[1]:[-1,1])){
      const x=bike?0:s*(span+(anti?.15:0)+ww),first=g.d.length;
      if(high){garageTire(g,x,cy,z,r,w,ti,s,anti,lod,bike,trim);
        g.wheelSpans.push({first,last:g.d.length,x,y:cy,z,r,side:s,front:isFront});
      }
      else garagePackWheel(g,x,cy,z,r,w,ti,s,anti,false,trim,bike);
      if(!isFront)garageRearContact(g,first,x,z,w,bike?0:s,anti);
      if(anti&&(!bike||isFront)){g.tube((bike?0:s*.41),cy+.15,z,x,cy+.04,z,.086,.096,'#899cae',lod?5:8);g.ell(x,cy+.103,z,.114,.051,.11,'#85efff',8,3)}
    }
  }
  return g;
}
// Keep chassis, wheel contacts and exhaust fixed while a rider leans. Splits
// retain the original vertices, normals and painted material classifications.
function rubyDriveRig(cfg,anti,whole=undefined){
  whole=whole||rubyKart(cfg,0,anti);
  if(whole.driveRig)return whole.driveRig;
  const data=whole.d,norms=whole.norm,wheels=[],span=whole.occupant;
  function part(){const g=new Geo();g.smoothActor=whole.smoothActor;return g}
  function copy(target,from,to,x=0,y=0,z=0){
    for(let j=from;j<to;j+=9){
      target.d.push(data[j]-x,data[j+1]-y,data[j+2]-z,data[j+3],data[j+4],data[j+5],data[j+6],data[j+7],data[j+8]);
      target.norm.push(norms[j/9]);
    }
  }
  const rider=part(),fixed=part(),chassis=whole.wheelSpans?part():fixed;
  // Store sleeves in wrist-local coordinates. Their Z axis points towards
  // the authored shoulder, so a rigid draw can reach the moving torso.
  const arms=[];let cursor=span.first;
  for(const a of span.arms||[]){
    copy(rider,cursor,a.first,0,span.y,0);cursor=a.last;
    const [x,y,z]=a.hand,[sx,sy,sz]=a.shoulder,dx=sx-x,dy=sy-y,dz=sz-z;
    const length=Math.hypot(dx,dy,dz),b=garageChassisBasis(Math.atan2(dx,dz),0,Math.asin(dy/length),new Float64Array(9));
    const mesh=part();copy(mesh,a.first,a.last,x,y,z);
    for(let j=0;j<mesh.d.length;j+=9){
      const X=mesh.d[j],Y=mesh.d[j+1],Z=mesh.d[j+2],n=mesh.norm[j/9],nx=(n&255)-128,ny=(n>>8&255)-128,nz=(n>>16&255)-128;
      mesh.d[j]=X*b[0]+Y*b[3]+Z*b[6];mesh.d[j+1]=X*b[1]+Y*b[4]+Z*b[7];mesh.d[j+2]=X*b[2]+Y*b[5]+Z*b[8];
      if(n)mesh.norm[j/9]=rubyNormal(nx*b[0]+ny*b[3]+nz*b[6],nx*b[1]+ny*b[4]+nz*b[7],nx*b[2]+ny*b[5]+nz*b[8],Boolean(n&(1<<24)));
    }
    arms.push({mesh,hand:a.hand,shoulder:a.shoulder,length});
  }
  copy(rider,cursor,span.last,0,span.y,0);
  copy(fixed,0,span.first);copy(fixed,span.last,data.length);
  if(whole.wheelSpans){
    copy(chassis,0,span.first);let index=span.last;
    for(const segment of whole.wheelSpans){
      copy(chassis,index,segment.first);
      const wheel=part();copy(wheel,segment.first,segment.last,segment.x,segment.y,segment.z);
      wheels.push({...segment,mesh:wheel});index=segment.last;
    }
    copy(chassis,index,data.length);
  }
  const rig={chassis,fixed,rider,arms,gripY:span.y,wheels,anti,basis:new Float64Array(9),release(renderer){
    renderer.release(rider);renderer.release(fixed);
    for(const a of arms)renderer.release(a.mesh);
    if(chassis!==fixed)renderer.release(chassis);
    for(const w of wheels)renderer.release(w.mesh);
    delete whole.driveRig;
  }};
  whole.driveRig=rig;return rig;
}
function drawRider(renderer,rig,x,y,z,yaw,scale,roll,pitch,lean,b){
  const h=rig.gripY*scale;
  renderer.draw(rig.rider,x+h*b[1],y+h*b[4],z+h*b[7],yaw,scale,roll+lean,pitch);
  if(!rig.arms.length)return;
  const cs=Math.cos(lean),sn=Math.sin(lean);
  for(const arm of rig.arms){
    const [hx,hy,hz]=arm.hand,[sx,sy,sz]=arm.shoulder,dy=sy-rig.gripY;
    const X=cs*sx-sn*dy-hx,Y=sn*sx+cs*dy+rig.gripY-hy,Z=sz-hz;
    const flat=Math.hypot(X,Z),length=Math.hypot(flat,Y),cx=Z/flat,cz=-X/flat;
    // Local Z follows wrist to shoulder; X stays level in chassis space.
    const zx=(b[0]*X+b[1]*Y+b[2]*Z)/length,zy=(b[3]*X+b[4]*Y+b[5]*Z)/length,zz=(b[6]*X+b[7]*Y+b[8]*Z)/length;
    const xx=b[0]*cx+b[2]*cz,xy=b[3]*cx+b[5]*cz,xz=b[6]*cx+b[8]*cz;
    const yawArm=Math.abs(zy)>.9999999?Math.atan2(-xz,xx):Math.atan2(zx,zz);
    const rollArm=Math.abs(zy)>.9999999?0:Math.atan2(xy,zz*xx-zx*xz);
    renderer.draw(arm.mesh,x+scale*(b[0]*hx+b[1]*hy+b[2]*hz),y+scale*(b[3]*hx+b[4]*hy+b[5]*hz),
      z+scale*(b[6]*hx+b[7]*hy+b[8]*hz),yawArm,scale*length/arm.length,rollArm,Math.asin(clamp(zy,-1,1)));
  }
}
function drawSeatedKart(renderer,rig,x,y,z,yaw,scale,roll,pitch,lean){
  renderer.draw(rig.fixed,x,y,z,yaw,scale,roll,pitch);
  drawRider(renderer,rig,x,y,z,yaw,scale,roll,pitch,lean,garageChassisBasis(yaw,roll,pitch,rig.basis));
}
// The WebGL vertex shader and the wheel rig use roll, then pitch, then yaw.
function garageChassisBasis(yaw,roll,pitch,b){
  const cs=Math.cos(yaw),sn=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),cr=Math.cos(roll),sr=Math.sin(roll);
  b[0]=cs*cr-sn*sp*sr;b[1]=-cs*sr-sn*sp*cr;b[2]=sn*cp;
  b[3]=cp*sr;b[4]=cp*cr;b[5]=sp;
  b[6]=-sn*cr-cs*sp*sr;b[7]=sn*sr-cs*sp*cr;b[8]=cs*cp;
  return b;
}
function garagePlaceAnchor(point,ref,x,y,z,b,scale=1){
  point.x=x+scale*(b[0]*ref.x+b[1]*ref.y+b[2]*ref.z);
  point.y=y+scale*(b[3]*ref.x+b[4]*ref.y+b[5]*ref.z);
  point.z=z+scale*(b[6]*ref.x+b[7]*ref.y+b[8]*ref.z);
}
// Pass one result buffer per visible kart; no per-frame arrays, objects or
// geometry scans. Call with the final rendered pose, including spins and tricks.
function rubyKartSockets(mesh,x,y,z,yaw,roll,pitch,out,scale=1){
  if(!out)out={};
  if(!out.basis)out.basis=new Float64Array(9);
  if(!out.outlets)out.outlets=[];
  if(!out.wheels)out.wheels=[];
  const a=mesh.kartAnchors,b=garageChassisBasis(yaw,roll,pitch,out.basis);
  out.anti=a.anti;
  out.outlets.length=a.outlets.length;
  out.wheels.length=a.wheels.length;
  for(let i=0;i<a.outlets.length;i++){
    const src=a.outlets[i],p=out.outlets[i]||(out.outlets[i]={});
    garagePlaceAnchor(p,src,x,y,z,b,scale);
    p.dx=-b[2];p.dy=-b[5];p.dz=-b[8];p.radius=src.radius*scale;
  }
  for(let i=0;i<a.wheels.length;i++){
    const src=a.wheels[i],p=out.wheels[i]||(out.wheels[i]={});
    garagePlaceAnchor(p,src,x,y,z,b,scale);
    p.width=src.width*scale;p.side=src.side;
  }
  return out;
}
// Wheel spin, steering and track banking do not commute. Compose the chassis,
// steering and axle transforms before converting to Motor's yaw/pitch/roll order.
function drawRubyRig(renderer,rig,x,y,z,yaw,roll,pitch,distance,steer,scale=1,rearSpin=0,riderLean=0){
  renderer.draw(rig.chassis,x,y,z,yaw,scale,roll,pitch);
  const b=garageChassisBasis(yaw,roll,pitch,rig.basis);
  drawRider(renderer,rig,x,y,z,yaw,scale,roll,pitch,riderLean,b);
  const b00=b[0],b01=b[1],b02=b[2],b10=b[3],b11=b[4],b12=b[5],b20=b[6],b21=b[7],b22=b[8];
  for(const wheel of rig.wheels){
    const X=x+scale*(b00*wheel.x+b01*wheel.y+b02*wheel.z),Y=y+scale*(b10*wheel.x+b11*wheel.y+b12*wheel.z),Z=z+scale*(b20*wheel.x+b21*wheel.y+b22*wheel.z);
    const a=wheel.front?steer:0,ca=Math.cos(a),sa=Math.sin(a);
    // The antigravity wheel axle leans down towards the hub on its own side.
    const ax=rig.anti?Math.cos(1.43):1,ay=rig.anti?-wheel.side*Math.sin(1.43):0;
    const phase=(distance+(wheel.front?0:rearSpin))/wheel.r,c=Math.cos(phase),s=Math.sin(phase),v=1-c;
    const xx=c+ax*ax*v,xy=ax*ay*v,xz=ay*s,yy=c+ay*ay*v,yz=-ax*s,zz=c;
    const s00=ca*xx-sa*xz,s01=ca*xy-sa*yz,s02=ca*xz+sa*zz;
    const s20=-sa*xx-ca*xz,s21=-sa*xy-ca*yz,s22=-sa*xz+ca*zz;
    const m12=b10*s02+b11*yz+b12*s22,p=Math.asin(clamp(m12,-1,1));
    let ry,rz;
    if(Math.abs(m12)>.9999999){
      const m20=b20*s00+b21*xy+b22*s20,m00=b00*s00+b01*xy+b02*s20;
      ry=Math.atan2(-m20,m00);rz=0;
    }else{
      ry=Math.atan2(b00*s02+b01*yz+b02*s22,b20*s02+b21*yz+b22*s22);
      rz=Math.atan2(b10*s00+b11*xy+b12*s20,b10*s01+b11*yy+b12*s21);
    }
    renderer.draw(wheel.mesh,X,Y,Z,ry,scale,rz,p);
  }
}
// Both folding and deployed positions follow the rendered chassis matrix.
const rubyWingBasis=new Float64Array(9);
function drawRubyWing(renderer,wing,car,x,y,z,yaw,roll,pitch,opening,scale=1){
  const size=opening*opening*(3-2*opening);
  if(size<.012)return;
  const b=garageChassisBasis(yaw,roll,pitch,rubyWingBasis);
  const lift=car.gliderLift||0,dy=lift+.80*(1-size),dz=-.59*(1-size);
  renderer.draw(wing,x+scale*(b[1]*dy+b[2]*dz),y+scale*(b[4]*dy+b[5]*dz),z+scale*(b[7]*dy+b[8]*dz),yaw,size*scale,roll,pitch);
}
function rubyWing(cfg) {
  const g=new Geo(),kind=(cfg.wing||0)%4,P=GARAGE.paints[cfg.paint]||GARAGE.paints[0], seam='#f1d7a0',rig='#3d5262';
  const binding=cfg.paint===4?'#354d71':garageTone(P.hex,.49,14);
  const band=(a,b,depth,top,edge)=>{
    const at=(p,k)=>[p[0],p[1]-depth*k,p[2]+.07*k];
    g.quad(a,b,at(b,.74),at(a,.74),top);g.quad(at(a,.74),at(b,.74),at(b,1),at(a,1),edge);
  };
  const cable=(a,b,r=.014,c=rig)=>{g.mat=4;g.tube(...a,...b,r,r,c,5);g.mat=0};
  if(kind===1){
    // An envelope of overlapping lobes supported by a small brass trapeze.
    const lobes=[[-1.63,2.82,0,.62,.40,.47],[-1.08,3.05,.015,.76,.57,.65],[-.39,3.23,0,.82,.69,.70],[.38,3.12,.02,.80,.61,.70],[1.06,2.99,.02,.73,.48,.63],[1.64,2.79,.02,.6,.38,.49]];
    const shade=rgb('#849cb5'),white=rgb('#f4f6ee');
    for(const [x,y,z,a,b,c] of lobes){
      const first=g.d.length;g.ell(x,y,z,a,b,c,'#f4f6ee',14,7);
      for(let j=first;j<g.d.length;j+=9){
        const lit=clamp((g.d[j+1]-y)/b+.68,0,1);
        for(let k=0;k<3;k++)g.d[j+3+k]=mix(shade[k],white[k],lit);
      }
    }
    for(const s of [-1,1]){
      g.ell(s*.29,3.19,-.709,.092,.136,.039,'#343c52',9,5);g.ell(s*.29-.019,3.25,-.746,.028,.032,.012,'#fffefa',7,3);
      g.ell(s*.51,3.04,-.686,.091,.047,.030,'#edc3be',8,4);
      for(const z of [-.26,.26])cable([s*.41,.87,z-.10],[s*1.49,2.64,z],.014,'#827668');
    }
    cable([-.49,1.94,.02],[.49,1.94,.02],.026,'#e2ae62');
    return g;
  }
  if(kind===3){
    const nose=[0,3.09,1.57],tail=[0,2.89,-1.13],pleat=[0,2.43,-.84];
    for(const s of [-1,1]){
      // Dihedral tips and a shadowed central fold stay legible against bright snow.
      const tip=[s*2.36,3.13,-1.02],fold=[s*1.92,2.96,-.98],root=[s*.38,2.72,-.78];
      g.tri(nose,fold,root,s<0?'#fff4da':'#ddd4c8');g.tri(nose,tip,fold,s<0?'#c1d0dc':'#99aabd');
      g.tri(nose,root,tail,s<0?'#adc0d2':'#8699b2');
      g.tri(nose,root,pleat,s<0?'#8194ab':'#516980');
      band(tip,fold,.105,P.hex,binding);band(fold,root,.105,P.hex,binding);
      g.tri([s*.14,3.082,1.39],tip,[s*2.20,3.071,-1.003],P.hex);
      g.tri(tail,[s*.94,2.895,-1.08],[s*.90,2.88,-.90],P.hex);
      cable([s*.40,.88,-.23],[s*1.68,2.91,-.58],.012);
      cable([s*.27,.92,.23],[s*.81,2.99,.59],.011);
    }
    return g;
  }
  if(kind===2){
    // A rigid yellow delta, indigo wingtips, roundels and twin stabilizers.
    const a=[0,3.10,1.23],b=[0,2.86,-.87];
    for(const s of [-1,1]){
      const c=[s*2.49,2.68,-.69],d=[s*1.77,2.78,-1.13],mid=[s*1.48,2.858,-.03];
      g.tri(a,mid,c,'#f5c834');g.tri(a,c,b,'#ffd74a');g.tri(c,d,b,'#e8b324');
      g.tri([s*1.78,2.805,-.16],c,d,'#6a4c98');g.tri([s*1.78,2.805,-.16],d,[s*1.56,2.84,-1.04],'#7963ab');
      const ft=[s*.60,3.49,-.87],base=[s*.61,2.89,-.97],tip=[s*.61,2.93,-.22];
      g.tri(ft,base,tip,'#76559f');band(d,b,.135,'#a27636','#483359');cable([s*.39,.88,-.24],[s*1.76,2.79,-.69]);cable([s*.34,.91,.19],[s*.64,3.02,.535]);
      cable(a,c,.025,'#f8dfa0');
    }
    g.label('W',0,3.04,-.92,.58,.32,'#523c81');
    return g;
  }
  const n=14;
  const p=(i,j)=>{let t=i/n*2-1,a=Math.abs(t),arc=Math.cos(t*1.46),nose=.84-a*.65,tail=-.93+a*.42-(i%2?.15:0);
    return [2.55*t,2.66+arc*.49+Math.sin(j*Math.PI/2)*.16,(j===0?nose:j===1?(nose+tail)/2:tail)]};
  const colors=[P.hex,binding,P.hex,'#f3d879',P.trim,P.hex,binding,binding,P.hex,P.trim,'#f3d879',P.hex,binding,P.hex];
  for(let i=0;i<n;i++)for(let j=0;j<2;j++)g.quad(p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1),colors[i]);
  for(let i=0;i<n;i++){
    // A rear skirt shows the sail's real profile even when the chase camera is level with the top fabric.
    band(p(i,2),p(i+1,2),.21+.04*Math.sin((i+.5)/n*Math.PI),colors[i],binding);
    cable(p(i,0),p(i+1,0),.018,seam);
  }
  for(const s of [-1,1]){for(const i of (s<0?[1,3,5]:[13,11,9]))cable([s*.39,.88,-.24],p(i,2),.013);cable([s*.37,.91,.19],p(s<0?2:12,0),.015);}
  return g;
}
