// Original CTR-001 in Flare Red. Units are millimetres. The hinge is the assembly datum.
function buildRuby3DS(g) {
  const lacquer = '#b32136', face = '#bd3745', ruby = '#8f1c2e';
  const wine = '#581425', underside = '#711b2c';
  const ink = '#e6d9cd', black = '#15141a', glass = '#111117';
  const axis = Math.PI / 2;

  // Radius detail is reserved for visible contours. Small moulded marks are
  // chamfered octagons or simple strips and share the body draw call.
  function slab(x,y,z,w,h,depth,radius,bevel,color,finish) {
    if (radius >= 2.7 || Math.min(w,h)>=8) {
      g.slab(x,y,z,w,h,depth,radius,bevel,color,finish);
      return;
    }
    const rx=w/2, ry=h/2, r=Math.min(radius,rx*.92,ry*.92);
    const p=r<=.24 || Math.min(w,h)<.5
      ? [[-rx,-ry],[rx,-ry],[rx,ry],[-rx,ry]]
      : [[-rx+r,-ry],[rx-r,-ry],[rx,-ry+r],[rx,ry-r],[rx-r,ry],[-rx+r,ry],[-rx,ry-r],[-rx,-ry+r]];
    g.sweep(x,y,z,p,depth,depth < .27 ? 0 : bevel,color,finish);
  }

  // On the red original the translucent lid changes from burgundy by the lenses
  // to scarlet by the hinge. Shade the clear-coated insert with vertex colors
  // so the gradient follows the physical shell through a full orbit.
  function paintedInsert(w,h,r,z,deck=false) {
    const stations=deck ? [[-1,[.63,.14,.20]],[-.98,[.64,.14,.20]],[-.93,[.65,.15,.20]],[-.85,[.66,.15,.20]],[0,[.70,.18,.23]],[.82,[.76,.22,.27]],[.94,[.76,.22,.27]],[.985,[.76,.22,.27]],[1,[.76,.22,.27]]] : [[-1,[.77,.22,.25]],[-.98,[.78,.23,.26]],[-.93,[.77,.22,.25]],[-.85,[.76,.20,.24]],[-.5,[.75,.17,.23]],[-.06,[.69,.12,.19]],[.42,[.59,.09,.15]],[.82,[.48,.06,.12]],[.94,[.43,.055,.11]],[.985,[.42,.055,.11]],[1,[.42,.055,.11]]];
    const rows=stations.map(([t,color])=>{
      const y=t*h/2, corner=Math.max(0,Math.abs(y)-(h/2-r));
      return {y,x:w/2-r+Math.sqrt(Math.max(0,r*r-corner*corner)),color};
    });
    const crown=deck ? .064 : .218,cols=4;
    const surface=(row,col)=>{
      const u=col*2/cols-1,v=row.y/(h/2),rise=crown*(1-u*u)*(1-v*v);
      const nx=2*crown*u*(1-v*v)/row.x,ny=4*crown*v*(1-u*u)/h;
      const n=Math.hypot(nx,ny,1);
      return {p:[u*row.x,row.y,z+rise],n:[nx/n,ny/n,1/n],c:row.color};
    };
    for(let j=1;j<rows.length;j++)for(let i=0;i<cols;i++){
      const a=surface(rows[j-1],i),b=surface(rows[j-1],i+1);
      const c=surface(rows[j],i+1),d=surface(rows[j],i);
      for(const v of [a,b,c,a,c,d])g.vertex(v.p,v.n,v.c,9);
    }
  }

  // Trim surrounds a recessed image: the four rails never run under the active area.
  function displayTrim(x, y, z, w, h, lip, depth, color, finish) {
    for (const side of [-1, 1]) {
      slab(x, y + side * (h + lip) / 2, z, w + 2 * lip, lip, depth, lip * .43, .13, color, finish);
      slab(x + side * (w + lip) / 2, y, z, lip, h, depth, .25, .12, color, finish);
    }
  }

  function opticalGlass(x, y, z, outside, front) {
    // A nickel retaining lip surrounds a dark optical barrel. Curved glass
    // rises above the recess, leaving both the barrel and the lens visible in profile.
    g.lathe(x,y,z,[[outside,-.10],[outside,.05],[outside*.91,.20],[outside*.83,.19]],front?'#3b3c44':'#834154','satin',20);
    g.lathe(x,y,z,[[outside*.83,.16],[outside*.80,.22],[outside*.61,.24]],'#11151d','matte',18);
    g.lathe(x,y,z,[[outside*.62,.23],[outside*.58,.31],[outside*.39,.38],[outside*.20,.41]],'#243646','glass',18);
    g.lathe(x,y,z,[[outside*.29,.38],[outside*.20,.419]],'#101b29','glass',12);
    g.lathe(x-outside*.24,y+outside*.24,z,[[outside*.10,.42],[outside*.07,.44]],'#8cafb6','glass',8);
  }

  // The stereo perforations share one recessed floor and a short bevel.
  // At this size the backside of a complete turned button would be buried.
  function speakerHole(x,y){
    const n=[0,0,1],rim=[.187,.181,.212],well=[.027,.031,.046];
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4,b=(i+1)*Math.PI/4;
      const p=(t,r,z)=>[x+Math.cos(t)*r,y+Math.sin(t)*r,z];
      const na=[-Math.cos(a)*.31,-Math.sin(a)*.31,.951],nb=[-Math.cos(b)*.31,-Math.sin(b)*.31,.951];
      const o=p(a,.53,2.236),e=p(b,.53,2.236),j=p(b,.39,2.208),k=p(a,.39,2.208);
      g.quad(o,e,j,k,na,nb,nb,na,rim,2);g.tri([x,y,2.208],k,j,n,n,n,well,1);
    }
  }

  function fastener(x, y, z) {
    g.lathe(x,y,z,[[1.13,-.13],[1.14,.02],[1.0,.09]],'#491a27','satin',12);
    g.lathe(x,y,z,[[.72,.095],[.69,.16]],'#886575','metal',12);
    for (const angle of [0, Math.PI / 2]) {
      g.part({x,y,z:z+.18,rz:angle+.23},()=>{
        slab(0,0,0,.8,.15,.035,.02,.01,'#492d36','ink');
      });
    }
  }

  // The upper and lower halves terminate at the same x-extent. The three layers
  // of the base are separately rounded, preserving the visible original stepped rim.
  slab(0,-36.9,-3.3,132.3,72.5,7.0,6.5,1.65,underside,'satin');
  slab(0,-37,-.25,134,74,4.45,6.45,.85,wine,'candy');
  slab(0,-37,1.95,133.8,73.85,1.05,6.35,.32,'#681926','candy');
  slab(0,-37,3.89,133.65,73.7,3.95,6.3,1.03,face,'candy');

  g.part({y:-37},()=>paintedInsert(131.52,71.59,5.26,5.884,true));

  // Bottom screen bezel is molded in the same red material as the controls.
  slab(0,-33.4,5.88,67.1,51.7,.57,2.0,.22,'#9b2535','satin');
  slab(0,-33.4,6.11,64.0,48.9,.40,.83,.12,'#5b1b27','glass');
  displayTrim(0,-33.4,6.35,61.44,46.08,1.18,.44,'#6d2631','gloss');
  g.screen('lower',0,-33.4,6.375,61.44,46.08);

  // Circle Pad: dark clearance well, beveled bank and a dished grey rubber cap.
  const stickX = -50.5, stickY = -20.8;
  g.lathe(stickX,stickY,5.87,[[10.35,-.2],[10.25,.13],[9.45,.40],[8.85,.14]],'#8a2634','gloss',32);
  g.lathe(stickX,stickY,6.00,[[9.15,-.18],[9.08,.09],[8.20,.1]],'#4c252b','matte',32);
  g.key('steer',()=>{
    g.lathe(stickX,stickY,6.10,[[7.55,-.18],[7.83,.26],[7.79,1.12],[7.45,1.58],[6.82,1.73],[5.74,1.58],[4.45,1.38],[2.35,1.24],[.08,1.23]],'#adacaa','rubber',32);
  });
  g.control('steer',stickX,stickY,7.83,22.2,22.2);

  // One continuous, beveled rocker, with separate satin recess and arm ribs.
  const padX=-50.5, padY=-47.1;
  const cross=[[-2.92,8],[2.92,8],[2.92,2.92],[8,2.92],[8,-2.92],[2.92,-2.92],[2.92,-8],[-2.92,-8],[-2.92,-2.92],[-8,-2.92],[-8,2.92],[-2.92,2.92]];
  g.sweep(padX,padY,5.98,cross.map(([x,y])=>[x*1.13,y*1.13]),.40,.19,'#66202a','satin');
  g.key('dpad',()=>{
    g.sweep(padX,padY,6.60,cross,1.35,.48,'#8b2635','candy');
    for (let i=0;i<4;i++) {
      g.part({x:padX,y:padY,z:7.3,rz:i*axis},()=>{
        slab(0,5.45,0,2.48,.40,.17,.17,.04,'#b14b56','satin');
      });
    }
  });
  g.control('dpad',padX,padY,7.37,19,19);

  // On the original machine the XYAB letters are all the same muted ivory.
  const keyX=50.4,keyY=-26.3;
  for(const [letter,id,dx,dy] of [['X','brakeBtn',0,7.7],['Y','rearBtn',-7.7,0],['A','itemBtn',7.7,0],['B','driftBtn',0,-7.7]]) {
    const x=keyX+dx,y=keyY+dy;
    g.lathe(x,y,5.92,[[3.94,-.10],[3.93,.09],[3.66,.24]],'#702331','satin',22);
    g.key(id,()=>{
      g.lathe(x,y,6,[[3.36,-.20],[3.38,.78],[3.27,1.39],[3.00,1.71],[.10,1.88]],'#982a39','candy',24);
      g.label(letter,x,y,7.902,2.7,2.95,ink,{font:'bold 64px Arial'});
    });
    g.control(id,x,y,7.93,7.8,7.8);
  }

  // The original flush membrane runs continuously beneath the touch panel.
  slab(0,-63.5,5.88,65.8,7.65,.29,.65,.1,'#902c3a','satin');
  const systemKeys=[[-21.3,'SELECT','settingsKey'],[0,'HOME','homeKey'],[21.3,'START','startKey']];
  for(const [x,caption,id] of systemKeys) {
    g.key(id,()=>{
      slab(x,-63.5,6.015,20.88,7.17,.2,.32,.07,'#aa3341','satin');
      if(id==='homeKey') {
        g.label(caption,x+1.68,-63.55,6.151,6.5,1.63,ink,{font:'bold 64px Arial'});
        const house=[[-1.43,-.03],[-1.43,-1.25],[-.48,-1.25],[-.48,-.45],[.42,-.45],[.42,-1.25],[1.40,-1.25],[1.40,.19],[1.74,.14],[0,1.52],[-1.74,.14]];
        g.sweep(x-3.98,-63.45,6.15,house,.08,.015,ink,'ink');
      }else{
        g.label(caption,x,-63.55,6.151,caption==='SELECT'?8.65:7.55,1.63,ink,{font:'bold 64px Arial'});
      }
    });
    g.control(id,x,-63.5,6.16,20.6,7.17);
  }

  // power key, microphone and front-edge indicator light pipes
  g.lathe(43.3,-62.9,5.91,[[2.7,-.03],[2.62,.14]],'#702333','satin',20);
  g.key('powerKey',()=>{
    g.lathe(43.3,-62.9,6.04,[[2.14,-.01],[2.11,.11],[1.93,.17]],'#ab3443','gloss',20);
    // The power pictogram is moulded into the key, independent of system fonts.
    const pi=Math.PI, normal=[0,0,1], symbolColor=[.86,.73,.72];
    for(let j=0;j<14;j++){
      const a=pi*.23+j*(pi*1.54/14),b=a+pi*1.54/14;
      for(const [angle,r] of [[a,.96],[a,.74],[b,.74],[a,.96],[b,.74],[b,.96]]) {
        g.vertex([43.3+Math.sin(angle)*r,-62.92+Math.cos(angle)*r,6.24],normal,symbolColor,7);
      }
    }
    slab(43.3,-62.24,6.23,.19,.9,.028,.04,0,'#d9b9b7','ink');
  });
  g.control('powerKey',43.3,-62.9,6.26,6.75,6.75);
  g.label('POWER',51.9,-63.0,6.04,8.5,1.52,'#d3aab0',{font:'bold 64px Arial'});
  g.lathe(20.1,-69.9,5.86,[[.46,-.04],[.43,.03]],'#61232b','matte',9);
  g.label('MIC',23.65,-69.9,5.96,3.88,1.08,'#d3a4a9');

  // Front face (normal points towards the player's hands).
  g.part({y:-73.92,z:-.4,rx:axis},()=>{
    g.lathe(0,0,0,[[2.86,-.35],[2.84,.10],[2.44,.20]],'#641c29','satin',22);
    g.lathe(0,0,0,[[2.32,.18],[2.16,.26]],'#252029','metal',20);
    g.lathe(0,0,0,[[1.73,.26],[1.63,.28]],'#090a10','matte',18);
    for(const [x,c] of [[44.2,'#5293db'],[49.2,'#c68347']]) {
      slab(x,-.55,.07,2.75,.95,.36,.45,.12,'#401b26','gloss');
      slab(x,-.55,.28,2.18,.55,.12,.24,.05,c,'emissive');
    }
  });

  // Original telescoping stylus and gaming/charging connections share the rear edge.
  g.part({y:-.40,z:-1.31,rx:-axis},()=>{
    slab(0,0,.17,36.3,3.12,.54,1.08,.20,'#4b1a27','satin');
    slab(0,0,.40,34.7,2.22,.12,.7,.06,'#1f1820','matte');
    slab(0,-.03,.50,32.7,.92,.1,.22,.03,'#452a32','rubber');
    slab(27.3,.10,.21,8.48,3.83,.56,.47,.18,'#4a1826','satin');
    slab(27.3,.10,.50,7.53,2.73,.12,.28,.04,'#a59686','metal');
    slab(27.3,.10,.59,6.64,1.92,.08,.22,.02,'#211c21','matte');
    for(const x of [23.1,33.1]) {
      slab(x,-1.45,.33,1.28,1.39,.20,.28,.07,'#be9865','metal');
    }
    slab(-24.8,0,.23,6.7,3.4,.52,1.38,.15,'#56212b','satin');
    slab(-24.8,-.04,.54,5.78,2.56,.27,1.15,.11,'#b14149','gloss');
    slab(-35.4,.0,.18,6.1,2.9,.52,1.1,.15,'#391b24','satin');
    slab(-35.4,.0,.46,5.54,2.35,.22,.88,.10,'#261922','glass');
  });
  for(const side of [-1,1]) {
    const letter=side<0?'L':'R';
    slab(side*56,-3.49,-1.2,17.4,7.06,7.0,2.78,1.03,'#732131','gloss');
    g.part({x:side*56,y:.0,z:-.9,rx:-axis},()=>{
      g.label(letter,0,0,.43,2.54,2.88,'#b7727d',{font:'bold 64px Arial'});
    });
  }

  // Left side SD door and volume slide, right side spring-return wireless switch.
  g.part({x:-66.87,ry:-axis},()=>{
    slab(0,-46.0,0,5.4,24.5,.34,1.31,.12,'#58202a','satin');
    slab(0,-46,.22,4.75,23.8,.29,1.16,.11,'#962b39','satin');
    g.label('SD',0,-46,.39,3.4,1.34,'#d69ca2',{font:'bold 64px Arial'});
    slab(0,-18.4,.10,2.64,12.3,.30,1.18,.14,'#56202a','satin');
    g.key('soundToggle',()=>{
      slab(0,-16.7,.44,2.10,5.17,.62,.64,.17,'#9e3d49','satin');
      for(let j=-1;j<=1;j++) slab(0,-16.7+j*.84,.79,1.62,.21,.13,.09,.04,'#c46c74','satin');
    });
    g.control('soundToggle',0,-16.7,.89,7,12);
  });
  g.part({x:66.87,ry:axis},()=>{
    slab(0,-39.15,.06,2.85,7.82,.30,1.18,.12,'#64212d','satin');
    slab(0,-39.6,.35,1.98,3.44,.55,.61,.15,'#963746','satin');
    slab(0,-33.0,.20,1.12,2.0,.26,.49,.08,'#d59a51','glass');
  });

  // Undertray and full battery cover. These markings face away from the player's thumbs.
  g.part({x:0,y:-37.1,z:-6.55,ry:Math.PI},()=>{
    slab(0,0,.16,128.5,66.75,.68,5.3,.32,'#671a29','satin');
    slab(0,-.20,.49,127.8,65.6,.48,5.0,.18,underside,'satin');
    for(const x of [-53.9,53.9]) for(const y of [-28.3,28.5]) fastener(x,y, .74);
    g.label('NINTENDO',-7.00,7.82,.79,15,3.12,'#c07b82',{font:'bold 64px Arial'});
    g.label('3DS',6.72,7.82,.79,11.6,4.38,'#cc878c',{font:'bold 64px Arial'});
    g.label('MODEL NO. CTR-001',0,2.91,.79,19.2,1.49,'#b66e78');
    g.label('Nintendo   •   4.6V ⎓ IN',0,.45,.79,18.90,1.43,'#ae6a75');
    slab(0,-15.9,.75,30.6,4.9,.12,.18,.05,'#c6afa8','matte');
    for(let i=0;i<45;i++) {
      const x=-13.6+i*.59;
      const lineWidth=i%5===0?.41:i%3===0?.28:.14;
      const n=[0,0,1],color=[.26,.18,.19];
      for(const [dx,dy] of [[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]]) {
        g.vertex([x+dx*lineWidth/2,-15.65+dy*1.05,.835],n,color,7);
      }
    }
  });

  // Thin upper assembly. A black mirrored inner face and a broad colored back skin
  // share the same red perimeter. The outer stereo camera window is visible from the rear.
  // Both active panes lie at z=6.375. The axis and its end journals remain
  // above this plane, even at the fully open mechanical stop.
  g.part({z:6.375-2.45},()=>{
    slab(0,36.60,-1.76,133.7,73.65,5.5,6.5,1.77,lacquer,'candy');
    slab(0,36.52,.04,134,73.8,2.35,6.43,.79,ruby,'candy');
    // The tinted injection edge is exposed between the black face and
    // the darker red carrier. Both sides remain inside the 134 mm width.
    slab(0,36.55,.66,133.74,73.6,.78,6.31,.22,'#541824','satin');
    slab(0,36.55,1.06,133.53,73.39,.46,6.11,.17,'#a82d3e','candy');
    slab(0,36.65,1.31,132.76,72.72,1.45,5.80,.72,black,'gloss');
    slab(0,37.15,2.01,130.3,69.96,.35,5.03,.15,glass,'glass');
    // The inside LCD uses a five-to-three active aperture, with the small bevel
    // visible when the console is turned sideways.
    slab(0,35.35,2.18,78.82,48.1,.25,.56,.10,'#07090e','glass');
    displayTrim(0,35.35,2.40,76.8,46.08,.81,.27,'#211e25','glass');
    g.screen('upper',0,35.35,2.45,76.8,46.08);
    opticalGlass(0,66.83,2.2,1.46,true);
    for(const x of [-53.3,53.3]){
      const pattern=[[0,0],[0,1],[0,2],[0,-1],[0,-2],[-1,0],[1,0],[-1,1],[1,-1]];
      for(const [dx,dy] of pattern){
        const px=x+dx*1.55,py=35.6+dy*1.75;
        speakerHole(px,py);
      }
    }
    for(const x of [-53.6,53.6]){
      slab(x,68.0,2.23,7.07,1.84,.32,.40,.13,'#302c33','rubber');
      slab(x,3.9,2.23,5.90,1.72,.31,.40,.11,'#302c33','rubber');
    }
    // Center-right 3D indicator and edge depth slider.
    g.label('3D',60.8,25.55,2.28,3.36,1.96,'#73ad86',{font:'bold 64px Arial'});
    g.label('OFF',62.12,21.3,2.26,3.75,1.15,'#86838a',{font:'bold 64px Arial'});
    g.part({x:66.60,y:0,ry:axis},()=>{
      slab(0,31.0,.01,2.07,13.7,.40,.81,.15,'#421d28','satin');
      g.key('tiltBtn',()=>{
        slab(0,32.9,.37,2.26,5.55,.83,.61,.2,'#8b4b56','satin');
        for(let i=-1;i<=1;i++) slab(0,32.9+i*.91,.82,1.75,.21,.12,.09,.04,'#bb8790','satin');
      });
      g.control('tiltBtn',0,31,.89,6.6,14);
    });
    // Exterior lens pair near the lid's leading edge, at the original 35 mm spacing.
    g.part({x:0,y:36.6,z:-4.32,ry:Math.PI},()=>{
      slab(0,0,-.07,131.95,71.70,.72,5.90,.27,'#56192b','candy');
      slab(0,0,.18,131.43,71.22,.64,5.72,.24,'#a42a38','candy');
      paintedInsert(130.75,70.58,5.43,.517);
      for(const x of [-17.5,17.5]) opticalGlass(x,27.15,.63,2.18,false);
      g.lathe(-20.96,27.15,.64,[[.57,0],[.51,.11]],'#452634','glass',10);
    });
  });

  // Hinge sleeves are turned solids with distinct end caps, washers and a
  // slight waist along the lengthy central knuckle, as on the CTR-001.
  function barrel(x1,x2,r,color,finish='candy'){
    const h=(x2-x1)/2;
    g.part({x:(x1+x2)/2,y:.08,z:4.73,ry:axis},()=>{
      g.lathe(0,0,0,[[r-.50,-h],[r,-h+.45],[r,h-.45],[r-.50,h]],color,finish,24);
    });
  }
  barrel(-66.07,-50.2,4.1,'#a92e3c');
  barrel(-50.08,-49.36,3.8,'#451d2a','satin');
  barrel(-49.26,49.24,4.0,'#b03442');
  barrel(49.33,50.04,3.8,'#451d2a','satin');
  barrel(50.16,66.07,4.1,'#a92e3c');
  for(const side of [-1,1]){
    // Circular end faces, a fine pin seam and the moulding return at the axis.
    g.part({x:side*66.10,y:.08,z:4.73,ry:side*axis},()=>{
      g.lathe(0,0,0,[[3.36,-.07],[3.30,.03],[2.96,.12]],'#6b2633','satin',18);
      g.lathe(0,0,.10,[[2.71,.01],[2.63,.08]],'#a42d3d','candy',18);
    });
  }
  slab(61.33,1.21,8.64,3.2,1.03,.34,.46,.1,'#512832','gloss');
  slab(61.33,1.21,8.84,2.57,.61,.16,.28,.07,'#73bf9e','glass');
}
