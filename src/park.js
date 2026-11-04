// The centerline is a stadium fitted to the Wii U minimap. The start is on the
// blue-to-pink straight, roughly 28% of the way from its first tangent point.
function parkDefinition() {
  const rad=10.15, straight=141, front=straight*.72, back=front-straight;
  const circle=Math.PI*2, arc=Math.PI*rad, length=2*straight+2*arc, half=7.5;
  const wrap=s=>((s%length)+length)%length;
  function center(s){
    let q=wrap(s-back);
    if(q<straight)return [0,back+q,0];
    q-=straight;
    if(q<arc){let a=q/rad;return [rad-rad*Math.cos(a),front+rad*Math.sin(a),a]}
    q-=arc;
    if(q<straight)return [rad*2,front-q,Math.PI];
    let a=(q-straight)/rad;return [rad+rad*Math.cos(a),back-rad*Math.sin(a),Math.PI+a];
  }
  const points=Array.from({length:512},(_,i)=>center(i*length/512).slice(0,2));
  // The whole ride sits on one pitched mounting, including both straightaways.
  const deckY=(x,z)=>10.3-x*.19+z*.042;
  function height(f){let [x,z]=center(f*length);return deckY(x,z)}
  function bank(f){let a=center(f*length)[2];return Math.atan(-.19*Math.cos(a)-.042*Math.sin(a))}
  function shoulder(f,side){
    if(side<0)return .40;
    const turn=Math.min(1,Math.max(0,(Math.abs(Math.sin(center(f*length)[2]))-.02)/.36));
    return .40+1.24*turn*turn*(3-2*turn);
  }
  return {id:'park',name:'GCN 宝宝公园',english:'Baby Park',laps:7,half,points,height,bank,movingBoxes:true,
    edgeKind:()=> 'rail',shoulder,
    itemRows:[.18,.68],antigravity:true, build(api) {
    const {pt,at,add,L}=api;
    const deck=new RoadSurfaceIndex();
    const rnd=(i)=>{let s=Math.sin(i*127.1+311.7)*43758.5453;return s-Math.floor(s)};
    const cream='#fff0c4',gold='#f4bd58',navy='#315571',coral='#ef7777',mint='#70c1a9',sky='#70ccef',plum='#7b476c';
    const candy=['#f29ca6','#ffc268','#b4da70','#7ed0b6','#80bdef','#bd9dd9'];
    const theme=['#f47072','#f1a74b','#61b995','#56b6d7','#ba83c6'];
    const hex=(v)=>'#'+v.map(n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,'0')).join('');
    const blend=(a,b,u)=>hex([1,3,5].map(i=>parseInt(a.slice(i,i+2),16)*(1-u)+parseInt(b.slice(i,i+2),16)*u));
    function local(g,x,y,z){for(let i=0;i<g.d.length;i+=9){g.d[i]-=x;g.d[i+1]-=y;g.d[i+2]-=z}}
    function stamp(g,x,y,z,yaw=0,size=1,r=14,anim=null){add(g,x,y,z,yaw,size,r,anim)}
    function stripe(g,s,t,a,b,h,col,bh=h){g.quad(pt(s,a,h),pt(s,b,h),pt(t,b,bh),pt(t,a,bh),col)}
    function bar(g,a,b,r,c,n=5){g.tube(...a,...b,r,r,c,n)}
    function badge(g,x,y,z,rad,inner,col,depth=.1){for(let j=0;j<10;j++){let a=-Math.PI/2+j*Math.PI/5,b=a+Math.PI/5,ra=j%2?inner:rad,rb=j%2?rad:inner;
      let p=[x+ra*Math.cos(a),y-ra*Math.sin(a),z],q=[x+rb*Math.cos(b),y-rb*Math.sin(b),z];g.tri([x,y,z-.08],p,q,col);if(depth)g.quad(p,q,[q[0],q[1],z+depth],[p[0],p[1],z+depth],gold)}}
    // The rail is one length of painted fairground ribbon: the image runs
    // continuously across four existing sections. Tinting the same artwork
    // leaves each attraction its own colour without adding trim geometry.
    const ribbonTile=finishTile('park/ribbon',(c,w,h)=>{
      for(let k=0;k<4;k++){
        const y=k*16,col=['#d58191','#dfa769','#67aba4','#8b93c6'][k];
        c.fillStyle=col;c.fillRect(0,y,w,16);c.fillStyle='#f9e3ba';c.fillRect(0,y+1,w,1);
        c.fillStyle='#ac877f';c.fillRect(0,y+14,w,1);
        c.strokeStyle='#f9e1bb';c.lineWidth=.85;c.beginPath();
        for(let x=-32;x<w;x+=64){c.moveTo(x,y+4);c.quadraticCurveTo(x+32,y+15,x+64,y+4)}c.stroke();
        for(let x=0;x<w;x+=64){c.fillStyle='#fff1cf';c.beginPath();c.moveTo(x,y+7);c.lineTo(x+3,y+9);c.lineTo(x,y+12);c.lineTo(x-3,y+9);c.fill()}
      }
    });
    const braid=finishTile('park/inlaid-hem',(c,w,h)=>{
      for(let k=0;k<2;k++){
        const y=k*32;c.fillStyle=k?'#dfa0ab':'#9abdd8';c.fillRect(0,y,w,32);
        c.fillStyle=k?'#cf8499':'#86a5ce';c.fillRect(0,y+2,w,3);
        c.fillStyle='#fce7c6';c.fillRect(0,y+7,w,2);c.fillRect(0,y+26,w,1);
        for(let x=0;x<w;x+=64){
          c.fillStyle=k?'#f4cfbd':'#d1dcdd';c.beginPath();c.moveTo(x,y+17);c.lineTo(x+18,y+11);
          c.lineTo(x+31,y+16);c.lineTo(x+17,y+22);c.closePath();c.fill();
          c.fillStyle='#fff0d0';c.fillRect(x+36,y+15,14,1.5);
        }
      }
    });
    const crest=finishTile('park/court',(c,w,h)=>{
      c.fillStyle='#f5ecca';c.beginPath();c.moveTo(15,31);c.lineTo(91,23);c.lineTo(111,23);
      c.lineTo(128,9);c.lineTo(145,23);c.lineTo(165,23);c.lineTo(241,31);
      c.lineTo(165,39);c.lineTo(145,39);c.lineTo(128,55);c.lineTo(111,39);c.lineTo(91,39);c.closePath();c.fill();
      c.fillStyle='#d39c68';c.beginPath();c.moveTo(112,24);c.lineTo(122,29);c.lineTo(128,17);
      c.lineTo(134,29);c.lineTo(145,24);c.lineTo(140,39);c.lineTo(117,39);c.fill();
      c.fillStyle='#f8faf0';c.fillRect(119,40,19,2);
    });
    const n=240, sector=12,lateral=[-half,-half+.96,0,half-.96,half]; // Shared road and rail culling bounds.
    for(let base=0;base<n;base+=sector){
      const g=new Geo(),mid=at((base+sector/2)*L/n),N=Math.min(n,base+sector);
      for(let i=base;i<N;i++){let s=i*L/n,t=(i+1)*L/n,f=(i+.5)/n;
        let p=center(f*length),pink=(p[1]-(back+front)/2)>0;
        const lineDist=Math.abs(wrap(f*length+length/2)-length/2),stripeColor=lineDist<9?'#f3d477':pink?'#e99caf':'#a6c5e8';
        // Painted ribbon with softly changing tint, diamonds and alternating passementerie.
        const glint=.11+.09*Math.sin(f*circle*3),surface=blend(stripeColor,'#fffce3',glint);
        const roadStart=g.d.length;
        g.mat=1;for(let j=0;j<4;j++){
          const x0=lateral[j],x1=lateral[j+1],outer=j===0||j===3;
          if(outer&&lineDist>=9){
            const A=mix(braid[0],braid[2],(i%3)/3),B=mix(braid[0],braid[2],(i%3+1)/3);
            const y=pink?.5:0,near=mix(braid[1],braid[3],y+.02),far=mix(braid[1],braid[3],y+.48);
            g.face(pt(s,x0,0),pt(s,x1,0),pt(t,x1,0),pt(t,x0,0),'#ffffff',null,[[A,j?far:near],[A,j?near:far],[B,j?near:far],[B,j?far:near]]);
          }else stripe(g,s,t,x0,x1,0,blend(surface,cream,.03+.018*Math.cos(4*Math.PI*f)));
        }
        deck.addGeometry(g,roadStart);
        if(i%40===7&&Math.abs(Math.sin(p[2]))<.30){
          const m=(s+t)/2,w=3.9;
          g.face(pt(m-1.05,-w,.028),pt(m-1.05,w,.028),pt(m+1.05,w,.028),pt(m+1.05,-w,.028),
            '#ffffff',null,[[crest[0],crest[3]],[crest[2],crest[3]],[crest[2],crest[1]],[crest[0],crest[1]]]);
        }
        if(i%10===0){const m=(s+t)/2;
          for(const l of [-5.4,5.4])g.quad(pt(m-.23,l,.024),pt(m,l+.19,.024),pt(m+.23,l,.024),pt(m,l-.19,.024),blend(surface,cream,.46));
        }
        g.mat=0;
        for(let side of [-1,1]){
          let inside=side===1,turn=Math.abs(Math.sin(p[2]))>.16;
          const l=side*(half+shoulder(i/n,side)),end=side*(half+shoulder((i+1)/n,side)),edgecolor=candy[(i>>3)%6];
          const trim=(a,b,h,col)=>{
            const first=g.d.length;g.quad(pt(s,l+a,h),pt(s,l+b,h),pt(t,end+b,h),pt(t,end+a,h),col);
            deck.addGeometry(g,first);
          };
          const wall=(offset,h0,h1,col)=>g.quad(pt(s,l+offset,h0),pt(t,end+offset,h0),pt(t,end+offset,h1),pt(s,l+offset,h1),col);
          const apronStart=g.d.length;
          stripe(g,s,t,side*half,side*(half+.24),.028,cream);
          g.quad(pt(s,side*(half+.24),.035),pt(s,l,.035),pt(t,end,.035),pt(t,side*(half+.24),.035),inside&&turn?'#a3cf70':'#ecd48e');
          deck.addGeometry(g,apronStart);
          if(inside&&shoulder(f,side)>1.12&&i%2===0){let m=(s+t)/2;stripe(g,m-.18,m+.18,side*(half+.66),side*(half+.97),.073,theme[i%5])}
          const thick=.42*side;
          trim(0,thick,.84,i%2?blend(edgecolor,cream,.21):edgecolor);
          const u=mix(ribbonTile[0],ribbonTile[2],(i%4)/4),v=mix(ribbonTile[0],ribbonTile[2],(i%4+1)/4);
          const design=(i>>3)%4,bot=mix(ribbonTile[1],ribbonTile[3],(design+1-.025)/4),top=mix(ribbonTile[1],ribbonTile[3],(design+.025)/4);
          if((i>>2)%2===0)g.face(pt(s,l,.19),pt(t,end,.19),pt(t,end,.82),pt(s,l,.82),'#ffffff',null,[[u,bot],[v,bot],[v,top],[u,top]]);
          else wall(0,.19,.82,edgecolor);
          wall(thick,-.55,.82,blend(edgecolor,'#9a6976',.22));
          wall(0,.03,.18,'#eadbae');trim(-.055*side,.06*side,.89,cream);
          if(i%8===0){let k=(s+t)/2;
            g.quad(pt(k-.07,l-side*.018,.32),pt(k+.07,l-side*.018,.32),pt(k+.07,l-side*.018,.64),pt(k-.07,l-side*.018,.64),cream)}
          trim(thick,side*1.1,-.38,side>0?'#977f89':'#f0b2be');
          wall(side*1.08,-1.07,-.35,'#ae748f');
          wall(side*1.08,-.70,-.60,'#fce0ce');
          if(i%8===0){
            const A=pt(s,l+side*.82,-.74),B=pt(t+2*L/n,l+side*.82,-.75),C=[(A[0]+B[0])/2,(A[1]+B[1])/2-2.5,(A[2]+B[2])/2];
            bar(g,A,C,.11,'#99b8b9',5);bar(g,C,B,.11,'#99b8b9',5);
            if(!inside)bar(g,C,[C[0],.6,C[2]],.22,'#ebacbb',6);
          }
        }
      }
      local(g,mid.x,mid.y,mid.z);stamp(g,mid.x,mid.y,mid.z,0,1,26);
    }
    let lawn=new Geo();lawn.quad([-650,-.16,-650],[650,-.16,-650],[650,-.16,650],[-650,-.16,650],'#9cce7e');stamp(lawn,0,0,0,0,1,1200);
    const pond=new Geo();for(let j=0;j<48;j++){let a=j*circle/48,b=(j+1)*circle/48;
      const lake=v=>[Math.cos(v)*(29+2*Math.cos(3*v)),0,Math.sin(v)*16];
      const p=lake(a),q=lake(b);pond.tri([0,0,0],p,q,'#76ced4');pond.quad(p,q,[q[0]*1.05,0,q[2]*1.05],[p[0]*1.05,0,p[2]*1.05],'#f0e4bf')}
    for(let i=0;i<18;i++){let a=rnd(i+3)*circle,r=rnd(99+i);pond.box(Math.cos(a)*27*r,.025,Math.sin(a)*14*r,1+rnd(i+77)*2,.03,.15,'#b9e4dc',.18)}
    stamp(pond,62,.02,25,0,1,40);
    // Cloud-and-star theatre over the starting line.
    const gate=new Geo(),W=8.8;
    for(let side of [-1,1]){
      let x=side*W;gate.tube(x,-.20,0,x,.3,0,.94,.84,'#bd7774',10);
      gate.tube(x,.25,0,x,4.95,0,.39,.31,'#ffe7b1',10);
      gate.tube(x,3.8,0,x,3.98,0,.46,.46,gold,10);gate.tube(x,4.90,0,x,5.45,0,.87,.78,coral,10);
      gate.tube(x,5.40,0,x,6.29,0,.74,.65,'#f6d17b',10);
      gate.tube(x,6.23,0,x,6.63,0,.77,.70,'#e66a65',10);gate.tube(x,6.57,0,x,7.23,0,.72,0,'#f27d78',10);
      gate.tube(x,7.20,0,x,7.7,0,.043,.031,gold,5);gate.tri([x,7.70,0],[x+side*.75,7.51,0],[x,7.34,0],theme[side>0?2:0]);
      for(let j=0;j<3;j++){
        let xx=x+side*(.8+j*.62),z=.3+j*.16;gate.tube(xx,-.3,z,xx,4.3-j*.7,z,.20,.13,cream,8);
        gate.tube(xx,3.4-j*.7,z,xx,3.55-j*.7,z,.25,.24,coral,8);
        gate.tube(xx,4.0-j*.7,z,xx,4.75-j*.7,z,.28,0,gold,7);
      }
    }
    for(let i=0;i<20;i++){
      let a=i/20,b=(i+1)/20,x0=-W+2*W*a,x1=-W+2*W*b;
      const top=t=>5.35+1.57*Math.sin(Math.PI*t),bot=t=>top(t)-.58;
      gate.quad([x0,bot(a),-.5],[x1,bot(b),-.5],[x1,top(b),-.5],[x0,top(a),-.5],candy[(i+1)%6]);
      gate.quad([x0,top(a),-.5],[x1,top(b),-.5],[x1,top(b),.52],[x0,top(a),.52],cream);
      gate.quad([x0,bot(a)-.15,-.56],[x1,bot(b)-.15,-.56],[x1,bot(b),-.56],[x0,bot(a),-.56],gold);
    }
    gate.box(0,6.59,-.49,9.45,1.13,.44,'#674958');gate.box(0,6.68,-.78,9.29,1.1,.18,cream);
    const word='MARIOKART',letters=['#ed685f','#f6a14d','#78b65a','#4fa3bd','#aa7dc0','#e76f87','#ecab42','#75b79d','#79a5d6'];
    for(let j=0;j<word.length;j++)gate.label(word[j],(j-4)*.94,6.74,-.889,.95,.95,letters[j]);
    gate.label('BABY   PARK',0,5.93,-.83,4.5,.34,'#fcf6d8','#b8747b');
    function childFigure(luigi){
      let g=new Geo(),shirt=luigi?'#55ae65':'#eb6457',skin='#ffcc9d',jeans='#4889aa',s=luigi?-1:1;
      g.ell(0,0,.16,.42,.54,.24,jeans,9,5);
      for(let j of [-1,1]){
        g.ell(j*.24,-.53,.15,.20,.29,.19,jeans,8,4);
        g.ell(j*.28,-.76,.05,.23,.12,.27,'#9b654b',8,4);
        bar(g,[j*.32,.23,0],[j*.52,.38,-.07],.13,shirt,6);
        bar(g,[j*.52,.38,-.07],[j*.65,.55,-.07],.11,skin,6);
        g.ell(j*.66,.56,-.07,.13,.14,.13,skin,7,4);
      }
      g.ell(0,.73,0,.55,.58,.43,skin,11,6);
      g.ell(s*.17,.62,-.39,.21,.15,.19,'#ffc99d',9,4);
      for(let j of [-1,1]){g.ell(j*.17,.80,-.397,.07,.13,.04,'#344351',6,4);g.ell(j*.51,.70,0,.12,.13,.11,skin,7,4)}
      g.ell(0,1.11,.01,.60,.34,.47,shirt,12,5);g.ell(s*.05,1.01,-.31,.56,.10,.30,shirt,11,4);
      g.ell(0,1.19,-.42,.13,.13,.025,cream,7,4);g.label(luigi?'L':'M',0,1.19,-.452,.17,.17,shirt);
      return g;
    }
    const home=at(0),gateTilt=home.bank,cs=Math.cos(gateTilt),sn=Math.sin(gateTilt);
    stamp(gate,home.x,home.y,home.z,home.yaw,1,18,()=>({roll:gateTilt}));
    for(const side of [-1,1]){
      // Follow the banked base and split the leaning mast into short segments.
      const u=side*W;
      api.solidLocal(home,home.yaw,u*cs,u*sn-.2,0,{tag:'parkGateFoot',r:.94,h:.5});
      for(let j=0;j<3;j++){
        const h=.3+j*1.55;
        api.solidLocal(home,home.yaw,u*cs-(h+.775)*sn,u*sn+h*cs,0,{tag:'parkGateMast',r:.39,h:1.55});
      }
    }
    for(let side of [-1,1]){
      let x=side*7.1,figure=childFigure(side===1),p=at(0,x);
      stamp(figure,p.x-6.95*sn,p.y+6.95*cs,p.z-.64,0,1.35,6,t=>({roll:gateTilt+Math.sin(t*1.6+side)*.065}));
      const decor=new Geo();bar(decor,[0,0,0],[side*.75,1.77,0],.025,cream,5);badge(decor,side*.75,2.04,-.09,.62,.33,'#ffda5f');
      stamp(decor,p.x+side*.74*cs-7.65*sn,p.y+side*.74*sn+7.65*cs,p.z-.60,0,1,5,t=>({roll:gateTilt+.1*Math.sin(t*.75+side)}));
    }
    function building(type,v=0){
      const g=new Geo(),body=['#f4cfa8','#e6c3be','#c4d5bc','#f4d59e'][v%4],can=['#e79294','#79b9bc','#b798cb','#db9956'][v%4],win='#537695';
      if(type==='shop'){
        const w=8.6,h=4.84,d=5.8;
        g.box(0,h/2,0,w,h,d,body);g.box(0,.36,0,w+.25,.47,d+.2,'#c69c87');g.box(0,h-.02,0,w+.4,.36,d+.4,cream);
        g.quad([-4.6,h, -3.12],[4.6,h,-3.12],[4.6,7.0,0],[-4.6,7.0,0],can);
        g.quad([-4.6,7.0,0],[4.6,7.0,0],[4.6,h,3.12],[-4.6,h,3.12],blend(can,'#8f7690',.22));
        for(let s of [-1,1])g.tri([s*4.35,h,-3.1],[s*4.35,7,0],[s*4.35,h,3.1],cream);
        for(let j of [-1,1]){g.box(j*2.55,2.39,-2.94,2.45,2.17,.11,cream);g.box(j*2.55,2.41,-3.02,2.14,1.84,.10,win);
          g.box(j*2.55,2.41,-3.09,.09,1.9,.06,'#f9dfb5');g.box(j*2.55,2.52,-3.09,2.2,.08,.06,cream);
          g.box(j*2.55,1.16,-3.08,2.36,.20,.28,can)}
        g.box(0,1.35,-2.97,1.48,2.63,.11,'#aa8272');g.box(0,1.23,-3.06,1.20,2.39,.07,win);
        for(let j=0;j<10;j++){let a=-4.4+j*.88,b=a+.88;g.quad([a,4.21,-2.96],[b,4.21,-2.96],[b,3.67,-4.1],[a,3.67,-4.1],j%2?can:cream);
          g.quad([a,3.68,-4.1],[b,3.68,-4.1],[b,3.41,-4.1],[a,3.41,-4.1],j%2?can:cream)}
        g.label(['ROYAL PATISSERIE','MILK BAR','KOOPA GIFTS','PRINCESS ORANGE'][v%4],0,4.58,-2.991,6.7,.55,'#70585c');
      }else if(type==='mansion'){
        g.box(0,3.15,0,10.5,6.3,6.5,'#94a58f');g.box(-2.8,7,0,4,3.7,5,'#a8aea1');
        for(let j of [-1,1]){g.tube(j*5.0,0,-2.55,j*5.0,7.1,-2.55,1.6,1.34,'#98a192',10);g.tube(j*5,6.8,-2.55,j*5.3,11.3,-2.55,2.05,0,'#5c5870',10)}
        for(let j=0;j<3;j++){g.box(-3.4+j*3.4,3.9,-3.31,1.3,2.1,.12,'#eac178');g.box(-3.4+j*3.4,3.88,-3.4,.14,2.2,.1,'#5e6970')}
        g.quad([-5.55,6.1,-3.7],[5.55,6.1,-3.7],[4.3,8.02,0],[-4.3,8.02,0],'#676278');
        g.tube(-2.8,8.7,0,-3.2,12.5,0,3.2,0,'#655672',8);
        g.box(0,2,-3.43,2.1,4,.28,'#485362');g.label('MANSION',0,5.47,-3.40,5.5,.8,'#f8d99b');
      }return g;
    }
    // The fairytale castle rises beyond the first pink hairpin.
    const castle=makeProp('castle');for(let i=0;i<castle.d.length;i+=9){let r=castle.d[i+3],g=castle.d[i+4],b=castle.d[i+5];
      if(r>g*1.38&&r>b*1.12&&g<.53){castle.d[i+3]=g*.84;castle.d[i+4]=r*.76;castle.d[i+5]=Math.min(1,r*1.07)}}
    stamp(castle,-18,.06,129,.12,1.82,38);
    const mansion=building('mansion');stamp(mansion,51,.06,-48,2.60,1.48,18);
    const shops=Array.from({length:4},(_,i)=>building('shop',i));
    [[-31,11,-1.46],[-32,28,-1.46],[-25,48,-1.42],[-26,65,-1.45],[50,91,1.77],[63,82,1.63],[72,73,1.5],[-14,-65,-2.86],[-28,-59,-2.5],[24,142,.1],[41,139,.1]].forEach(([x,z,a],i)=>stamp(shops[i%4],x,.03,z,a,1.09+(i%3)*.13,12));
    const walk=new Geo();walk.quad([-37,.005,-8],[-18,.005,-8],[-13,.005,86],[-32,.005,86],'#e9c7ab');stamp(walk,0,0,0,0,1,100);
    // Baby Peach's rose-gold Partners sculpture in the central plaza.
    const statue=new Geo();statue.tube(0,0,0,0,.7,0,3.0,3,'#bad0be',12);statue.tube(0,.7,0,0,2.1,0,2.25,1.95,'#ebc3a7',10);
    statue.tube(0,2.1,0,0,2.32,0,2.32,2.32,cream,12);statue.tube(0,2.32,0,0,5.09,0,1.28,.50,'#cf9686',10);
    statue.ell(0,5.6,0,1.02,1.02,.84,'#f2c3a1',10,5);statue.tube(0,6.49,0,0,6.91,0,.51,.68,'#efd5a1',7);
    bar(statue,[-.42,4.74,0],[-1.3,5.9,-.12],.2,'#efb89a',6);badge(statue,-1.5,6.44,-.17,.75,.35,'#ffdb90');
    stamp(statue,-19.4,0,72,.1,1.25,12);
    // A faceted gondola wheel; each cabin hangs upright while the ring revolves.
    const fx=47,fz=108,fy=23.3,fr=17.5,fwYaw=-.32,fs=Math.sin(fwYaw),fc=Math.cos(fwYaw);
    const baseWheel=new Geo(),wh=new Geo();
    baseWheel.box(0,.69,0,19.5,1.30,11.7,'#f3d59c');baseWheel.box(0,2.2,0,14.6,2.4,5.7,'#a1d0cd');
    for(let j of [-1,1])for(let k of [-1,1])bar(baseWheel,[j*8.55,1.1,k*4.0],[0,fy,k*1.2],.58,'#e89192',7);
    bar(baseWheel,[0,fy,-2.5],[0,fy,2.5],.70,'#b08281',8);stamp(baseWheel,fx,0,fz,fwYaw,1,31);
    for(let i=0;i<32;i++){
      let a=i*circle/32,b=(i+1)*circle/32;const node=(r,theta,z)=>[Math.cos(theta)*r,Math.sin(theta)*r,z];
      for(let z of [-.49,.49])bar(wh,node(fr,a,z),node(fr,b,z),.22,'#e6b86f',5);
      bar(wh,node(fr-1.02,a,-.53),node(fr-1.02,b,-.53),.12,cream,5);
      if(i%2===0){bar(wh,[0,0,0],node(fr-.1,a,0),.13,'#efaf9f',5);bar(wh,node(fr-1.02,a,-.53),node(fr,a,-.49),.10,cream,5)}
    }
    wh.tube(0,0,-1.25,0,0,1.0,3.78,3.5,'#fac255',12);badge(wh,0,0,-1.34,6.8,3.35,'#ffe479',.35);
    wh.ell(-1.0,.3,-1.51,.36,.79,.14,'#785c4a',7,4);wh.ell(1.0,.3,-1.51,.36,.79,.14,'#785c4a',7,4);
    stamp(wh,fx,fy,fz,fwYaw,1,22,t=>({roll:t*.095}));
    for(let i=0;i<12;i++){
      let cab=new Geo(),col=candy[i%6];cab.tube(0,-1.85,0,0,-.86,0,1.13,1.29,col,9);
      cab.tube(0,-.85,0,0,-.23,0,1.18,.98,'#749bad',9);cab.tube(0,-.25,0,0,.25,0,1.35,.41,col,9);
      cab.tube(0,.23,0,0,.57,0,.15,.11,gold,6);let a=i*circle/12;
      const offset=t=>{let q=a+t*.095,xx=Math.cos(q)*fr;return {x:xx*fc,y:Math.sin(q)*fr,z:-xx*fs}};
      stamp(cab,fx,fy,fz,fwYaw,1,23,offset);
    }
    // Twin rails with visible ties and triangulated columns run across the scene like the trailer.
    const coaster={x:11,z:34};
    function lift(v){
      const overpass=10*Math.exp(-6.2*(1-Math.cos(v-1.90)));
      return 25.5+6.4*Math.sin(2*v+.68)+4.2*Math.sin(3*v-.67)+overpass;
    }
    function railPoint(v,offset=0){
      const x=coaster.x+(41+offset)*Math.cos(v)+3*Math.sin(2*v+.4);
      const z=coaster.z+(84+offset)*Math.sin(v)+5*Math.sin(2*v);
      return [x,lift(v)+offset*.085*Math.sin(v),z]
    }
    // Slender coaster ties terminate inside the rail. Model only their four
    // exposed faces, at the same width as the former capped round rods.
    function coasterTie(g,a,b,r,col){
      const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz),flat=Math.hypot(dx,dz)||1;
      const u=[r*dz/flat,0,-r*dx/flat],v=[-dy*u[2]/len,(dx*u[2]-dz*u[0])/len,dy*u[0]/len];
      const offsets=[u,v,u.map(x=>-x),v.map(x=>-x)],P=(pt,d)=>[pt[0]+d[0],pt[1]+d[1],pt[2]+d[2]];
      for(let k=0;k<4;k++){const A=offsets[k],B=offsets[(k+1)%4];g.quad(P(a,A),P(b,A),P(b,B),P(a,B),col)}
    }
    const segments=154;
    for(let first=0;first<segments;first+=11){
      const g=new Geo(),q=railPoint((first+5)*circle/segments),last=Math.min(segments,first+11);
      for(let i=first;i<last;i++){
        let a=i*circle/segments,b=(i+1)*circle/segments;
        const pa=railPoint(a),pb=railPoint(b),lo=railPoint((a+b)/2);
        for(let side of [-1,1]){
          let p=railPoint(a,side*1.07),q=railPoint(b,side*1.07),r=[q[0],q[1]-.43,q[2]],s=[p[0],p[1]-.43,p[2]];
          g.quad(p,q,r,s,'#e86a8d');let t=railPoint(a,side*.84),u=railPoint(b,side*.84);g.quad(p,q,u,t,'#fbb4b9');
        }
        let l=railPoint(a,-1.05),r=railPoint(a,1.05);coasterTie(g,l,r,.086,cream);
        coasterTie(g,[pa[0],pa[1]-1.4,pa[2]],[pb[0],pb[1]-1.4,pb[2]],.12,'#e47d9c');
        coasterTie(g,l,[lo[0],lo[1]-1.40,lo[2]],.072,'#ffc2d1');coasterTie(g,r,[lo[0],lo[1]-1.40,lo[2]],.072,'#ffc2d1');
        if(i%6===0){const sup=railPoint(a,2.3);
          // Columns stand in the fairground, never through the playable ribbon.
          // At a crossing, a high cantilever reaches in from outside the oval.
          const z0=clamp(sup[2],back,front),dx=sup[0]-rad,dz=sup[2]-z0,dist=Math.hypot(dx,dz);
          if(Math.abs(dist-rad)<half+1.75){
            const clear=rad+half+2.2;
            sup[0]=rad+clear*dx/(dist||1);sup[2]=z0+clear*dz/(dist||1);
            bar(g,[sup[0],sup[1]-1.5,sup[2]],[pa[0],pa[1]-1.15,pa[2]],.22,cream,6);
          }
          bar(g,[sup[0],.4,sup[2]],[sup[0],sup[1]-1.5,sup[2]],.30,'#eaa2b4',7);
          g.tube(sup[0],0,sup[2],sup[0],.6,sup[2],.77,.72,'#d3bd9d',7);
          bar(g,[sup[0],sup[1]-4.3,sup[2]],[pa[0],pa[1]-1.1,pa[2]],.21,'#f2b9bd',6);
        }
      }
      local(g,q[0],q[1],q[2]);stamp(g,...q,0,1,39);
    }
    for(let i=0;i<4;i++){
      const train=new Geo();train.box(0,1.09,0,1.82,.58,2.03,'#ec79a2');
      train.ell(0,1.56,.65,.85,.58,.60,'#ed8ca6',9,5);
      for(let s of [-1,1]){train.ell(s*.49,1.86,.65,.20,.25,.15,cream,7,4);train.ell(s*.49,1.88,.78,.085,.14,.045,navy,6,4)}
      train.box(0,1.45,-.30,1.34,.45,.94,'#b45a75');train.box(0,1.76,-.68,1.15,.37,.27,'#f0a1b0');
      const head=(u)=>Math.atan2(railPoint(u+.006)[0]-railPoint(u-.006)[0],railPoint(u+.006)[2]-railPoint(u-.006)[2]);
      stamp(train,coaster.x,0,coaster.z,0,1,112,t=>{let a=t*.16+1.19-i*.034,p=railPoint(a);return{x:p[0]-coaster.x,y:p[1],z:p[2]-coaster.z,yaw:head(a),pitch:Math.atan2(lift(a+.008)-lift(a-.008),Math.hypot(...[0,2].map(k=>railPoint(a+.008)[k]-railPoint(a-.008)[k])))}});
    }
    // Boatswain's swinging ship is hung from a pair of red A-frames.
    const bx=-29,bz=-35,by=16.3,shipSupport=new Geo(),ship=new Geo();
    for(let side of [-1,1]){
      bar(shipSupport,[-6,0,side*3.7],[0,by,side*2.7],.45,'#d47e79',7);
      bar(shipSupport,[6,0,side*3.7],[0,by,side*2.7],.45,'#db8880',7);
    }
    bar(shipSupport,[0,by,-3.15],[0,by,3.15],.64,'#e8bd84',8);
    shipSupport.box(0,.50,0,16,1.0,9.6,'#d5b79b');stamp(shipSupport,bx,0,bz,.39,1,22);
    for(let j=0;j<8;j++){let a=-7+j*1.75,b=a+1.75;
      let y=x=>-10.1+.047*x*x,halfWidth=x=>Math.max(.24,2.45-.043*x*x);
      for(let side of [-1,1]){let l=[a,y(a),side*halfWidth(a)],r=[b,y(b),side*halfWidth(b)];
        let lb=[a,y(a)-1.94,side*halfWidth(a)*.48],rb=[b,y(b)-1.94,side*halfWidth(b)*.48];
        ship.quad(l,r,rb,lb,j%2?'#995c48':'#a76948');
        bar(ship,l,r,.13,gold,6)}
      ship.quad([a,y(a),-halfWidth(a)],[b,y(b),-halfWidth(b)],[b,y(b),halfWidth(b)],[a,y(a),halfWidth(a)],'#e4bd83');
    }
    for(let s of [-1,1])for(let k of [-1,1])bar(ship,[0,0,k*2.25],[s*5.9,-8.3,k*1.5],.10,'#e3d09d',5);
    for(let j=-2;j<=2;j++)ship.box(j*1.67,-9.54+.12*j*j,0,.47,.45,3.12,'#b64f50');
    badge(ship,-6.25,-8.02,-.94,.94,.45,gold);
    stamp(ship,bx,by,bz,.39,1,19,t=>({roll:.72*Math.sin(t*.6)}));
    // Marquee carousel across from the haunted house.
    const cx=49,cz=-22,caro=new Geo();
    caro.tube(0,.04,0,0,.61,0,6.13,6.13,'#da9a89',20);caro.tube(0,.62,0,0,1.02,0,6.03,5.78,'#f7cd8e',20);
    caro.tube(0,1.02,0,0,6.75,0,.60,.55,gold,10);
    for(let i=0;i<18;i++){let a=i*circle/18,b=(i+1)*circle/18;
      let P=(v,r,y)=>[r*Math.cos(v),y,r*Math.sin(v)];
      caro.tri([0,8.9,0],P(a,6.4,6.21),P(b,6.4,6.21),i%2?'#f6ada5':'#fff2cd');
      caro.quad(P(a,6.48,6.2),P(b,6.48,6.2),P(b,6.48,5.7),P(a,6.48,5.7),i%2?coral:gold);
      if(i%2===0){let x=Math.cos(a)*4.6,z=Math.sin(a)*4.6;bar(caro,[x,1.0,z],[x,6.34,z],.076,cream,5);
        caro.ell(x,2.6,z,1.08,.51,.34,candy[i%6],8,4);caro.ell(x+.8,3.14,z,.34,.55,.30,cream,7,4)}
    }
    caro.tube(0,8.81,0,0,9.92,0,.08,.075,gold,6);caro.tri([0,9.92,0],[1.59,9.57,0],[0,9.35,0],coral);
    stamp(caro,cx,0,cz,0,1,14,t=>({yaw:t*.12}));
    // Royal Raceway-style princess balloons, paneled fabric, gold seams and suspended baskets.
    function hotAir(v){
      let g=new Geo(),col=[['#df91a1','#f3b8be','#f6d994'],['#e6b66d','#f5d09a','#b8dfe2'],['#85c6bc','#c1ded0','#fff3c4']][v%3];
      const layers=[[-.40,.82],[1.45,1.30],[3.30,2.75],[5.45,3.67],[7.18,3.76],[8.88,2.74],[9.65,1.27],[9.88,.08]];
      for(let n=0;n<layers.length-1;n++)for(let i=0;i<14;i++){
        let a=i*circle/14,b=(i+1)*circle/14;
        const P=(j,t)=>[layers[j][1]*Math.cos(t),layers[j][0],layers[j][1]*Math.sin(t)];
        g.quad(P(n,a),P(n,b),P(n+1,b),P(n+1,a),n===1||n===5?col[2]:col[i%2]);
      }
      g.tube(0,-3.14,0,0,-2.14,0,.73,.89,'#bc835b',9);g.tube(0,-2.18,0,0,-1.99,0,.94,.95,'#efc68c',9);
      for(let k of [-1,1])for(let s of [-1,1])bar(g,[k*.57,-2,s*.52],[k*.68,-.4,s*.59],.036,'#eedbb0',5);
      g.ell(0,5.48,-3.50,.91,.90,.17,'#fff0c9',11,5);badge(g,0,5.47,-3.69,.58,.30,gold);
      return g;
    }
    [[-40,29,112,0,1.12],[60,43,155,1,1.05],[22,32,-92,2,.86],[-70,35,20,0,.86]].forEach(([x,y,z,v,sc],i)=>stamp(hotAir(v),x,y,z,.1*i,sc,14,t=>({y:Math.sin(t*.38+i)*.78,x:Math.sin(t*.20+i)*.71})));
    // Flags, pennants and activity at spectator level.
    const flags=Array.from({length:5},(_,i)=>makeProp('flag',i)),trees=[0,1,2].map(i=>makeProp('tree',i));
    for(let i=0;i<23;i++){
      let s=L*i/23,q=at(s,-(half+1.15));stamp(flags[i%5],q.x,q.y-.38,q.z,q.yaw+2.55,.60,4);
    }
    for(let i=0;i<40;i++){
      const side=i%2===0?-1:1,x=side<0?-18-rnd(i+23)*28:34+rnd(i+19)*29,z=-74+rnd(i+46)*195;
      if(z>83&&x>35||z<-33&&x<-18||Math.hypot(x-62,z-25)<20)continue;
      stamp(trees[i%3],x,0,z,rnd(i+2)*6,.69+rnd(i+6)*.62,8);
    }
    const stand=distantDecoration(stand=>{
    stand.box(0,.48,0,13.3,.96,3.4,'#d8bea5');
    for(let n=0;n<3;n++){
      let h=.8+n*.59,z=-1.11+n*.95;stand.box(0,h-.27,z,13.0,.54,1.01,n%2?'#e3c5ac':'#f3dbc2');
      for(let i=0;i<11;i++){if((n+i*7)%10===1)continue;let x=(i-5)*1.11;
        stand.box(x,h+.24,z,.34,.40,.3,theme[(i+n*3)%5]);stand.ell(x,h+.53,z-.04,.23,.22,.18,'#f4c997',6,3);
        stand.ell(x,h+.78,z,.33,.24,.27,cream,7,3);stand.ell(x,h+.83,z-.22,.14,.12,.07,theme[(i+n)%5],5,3)
      }
    }
    return stand;
    });
    for(let i=0;i<5;i++){let s=-34+i*22,q=at(s,-15.1);stamp(stand,q.x,Math.max(1,q.y-2.8),q.z,-Math.PI/2,.92,11)}
    const boardNames=['MOO MOO MILK','PATISSERIE','ORANGE CLUB'];
    const posters=boardNames.map((word,k)=>finishTile('park/poster'+k,(c,w,h)=>{
      const ground=['#397c85','#b35970','#b86f34'][k];
      c.fillStyle=ground;c.fillRect(0,0,w,h);c.strokeStyle='#f9db91';c.lineWidth=2;c.strokeRect(4,4,w-8,h-8);
      c.fillStyle='#fff2c9';c.beginPath();c.arc(35,32,22,0,circle);c.fill();
      c.fillStyle=ground;c.strokeStyle=ground;c.lineWidth=3.5;c.lineJoin='round';
      if(k===0){c.beginPath();c.moveTo(30,19);c.lineTo(40,19);c.lineTo(40,23);c.lineTo(44,29);c.lineTo(44,44);c.lineTo(26,44);c.lineTo(26,29);c.lineTo(30,23);c.closePath();c.stroke();c.fillRect(26,31,18,6)}
      if(k===1){c.beginPath();c.moveTo(23,40);c.lineTo(46,40);c.lineTo(43,30);c.lineTo(25,30);c.closePath();c.fill();c.beginPath();c.arc(35,30,9,Math.PI,0);c.fill();c.fillStyle='#f3ba83';c.fillRect(25,35,17,2)}
      if(k===2){c.beginPath();c.arc(35,36,10,0,circle);c.fill();c.beginPath();c.ellipse(39,23,8,3,-.44,0,circle);c.fill()}
      c.fillStyle='#fff4ce';c.textAlign='left';c.font='bold 23px sans-serif';c.fillText(word,66,41,179);
    }));
    for(let i=0;i<6;i++){
      const q=at((i+.25)*L/6,-9.8),board=new Geo(),uv=posters[i%3];
      board.box(0,1.08,0,5.8,1.57,.29,cream);
      board.face([-2.72,1.74,-.16],[2.72,1.74,-.16],[2.72,.42,-.16],[-2.72,.42,-.16],'#ffffff',null,
        [[uv[0],uv[1]],[uv[2],uv[1]],[uv[2],uv[3]],[uv[0],uv[3]]]);
      for(let k of [-1,1])board.box(k*2.19,.35,0,.15,.8,.18,'#caac8e');
      stamp(board,q.x,q.y-.18,q.z,q.yaw-Math.PI/2.3,1,6);
    }
    const cloud=makeProp('cloud',0),hills=Array.from({length:5},(_,i)=>makeProp('hill',i));
    for(let i=0;i<26;i++){let a=i*circle/26,d=151+rnd(i+170)*42;stamp(hills[i%5],12+Math.cos(a)*d,-1.6,35+Math.sin(a)*d,.39*i,1.7+rnd(i+90)*2.0,24)}
    for(let i=0;i<15;i++){let a=(i+.1)*circle/15,d=129+rnd(i+192)*60;stamp(cloud,15+Math.cos(a)*d,34+rnd(i+312)*16,31+Math.sin(a)*d,a,1.5+rnd(i+2)*2.1,13)}
    return (x,z,p,maxY=Infinity)=>Math.abs(p.l)<half-.2&&maxY>=p.y?undefined:deck.heightAt(x,z,maxY);
  }};
}
