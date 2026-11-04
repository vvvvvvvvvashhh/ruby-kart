/* Model-space origin is on the ground. The scenic front faces -Z. */
// Keep the authored placement, paint, landmarks and normals. Small round
// details need fewer silhouette segments once their chord error is subpixel.
class BackdropDetail extends Geo{
 constructor(){super();this.error=0}
 ell(x,y,z,rx,ry,rz,color,sides=12,rings=7){
  const n=Math.min(sides,Math.max(4,Math.ceil(sides*.55))),m=Math.min(rings,Math.max(2,Math.ceil(rings*.55)));
  this.error=Math.max(this.error,Math.max(Math.abs(rx),Math.abs(rz))*(1-Math.cos(Math.PI/n))+
   Math.max(Math.abs(rx),Math.abs(ry),Math.abs(rz))*(1-Math.cos(Math.PI/(2*m))));
  super.ell(x,y,z,rx,ry,rz,color,n,m);
 }
 tube(x,y,z,X,Y,Z,r,R,color,sides=12){
  const n=Math.min(sides,Math.max(4,Math.ceil(sides*.60)));
  if(n<sides)this.error=Math.max(this.error,Math.max(r,R)*(1-Math.cos(Math.PI/n)));
  super.tube(x,y,z,X,Y,Z,r,R,color,n);
 }
}
function distantDecoration(build){
 const full=build(new Geo()),far=build(new BackdropDetail());
 if(far.d.length<full.d.length*.85)full.farDetail=far;
 return full;
}
function makeProp(kind, variant = 0, g) {
  if(!g&&['tree','cloud','hill','stand','mushroom'].includes(kind))return distantDecoration(mesh=>makeProp(kind,variant,mesh));
  g=g||new Geo();
  const turn = Math.PI * 2;
  const alt = ((Math.floor(variant) % 6) + 6) % 6;
  const red = '#e63930', rose = '#ff6e54', cream = '#fff6d8', ivory = '#fffcea';
  const blue = '#1978c3', sky = '#57b9ed', navy = '#244e73', yellow = '#ffca32';
  const ink = '#28394a', stem = '#e7cf91', brown = '#986237';
  const capPaint = [red, '#2489dc', '#efb524', '#71b749', '#e35d95', '#8661ba'];
  const b = (...p) => g.box(...p), e = (...p) => g.ell(...p), t = (...p) => g.tube(...p);
  const q = (...p) => g.quad(...p), tri = (...p) => g.tri(...p);

  function disc(x, y, z, xrad, yrad, paint, segments = 9) {
    for (let i = 0; i < segments; i++) {
      const a = i * turn / segments, c = (i+1) * turn / segments;
      tri([x,y,z], [x+xrad*Math.cos(a),y+yrad*Math.sin(a),z], [x+xrad*Math.cos(c),y+yrad*Math.sin(c),z], paint);
    }
  }

  // Paint the patches along the surface, including the ones visible at grazing angles.
  function shellPatch(cx,cy,cz,rx,ry,rz, bearing,latitude, spreadX,spreadY,paint, steps=12) {
    const u = [Math.cos(bearing),0,Math.sin(bearing)];
    const v = [-Math.sin(bearing)*Math.sin(latitude), Math.cos(latitude),Math.cos(bearing)*Math.sin(latitude)];
    const n = [Math.sin(bearing)*Math.cos(latitude),Math.sin(latitude),-Math.cos(bearing)*Math.cos(latitude)];
    const pos = (uu,vv) => {
      let x=n[0]+u[0]*uu+v[0]*vv, y=n[1]+v[1]*vv, z=n[2]+u[2]*uu+v[2]*vv;
      const norm=1.006/Math.hypot(x,y,z); return [cx+x*rx*norm,cy+y*ry*norm,cz+z*rz*norm];
    };
    const center=pos(0,0);
    for(let j=0;j<steps;j++){
      const a=turn*j/steps, h=turn*(j+1)/steps;
      const ax=spreadX*Math.cos(a), ay=spreadY*Math.sin(a), hx=spreadX*Math.cos(h), hy=spreadY*Math.sin(h);
      const p=pos(ax*.53,ay*.53), pp=pos(hx*.53,hy*.53);
      tri(center,p,pp,paint); q(p,pos(ax,ay),pos(hx,hy),pp,paint);
    }
  }

  function pennant(x,y,z,length,height,color) {
    tri([x,y,z],[x+length*.48,y-.14*height,z+.13],[x+length*.48,y-height*.72,z+.13],color);
    q([x,y,z],[x+length*.48,y-height*.72,z+.13],[x+length*.48,y-height,z+.13],[x,y-height,z],color);
    tri([x+length*.48,y-.14*height,z+.13],[x+length,y-height*.45,z],[x+length*.48,y-height,z+.13],color);
  }

  function stripes(x,y,z,count,width,height,depth,cols) {
    for(let i=0;i<count;i++) b(x+(i+.5)*width/count-width/2,y,z,width/count+.006,height,depth,cols[i%cols.length]);
  }

  function chevron(x,y,z,size,col,sign=1) {
    const p=(u,v)=>[x+sign*u*size,y+v*size,z];
    q(p(-.61,.62),p(.03,.62),p(.63,0),p(-.01,0),col);
    q(p(-.01,0),p(.63,0),p(.03,-.62),p(-.61,-.62),col);
  }

  if (kind === 'start') {
    for (const s of [-1,1]) {
      const x=10.65*s;
      b(x,.27,0,2.65,.54,3.3,'#a5b3ba'); b(x,.65,0,2.05,.35,2.75,ivory);
      b(x,3.52,0,1.60,5.64,2.02,blue);
      b(x,3.48,-1.03,1.24,5.45,.08,sky);
      b(x,.98,-1.09,1.45,.42,.1,yellow);
      for(let j=0;j<4;j++) {
        b(x,2+j*.88,-1.12,1.08,.22,.09,ivory);
        b(x,2+j*.88,1.02,1.08,.22,.09,ivory);
      }
      b(x,6.40,0,2.30,.60,2.28,'#f9ab26');
      b(x,6.89,0,2.15,.46,1.96,rose);
      t(x,8.26,0,x,10.8,0,.09,.065,ivory,6);
      pennant(x,10.78,0,1.38,.83,s<0?red:blue);
      // Two compact speaker stacks on brackets beside the gate.
      b(x+s*1.08,4.46,-.15,.65,1.72,.77,ink);
      for(const h of [4.07,4.83]) disc(x+s*1.08,h,-.55,.20,.21,'#728999',7);
    }
    // Silhouette of the crowned enamel fascia with a thin golden lower lip.
    const front=-.92, back=.92;
    const pts=[[-11.55,6.49],[-9.08,6.47],[-7.54,6.66],[-3.75,6.84],[0,6.9],[3.75,6.84],[7.54,6.66],[9.08,6.47],[11.55,6.49],
      [11.55,8.08],[10.98,8.45],[8.46,8.50],[7.71,9.12],[4.02,9.34],[0,9.44],[-4.02,9.34],[-7.71,9.12],[-8.46,8.50],[-10.98,8.45],[-11.55,8.08]];
    for(let j=0;j<pts.length;j++) {
      const a=pts[j],c=pts[(j+1)%pts.length];
      tri([0,7.78,front],[a[0],a[1],front],[c[0],c[1],front],red);
      tri([0,7.78,back],[c[0],c[1],back],[a[0],a[1],back],red);
      q([a[0],a[1],front],[a[0],a[1],back],[c[0],c[1],back],[c[0],c[1],front],j<8?'#a92332':rose);
    }
    b(0,6.93,0,14.35,.20,1.94,yellow);
    b(0,7.98,-.96,15.9,1.84,.12,'#9c2224');
    b(0,8.04,-1.04,15.63,1.73,.12,red);
    g.label('MARIO KART',0,8.02,-1.14,14.42,1.32,ivory);
    for(const s of [-1,1]) {
      b(s*9.64,7.54,-1.01,2.86,1.16,.12,ivory);
      for(let ix=0;ix<5;ix++) for(let iy=0;iy<2;iy++) if((ix+iy)%2===0)
        b(s*9.64+(ix-2)*.54,7.54+(iy-.5)*.53,-1.089,.547,.54,.045,ink);
    }
    b(0,6.49,-.48,4.10,.58,.81,ink);
    for(let i=0;i<5;i++) {
      disc((i-2)*.72,6.49,-.91,.225,.225,'#202b33',9);
      disc((i-2)*.72,6.51,-.925,.16,.16,i===4?'#86d9a6':'#ff6153',9);
    }
  } else if (kind === 'balloon') {
    const col=capPaint[alt];
    // Woven gondola and four suspension lines remain legible at track scale.
    t(0,.22,0,0,1.56,0,.89,1.35,'#c78544',8);
    t(0,1.35,0,0,1.65,0,1.38,1.42,'#edba6f',8);
    for(const height of [.57,.87,1.18]) t(0,height,0,0,height+.09,0,.92+height*.28,.95+height*.28,'#966036',8);
    for(const sx of [-1,1]) for(const sz of [-1,1])
      t(sx*.91,1.60,sz*.8,sx*1.56,6.73,sz*1.04,.054,.053,cream,5);
    e(-.81,5.96,-.16,.89,.54,1.05,'#8d5532',10,4); e(.81,5.96,-.16,.89,.54,1.05,'#8d5532',10,4);
    e(0,6.98,0,1.64,1.32,1.30,ivory,12,6);
    e(0,8.45,0,1.51,1.63,1.20,'#2769b0',12,6);
    e(0,8.49,-.78,.93,1.45,.56,'#f9c981',12,5);
    for(const s of [-1,1]) {
      t(s*.59,7.87,-1.14,s*.79,9.29,-.91,.10,.12,'#f8cf4b',7);
      t(s*1.13,8.63,0,s*1.97,9.29,-.02,.33,.33,'#fbd398',8);
      e(s*2.00,9.34,-.02,.41,.43,.39,'#ffe2ae',8,4);
    }
    e(0,10.50,0,2.33,1.96,2.00,'#ffd69b',18,8);
    for(const s of [-1,1]) {
      e(s*.76,10.47,-1.90,.17,.48,.10,ink,9,4);
      e(s*.76-.036,10.69,-2.004,.06,.11,.032,ivory,6,3);
      e(s*1.43,10.00,-1.50,.35,.16,.10,'#f5b487',8,3);
    }
    e(0,9.87,-1.94,.27,.16,.08,'#854c3f',8,3);
    const cy=12.80,rx=4.23,ry=2.81,rz=3.79;
    e(0,cy,0,rx,ry,rz,'#fff8e5',24,12);
    for(let j=0;j<5;j++) shellPatch(0,cy,0,rx,ry,rz,turn*j/5,.15,.42,.62,col,14);
    shellPatch(0,cy,0,rx,ry,rz,0,Math.PI/2,.45,.46,col,14);
  } else if (kind === 'stand') {
    const w=18.0;
    b(0,.38,.45,w+.55,.76,5.5,'#abc8d1');
    for(let n=0;n<4;n++) {
      const y=.94+n*.75, z=-1.83+n*1.18;
      b(0,y-.28,z,w,.60,1.28,n%2?'#81b6d2':'#9fc8d9');
      b(0,y+.09,z,w,.14,1.28,ivory);
      for(let i=0;i<12;i++) {
        const x=(i-5.5)*1.39+((n%2)-.5)*.29;
        if(((i*3+n*5+alt)%11)<2 || Math.abs(x)<.48) continue;
        const c=capPaint[(i*5+n+alt)%6], dy=.74+.10*((i+n)%2);
        // Tiny Toad spectators have pale mushroom rims, contrasted with colored spots.
        b(x,y+.25,z,.40,.4,.34,c);
        e(x,y+.50,z-.06,.25,.26,.23,'#ffd5a3',6,3);
        e(x,y+dy,z-.02,.43,.26,.38,ivory,7,3);
        e(x,y+dy+.08,z-.27,.19,.16,.11,c,6,3);
      }
    }
    for(const x of [-8.65,-3.10,3.10,8.65]) {
      t(x,.42,2.93,x,6.38,2.82,.14,.14,blue,6);
      t(x,4.12,2.82,x,5.83,-1.09,.102,.082,'#c0d7db',5);
    }
    // Striped awning, pitched gently toward the rows.
    for (let n=0;n<12;n++) {
      const l=-9.7+n*19.4/12,r=l+19.4/12;
      q([l,5.66,-2.64],[r,5.66,-2.64],[r,6.51,3.51],[l,6.51,3.51],n%2===0?ivory:capPaint[alt]);
      q([l,5.68,-2.64],[r,5.68,-2.64],[r,5.30,-2.64],[l,5.30,-2.64],n%2===0?cream:capPaint[alt]);
    }
    for(const x of [-7.4,0,7.4]) {
      t(x,6.44,2.97,x,8.11,2.97,.055,.052,ivory,5);
      pennant(x,8.09,2.97,1.02,.63,x===0?yellow:capPaint[alt]);
    }
    // Sponsor boards at the rail.
    b(0,1.01,-2.55,18.45,1.23,.17,blue);
    for(const x of [-6.10,0,6.10]) b(x,1.02,-2.66,5.75,.88,.08,ivory);
    g.label('TOAD',-6.1,1.02,-2.72,3.38,.61,blue);
    g.label('1 UP',0,1.02,-2.72,3.06,.61,red);
    g.label('KART',6.10,1.02,-2.72,3.39,.61,blue);
  } else if (kind === 'mushroom') {
    const col=capPaint[alt], cy=3.43,rx=2.18,ry=1.37,rz=2.11;
    t(0,0,0,0,2.84,0,.84,.58,stem,10);
    t(0,2.57,0,0,3.13,0,1.37,1.72,'#f7ddb1',12);
    e(0,cy,0,rx,ry,rz,col,16,7);
    for(let j=0;j<5;j++)shellPatch(0,cy,0,rx,ry,rz,j*turn/5,.29,.34,.44,ivory,9);
    shellPatch(0,cy,0,rx,ry,rz,0,Math.PI/2,.37,.38,ivory,9);
  } else if (kind === 'tree') {
    const shades=[['#3eaa54','#79cd4a','#64c445'],['#53b44b','#92d74a','#74c741'],['#279d60','#64c96a','#4db85e']][alt%3];
    t(0,0,0,0,3.45,0,.49,.34,'#976836',8);
    t(0,1.70,0,-.85,3.59,.06,.25,.14,'#98683a',7);
    e(-.66,3.77,.03,1.52,1.43,1.42,shades[0],10,5);
    e(.60,3.92,.12,1.45,1.60,1.42,shades[2],10,5);
    e(-.05,4.91,.02,1.52,1.57,1.51,shades[1],11,5);
  } else if (kind === 'pipe') {
    t(0,.02,0,0,2.68,0,1.04,1.05,'#269852',14);
    t(0,2.46,0,0,2.90,0,1.23,1.23,'#49b74e',16);
    t(0,2.88,0,0,2.98,0,1.24,1.24,'#7dcf5a',16);
    t(0,2.97,0,0,2.991,0,.93,.93,'#21503f',16);
  } else if (kind === 'castle') {
    const stone='#f1dfca', trim='#fff3db', roof='#da5553', shade='#b03b43', glass='#457897';
    b(0,.55,0,19.2,1.10,11.8,'#acb7b8');
    b(0,4.6,0,14.6,7.72,8.9,stone);
    b(0,5.07,-4.51,14.9,.38,.28,trim);
    b(0,8.40,0,15.15,.66,9.20,trim);
    function spire(x,z,base,h,r) {
      t(x,base,z,x,h,z,r*.97,r,stone,12);
      t(x,h-.72,z,x,h-.40,z,r*1.08,r*1.11,'#d3b9a6',12);
      t(x,h-.4,z,x,h,z,r*1.13,r*1.13,trim,12);
      t(x,h-.07,z,x,h+r*2.28,z,r*1.31,.08,roof,12);
      t(x,h-.15,z,x,h+.09,z,r*1.35,r*1.35,shade,12);
      t(x,h+r*2.18,z,x,h+r*2.87,z,.07,.06,cream,6);
      pennant(x,h+r*2.86,z,r*.78,r*.39,red);
      b(x,h-1.64,z-r*.99,r*.38,r*.78,.055,glass);
      disc(x,h-1.30,z-r-0.04,r*.19,r*.19,glass,7);
    }
    // A raised central keep and a pediment with Peach's rose window.
    b(0,10.0,.61,6.38,5.00,5.84,stone);
    const l=-4.68, r=4.68, y=8.64, top=13.44, z1=-4.64,z2=-1.12;
    tri([l,y,z1],[0,top,z1],[r,y,z1],trim);
    q([l-.25,y,z1-.15],[0,top+.25,z1-.15],[0,top+.25,z2],[l-.25,y,z2],roof);
    q([r+.25,y,z1-.15],[0,top+.25,z1-.15],[0,top+.25,z2],[r+.25,y,z2],shade);
    disc(0,10.13,-4.67,1.21,1.21,'#ca9d7d',12);
    disc(0,10.13,-4.70,1.02,1.02,'#7cb3c5',12);
    disc(0,10.13,-4.73,.67,.67,'#ffe0a7',10);
    tri([-.49,10.21,-4.75],[-.55,10.78,-4.75],[0,10.48,-4.75],yellow);
    tri([-.49,10.21,-4.75],[0,10.86,-4.75],[.49,10.21,-4.75],yellow);
    tri([0,10.48,-4.75],[.55,10.78,-4.75],[.49,10.21,-4.75],yellow);
    spire(0,1.04,10.02,15.74,2.35);
    for (const s of [-1,1]) {
      spire(s*7.17,-3.30,.75,9.19,1.71);
      spire(s*6.03,3.02,.75,11.09,1.63);
      for(const x of [3.13,4.94]) {
        b(s*x,6.75,-4.51,.56,1.24,.08,glass);
        disc(s*x,7.33,-4.57,.28,.31,glass,6);
      }
    }
    b(0,2.89,-4.55,3.82,4.05,.18,'#d1b5a2'); disc(0,4.86,-4.66,1.90,1.90,'#d1b5a2',12);
    b(0,2.76,-4.68,3.10,3.87,.14,'#78584b'); disc(0,4.70,-4.79,1.55,1.55,'#78584b',12);
    for(let n=-2;n<=2;n++) b(n*.54,2.74,-4.80,.044,3.80,.06,'#94745c');
  } else if (kind === 'windmill') {
    t(0,.05,0,0,7.26,0,2.48,1.70,'#ead4af',10);
    t(0,7.23,0,0,9.63,0,2.15,.06,red,10);
    b(0,1.53,-2.14,.82,2.10,.14,brown); b(0,4.15,-2.03,.72,.83,.10,blue);
    for(let n=0;n<4;n++){
      const ang=turn*(n/4+.045), ax=Math.sin(ang),ay=Math.cos(ang);
      const p=(rad,w,z)=>[ax*rad+ay*w,6.65+ay*rad-ax*w,z];
      const a=p(.28,0,-2.37),c=p(4.65,0,-2.37);
      t(...a,...c,.105,.08,brown,6);
      q(p(1.02,.04,-2.39),p(4.52,.04,-2.39),p(4.52,.92,-2.39),p(.98,.52,-2.39),ivory);
      for(const rad of [1.68,2.42,3.18,3.98]) {
        const aa=p(rad,0,-2.43),cc=p(rad,.51+.42*(rad-1)/3.5,-2.43);t(...aa,...cc,.033,.033,brown,4);
      }
    }
    e(0,6.64,-2.44,.44,.44,.34,'#b78246',10,5);
  } else if(kind==='hill') {
    const palettes=['#9edb66','#79d3a7','#72c7b7','#b3d97d','#8bd59d','#8ec8d0'];
    const wide=[7.3,6.2,5.7,6.8,6.7,5.5][alt], high=[11.0,15.9,10.7,8.1,12.6,9.2][alt];
    e(0,.07,0,wide,high,wide*.77,palettes[alt],14,8);
    if(alt%3===0) {
      for(const s of [-1,1]) e(s*.62,high*.59,-wide*.77*.80,.17,.59,.08,'#528d67',7,4);
    }
  } else if (kind==='sign') {
    const names=['MARIO','1 UP','TOAD','KART','1 UP','TOAD'];
    const bg=[red,'#459754',blue,'#e5a920','#3375bb','#df5947'][alt],w=7.65;
    for(const s of [-1,1]) b(s*2.41,1.47,0,.22,2.90,.26,'#b5c0b4');
    b(0,3.42,0,w+.36,2.99,.36,ivory);b(0,3.42,-.23,w,2.63,.14,bg);
    g.label(names[alt],0,3.49,-.321,w*.79,1.40,ivory);
    stripes(0,2.48,-.316,12,w*.89,.14,.055,[ivory,yellow]);
  } else if(kind==='arrow') {
    for(const x of [-1.34,1.34]) b(x,1.14,0,.14,2.28,.20,'#9baab0');
    b(0,2.45,0,4.54,1.72,.22,ivory); b(0,2.45,-.14,4.35,1.54,.12,'#cf4232');
    for(const x of [-1.35,0,1.35]) chevron(x,2.45,-.216,1.02,cream,alt%2?-1:1);
  } else if (kind==='flower') {
    const cols=['#fff5ce','#ffd14c','#fff8dc','#fc9096','#ffe47c','#fcfaf1'];
    for(let k=0;k<3;k++){
      const x=[-.42,.44,.09][k],z=[-.08,-.16,.31][k],h=[.69,.52,.87][k];
      t(x-.10,0,z+.04,x,h,z,.035,.033,'#46994c',4);
      tri([x-.06,.18,z],[x-.36,.48,z+.05],[x-.08,.29,z+.05],'#72b74b');
      for(let j=0;j<6;j++){
        const a=j*turn/6, cx=x+Math.sin(a)*.15, cy=h+Math.cos(a)*.15;
        disc(cx,cy,z,.13,.13,cols[(alt+k)%6],5);
      }
      disc(x,h,z-.025,.095,.095,'#f3a433',7);
    }
  } else if (kind==='cloud') {
    const loop=[[-2.03,.33,-.02,1.43,.91,1.04],[-.74,.77,.14,1.69,1.51,1.23],[.78,.64,.04,1.46,1.27,1.19],[2.0,.26,.03,1.17,.84,1.0]];
    loop.forEach(p=>e(...p,'#fffbed',12,6));
  } else if (kind==='flag') {
    t(0,.02,0,0,4.80,0,.075,.06,'#e0e8dc',7);
    e(0,4.83,0,.13,.14,.13,yellow,7,3);
    pennant(0,4.65,0,1.59,.87,capPaint[alt]);
  }
  return g;
}
