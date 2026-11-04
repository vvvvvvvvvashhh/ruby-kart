// Panoramas are painted once. Sampling the cylindrical plate at camera-relative angles
// keeps even the moon and far silhouettes registered as the kart turns.
const RubyAtmos = (() => {
  const plates = new Map(), items = new Map();
  const W = 2560, H = 786, HORIZON = 490, UNIT = W / (Math.PI * 2);
  const cycle = x => x - Math.floor(x);
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const between = (v,a,b) => Math.max(a,Math.min(b,v));
  function random(seed){
    return () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  }
  function canvas(w,h){let surface=document.createElement('canvas');surface.width=w;surface.height=h;return surface}
  function lineGradient(c,x1,y1,x2,y2,stops){
    let g=c.createLinearGradient(x1,y1,x2,y2);
    stops.forEach(([v,color])=>g.addColorStop(v,color));return g;
  }
  function halo(c,x,y,r,stops,rx=1,ry=1){
    if(r<=0)return;
    c.save();c.translate(x,y);c.scale(rx,ry);let g=c.createRadialGradient(0,0,0,0,0,r);
    stops.forEach(([v,color])=>g.addColorStop(v,color));c.fillStyle=g;c.fillRect(-r,-r,r*2,r*2);c.restore();
  }
  function ellipse(c,x,y,rx,ry,color){
    c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();
  }
  function star(c,x,y,r,col){
    c.fillStyle=col;c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x+r*.08,y-r*.10,x+r*.66,y);
    c.quadraticCurveTo(x+r*.11,y+r*.12,x,y+r);c.quadraticCurveTo(x-r*.08,y+r*.12,x-r*.66,y);
    c.quadraticCurveTo(x-r*.12,y-r*.11,x,y-r);c.closePath();c.fill();
  }
  function ridgePlate(c,y,height,phase,col){
    function wave(x){const a=x/W*Math.PI*2;
      return y-height*(.54+.17*Math.sin(a*5+phase)+.17*Math.sin(a*11-.7*phase)+.11*Math.sin(a*21+phase*.4));}
    c.fillStyle=col;c.beginPath();c.moveTo(0,H);c.lineTo(0,wave(0));
    for(let x=4;x<=W;x+=4)c.lineTo(x,wave(x));c.lineTo(W,H);c.closePath();c.fill();return wave;
  }
  function wrapPaint(x,margin,paint){paint(x);if(x<margin)paint(x+W);if(x>W-margin)paint(x-W)}
  function day(c,rnd){
    c.fillStyle=lineGradient(c,0,0,0,H,[[0,'#267fca'],[.25,'#3eaceb'],[.49,'#8ed6f7'],[.62,'#d5ebed'],[.71,'#b7e0d5'],[1,'#a9d4c9']]);c.fillRect(0,0,W,H);
    const sunX=W*.875;
    halo(c,sunX,283,142,[[0,'#fffddd'],[.07,'#fffbddb0'],[.20,'#fff6c364'],[1,'#fff9e000']]);
    ellipse(c,sunX,283,10.6,10.6,'#fffeeb');
    const cloud=(x,y,r,shape)=>{
      // One silhouette per cloud keeps lit crowns continuous across adjacent lobes.
      let rr=random(shape),puffs=[],n=Math.floor(7+rr()*4);
      for(let j=0;j<n;j++){let u=j/(n-1),belly=Math.sin(u*Math.PI);
        let rad=r*(.30+.34*belly+rr()*.12), lift=r*(.11+.37*belly+rr()*.16);
        puffs.push([x+(u-.5)*r*3.05,y-lift,rad*(.97+rr()*.30),rad]);}
      const body=(dx,dy,sx,sy)=>{c.beginPath();for(let p of puffs){c.moveTo(p[0]+dx+p[2]*sx,p[1]+dy);c.ellipse(p[0]+dx,p[1]+dy,p[2]*sx,p[3]*sy,0,0,Math.PI*2)}c.fill()};
      c.fillStyle=lineGradient(c,0,y-r*1.5,0,y+r*.3,[[0,'#fffdf5'],[.34,'#fffef4'],[.63,'#e8f9fe'],[.86,'#c2e4f3'],[1,'#b9d8e7']]);body(0,0,1,1);
      c.save();c.globalAlpha=.36;c.fillStyle='#fffdec';
      for(let j=1;j<n-1;j+=2){let p=puffs[j];c.beginPath();c.ellipse(p[0]-.10*r,p[1]-.32*p[3],p[2]*.7,p[3]*.55,-.2,Math.PI,Math.PI*1.9);c.fill()}c.restore();
    };
    for(let i=0;i<22;i++){let x=(i+rnd()*.85)*W/22,y=370+rnd()*82,r=6+rnd()*15;let seed=(rnd()*1e9)|0;
      wrapPaint(x,r*2.7,where=>cloud(where,y,r,seed));}
    for(let i=0;i<11;i++){let x=(i+.12+rnd()*.79)*W/11,y=240+rnd()*145,r=14+rnd()*23,seed=(rnd()*1e9)|0;
      wrapPaint(x,r*2.7,where=>cloud(where,y,r,seed));}
    ridgePlate(c,HORIZON+20,38,2.36,'#a4d7d4');ridgePlate(c,HORIZON+19,23,4.26,'#91c5bc');
    ridgePlate(c,HORIZON+19,10,5.2,'#89bbbb');
  }
  function night(c,rnd){
    c.fillStyle=lineGradient(c,0,0,0,H,[[0,'#0c1336'],[.26,'#142454'],[.47,'#394977'],[.62,'#696684'],[.73,'#6c6281'],[1,'#3b3d61']]);c.fillRect(0,0,W,H);
    const bandY=x=>299+73*Math.sin(x/W*Math.PI*2+.25)+40*Math.sin(x/W*Math.PI*4+1.1);
    // A pair of dusty ribbons adds depth without outshining the rainbow tiles.
    for(let i=0;i<260;i++){
      let x=rnd()*W,dr=(rnd()+rnd()+rnd()-1.5)*74, y=bandY(x)+dr,
          r=8+rnd()*30,blue=i%3?'#8293e50c':'#e692cd0d';
      wrapPaint(x,r*2.5,px=>halo(c,px,y,r,[[0,blue],[1,'#9f97dc00']],1.8,.57));
    }
    for(let i=0;i<740;i++){let x=rnd()*W,y=42+rnd()*414;
      let r=rnd()**3*1.16+.19,alpha=.36+rnd()*.59;
      c.globalAlpha=alpha;ellipse(c,x,y,r,r*(.9+rnd()*.16),['#daeaff','#fff6db','#d8cbed','#d5e2ff'][i%4]);}
    c.globalAlpha=1;
    for(let i=0;i<23;i++){let x=rnd()*W,y=91+rnd()*316,r=1.25+rnd()*2.55;
      halo(c,x,y,r*3.8,[[0,'#c4e0ff70'],[1,'#b2c7ee00']]);star(c,x,y,r,'#f0f4ff');}
    const mx=W*.925,my=401;
    halo(c,mx,my,83,[[0,'#fff8d995'],[.23,'#fff0bf5c'],[.51,'#e7deb42f'],[1,'#c8daeb00']]);
    ellipse(c,mx,my,18,18,'#fff4d7');
    let cr=random(46738);c.save();c.beginPath();c.arc(mx,my,17.8,0,Math.PI*2);c.clip();
    for(let i=0;i<18;i++){let a=cr()*Math.PI*2,rad=cr()*22;ellipse(c,mx+Math.cos(a)*rad,my+Math.sin(a)*rad,1.2+cr()*3.3,.8+cr()*2.2,'#e8d9ba86')}c.restore();
    ridgePlate(c,528,66,2.6,'#45456e');ridgePlate(c,548,55,4,'#343e62');
    let near=ridgePlate(c,565,41,1.35,'#283655');
    // Window lights of the villages beneath the floating road.
    for(let i=0;i<470;i++){
      let cluster=Math.floor(rnd()*17),x=(cluster+.2+(rnd()+rnd()-.8)*.46)*W/17;
      x=cycle(x/W)*W;let y=near(x)+3+rnd()**1.4*35,r=.35+rnd()*.78;
      c.globalAlpha=.32+.55*rnd();ellipse(c,x,y,r*1.3,r,i%4?'#ffdf91':'#94d9ff');
    }c.globalAlpha=1;
    // Moonlit stratus lies below the deck and breaks up the valley in downward views.
    for(let i=0;i<72;i++){let x=rnd()*W,y=565+rnd()*152,r=9+rnd()*28;
      wrapPaint(x,4*r,xx=>halo(c,xx,y,r,[[0,'#bbc2d229'],[.28,'#a7b4d222'],[.73,'#94a4c20f'],[1,'#879ab800']],2.9,.42));}
  }
  function garage(c){
    c.fillStyle=lineGradient(c,0,0,0,H,[[0,'#080910'],[.35,'#171923'],[.55,'#353540'],[.63,'#53505a'],[.74,'#302d37'],[1,'#161720']]);c.fillRect(0,0,W,H);
    for(let i=0;i<12;i++){
      const x=i*W/12,s=W/12,lantern=i%3!==1;let x1=x+s*.11;
      c.fillStyle=lineGradient(c,x,0,x+s,0,[[0,'#141420a8'],[.10,'#78778233'],[.86,'#36374019'],[1,'#090a12a2']]);c.fillRect(x,190,s,290);
      c.fillStyle='#131421';c.fillRect(x-1.5,175,3,310);
      if(lantern){halo(c,x+s*.5,345,105,[[0,i%2?'#8d3d3f4a':'#96b9dd35'],[1,'#c3c8df00']],.90,1.2);
        c.fillStyle='#20212b';c.fillRect(x1-3,281,s*.78+6,17);
        c.fillStyle=lineGradient(c,x1,0,x+s*.89,0,[[0,'#8e9aa8'],[.15,'#d7e2df'],[.67,'#f5f5ea'],[1,'#7f8d9c']]);
        c.fillRect(x1,283,s*.78,6);
        c.fillStyle='#f9f9ef';c.fillRect(x1+9,283,s*.55,1.4);
      }
      c.strokeStyle='#77778270';c.lineWidth=2;c.beginPath();c.moveTo(x+12,190);c.lineTo(x+s*.47,286);c.stroke();
      // Low service-light strips stay visible from the low turntable camera.
      if(i%3!==0){
        let xx=x+s*.19,yy=401;
        c.fillStyle='#141722';c.fillRect(xx-2,yy-2,s*.64+4,7);
        halo(c,xx+s*.32,yy+2,s*.77,[[0,i%2?'#fc839d39':'#e7f7fb33'],[1,'#c0cfdb00']],.85,.32);
        c.fillStyle=i%2?'#d87487':'#dbeced';c.fillRect(xx,yy,s*.64,2.2);
        c.fillStyle=i%2?'#ffc4c8':'#fff3e2';c.fillRect(xx+s*.11,yy,s*.28,1);
        for(let j=0;j<5;j++){c.fillStyle='#555464';c.fillRect(x+s*.17+j*6,435,3.8,1.9);}
      }
      if(i%3===0){c.fillStyle='#272633';c.fillRect(x+s*.1,346,s*.8,107);
        for(let j=0;j<13;j++){c.fillStyle=j%2?'#52515e':'#4a4955';c.fillRect(x+s*.105,349+j*7.6,s*.79,4.5)}
      }
    }
    c.fillStyle='#8e404c';c.fillRect(0,457,W,3);c.fillStyle='#e4a49a';c.fillRect(0,457,W,1);
    c.fillStyle=lineGradient(c,0,462,0,H,[[0,'#53505a'],[.17,'#49464e'],[1,'#201f28']]);c.fillRect(0,462,W,H-462);
    for(let i=0;i<12;i+=2)halo(c,(i+.5)*W/12,490,55,[[0,'#e7cadb2b'],[1,'#d3e6ed00']],1.7,.35);
    for(let i=0;i<12;i++){let y=477+Math.pow(i/11,1.9)*295;c.fillStyle='#25242c38';c.fillRect(0,y,W,2)}
    for(let i=0;i<=48;i++){c.strokeStyle='#2b293136';c.lineWidth=1;c.beginPath();c.moveTo(i*W/48,480);c.lineTo(i*W/48,786);c.stroke()}
  }
  function poly(c,color,pts){
    c.fillStyle=color;c.beginPath();c.moveTo(pts[0][0],pts[0][1]);
    for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.closePath();c.fill();
  }
  function streak(c,color,x,y,w,h,skew){
    c.fillStyle=color;c.beginPath();c.moveTo(x-w,y);
    c.bezierCurveTo(x-w*.5,y-h,x+w*.25,y+skew-h,x+w,y+skew);
    c.bezierCurveTo(x+w*.33,y+skew+h,x-w*.43,y+h,x-w,y);c.fill();
  }
  function cirrus(c,rnd,rows,lo,hi,palette){
    for(let i=0;i<rows;i++){
      const x=rnd()*W,y=lo+(hi-lo)*rnd(),w=18+rnd()*113,h=1+rnd()*5,s=(rnd()-.5)*9;
      wrapPaint(x,w+5,px=>streak(c,palette[i%palette.length],px,y,w,h,s));
    }
  }
  function harbor(c,rnd){
    c.fillStyle=lineGradient(c,0,0,0,H,[[0,'#3e689e'],[.31,'#a8b3d0'],[.48,'#e8ad9f'],[.58,'#ffd7a8'],[.66,'#b6c8c4'],[1,'#578d95']]);c.fillRect(0,0,W,H);
    const sx=W*.844,sy=397;
    halo(c,sx,sy,220,[[0,'#ffedb5bb'],[.26,'#ffd3a077'],[1,'#efac8b00']],1.5,.82);
    ellipse(c,sx,sy,19,19,'#fff4c7');
    cirrus(c,rnd,70,280,448,['#ffdfc374','#f4bcada3','#d0909e56','#fff0d750']);
    ridgePlate(c,482,67,1.17,'#bba8ad');ridgePlate(c,492,51,3.90,'#a99ba9');
    // An ochre town rises from the breakwater; its roof rhythm changes around the bay.
    const n=125,shore=i=>477-21*Math.pow(.5+.5*Math.cos(i/n*Math.PI*8-.80),4);
    for(let i=0;i<n;i++){
      const x=W*i/n,w=9+11*rnd(),y=shore(i)+5*rnd(),h=7+14*rnd(),roofRise=4+rnd()*2,color=['#aa8489','#b38f91','#c49a95','#b99090'][i%4];
      wrapPaint(x,25,px=>{
        c.fillStyle=color;c.fillRect(px-w/2,y-h,w,h+10);poly(c,'#a37c84',[[px-w*.6,y-h],[px-w*.12,y-h-roofRise],[px+w*.58,y-h]]);
        c.fillStyle='#edc09d';c.fillRect(px-w*.5,y-h,w*.23,h+8);
        c.fillStyle='#8d7883';for(let j=0;j<2;j++)c.fillRect(px+w*(j*.26-.05),y-h+3,1.3,2.6);
      });
    }
    for(let i=0;i<7;i++){
      const x=(i+.47)*W/7,y=shore(x*n/W)+1,h=24+8*rnd();
      c.fillStyle='#a27e83';c.fillRect(x-3.8,y-h,7.6,h);c.fillStyle='#d9a99b';c.fillRect(x-3.8,y-h,3.2,h);
      poly(c,'#9c7b83',[[x-5,y-h],[x-3.6,y-h-3],[x,y-h-8],[x+3.6,y-h-3],[x+5,y-h]]);
    }
    // The high harbor has a single long masonry viaduct suspended over its eastern inlet.
    const archX=W*.335,archY=459;
    c.fillStyle='#a98d94';c.fillRect(archX,archY,88,3);c.fillStyle='#ecd0af';c.fillRect(archX,archY-.7,88,1.2);
    for(let i=0;i<8;i++){const x=archX+i*11;c.fillStyle='#a58a91';c.fillRect(x,archY+3,2,18);c.beginPath();
      c.moveTo(x+1,archY+3);c.lineTo(x+11,archY+3);c.lineTo(x+11,archY+10);c.quadraticCurveTo(x+6,archY+1,x+1,archY+10);c.closePath();c.fill()}
    for(let i=0;i<23;i++){const x=135+38*Math.sin(i*2.4)+i*54,y=360+26*Math.cos(i*.65),wing=.6+rnd()*2;
      c.beginPath();c.strokeStyle='#987e8585';c.lineWidth=.8;c.moveTo(x-wing*1.55,y-wing*.3);c.quadraticCurveTo(x-wing*.58,y-wing*.8,x,y);c.quadraticCurveTo(x+wing*.54,y-wing*.86,x+wing*1.48,y-wing*.31);c.stroke();}
    c.fillStyle=lineGradient(c,0,480,0,H,[[0,'#b9b7af'],[.06,'#a3bfbd'],[.25,'#85aead'],[.72,'#649499'],[1,'#4f828c']]);c.fillRect(0,480,W,H-480);
    for(let i=0;i<500;i++){
      const v=rnd()**1.6,x=rnd()*W,y=481+v*224,w=.8+v*11+rnd()*4;
      wrapPaint(x,w,px=>streak(c,['#deccba73','#bbd1c660','#eef0d851','#74999866'][i%4],px,y,w,.24+v*.45,0));
    }
    for(let i=0;i<145;i++){
      const y=482+155*rnd()**1.8,x=sx+(rnd()+rnd()-1)*(8+(y-480)*.90);
      streak(c,i%4?'#ffd99c9c':'#ffedbfab',x,y,.9+rnd()*(1.4+(y-480)*.11),.4,0);
    }
    for(let i=0;i<13;i++){
      let x=(i+.27+rnd()*.3)*W/13,y=483+rnd()*12,s=2.1+rnd()*2.5;
      c.fillStyle='#7f8997';c.fillRect(x-s,y,s*2,.8);
      poly(c,'#e8d6be',[[x-.3,y-.7],[x-.25,y-2.15*s],[x-1.15*s,y-.8]]);
      poly(c,'#b8adb0',[[x+.3,y-.9],[x+.3,y-1.8*s],[x+.85*s,y-.8]]);
    }
  }
  function summit(c,rnd){
    c.fillStyle=lineGradient(c,0,0,0,H,[[0,'#315f94'],[.28,'#77a9d2'],[.55,'#c0dfeb'],[.67,'#deebed'],[1,'#b3cbd7']]);c.fillRect(0,0,W,H);
    const sx=W*.391;
    halo(c,sx,153,81,[[0,'#fffbed'],[.2,'#fcffff64'],[1,'#f3ffff00']]);ellipse(c,sx,153,10,10,'#fffdf0');
    cirrus(c,rnd,45,205,381,['#dfedf24d','#fcfcf56b','#c4dde958']);
    // Broad faces, cornices and blue couloirs are registered on the same mountain silhouette.
    function range(base,count,high,pal){
      const span=W/count,knots=[];
      for(let i=0;i<count;i++)knots.push({x:(i+.32+rnd()*.31)*span,y:base-high*(.46+.54*rnd()),foot:base-3-rnd()*12});
      for(let i=-1;i<=count;i++){
        const ki=(i+count)%count,p=knots[ki],detail=random(44731+ki*183+count*3),x=p.x+(i<0?-W:i===count?W:0),y=p.y,foot=p.foot;
        const left=x-span*(.63+.21*detail()),right=x+span*(.63+.29*detail());
        const rib1=[x+span*.06,y+(base-y)*.32],rib2=[x-span*.04,y+(base-y)*.57];
        poly(c,pal[1],[[left,foot],[x-span*.23,y+(base-y)*.43],[x-span*.15,y+(base-y)*.38],[x,y],rib1,rib2,[x+span*.13,base+14],[left,base+15]]);
        poly(c,pal[2],[[x,y],[x+span*.19,y+(base-y)*.20],[x+span*.31,y+(base-y)*.48],[x+span*.39,y+(base-y)*.53],[right,foot],[right,base+17],[x+span*.13,base+16],rib2,rib1]);
        poly(c,pal[0],[[x,y],rib1,[x+span*.017,y+(base-y)*.31],[x-span*.08,y+(base-y)*.49],[x-span*.07,y+(base-y)*.29],[x-span*.15,y+(base-y)*.38]]);
        poly(c,pal[3],[[x+span*.11,y+(base-y)*.19],[x+span*.19,y+(base-y)*.23],[x+span*.30,y+(base-y)*.50],[x+span*.19,y+(base-y)*.40]]);
        poly(c,pal[3],[[x-span*.20,y+(base-y)*.51],[x-span*.27,y+(base-y)*.60],[x-span*.50,foot],[x-span*.32,y+(base-y)*.60]]);
        c.save();c.beginPath();c.moveTo(x,y);c.lineTo(x+span*.19,y+(base-y)*.20);c.lineTo(right,foot);c.lineTo(left,foot);c.lineTo(x-span*.23,y+(base-y)*.43);c.lineTo(x-span*.15,y+(base-y)*.38);c.closePath();c.clip();
        for(let j=0;j<17;j++){
          const down=.20+detail()*.7,dr=(detail()-.49)*.76,px=x+dr*span*down,py=y+(base-y)*down;
          const len=.04+.12*detail(),side=dr>0?1:-1,tone=dr>0?pal[3]:pal[0];
          poly(c,tone,[[px,py],[px+side*.035*span,py+(base-y)*len*.26],
             [px+side*(.06+len)*span,py+(base-y)*len*1.7],[px+side*.035*span,py+(base-y)*len*.57]]);
        }
        c.restore();
      }
    }
    range(479,14,103,['#dfedf0','#c5dce5','#aec7d9','#b8cfde']);
    range(495,10,190,['#f7faf4','#d7e8ec','#8ca8c4','#a4bdd3']);
    ridgePlate(c,514,47,4.4,'#aac2d1');const edge=ridgePlate(c,542,72,1.2,'#8ca7b7');
    for(let i=0;i<900;i++){
      const x=rnd()*W,y=edge(x)+2+rnd()**1.4*45,s=1.8+rnd()*4.9;
      poly(c,i%3?'#7999aa':'#8da8b6',[[x-.43*s,y],[x,y-s],[x+.49*s,y]]);
    }
    ridgePlate(c,576,60,1.7,'#b8cdd2');
    cirrus(c,rnd,50,510,667,['#d4e4e599','#d9e8ea66']);
  }
  function forge(c,rnd){
    c.fillStyle=lineGradient(c,0,0,0,H,[[0,'#28283d'],[.36,'#535067'],[.53,'#866575'],[.64,'#be8475'],[.77,'#865560'],[1,'#423646']]);c.fillRect(0,0,W,H);
    const sx=W*.872;
    halo(c,sx,347,168,[[0,'#ffd394a6'],[.30,'#e9a18370'],[1,'#c7858800']],1.2,.78);
    ellipse(c,sx,347,12.5,12.5,'#ffdaa6');
    cirrus(c,rnd,68,264,428,['#76627291','#705c70a6','#b883815e','#e0a48563']);
    ridgePlate(c,490,74,.60,'#a0777f');ridgePlate(c,504,85,3.92,'#826471');
    // Eroded basalt shelves and narrow pillars stand out against warm ash.
    for(let i=0;i<37;i++){
      const x=(i+.22+rnd()*.6)*W/37,y=476+rnd()*8,h=11+24*rnd(),w=7+22*rnd();
      wrapPaint(x,w+5,px=>{poly(c,'#755d6a',[[px-w,y],[px-w*.55,y-h*.4],[px-w*.47,y-h*.9],[px-w*.12,y-h],[px+w*.32,y-h*.91],[px+w*.38,y-h*.54],[px+w,y]]);
        poly(c,'#846673',[[px-w*.47,y-h*.9],[px-w*.12,y-h],[px+w*.13,y-h*.94],[px+w*.04,y-h*.80],[px-w*.31,y-h*.7]])});
    }
    function volcano(x,y,s){
      const originY=509,near=x+21*s;
      halo(c,x,y,91*s,[[0,'#ee925e8a'],[.33,'#d9845950'],[1,'#a8615900']],1.45,.65);
      for(let i=0;i<13;i++){
        const a=i/12,cx=x+120*s*a**1.7,cy=y-102*s*a,rr=(7+15*a)*s;
        halo(c,cx,cy,rr,[[0,'#9a7884a6'],[.53,'#96738276'],[1,'#9c788300']],1.75,.66);
      }
      poly(c,'#634e60',[[x-185*s,originY],[x-121*s,y+73*s],[x-72*s,y+57*s],[x-23*s,y+8*s],[x-15*s,y],[x+3*s,y+3*s],[x+17*s,y-2*s],[x+28*s,y+9*s],[x+74*s,y+65*s],[near+153*s,originY],[near+153*s,536],[x-185*s,536]]);
      poly(c,'#735766',[[x-23*s,y+8*s],[x-15*s,y],[x+3*s,y+3*s],[x-22*s,y+49*s],[x-64*s,y+88*s],[x-33*s,y+49*s]]);
      const stream=[[x-12*s,y+.4*s],[x+2*s,y+3.5*s],[x+15*s,y-.7*s],[x+10*s,y+6*s],[x+3*s,y+19*s],[x+9*s,y+25*s],[x-3*s,y+42*s],[x-8*s,y+54*s],[x-22*s,y+64*s],[x-39*s,y+87*s]];
      for(const [width,color] of [[5*s,'#df795157'],[1.8*s,'#ed9461'],[.65*s,'#ffd193']]){c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.beginPath();c.moveTo(...stream[0]);for(const p of stream.slice(1))c.lineTo(...p);c.stroke()}
    }
    volcano(W*.205,395,.86);volcano(W*.697,410,.72);volcano(W*.866,365,1.12);
    ridgePlate(c,531,61,5.1,'#594858');const ridge=ridgePlate(c,544,48,3.4,'#433c4d');
    for(let i=0;i<18;i++){
      const x=(i+.3+rnd()*.44)*W/18,y=ridge(x)+1,h=11+rnd()*21,w=1.8+rnd()*3.2;
      c.fillStyle='#504050';c.fillRect(x-w,y-h,w*2,h+6);c.fillRect(x-w*1.3,y-h,w*2.6,2.3);
      c.fillStyle='#bd7868';c.fillRect(x-w,y-h,w*.4,h);
      if(i%3===0){c.fillStyle='#ce8069';c.fillRect(x+.3,y-5,1.4,2.4)}
    }
    for(let i=0;i<21;i++){
      const x=rnd()*W,y=540+rnd()*98,w=18+rnd()*88;
      wrapPaint(x,w+1,px=>{streak(c,'#a75f5352',px,y,w,1.4,4);streak(c,'#e3916359',px,y,w*.58,.6,2)});
    }
  }

  function airfield(c,rnd){
    day(c,rnd);
    // Distant hangars and parallel contrails sit on the panorama, outside the apron mesh.
    for(let i=0;i<30;i++){
      const x=(i+rnd()*.65)*W/30,y=HORIZON-5-rnd()*5,w=12+rnd()*35;
      poly(c,'#a9c7cd',[[x,y],[x+w*.18,y-5],[x+w*.8,y-5],[x+w,y],[x+w,y+5],[x,y+5]]);
    }
    for(let i=0;i<3;i++){
      const x=W*(.17+i*.32),y=126+i*58;c.strokeStyle='#f8fbf187';c.lineWidth=1.4;
      c.beginPath();c.moveTo(x,y);c.lineTo(x+168,y-20);c.stroke();
    }
  }
  function iceVault(c){
    c.fillStyle=lineGradient(c,0,0,0,H,[[0,'#24425c'],[.45,'#47758a'],[.67,'#699aaa'],[1,'#406a80']]);c.fillRect(0,0,W,H);
  }
  const settings={
    park:[day,1809,'#94c7c2'],rainbow:[night,65537,'#283655'],garage:[garage,7,'#201e27'],
    airport:[airfield,71209,'#8ac0ce'],wario:[summit,36027,'#bed9e4'],icevault:[iceVault,4329,'#548397'],harbor:[harbor,103907,'#649499'],summit:[summit,47326,'#b8cdd2'],forge:[forge,88413,'#433c4d']
  };
  let lastPlate='',lastSurface=null;
  function paintPlate(theme){
    const [paint,seed]=settings[theme]||settings.garage;
    // All twelve projected strips can share a single immutable texture.
    if(typeof OffscreenCanvas==='function'&&OffscreenCanvas.prototype.transferToImageBitmap){
      try{
        const plate=new OffscreenCanvas(W,H),ctx=plate.getContext('2d',{alpha:false});
        if(ctx){paint(ctx,random(seed));return plate.transferToImageBitmap()}
      }catch{}
    }
    const plate=canvas(W,H);paint(plate.getContext('2d',{alpha:false}),random(seed));
    if(typeof createImageBitmap==='function'){
      try{createImageBitmap(plate).then(image=>{
        if(plates.get(theme)!==plate){image.close();return}
        plates.set(theme,image);if(lastSurface===plate)lastSurface=image;
        plate.width=plate.height=1;
      },()=>{})}catch{}
    }
    return plate;
  }
  function getPlate(theme){
    if(theme===lastPlate&&lastSurface)return lastSurface;
    let p=plates.get(theme);
    if(p)plates.delete(theme);
    else{
      if(plates.size>=2){
        const key=plates.keys().next().value,old=plates.get(key);plates.delete(key);
        if(typeof old.close==='function')old.close();else old.width=old.height=1;
      }
      p=paintPlate(theme);
    }
    plates.set(theme,p);lastPlate=theme;lastSurface=p;return p;
  }
  function fit(surface,motor,alpha=true){
    let w=motor.cv.width,h=motor.cv.height;if(surface.width!==w||surface.height!==h){surface.width=w;surface.height=h}
    return surface.getContext('2d',{alpha});
  }
  function distantPoint(motor,azimuth,elevation){
    const ca=Math.cos(elevation),dx=Math.sin(azimuth)*ca,dz=Math.cos(azimuth)*ca,dy=Math.sin(elevation),cam=motor.cam;
    return motor.project(cam.x+dx*430,cam.y+dy*430,cam.z+dz*430);
  }
  function fireworks(c,motor,t){
    const w=motor.cv.width,h=motor.cv.height;let sc=h/254;
    for(let i=0;i<4;i++){
      let clock=t+(i*2.21),round=Math.floor(clock/6.3),age=clock-round*6.3;
      if(age>1.62)continue;
      const a=i*1.56+.36*Math.sin(round*3.64+i),alt=.16+.08*cycle(round*.29+i*.39),p=distantPoint(motor,a,alt);if(!p||p[0]<-w*.15||p[0]>w*1.15||p[1]<-h*.12||p[1]>h*.63)continue;
      const pal=['#fff3a8','#89f1ff','#ffa6d7','#c5c1ff'],col=pal[(i+round)%4];
      let size=(13+9*cycle(round*.56+i*.28))*sc,progress=age/1.62;
      c.save();c.lineCap='round';c.globalAlpha=Math.min(1,(1-progress)*1.55);
      for(let j=0;j<24;j++){let theta=j*Math.PI/12+.91*round,outer=1-Math.exp(-3.1*progress),vv=.68+.30*Math.sin(j*1.8+i)**2;
        let dx=Math.cos(theta)*size*vv,dy=Math.sin(theta)*size*vv;
        c.beginPath();c.moveTo(p[0]+dx*outer,p[1]+dy*outer+progress*progress*7*sc);
        c.lineTo(p[0]+dx*Math.max(0,outer-.12*(1-progress)),p[1]+dy*Math.max(0,outer-.12*(1-progress))+progress*progress*7*sc);
        c.lineWidth=Math.max(.6,sc*.85);c.strokeStyle=col;c.stroke()}
      c.restore();
    }
  }
  function sky(surface,motor,theme,t){
    if(!surface||!motor||!motor.cam)return;let c=fit(surface,motor,false),w=surface.width,h=surface.height;
    let p=getPlate(theme),cam=motor.cam,focus=h*.5*motor.f,horizon=h*.5+focus*Math.tan(cam.pitch);
    c.fillStyle=(settings[theme]||settings.garage)[2];c.fillRect(0,0,w,h);
    // Each strip spans a true azimuthal arc, rather than stretching the view as a flat card.
    const dyScale=focus/(UNIT*Math.cos(cam.pitch)**2),top=horizon-HORIZON*dyScale,dstHeight=H*dyScale;
    const count=12, step=w/count;let x0=0,ang0=Math.atan(-w*.5/focus);
    for(let i=0;i<count;i++){
      let x1=i===count-1?w:Math.round((i+1)*step),ang1=Math.atan((x1-w*.5)/focus);
      let so=cycle((cam.yaw+ang0)/(Math.PI*2))*W,sw=(ang1-ang0)*UNIT;
      let width=x1-x0+.28;
      if(so+sw<W)c.drawImage(p,so,0,sw,H,x0,top,width,dstHeight);
      else{let part=(W-so)/sw;c.drawImage(p,so,0,W-so,H,x0,top,width*part,dstHeight);
        if(part<.99999)c.drawImage(p,0,0,sw*(1-part),H,x0+width*part,top,width*(1-part),dstHeight)}
      x0=x1;ang0=ang1;
    }
    if(theme==='rainbow')fireworks(c,motor,t);
  }
  function finishConfetti(c,w,h,sc,age,t){
    c.globalAlpha=clamp01((3.3-age)*.9);
    for(let j=0;j<42;j++){let f=cycle(j*.61803+age*(.24+j%9*.014)),x=cycle(j*.41403+.02*Math.sin(t*2+j))*w;
      c.save();c.translate(x,(f-.09)*h);c.rotate(t*(j%5+2)+j);c.fillStyle=['#ffcf50','#8cf1fa','#ff5975','#fffadc','#a38afe'][j%5];
      c.fillRect(-sc,-sc,Math.max(.6,Math.abs(Math.sin(age*5+j))*4*sc),1.9*sc);c.restore();
    }
  }
  let fxDirty=false;
  function fx(surface,motor,info,t){
    if(!surface||!motor?.cam||!info)return;
    const race=info.screen==='race',confetti=info.screen==='finish'&&info.finishAge>=0&&info.finishAge<3.25;
    const sparkle=race&&info.star&&info.car&&!info.rescue;
    if(!fxDirty&&!sparkle&&!confetti)return;
    const c=fit(surface,motor),w=surface.width,h=surface.height,sc=h/255;
    if(fxDirty)c.clearRect(0,0,w,h);
    fxDirty=!!(sparkle||confetti);
    if(!fxDirty)return;
    c.save();
    if(sparkle){
      const phase=cycle(t*2.6),side=(Math.floor(t*2.6)%2?1:-1),car=info.car;
      const p=motor.project(car.x+side*.89*Math.cos(car.yaw),car.y+.29+.83*phase,car.z-side*.89*Math.sin(car.yaw));
      if(p){c.globalAlpha=.78*Math.sin(Math.PI*phase);star(c,p[0],p[1],(3.5+3*phase)*sc,'#fff6a2')}
    }
    if(confetti)finishConfetti(c,w,h,sc,info.finishAge,t);
    c.restore();
  }
  // Local coordinates for all six faces. Adjacent panel facets meet on jewel-cut edges.
  const basis=[
    [[0,0,-1],[1,0,0],[0,1,0]],[[1,0,0],[0,0,1],[0,1,0]],
    [[0,0,1],[-1,0,0],[0,1,0]],[[-1,0,0],[0,0,-1],[0,1,0]],
    [[0,1,0],[1,0,0],[0,0,1]],[[0,-1,0],[1,0,0],[0,0,-1]]
  ];
  // One guarded, opaque distance mask for all six facets. A fragment samples
  // it once; the projected size controls how much of the printed ink it covers.
  function question(g){
    const colors=['#7abace','#9ba9df','#85c7b6','#baabd1','#99cbd6','#94a9d1'];
    const tile=finishTile('pickup/opal-mark',ctx=>{
      const art=document.createElement('canvas');art.width=art.height=64;
      const c=art.getContext('2d'),im=c.createImageData(64,64);
      const segment=(x,y,ax,ay,bx,by)=>{
        const dx=bx-ax,dy=by-ay,t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy),0,1);
        return Math.hypot(x-ax-t*dx,y-ay-t*dy);
      };
      for(let j=0;j<64;j++)for(let i=0;i<64;i++){
        const u=(i-2)/59,v=(j-2)/59,x=u-.5,y=v-.343,R=.178;
        const ex=.574*R,ey=.819*R;
        let arc=Math.abs(Math.hypot(x,y)-R);
        if(y>0&&x*.819-y*.574<0)arc=Math.min(Math.hypot(x+R,y),Math.hypot(x-ex,y-ey));
        const hook=Math.min(arc,segment(x,y,ex,ey,-.006,.202),segment(x,y,-.006,.202,-.006,.264))-.049;
        const sd=Math.min(hook,Math.hypot(x+.006,y-.395)-.052);
        const edge=Math.min(u,v,1-u,1-v),k=(j*64+i)*4;
        im.data[k]=128+512*sd;
        im.data[k+1]=255*clamp(.8-.55*u-.60*v,0,1);
        im.data[k+2]=255*clamp(1-edge/.075,0,1);
        im.data[k+3]=255;
      }
      c.putImageData(im,0,0);ctx.drawImage(art,0,0);
    });
    const r=.736,k=.61,oct=[[-k,-r],[k,-r],[r,-k],[r,k],[k,r],[-k,r],[-r,k],[-r,-k]];
    for(let f=0;f<6;f++){
      const [n,u,v]=basis[f],P=(a,b)=>n.map((x,i)=>x*r+u[i]*a+v[i]*b);
      const uv=(a,b)=>[tile[0]+(2+(a/r+1)*29.5)/2048,tile[1]+(2+(1-b/r)*29.5)/1024];
      g.mat=2.125;
      for(let j=0;j<8;j++){const a=oct[j],b=oct[(j+1)%8];
        g.face(P(0,0),P(...a),P(...b),null,colors[f],n,[uv(0,0),uv(...a),uv(...b)]);
      }
    }
    g.mat=5;for(let x of [-1,1])for(let y of [-1,1])for(let z of [-1,1])
      g.tri([x*r,y*k,z*r],[x*k,y*r,z*r],[x*r,y*r,z*k],'#bfd1dc');
  }
  function coin(g){
    // Mint one continuous shell. The rim, field and raised stamp meet along
    // shared edges, so opposite faces never compete in a distant depth texel.
    const n=20,rim=[],face=[],mark=[],crown=[];
    for(let i=0;i<n;i++){
      const a=i*TAU/n,x=Math.cos(a),y=Math.sin(a);
      rim.push([.544*x,.544*y]);face.push([.465*x,.465*y]);
      const reach=Math.min(.105/Math.max(.0001,Math.abs(x)),.30/Math.max(.0001,Math.abs(y)),.369/(Math.abs(x)+Math.abs(y)));
      mark.push([reach*x,reach*y]);crown.push([.78*reach*x,.91*reach*y]);
    }
    const p=(v,z)=>[v[0],v[1],z];
    for(let i=0;i<n;i++){
      const j=(i+1)%n,a=(i+.5)*TAU/n,nx=Math.cos(a),ny=Math.sin(a);
      g.mat=0;g.face(p(rim[i],-.088),p(rim[j],-.088),p(rim[j],.088),p(rim[i],.088),'#e8a537',[nx,ny,0]);
      for(const side of [-1,1]){
        const strip=(outer,zo,inner,zi,color,normal)=>{
          g.face(p(outer[i],side*zo),p(outer[j],side*zo),p(inner[j],side*zi),p(inner[i],side*zi),color,normal);
        };
        g.mat=3;strip(rim,.088,face,.146,'#fbd069',[.59*nx,.59*ny,.81*side]);
        g.mat=2;strip(face,.146,mark,.146,'#f5b93f',[0,0,side]);
        g.mat=0;strip(mark,.146,crown,.169,'#edb140',[.68*nx,.68*ny,.73*side]);
        g.mat=2;g.face([0,0,.169*side],p(crown[i],.169*side),p(crown[j],.169*side),null,'#ffe08a',[0,0,side]);
      }
    }
  }
  function banana(g){
    g.mat=3;
    for(let j=0;j<3;j++){let a=j*Math.PI*2/3+.16;
      const local=(x,y,z)=>[x*Math.cos(a)+z*Math.sin(a),y,z*Math.cos(a)-x*Math.sin(a)];
      const rows=[[.00,.40,.17],[.13,.28,.21],[.35,.12,.24],[.57,.075,.16],[.735,.14,.08],[.807,.24,.013]];
      for(let i=0;i+1<rows.length;i++){let [aZ,aY,aW]=rows[i],[bZ,bY,bW]=rows[i+1];
        g.quad(local(-aW,aY,aZ),local(0,aY+.04,aZ),local(0,bY+.04,bZ),local(-bW,bY,bZ),'#ffe88a');
        g.quad(local(0,aY+.04,aZ),local(aW,aY,aZ),local(bW,bY,bZ),local(0,bY+.04,bZ),'#fff2a0');
        g.quad(local(-aW,aY,aZ),local(-aW*.91,aY-.06,aZ),local(-bW*.91,bY-.06,bZ),local(-bW,bY,bZ),'#e5a02b');
        g.quad(local(aW,aY,aZ),local(aW*.91,aY-.06,aZ),local(bW*.91,bY-.06,bZ),local(bW,bY,bZ),'#efb42a');}}
    g.ell(0,.36,0,.225,.32,.218,'#ffd34c',10,5);
    g.tube(0,.52,0,.042,.73,.017,.16,.076,'#ffde52',9);g.tube(.042,.73,.017,.083,.90,.046,.080,.058,'#e2c849',7);
    g.tube(.083,.90,.046,.089,.94,.054,.058,.052,'#8c652f',7);
    for(let s of [-1,1]){g.ell(.088*s,.395,-.196,.032,.071,.024,'#353029',7,4);g.ell(.089*s-.009,.425,-.216,.01,.018,.009,'#fff8c9',5,3)}
    g.tube(-.058,.302,-.209,0,.28,-.216,.011,.012,'#6c4b34',5);g.tube(0,.28,-.216,.061,.307,-.204,.012,.010,'#6c4b34',5);
  }
  function shell(g){
    g.mat=3;g.ell(0,.22,0,.54,.20,.59,'#d19e61',12,5);
    g.ell(0,.32,0,.59,.164,.625,'#fff3cb',16,6);
    const P=(a,e,offset=1)=>[.502*Math.cos(e)*Math.cos(a)*offset,.34+.446*Math.sin(e)*offset,.544*Math.cos(e)*Math.sin(a)*offset];
    const hues=['#e34c3e','#d94138','#ee6353','#eb4d40','#d63f37','#ec6557','#db4338','#e6423d'];
    for(let j=0;j<8;j++){let a=j*Math.PI/4,b=(j+1)*Math.PI/4,m=(a+b)*.5;
      let bottom=[P(a,0),P(m,0),P(b,0)],top=[P(a,.625),P(m,.79),P(b,.625)];
      g.quad(bottom[0],bottom[1],top[1],top[0],hues[j]);g.quad(bottom[1],bottom[2],top[2],top[1],hues[j]);
      g.tri(top[0],top[1],P(m,1.12),'#ec5a4a');g.tri(top[1],top[2],P(m,1.12),'#e55042');
      g.tri(top[0],P(m,1.12),P(a,1.26),'#ee6651');g.tri(top[2],P(b,1.26),P(m,1.12),'#e7574a');
      g.tri(P(a,1.26),P(m,1.12),P(m,1.57),'#fa7660');g.tri(P(m,1.12),P(b,1.26),P(m,1.57),'#fa7660');
      for(let [p,q] of [[top[0],top[1]],[top[1],top[2]],[bottom[0],top[0]]])g.tube(...p,...q,.013,.013,'#a83134',4)}
  }
  function mushroom(g){
    g.mat=3;g.ell(0,.32,0,.325,.325,.283,'#ffe8bd',12,7);
    for(let s of [-1,1]){g.ell(s*.091,.335,-.271,.035,.080,.021,'#34312e',7,4);g.ell(s*.091-.008,.362,-.29,.012,.021,.008,'#fcffdf',5,3)}
    const P=(a,e,gap=1)=>[.53*Math.cos(e)*Math.cos(a)*gap,.477+.447*Math.sin(e)*gap,.51*Math.cos(e)*Math.sin(a)*gap];
    const point=(a,e)=>P(a,e);
    for(let i=0;i<16;i++){let a=i*Math.PI/8,b=(i+1)*Math.PI/8;for(let j=0;j<7;j++){
      let t=-.33+j*(Math.PI/2+.33)/7,k=-.33+(j+1)*(Math.PI/2+.33)/7;
      g.quad(point(a,t),point(b,t),point(b,k),point(a,k),j<1?'#bc3643':j>4?'#ff6651':j>1?'#ef463d':'#db383b')}}
    function dot(a,e,rad){
      const n=[Math.cos(e)*Math.cos(a),Math.sin(e),Math.cos(e)*Math.sin(a)],
        u=[-Math.sin(a),0,Math.cos(a)],v=[-Math.sin(e)*Math.cos(a),Math.cos(e),-Math.sin(e)*Math.sin(a)];
      const F=(t,r)=>{let p=n.map((d,i)=>d*Math.cos(r)+(u[i]*Math.cos(t)+v[i]*Math.sin(t))*Math.sin(r));return [.536*p[0],.477+.453*p[1],.516*p[2]]};
      for(let i=0;i<13;i++)g.tri(F(0,0),F(i*Math.PI*2/13,rad),F((i+1)*Math.PI*2/13,rad),'#fff5da');}
    for(let i=0;i<5;i++)dot(i*Math.PI*2/5-1.57,.33,.30);
    dot(.3,1.38,.28);
  }
  function powerStar(g){
    const y0=.64,r=.64,inner=.305,ring=[];
    for(let i=0;i<10;i++){let a=Math.PI/2-i*Math.PI/5,s=i%2?inner:r;ring.push([s*Math.cos(a),y0+s*Math.sin(a)])}
    for(let i=0;i<10;i++){let a=ring[i],b=ring[(i+1)%10];
      g.mat=2;g.tri([0,y0,-.182],[a[0],a[1],-.051],[b[0],b[1],-.051],i%2?'#ffcf44':'#ffe463');
      g.tri([0,y0,.182],[a[0],a[1],.051],[b[0],b[1],.051],i%2?'#ffcf44':'#ffe463');
      g.mat=4;g.quad([a[0],a[1],-.051],[b[0],b[1],-.051],[b[0],b[1],.051],[a[0],a[1],.051],'#e99c28');}
    for(let s of [-1,1])for(let face of [-1,1]){g.mat=3;g.ell(s*.095,.715,face*.17,.035,.088,.018,'#353026',8,4);
      g.ell(s*.095-.008,.756,face*.186,.013,.025,.008,'#fff6dd',6,3)}
  }
  function item(type){if(items.has(type))return items.get(type);let g=new Geo();
    const recipes={coin,box:question,banana,shell,mushroom,star:powerStar};
    if(!Object.hasOwn(recipes,type))return g;
    recipes[type](g);
    items.set(type,g);return g;
  }
  return {sky,fx,item,prepare:getPlate};
})();
function raceSky(canvas,motor,theme,t){RubyAtmos.sky(canvas,motor,theme,t)}
function raceFX(canvas,motor,info,t){RubyAtmos.fx(canvas,motor,info,t)}
function getRubyItemMesh(type){return RubyAtmos.item(type)}
