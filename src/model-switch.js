// Original HAC-001 handheld, in millimetres. Front is +Z. World X is always
// the player's right, including for parts that can only be seen from the back.
function buildRubySwitch(g) {
  const charcoal = '#30343a', shell = '#33363b', gasket = '#161a1e';
  const black = '#0b0e12', bezel = '#14171b', rubber = '#34373b';
  const numeral = '#ebedeb', etched = '#86898a';
  const left = {face:'#00b9db', back:'#00aeca', seam:'#087e94'};
  const right = {face:'#fc524d', back:'#ec4945', seam:'#b43836'};
  const halfTurn = Math.PI, quarterTurn = Math.PI / 2;

  // Sweeps are centred independently so the bevel follows the actual part.
  function outline(points, z, depth, bevel, color, finish) {
    let loX=Infinity,hiX=-Infinity,loY=Infinity,hiY=-Infinity,area=0;
    for (let i=0;i<points.length;i++) {
      const a=points[i], b=points[(i+1)%points.length];
      loX=Math.min(loX,a[0]); hiX=Math.max(hiX,a[0]);
      loY=Math.min(loY,a[1]); hiY=Math.max(hiY,a[1]);
      area+=a[0]*b[1]-b[0]*a[1];
    }
    const x=(loX+hiX)/2,y=(loY+hiY)/2;
    const p=points.map(a=>[a[0]-x,a[1]-y]);
    g.sweep(x,y,z,area<0?p.reverse():p,depth,bevel,color,finish);
  }
  // Flat stamped apertures, printed details and thin grille bridges have a
  // simple clipped corner instead of a six-ring moulding on every edge.
  function stamp(x,y,z,w,h,d,corner,color,finish) {
    const a=w/2,b=h/2,c=Math.min(corner,a*.98,b*.98);
    const p=[[-a+c,-b],[a-c,-b],[a,-b+c],[a,b-c],[a-c,b],[-a+c,b],[-a,b-c],[-a,-b+c]];
    g.sweep(x,y,z,p,d,0,color,finish);
  }
  function stroke(points,z,r,hex) {
    const base=parseInt(hex.slice(1),16),color=[base>>16,(base>>8)&255,base&255].map(c=>c/255);
    const ends=points.map(([x,y],i)=>{
      const a=points[i-1]||points[i],b=points[i+1]||points[i];
      const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1;
      return [[x-r*dy/len,y+r*dx/len,z],[x+r*dy/len,y-r*dx/len,z]];
    });
    for(let i=1;i<ends.length;i++){
      const [a,b]=ends[i-1],[c,d]=ends[i];
      for(const p of [a,b,d,a,d,c])g.vertex(p,[0,0,1],color,7);
    }
  }
  // Samples one continuous shell profile, with a flat rail on its inner edge
  // and larger top/bottom radii only on the outside.
  function bezierContour(start, segments, steps=5) {
    let from=start;
    const points=[start];
    for(const [c1,c2,to] of segments) {
      if(c1) {
        for(let i=1;i<=steps;i++) {
          const t=i/steps,s=1-t;
          points.push([0,1].map(k=>s*s*s*from[k]+3*s*s*t*c1[k]+3*s*t*t*c2[k]+t*t*t*to[k]));
        }
      } else points.push(to);
      from=to;
    }
    return points;
  }
  const joyShape=bezierContour([86.8,49.2],[
    [[86.8,50.3],[87.5,50.95],[88.55,50.95]], [null,null,[97.2,50.95]],
    [[110.8,50.95],[119.5,42.25],[119.5,29.5]], [null,null,[119.5,-29.7]],
    [[119.5,-42.8],[110.9,-50.95],[98.7,-50.95]], [null,null,[88.3,-50.95]],
    [[87.45,-50.95],[86.8,-50.2],[86.8,-49.25]]
  ]);
  const mirror=(points,side)=>points.map(([x,y])=>[x*side,y]);

  // The outer flank of each Joy-Con rolls into the thumb surface over a much
  // broader radius than the straight rail edge. One continuous moulding gives
  // that asymmetric section without multiple plates crowding the join.
  function joyFace(side,hex){
    const points=joyShape,n=points.length,base=parseInt(hex.slice(1),16);
    const color=[base>>16,(base>>8)&255,base&255].map(c=>c/255);
    const edges=points.map((p,i)=>{
      const q=points[(i+1)%n],dx=q[0]-p[0],dy=q[1]-p[1],l=Math.hypot(dx,dy);
      return [-dy/l,dx/l];
    });
    const rings=[[.48,.16,.02],[1.04,0,.07],[3.87,0,.18],[5.43,.17,.42],
      [6.37,.48,.76],[6.78,.77,.92],[6.94,1,1]];
    const section=rings.map(([z,t,nz])=>points.map(([x,y],i)=>{
      const e=edges[(i+n-1)%n],f=edges[i],s=Math.hypot(e[0]+f[0],e[1]+f[1]);
      const nx=(e[0]+f[0])/s,ny=(e[1]+f[1])/s,outer=Math.max(0,nx);
      const roll=1.55+2.12*outer,xpos=x-t*roll*nx,ypos=y-t*roll*ny,nr=Math.sqrt(1-nz*nz);
      const joint=Math.max(0,-nx)*(.23*(1-t)+.07),undercut=.11*(1-nz);
      return {p:[xpos*side,ypos,z],n:[side*nx*nr,ny*nr,nz],color:color.map(c=>c*(1-joint-undercut))};
    }));
    for(let k=1;k<section.length;k++)for(let i=0;i<n;i++){
      const j=(i+1)%n,a=section[k-1][i],b=section[k-1][j],c=section[k][j],d=section[k][i];
      for(const v of [a,b,c,a,c,d])g.vertex(v.p,v.n,v.color,13);
    }
    const cap=section[section.length-1],c=[side*102.7,0,7.00];
    for(let i=0;i<n;i++){
      const a=cap[i],b=cap[(i+1)%n];
      g.tri(c,a.p,b.p,[0,0,1],a.n,b.n,color,11);
    }
  }

  // Injection-moulded rear, narrow aluminium frame and flush cover glass.
  g.slab(0,0,-1.1,172.45,101.90,11.7,3.3,1.6,shell,'matte');
  g.slab(0,0,4.9,172.6,102,2.45,3.15,.84,charcoal,'edgeCoat');
  g.slab(0,0,6.13,171.15,100.55,.85,2.65,.30,black,'gloss');
  g.slab(0,0,6.59,168.9,98.8,.52,2.15,.19,bezel,'glass');
  const screenW=137.25, screenH=screenW*9/16;
  g.slab(0,0,6.89,screenW+.72,screenH+.72,.16,.57,.04,'#060a0d','glass');
  g.screen('upper',0,0,7.04,screenW,screenH);

  // Tiny speakers and the round brightness sensor in the lower black border.
  for(const s of [-1,1]) {
    stamp(s*73.45,-44.7,6.91,4.70,.73,.12,.31,'#080a0c','matte');
    g.line(s*73.45-1.74,-44.91,6.99,s*73.45+1.74,-44.91,6.99,.08,'#464a4e','ink',6);
  }
  g.oval(-79.35,-46.0,6.92,.70,.70,.12,'#252930','glass');

  function analog(cx,cy,steering) {
    // The rubber skirt flares to the socket; the cap overhangs the narrower stem.
    g.socketShadow(cx,cy,7.016,7.95,2.05,(cx<0?left:right).face,'powder');
    g.lathe(cx,cy,6.84,[[8.2,0],[8.3,.15],[8.05,.51],[7.6,.73],[7.17,.71]],gasket,'matte',28);
    g.lathe(cx,cy,7.35,[[7.65,0],[6.85,.50],[5.4,1.15],[4.25,1.55]],'#202329','rubber',22);
    const moving=()=>{
      g.lathe(cx,cy,8.37,[[4.5,0],[4.1,2.00],[4.8,2.84],[6.8,3.05]],'#303239','satin',24);
      g.lathe(cx,cy,10.85,[[6.1,0],[7.2,.55],[7.65,1.60],[7.67,2.7],[7.19,3.34],[6.85,3.47],[6.55,3.48]],rubber,'rubber',32);
      g.lathe(cx,cy,14.28,[[6.46,0],[6.27,.18],[5.94,.25],[5.42,.31]],'#404347','rubber',28);
      for(let i=0;i<4;i++) {
        const a=i*quarterTurn;
        g.line(cx+6.18*Math.cos(a),cy+6.18*Math.sin(a),14.41,
          cx+7.10*Math.cos(a),cy+7.10*Math.sin(a),14.18,.13,'#282b2d','rubber',6);
      }
    };
    if(steering) {
      g.key('steer',moving);
      g.control('steer',cx,cy,14.56,22,22);
    } else {g.key('stickRear',moving);g.control('stickRear',cx,cy,14.56,22,22)}
  }
  function keycap(x,y,id,legend,direction) {
    g.socketShadow(x,y,7.016,3.68,.97,(x<0?left:right).face,'powder');
    g.lathe(x,y,6.94,[[3.78,0],[3.78,.16],[3.50,.35]],gasket,'rubber',18);
    g.key(id,()=>{
      g.lathe(x,y,7.06,[[3.43,0],[3.45,.46],[3.34,1.40],[2.99,1.73],[2.72,1.80]],'#32353a','satin',20);
      if(direction===undefined) {
        g.label(legend,x,y,8.92,3.05,3.15,numeral,{font:'600 64px Arial, sans-serif'});
      } else {
        g.part({x,y,z:8.92,rz:direction},()=>{
          outline([[0,1.38],[-1.39,-.98],[1.39,-.98]],.035,.07,0,'#26282a','ink');
          stroke([[-1.05,-.84],[0,1.00],[1.06,-.84]],.115,.16,'#aaadad');
        });
      }
    });
    if(direction===undefined) g.control(id,x,y,8.91,8.25,8.25);
    else g.control(id,x,y,8.91,7.9,7.9);
  }

  // Rear seam, front shell and exposed slivers of locking rails.
  for(const side of [-1,1]) {
    const p=side<0?left:right, shape=mirror(joyShape,side);
    outline(shape,-3.36,7.16,1.86,p.back,'powder');
    outline(shape,.22,1.04,.34,p.seam,'matte');
    joyFace(side,p.face);
    stamp(side*86.40,0,-.16,1.20,99.85,11.45,.48,'#3a4045','rail');
    stamp(side*86.45,0,5.67,.65,99.1,1.04,.28,'#1e2529','rail');

    // L/R follow the outside curve instead of crossing the tablet's top edge.
    const bumper=bezierContour([89.4,48.4],[
      [[89.1,49.4],[89.2,50.6],[90.5,50.95]],[null,null,[96.7,50.95]],
      [[107.7,51.0],[116.1,45.7],[118.28,35.7]],
      [[118.57,33.8],[117.38,33.5],[116.5,34.85]],
      [[110.8,45.1],[104.35,47.9],[96.4,48.2]]
    ]);
    const shoulder=bumper.map(([x,y])=>[side*(x+.20),y+.38]);
    outline(shoulder,1.03,7.10,.70,'#202328','satin');
    // Trigger caps step further back, with a rounded pull lip at the top.
    const trigger=bezierContour([88.85,36.25],[
      [[88.75,32.7],[89.85,31.7],[93.2,31.65]],[null,null,[111.45,31.65]],
      [[115.6,31.6],[118.7,33.0],[118.7,37.3]],
      [[117.1,45.9],[110.4,50.9],[99.2,50.93]],[null,null,[91.8,50.93]],
      [[89.7,50.9],[88.85,49.8],[88.85,47.4]]
    ]);
    outline(mirror(trigger,side),-6.35,8.4,1.80,'#24272c','satin');
    const triggerLip=trigger.map(([x,y])=>[side*(103+(x-103)*.948),39+(y-39)*.938]);
    outline(triggerLip,-10.68,4.45,1.36,'#303338','matte');
  }

  const ax=103.3, high=21.9, low=-7.3, pitch=7.25;
  analog(-ax,high,true);
  analog(ax,low,false);
  keycap(ax+pitch,high,'itemBtn','A');
  keycap(ax,high-pitch,'driftBtn','B');
  keycap(ax,high+pitch,'brakeBtn','X');
  keycap(ax-pitch,high,'rearBtn','Y');
  keycap(-ax,low+pitch,'dir-up','',0);
  keycap(-ax-pitch,low,'dir-left','',quarterTurn);
  keycap(-ax,low-pitch,'dir-down','',halfTurn);
  keycap(-ax+pitch,low,'dir-right','',-quarterTurn);
  g.control('dpad',-ax,low,8.91,22.4,22.4);

  stamp(-92.55,39.45,7.03,6.14,2.27,.21,.47,gasket,'matte');
  g.key('mapKey',()=>{
    g.slab(-92.55,39.45,7.77,5.6,1.76,1.77,.38,.32,'#282b30','satin');
  });
  g.control('mapKey',-92.55,39.45,8.68,9,8);
  const plus=[[.87,2.95],[-.87,2.95],[-.87,.87],[-2.95,.87],[-2.95,-.87],
    [-.87,-.87],[-.87,-2.95],[.87,-2.95],[.87,-.87],[2.95,-.87],[2.95,.87],[.87,.87]];
  outline(plus.map(([x,y])=>[92.55+x*1.13,39.45+y*1.13]),7.05,.20,.07,gasket,'matte');
  g.key('startKey',()=>outline(plus.map(([x,y])=>[92.55+x,39.45+y]),7.78,1.78,.22,'#292c30','satin'));
  g.control('startKey',92.55,39.45,8.69,9,9);

  // Capture is a physical square key with a circular inlay. Home has a
  // silver surround and the original outlined house; neither is an A/B key.
  g.slab(-92.95,-27.6,7.06,6.19,6.19,.31,.93,.13,gasket,'matte');
  g.key('settingsKey',()=>{
  g.slab(-92.95,-27.6,7.54,5.6,5.6,.92,.70,.21,'#2b2e32','satin');
  g.oval(-92.95,-27.6,8.03,1.83,1.83,.13,'#16191d','satin');
  g.oval(-92.95,-27.6,8.13,1.51,1.51,.10,'#303338','satin');
  });
  g.control('settingsKey',-92.95,-27.6,8.15,8,8);
  g.lathe(92.95,-27.6,6.96,[[3.8,0],[3.8,.24],[3.54,.68],[3.18,.74]],'#adb1b0','metal',24);
  g.key('homeKey',()=>{
    g.lathe(92.95,-27.6,7.40,[[3.06,0],[3.10,.25],[2.75,.74]],'#303338','satin',20);
    g.part({x:92.95,y:-27.6,z:8.22},()=>{
      stroke([[-1.50,-.05],[0,1.33],[1.50,-.05]],0,.22,'#d7d9d7');
      stroke([[-1.09,.08],[-1.09,-1.17],[1.09,-1.17],[1.09,.08]],0,.17,'#d7d9d7');
      stroke([[0,-1.06],[0,-.43]],0,.17,'#d7d9d7');
    });
  });
  g.control('homeKey',92.95,-27.6,8.22,9.3,9.3);

  // Everything in this transform is viewed from the rear. In these local
  // coordinates the kickstand is on the right beside the blue Joy-Con.
  g.part({x:0,y:0,z:-6.98,ry:halfTurn},()=>{
    stamp(61.9,-20.7,.06,15.6,59.4,.25,1.04,'#171a1e','matte');
    g.slab(61.9,-20.75,.25,14.96,58.83,.32,.91,.12,'#34373c','matte');
    stamp(61.9,7.25,.43,14.58,1.42,.18,.38,'#202529','matte');
    // The hinge pin is visible where the narrow HAC-001 stand rolls into
    // its top edge. Keep a real thumbnail recess below the opposite end.
    for(const x of [57.55,66.25]){
      g.part({x,y:7.20,z:.56,ry:quarterTurn},()=>{
        g.lathe(0,0,0,[[.51,-2.63],[.62,-2.42],[.62,2.42],[.51,2.63]],'#41474a','rail',12);
      });
    }
    stamp(61.9,-49.31,.43,9.72,1.17,.19,.52,'#15191d','rubber');
    stamp(61.9,-48.64,.53,9.6,.74,.14,.32,'#202327','rubber');

    // Printed monochrome Switch mark. Both silhouettes have straight inner
    // sides and rounded outer ends. The left is hollow, the right is solid.
    function glyphHalf(inner,outer,y0,y1,hand) {
      const width=outer-inner, r=width*.65, x=v=>hand*v;
      const shape=bezierContour([x(inner),y0],[
        [null,null,[x(outer-r),y0]],
        [[x(outer-r*.40),y0],[x(outer),y0+r*.43],[x(outer),y0+r]], [null,null,[x(outer),y1-r]],
        [[x(outer),y1-r*.43],[x(outer-r*.40),y1],[x(outer-r),y1]], [null,null,[x(inner),y1]]
      ]);
      return shape;
    }
    const logo='#bfc2c1';
    outline(glyphHalf(.47,6.34,2.40,16.45,-1),.08,.11,0,logo,'ink');
    outline(glyphHalf(1.45,5.30,3.43,15.42,-1),.20,.10,0,shell,'ink');
    g.oval(-3.27,12.0,.32,1.41,1.41,.08,logo,'ink');
    outline(glyphHalf(.62,6.53,2.40,16.45,1),.08,.11,0,logo,'ink');
    g.oval(3.46,8.32,.19,1.64,1.64,.08,shell,'ink');
    g.label('N I N T E N D O',0,-.12,.22,19.2,2.20,logo,{font:'bold 64px Arial, sans-serif'});
    g.label('S W I T C H',0,-3.52,.22,21.1,3.02,logo,{font:'bold 64px Arial, sans-serif'});
    g.label('Nintendo',0,-35.15,.19,10.15,2.02,etched,{font:'600 64px Arial, sans-serif'});
    g.label('MOD. HAC-001   ·   INPUT 15V ⎓ 2.6A',0,-38.30,.18,29.5,1.32,etched);
    // Pair of lower intake grilles, each sunk behind three fine bridges.
    for(const s of [-1,1]) {
      const x=s*40.1;
      stamp(x,-47.10,.10,13.5,2.30,.25,.78,'#14171a','matte');
      for(let i=-1;i<=1;i++) {
        stamp(x+i*3.25,-47.10,.33,.45,2.36,.22,.17,charcoal,'satin');
      }
    }
    function screw(x,y,z,base) {
      g.lathe(x,y,z,[[.94,-.07],[.94,0],[.80,.085]],base,'matte',9);
      for(let j=0;j<3;j++) {
        const a=Math.PI*(.24+2*j/3);
        g.line(x,y,z+.107,x+Math.cos(a)*.62,y+Math.sin(a)*.62,z+.107,.094,'#101216','ink',5);
      }
    }
    for(const s of [-1,1]) {
      for(const y of [-46.6,46.25]) screw(s*81.9,y,.12,'#202429');
      // Visible release key in the recess just below ZL/ZR.
      const x=s*91.2, y=27.1;
      g.slab(x,y,.27,4.5,6.2,.49,1.63,.17,'#292c2e','rubber');
      g.slab(x,y,.64,3.6,5.36,.54,1.44,.18,'#37393d','satin');
      for(const q of [[s*92.5,-40.9],[s*111.3,-31.5],[s*113.8,25.0]]) screw(q[0],q[1],.15,'#354047');
      g.label(s>0?'ZL':'ZR',s*103.2,42.5,6.06,4.6,2.45,'#9b9d9e',{font:'bold 64px Arial, sans-serif'});
    }
  });

  // Top edge, local +Z faces up and local -Y points toward the player.
  g.part({x:0,y:50.91,z:0,rx:-quarterTurn},()=>{
    g.key('powerKey',()=>{
    g.slab(-75.7,-.28,.18,5.72,2.55,.70,1.16,.20,'#26292e','satin');
    const a=[];for(let i=0;i<=10;i++){
      const theta=(128+i*28.4)*Math.PI/180;a.push([-75.7+.88*Math.cos(theta),-.28+.88*Math.sin(theta)]);
    }
    stroke(a,.56,.10,'#81858a');stroke([[-75.7,.74],[-75.7,-.10]],.56,.11,'#81858a');
    });
    g.control('powerKey',-75.7,-.28,.57,7.5,4);
    g.slab(-62.0,-.28,.19,12.7,2.42,.72,1.12,.20,'#282c30','satin');
    g.label('−',-58.3,-.24,.57,1.72,1.12,etched);
    g.label('+',-65.6,-.24,.57,1.35,1.24,etched);
    stamp(-15.0,.34,.13,30.0,5.9,.45,1.14,'#101316','matte');
    for(let i=0;i<8;i++) {
      stamp(-27.5+3.56*i,.34,.41,.84,5.70,.38,.29,'#3a3d41','satin');
    }
    g.oval(37.5,.30,.11,2.32,2.32,.34,'#5b5e62','metal');
    g.oval(37.5,.30,.36,1.82,1.82,.21,'#0b0d10','matte');
    stamp(62.4,.30,.14,17.9,6.15,.46,.93,'#171a1e','matte');
    g.slab(62.4,.30,.37,17.12,5.55,.34,.76,.12,'#34373b','satin');
    g.label('GAME CARD',62.4,.52,.58,10.0,1.22,etched,{font:'bold 64px Arial, sans-serif'});
  });
  // Dock edge. Port throat and tongue are nested shells with independent
  // depths so the USB-C connector and IR window survive grazing views.
  g.part({x:0,y:-50.91,z:0,rx:quarterTurn},()=>{
    g.slab(0,.14,.01,9.30,3.55,.22,1.49,.08,'#929495','metal');
    g.slab(0,.14,.15,8.50,2.82,.12,1.14,.04,'#0d1013','matte');
    stamp(0,.12,.21,5.55,.72,.06,.28,'#657077','metal');
    stamp(-52.5,.68,.08,15.1,3.07,.04,.30,'#9b9b95','ink');
    for(let j=0;j<15;j++) {
      g.slab(-58.8+j*.63,.72,.13,j%4===0?.36:.17,1.72,.03,0,0,'#36383a','ink');
    }
    g.slab(99.0,-.3,-.08,10.5,5.47,.47,1.50,.12,'#26242a','gloss');
    g.slab(99.0,-.3,.16,9.58,4.69,.11,1.27,.04,'#301e29','glass');
    g.oval(98.4,-.31,.23,1.10,1.02,.07,'#392a37','glass');
  });
}
