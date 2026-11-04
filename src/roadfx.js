// A depth-tested, transient mesh. Every emitter is attached to the same transformed
// wheel or exhaust mouth used by the opaque vehicle, including in the rear mirror.
const RubyRoadFX=(()=>{
  const C=rgb,limit=(x,a,b)=>Math.max(a,Math.min(b,x)),unit=x=>limit(x,0,1);
  const motionPref=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
  let calm=motionPref?.matches||false;motionPref?.addEventListener?.('change',e=>calm=e.matches);
  const materials={
    harbor:{groove:C('#29272c'),lip:C('#53474b'),puff:C('#a88470'),light:C('#f6d2ac'),cruise:.17},
    airport:{groove:C('#454a51'),lip:C('#77848c'),puff:C('#b2ab99'),light:C('#e2daca'),cruise:.16},
    wario:{groove:C('#5d7890'),lip:C('#fbffff'),puff:C('#adc9d5'),light:C('#f8ffff'),cruise:.66,snow:true},
    forge:{groove:C('#100f1b'),lip:C('#514050'),puff:C('#846b7a'),light:C('#d4b7ae'),cruise:.21},
    park:{groove:C('#293941'),lip:C('#67787c'),puff:C('#cfdbcd'),light:C('#f1ece0'),cruise:.15},
    rainbow:{groove:C('#534a79'),lip:C('#a298c4'),puff:C('#c7bfe1'),light:C('#f2e4fc'),cruise:.15},
    summit:{groove:C('#536f8a'),lip:C('#f5ffff'),puff:C('#93afc6'),light:C('#f7ffff'),cruise:.72,snow:true},
    ice:{groove:C('#426e91'),lip:C('#e8ffff'),puff:C('#7fa9c3'),light:C('#e5faff'),cruise:.66,snow:true,ice:true},
    hover:{groove:C('#46889f'),lip:C('#abf7ff'),puff:C('#83b8d2'),light:C('#e5ffff'),cruise:.53,hover:true}
  };
  const frost=[C('#b5e9fa'),C('#72adcd'),C('#f0ffff')], spark=[C('#a7edff'),C('#6de7ff'),C('#ffb24e'),C('#f18dff')];
  const chargeInk=[C('#9ecaff'),C('#17a9ff'),C('#ff8c20'),C('#e455ff')];
  const jetColor=[C('#ff512b'),C('#ffb43e'),C('#fff1a7'),C('#47caff'),C('#fffefa')];
  const jetIce=[C('#277dff'),C('#61dbff'),C('#c9ffff'),C('#b072ff'),jetColor[4]];
  // Bake contours and lobes once. Both rasterizers consume exactly the same vertex colors.
  const haloX=[],haloY=[],plumeX=[],plumeY=[],plumeR=[1,.86,1.05,1,.78,1.09];
  for(let i=0;i<8;i++){const a=i*Math.PI/4;haloX.push(Math.cos(a));haloY.push(Math.sin(a))}
  for(let i=0;i<6;i++){const a=i*Math.PI/3,r=plumeR[i];plumeX.push(Math.cos(a)*r);plumeY.push(Math.sin(a)*r)}
  const ringX=[],ringY=[];
  for(let i=0;i<=7;i++){ringX[i]=Math.cos(i*Math.PI*2/7);ringY[i]=Math.sin(i*Math.PI*2/7)}
  const roadBudget=8190,impactBudget=2880;
  const batch={n:0,d:new Float32Array(9*(roadBudget+impactBudget))};
  let seed=5419;
  const ran=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  function vert(p,col,alpha){
    let j=batch.n++*9,d=batch.d;d[j]=p[0];d[j+1]=p[1];d[j+2]=p[2];d[j+3]=col[0];d[j+4]=col[1];d[j+5]=col[2];d[j+6]=-1;d[j+7]=alpha;d[j+8]=8;
  }
  function tri(a,b,c,ca,cb,cc,aa,ab,ac){if(batch.n+3>roadBudget+impactBudget)return;vert(a,ca,aa);vert(b,cb,ab);vert(c,cc,ac)}
  function v(){return new Float64Array(3)}
  function point(out,x,y,z){out[0]=x;out[1]=y;out[2]=z;return out}
  function wheelEnd(){return {x:0,y:0,z:0,hx:0,hy:0,hz:0}}
  function takeEnd(end,w,m,sn,cs){
    const half=Math.max(.13,w.width*.56)*(m.snow?1.09:1),bank=w.bank||0;
    end.x=w.x;end.y=(w.roadY??w.y)+.065;end.z=w.z;
    end.hx=cs*half;end.hy=Math.sin(bank)*half;end.hz=-sn*half;
  }
  function copyEnd(a,b){a.x=b.x;a.y=b.y;a.z=b.z;a.hx=b.hx;a.hy=b.hy;a.hz=b.hz}
  const ends=[wheelEnd(),wheelEnd()];
  const marks=Array.from({length:648},()=>({a:wheelEnd(),b:wheelEnd(),m:null,weight:0,time:0,life:0}));
  let ownMark=0,otherMark=0;
  function mark(a,b,m,weight,t,own){
    const i=own?ownMark++%360:360+otherMark++%288,rec=marks[i];
    copyEnd(rec.a,a);copyEnd(rec.b,b);rec.m=m;rec.weight=weight;rec.time=t;
    rec.life=m.hover?.92:m.snow?6.5:weight>.39?6.2:2.15;
  }
  const stops=[-1,-.67,-.24,-.08,.40,.70,1];
  const edgeA=Array.from({length:7},v),edgeB=Array.from({length:7},v);
  function edgeRow(row,e){
    for(let k=0;k<stops.length;k++){const u=stops[k];point(row[k],e.x+e.hx*u,e.y+e.hy*u,e.z+e.hz*u)}
  }
  function ribbonBand(i,left,right,al,ar,j=i+1){
    tri(edgeA[i],edgeA[j],edgeB[i],left,right,left,al,ar,al);
    tri(edgeB[i],edgeA[j],edgeB[j],left,right,right,al,ar,ar);
  }
  function paintRibbon(a,b,m,alpha,distant=false){
    edgeRow(edgeA,a);edgeRow(edgeB,b);
    const density=alpha*(m.snow?.85:m.hover?.83:.76);
    if(distant){
      // Beyond ~17 m the center rib is narrower than one native display pixel.
      ribbonBand(0,m.groove,m.groove,0,density*.76,1);
      ribbonBand(1,m.groove,m.groove,density*.76,density*.65,5);
      ribbonBand(5,m.snow||m.hover?m.lip:m.groove,m.lip,alpha*.54,0);
      return;
    }
    // Warm tire scrub has a thinner, paler rib through its footprint. On snow
    // that rib and one lifted outside lip catch the sky color.
    ribbonBand(0,m.groove,m.groove,0,density);
    ribbonBand(1,m.groove,m.groove,density,density*.76);
    ribbonBand(2,m.groove,m.groove,density*.76,density*.34);
    ribbonBand(3,m.groove,m.groove,density*.34,density*.85);
    ribbonBand(4,m.groove,m.groove,density*.85,density*.51);
    ribbonBand(5,m.snow||m.hover?m.lip:m.groove,m.lip,alpha*(m.snow||m.hover?.83:.39),0);
  }
  function visible(motor,x,y,z,r){
    const dx=x-motor.cam.x,dy=y-motor.cam.y,dz=z-motor.cam.z;
    const forward=dx*motor.s+dz*motor.c,depth=forward*motor.cp+dy*motor.sp;
    if(depth+r<.22||depth-r>46)return false;
    return Math.abs(dx*motor.c-dz*motor.s)<r+(depth+r)*motor.asp/motor.f&&
      Math.abs(dy*motor.cp-forward*motor.sp)<r+(depth+r)/motor.f;
  }
  function drawMarks(motor,t){
    for(const r of marks){
      if(!r.life)continue;
      const age=(t-r.time)/r.life;
      if(age>=1){r.life=0;continue}
      const a=r.a,b=r.b,m=r.m;
      if(!visible(motor,(a.x+b.x)*.5,(a.y+b.y)*.5,(a.z+b.z)*.5,.34+.52*(Math.abs(a.x-b.x)+Math.abs(a.z-b.z)+Math.abs(a.y-b.y))))continue;
      if(batch.n>5550)break;
      const alpha=r.weight*Math.min(1,(1-age)*2.45);
      const dx=a.x-motor.cam.x,dz=a.z-motor.cam.z;paintRibbon(a,b,m,alpha,dx*dx+dz*dz>289);
    }
    for(const e of emitters.values()){
      if(e.last!==t||!e.live)continue;
      for(let i=0;i<e.feetN;i++)paintRibbon(e.feet[i],e.now[i],e.material[i],e.weight);
    }
  }
  const rubberSmoke={puff:C('#b9c2cb'),light:C('#fff7e9')};
  const particles=Array.from({length:110},()=>({life:0}));
  let ownParticle=0,otherParticle=0,cameraRight=v(),cameraUp=v();
  const sPos=Array.from({length:8},v),worldCenter=v(),facetCenter=v();
  const sortParticles=[];
  function spawn(w,side,m,state,kind,power,own,color){
    const slot=own?ownParticle++%70:70+otherParticle++%40,p=particles[slot];
    const r=ran(),sn=state.sn,cs=state.cs,angular=kind==='chip',sparking=kind==='spark',spread=side*(1.3+r*2.6),back=angular?1.4:1.0;
    p.x=w.x+.04*cs*side;p.y=(w.roadY??w.y)+.075;p.z=w.z-.04*sn*side;
    p.floor=p.y-.065;p.kind=kind;p.m=m;p.color=color;p.trail=sparking?chargeInk[state.tier]:color;p.age=0;p.power=power;p.phase=ran()*6.28;
    const flare=own&&state.tier>=2?state.fxSpeed*(state.tier===3?1:.54):0;
    const fan=sparking?1.4+power*.46+.95*flare:angular?1+.62*flare:1;
    const drag=angular?.30+.22*flare:sparking?.26+.48*flare:.22;
    p.vx=state.vx*drag+spread*cs*fan-back*sn;p.vz=state.vz*drag-spread*sn*fan-back*cs;
    p.vy=angular?1.9+r*2.5:sparking?1.6+r*2.5:.63+r*1.22;
    p.life=angular?.50+r*.26:sparking?.21+r*.23:.44+r*.45;
    p.radius=angular?.076+r*.072:sparking?.043+r*.052:.21+r*.17;
    p.crest=kind==='puff'&&state.plume>.20&&r>.63?state.plume:0;
    if(sparking&&flare){p.radius*=1+.60*flare;p.vy+=flare*(2.6+r*2);p.life+=.095*flare}
    if(angular&&m.ice&&r>.67&&flare){p.radius*=1+1.28*flare;p.vy+=2.8*flare}
    p.turn=(ran()<.5?-1:1)*(angular?7+r*8:1.6+r);
    if(kind==='puff'&&state.plume>0&&!m.snow&&!m.hover){
      p.m=rubberSmoke;p.radius*=1+.37*state.plume;p.vy+=state.plume*.43;
      p.life+=state.plume*.12;
    }
    if(m.ice&&kind==='puff'){p.vy*=.66;p.radius*=1.28}
  }
  function bb(p,out,side,up){
    out[0]=p.x+cameraRight[0]*side+cameraUp[0]*up;
    out[1]=p.y+cameraUp[1]*up;
    out[2]=p.z+cameraRight[2]*side+cameraUp[2]*up;
  }
  function puff(p,f){
    // Two soft lobes have different centers: the cap catches sky light and the
    // lower skirts slide out across the track. A six-sided fan per lobe replaces
    // the old concentric three-band, seven-sided puff.
    const radius=p.radius*(.75+1.48*f),alpha=p.power*(1-f)*(1-.32*f);
    const angle=p.phase+f*p.turn*.28,cs=Math.cos(angle),sn=Math.sin(angle);
    const flat=p.m.ice?.53:p.m.snow?.75:.82;
    for(let lobe=0;lobe<2;lobe++){
      const rad=radius*(lobe?.67:1),sx=lobe?-radius*.24:0,sy=lobe?radius*.26:0;
      bb(p,worldCenter,sx-rad*.14,sy+rad*.13);
      for(let i=0;i<6;i++){
        const x=plumeX[i]*cs-plumeY[i]*sn,y=plumeX[i]*sn+plumeY[i]*cs;
        bb(p,sPos[i],sx+x*rad,sy+y*rad*flat);
      }
      const core=lobe?p.m.light:p.m.puff,weight=alpha*(lobe?.80:.88);
      for(let i=0;i<6;i++)tri(worldCenter,sPos[i],sPos[(i+1)%6],core,p.m.puff,p.m.puff,weight,0,0);
    }
    if(p.crest){
      // A tapered rim catches the light on a few rolling puffs.
      // It uses the same pooled vertices and fades with the underlying dust.
      const w=radius,h=radius*flat,k=alpha*p.crest*.49;
      bb(p,sPos[0],-.63*w,.20*h);bb(p,sPos[1],-.34*w,.54*h);
      bb(p,sPos[2],-.08*w,.62*h);bb(p,sPos[3],-.34*w,.44*h);
      tri(sPos[0],sPos[1],sPos[3],p.m.light,p.m.light,p.m.light,0,k,k*.44);
      tri(sPos[1],sPos[2],sPos[3],p.m.light,p.m.light,p.m.light,k,0,k*.44);
    }
  }
  function shard(p,f){
    const rad=p.radius*(1-.23*f),angle=p.phase+p.age*p.turn*(calm?.40:1),cs=Math.cos(angle),sn=Math.sin(angle);
    const hx=rad*(.54+.35*Math.abs(Math.sin(angle*.8))),hy=rad*1.17;
    bb(p,sPos[0],sn*hy,cs*hy);
    bb(p,sPos[1],cs*hx-sn*hy*.12,-sn*hx-cs*hy*.12);
    bb(p,sPos[2],-sn*hy*.80,-cs*hy*.80);
    bb(p,sPos[3],-cs*hx+sn*hy*.16,sn*hx+cs*hy*.16);
    bb(p,facetCenter,cs*hx*.21+sn*hy*.30,-sn*hx*.21+cs*hy*.30);
    const a=unit((1-f)*3)*p.power;
    const edge=(cs*cameraRight[0]+sn*cameraRight[2])*.5+.5;
    const face=edge>.72?frost[2]:frost[0];
    tri(sPos[0],sPos[1],facetCenter,frost[2],frost[0],face,a,a*.91,a);
    tri(sPos[1],sPos[2],facetCenter,frost[0],frost[1],frost[0],a*.92,a*.61,a*.81);
    tri(sPos[2],sPos[3],facetCenter,frost[1],frost[1],frost[0],a*.75,a*.82,a*.92);
    tri(sPos[3],sPos[0],facetCenter,frost[1],frost[2],frost[2],a*.90,a,a);
  }
  function fleck(p,f){
    const size=p.radius*(1-f*.45),alpha=(1-f)*p.power;
    // The hot head stays compact while the colored tail trails the spark's
    // velocity. This makes a drift tier change readable above dusty pavement.
    const step=Math.min((calm?.038:.089)*(1+.22*f),1.10/(Math.sqrt(p.vx*p.vx+p.vy*p.vy+p.vz*p.vz)||1));
    bb(p,sPos[0],-size,0);bb(p,sPos[1],size,0);
    bb(p,sPos[2],0,size*1.25);
    point(sPos[3],p.x-p.vx*step,p.y-p.vy*step,p.z-p.vz*step);
    tri(sPos[0],sPos[1],sPos[2],p.color,p.color,jetColor[4],alpha,alpha,alpha);
    tri(sPos[1],sPos[0],sPos[3],p.trail,p.trail,p.trail,alpha,alpha,0);
    bb(p,sPos[0],-size*.32,0);bb(p,sPos[1],size*.32,0);
    tri(sPos[0],sPos[1],sPos[2],jetColor[2],jetColor[2],jetColor[4],alpha,alpha,alpha);
  }
  function drawParticles(motor,dt,vertexLimit){
    const cam=motor.cam,list=sortParticles;list.length=0;
    for(const p of particles){
      if(!p.life)continue;p.age+=dt;
      if(p.age>=p.life){p.life=0;continue}
      p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;
      p.vy-=(p.kind==='puff'?1.8:9.4)*dt;
      if(p.y<p.floor-.03){p.life=0;continue}
      const dx=p.x-cam.x,dz=p.z-cam.z;
      p.depth=(dx*motor.s+dz*motor.c)*motor.cp+(p.y-cam.y)*motor.sp;
      if(p.depth>.20&&visible(motor,p.x,p.y,p.z,p.radius*(p.kind==='puff'?2.35:1.3)))list.push(p);
    }
    list.sort((a,b)=>b.depth-a.depth);
    for(const p of list){if(batch.n+63>vertexLimit)break;const f=p.age/p.life;
      if(p.kind==='chip')shard(p,f);else if(p.kind==='puff')puff(p,f);else fleck(p,f)
    }
  }
  const softEdge=Array.from({length:8},v),lightCenter=v(),coolWhite=C('#fffbdf');
  function radial(x,y,z,rx,ry,rz,ux,uy,uz,core,rim,alpha){
    if(alpha<.018)return;
    point(lightCenter,x,y,z);
    for(let i=0;i<8;i++)point(softEdge[i],x+rx*haloX[i]+ux*haloY[i],y+ry*haloX[i]+uy*haloY[i],z+rz*haloX[i]+uz*haloY[i]);
    for(let i=0;i<8;i++)tri(lightCenter,softEdge[i],softEdge[(i+1)%8],core,rim,rim,alpha,0,0);
  }
  function bloom(x,y,z,r,h,core,rim,alpha){
    radial(x,y,z,cameraRight[0]*r,0,cameraRight[2]*r,cameraUp[0]*h,cameraUp[1]*h,cameraUp[2]*h,core,rim,alpha);
  }
  const starReflection=[0,0,0];
  function paintStarLight(motor,info){
    const color=info.starLight,car=info.car;
    if(!color||!car||info.rescue||!info.grounded||!visible(motor,car.x,car.y,car.z,2.6))return;
    starReflection[0]=(color>>>16&255)/255;starReflection[1]=(color>>>8&255)/255;starReflection[2]=(color&255)/255;
    const c=Math.cos(car.yaw),s=Math.sin(car.yaw);
    radial(car.x,car.groundY+.065,car.z,1.55*c,1.55*Math.sin(car.bank||0),-1.55*s,
      1.95*s,1.95*Math.sin(info.gradePitch||0),1.95*c,starReflection,starReflection,.42*(color>>>24)/255);
  }
  function paintWheelLight(motor,e,t){
    if(e.last!==t||!e.feetN||(!e.tier&&e.jet<.15))return;
    const detail=motor.optionalBudget??1;
    if(!e.own&&detail<.46)return;
    const tier=e.tier,jetInk=(e.coolJet?jetIce:jetColor),color=tier?spark[tier]:jetInk[0];
    const contactFlash=tier?unit(1-(t-e.crownAt)/.24):0,wheels=e.sockets.wheels;
    const power=tier?e.fxSpeed:unit((e.jet-.24)/.68);
    for(let i=0;i<e.feetN;i++){
      const w=wheels[i],material=w.surface||e.surface;
      const reflective=material==='ice'?.94:material==='rainbow'?.85:material==='harbor'&&e.wet?.78:0;
      const height=w.roadY??w.y,side=w.side||(i?1:-1);
      if(!visible(motor,w.x,height,w.z,2.4))continue;
      if(reflective&&(detail>=.33||e.own)){
        const dx=motor.cam.x-w.x,dy=motor.cam.y-height,dz=motor.cam.z-w.z;
        const grazing=1-unit(Math.abs(dy)/(Math.sqrt(dx*dx+dy*dy+dz*dz)||1));
        const width=tier?.37+.19*power:.49+.38*power,length=tier?.65+.78*power:.75+1.18*power;
        const bank=Math.sin(w.bank||0),back=tier?.20+.33*power:.43+.66*power;
        // Follow the actual nozzle for a flame reflection, and the outer tire
        // contact for a drift reflection. Preserve the slope of the receiving deck.
        const nozzle=e.sockets.outlets[i]||e.sockets.outlets[0],x=tier||!nozzle?w.x:nozzle.x,z=tier||!nozzle?w.z:nozzle.z;
        radial(x-back*e.sn,height+.079-back*e.gradePitch,z-back*e.cs,e.cs*width,bank*width,-e.sn*width,
          -e.sn*length,-e.gradePitch*length,-e.cs*length,tier?color:jetInk[1],color,
          reflective*(.58+.42*grazing)*power);
      }
      if(!tier||power<.04)continue;
      const edge=w.width*.45,ox=w.x+e.cs*side*edge,oz=w.z-e.sn*side*edge,ink=chargeInk[tier];
      const size=.31+.10*tier+.24*contactFlash;
      bloom(ox,height+.21,oz,size,size*.84,ink,color,(e.own?.96:.64)*power);
      // A three-pronged fan at full charge: short bright root, spreading hot
      // branches, then free-moving sparks. Its length follows the contact speed.
      const count=tier===3?3:tier===2||contactFlash>.15?2:1;
      for(let j=0;j<count;j++){
        const wag=calm?0:.11*Math.sin(t*13+side*1.8+j*2.3);
        const spread=(j===0?1.60:j===1?1.03:.53)*(.31+.28*tier)*power*(1+wag);
        const tail=(j===0?.42:j===1?.78:1.04)*(.42+.24*tier)*power;
        const lift=(j===0?.44:j===1?.91:.60)*(1+wag)*power;
        point(rayA,ox,height+.18,oz);
        point(rayB,ox+side*e.cs*spread-e.sn*tail,height+.20+lift,oz-side*e.sn*spread-e.cs*tail);
        const root=(.053+.031*tier)*(1+.28*contactFlash)*(j?.72:1);
        paintStroke(motor,rayA,rayB,root,.014,ink,power*.98);
        paintStroke(motor,rayA,rayB,root*.40,.006,coolWhite,power*.93);
      }
    }
  }
  function jetCrown(motor,w,t,j,e){
    const x=w.x+w.dx*.035,y=w.y+w.dy*.035,z=w.z+w.dz*.035;
    const dx=motor.cam.x-x,dy=motor.cam.y-y,dz=motor.cam.z-z,dist=Math.sqrt(dx*dx+dy*dy+dz*dz)||1;
    const facing=unit((dx*w.dx+dy*w.dy+dz*w.dz)/dist);
    const hot=unit((e.jet-.43)/.5),ink=e.coolJet?jetIce:jetColor;
    const size=w.radius*(1.9+1.68*e.jet+.62*e.kick)+.18*hot;
    bloom(x,y,z,size,size,coolWhite,ink[0],(.23+.65*facing)*e.jet);
    if(e.jet<.49||!e.own||(motor.optionalBudget??1)<.4)return;
    // A blue-white compression bead inside the darker envelope, downstream
    // from the actual mouth, follows its axis even on jumps or single-pipe bikes.
    const d=.45+.41*e.jet+.028*Math.sin(t*13+j);
    const headX=w.x+w.dx*d,headY=w.y+w.dy*d,headZ=w.z+w.dz*d;
    bloom(headX,headY+.07*hot,headZ,w.radius*2+.31*hot,w.radius*1.64+.24*hot,ink[1],ink[0],.84*e.jet);
    const half=w.radius*.82+.045*hot,span=.26*e.jet;
    point(quad[0],headX+axisU[0]*half,headY+axisU[1]*half,headZ+axisU[2]*half);
    point(quad[1],headX-axisU[0]*half,headY-axisU[1]*half,headZ-axisU[2]*half);
    point(rayA,headX-w.dx*span,headY-w.dy*span,headZ-w.dz*span);
    point(rayB,headX+w.dx*span,headY+w.dy*span,headZ+w.dz*span);
    tri(rayA,quad[0],quad[1],ink[3],ink[4],ink[4],.65,.94,.94);
    tri(quad[0],quad[1],rayB,ink[4],ink[4],ink[1],.94,.94,.48);
  }
  const rim=Array.from({length:8},v),neck=Array.from({length:8},v),tip=v(),axisU=v(),axisV=v();
  function jetRing(out,w,along,rad,sway){
    const x=w.x+w.dx*along+axisU[0]*sway,y=w.y+w.dy*along+axisU[1]*sway,z=w.z+w.dz*along+axisU[2]*sway;
    for(let i=0;i<7;i++){
      const u=rad*ringX[i],v=rad*ringY[i];
      point(out[i],x+axisU[0]*u+axisV[0]*v,y+axisU[1]*u+axisV[1]*v,z+axisU[2]*u+axisV[2]*v);
    }
  }
  function flame(w,t,off,strength,ignition,ink){
    const horiz=Math.hypot(w.dx,w.dz);
    if(horiz>.03)point(axisU,w.dz/horiz,0,-w.dx/horiz);else point(axisU,1,0,0);
    point(axisV,w.dy*axisU[2]-w.dz*axisU[1],w.dz*axisU[0]-w.dx*axisU[2],w.dx*axisU[1]-w.dy*axisU[0]);
    const pulse=calm?.93:.94+.045*Math.sin(t*17+off)+.025*Math.sin(t*26-off);
    const hot=unit((strength-.43)/.5),rad=w.radius*(.77+.21*strength+.07*ignition);
    const len=(.19+1.04*strength+.86*hot+.33*ignition)*pulse;
    // The jet starts inside the metal mouth, then opens into a pressure cone.
    // Enlarging the port itself would detach the flame from narrow exhausts.
    const cone=rad*(1.16+.24*strength)+(.16+.08*ignition)*hot;
    const sway=(calm?.006:.026)*Math.sin(t*18+off)*strength;
    jetRing(rim,w,.003,rad,0);jetRing(neck,w,len*.37,cone,sway*.30);
    point(tip,w.x+w.dx*len+axisU[0]*sway,w.y+w.dy*len+.22*hot+.045*strength+axisU[1]*sway,w.z+w.dz*len+axisU[2]*sway);
    for(let i=0;i<7;i++){
      const j=(i+1)%7;
      tri(rim[i],rim[j],neck[i],ink[3],ink[3],ink[0],.96,.96,.93);
      tri(neck[i],rim[j],neck[j],ink[0],ink[3],ink[0],.93,.96,.93);
      tri(neck[i],neck[j],tip,ink[0],ink[0],ink[1],.93,.93,.39);
    }
    jetRing(rim,w,.010,rad*.62,0);jetRing(neck,w,len*.30,cone*.57,sway*.23);
    point(tip,w.x+w.dx*len*.68+axisU[0]*sway*.57,w.y+w.dy*len*.68+.105*hot+.027*strength+axisU[1]*sway*.57,w.z+w.dz*len*.68+axisU[2]*sway*.57);
    for(let i=0;i<7;i++){const j=(i+1)%7;
      tri(rim[i],rim[j],neck[i],ink[4],ink[4],ink[2],.99,.99,.97);
      tri(neck[i],rim[j],neck[j],ink[2],ink[4],ink[2],.97,.99,.97);
      tri(neck[i],neck[j],tip,ink[2],ink[2],ink[1],.96,.96,.70);
    }
  }
  function makeEmitter(){return {feet:[wheelEnd(),wheelEnd()],now:[wheelEnd(),wheelEnd()],feetN:0,live:false,material:[null,null],last:-1,jet:0,poof:0,chips:0,sparks:0,tally:0,sn:0,cs:1,vx:0,vz:0,x:0,z:0,tier:0,crownAt:-5,air:false,hit:false}}
  const emitters=new Map(),flames=[];

  function update(item,t,dt,own){
    const car=item.car,sock=item.sockets;
    if(!sock||!car)return;
    const key=own?-1:item.id;
    let e=emitters.get(key);if(!e){e=makeEmitter();emitters.set(key,e)}
    const moved=e.last<0||t-e.last>.25||Math.hypot(car.x-e.x,car.z-e.z)>7;
    if(moved){e.feetN=0;e.poof=e.chips=e.sparks=e.jet=0;e.tier=0;e.air=false;e.hit=false;e.boosting=false;e.ignited=e.crownAt=-5;}
    e.live=false;
    const frameDt=t-e.last;
    if(!moved&&frameDt>.0001){e.vx=(car.x-e.x)/frameDt;e.vz=(car.z-e.z)/frameDt}
    else if(moved)e.vx=e.vz=0;
    e.sn=Math.sin(car.yaw);e.cs=Math.cos(car.yaw);e.last=t;e.x=car.x;e.z=car.z;
    if(item.boost&&!e.boosting){
      e.ignited=t;e.coolJet=!item.mushroom&&(e.tier>=2||item.surface==='ice'||sock.anti);
    }
    e.boosting=!!item.boost;e.kick=calm?0:Math.max(0,1-(t-e.ignited)/.18)**2;
    const thrust=unit(Math.max(item.boost?.69:0,item.boostStrength||0));
    e.jet=thrust>e.jet?Math.max(thrust*.72,e.jet+(thrust-e.jet)*(1-Math.exp(-dt*25))):e.jet*Math.exp(-dt*16)+thrust*(1-Math.exp(-dt*16));
    if(e.jet>.07&&!item.rescue){e.nozzles=sock.outlets;e.jetCar=car;e.own=own;flames.push(e)}
    const wheels=sock.wheels;
    if(item.rescue||!wheels.length||wheels[0].valid===false||wheels[1]?.valid===false||item.grounded===false){e.feetN=0;e.air=item.grounded===false&&!item.rescue;return}
    const m=sock.anti?materials.hover:materials[item.surface]||materials[item.theme]||materials.harbor;
    const hit=!!item.hit,burst=(e.air||hit&&!e.hit)&&!moved;
    e.air=false;e.hit=hit;
    const gridLoad=item.gridLoad||0;e.gridLoad=gridLoad;
    e.plume=gridLoad||unit(item.driftBlend||0)*unit(Math.abs(item.speed||0)/55);
    const speed=Math.max(unit(Math.abs(item.speed||0)/100),gridLoad*.88);
    const scrub=unit(gridLoad+Math.abs(item.slip||0)*2.45+(item.driftBlend||0)*.56+(item.brake||0)*.65);
    const grade=gridLoad>=.85?3:gridLoad>=.52?2:gridLoad>=.16?1:Math.min(3,Math.max(0,item.driftLevel||0));
    e.fxSpeed=unit((speed-.11)/.40);
    e.surface=item.surface;e.sockets=sock;e.own=own;e.gradePitch=item.gradePitch||0;e.wet=!!item.wet;
    if(speed<.047&&!burst){e.feetN=0;e.poof=e.chips=e.sparks=0;return}
    const weight=unit(m.cruise+scrub*(1-m.cruise)+(item.boost?.16:0))*(own?1:.92);
    const n=Math.min(2,wheels.length);
    let seam=e.feetN!==n;
    for(let i=0;i<n;i++){
      const local=sock.anti?m:(materials[wheels[i].surface]||m);
      if(e.material[i]!==local)seam=true;e.material[i]=local;
      takeEnd(ends[i],wheels[i],local,e.sn,e.cs);
    }
    if(seam){for(let i=0;i<n;i++)copyEnd(e.feet[i],ends[i]);e.feetN=n}
    else{
      const l=Math.hypot(e.feet[0].x-ends[0].x,e.feet[0].z-ends[0].z);
      if(l>(gridLoad?.12:own?.73:1.18)){for(let i=0;i<n;i++){
        if(l<5.5)mark(e.feet[i],ends[i],e.material[i],weight,t,own);
        copyEnd(e.feet[i],ends[i]);
      }}else if(l>.028){
        e.live=true;e.weight=weight;for(let i=0;i<n;i++)copyEnd(e.now[i],ends[i]);
      }
    }
    const budget=own?1:gridLoad?.16:.42,factor=unit((speed-.045)*1.85);
    const dustRate=m.hover?4+scrub*14:m.snow?18+scrub*27:7+scrub*50;
    e.poof+=dt*(dustRate+(item.boost?6:0))*budget*factor;
    e.chips+=dt*(m.snow?(m.ice?28:8)+scrub*(m.ice?25:15):0)*budget*factor;
    e.sparks+=dt*(grade?29+7*grade:m.hover?8+19*scrub:0)*budget*factor;
    if(burst){e.poof+=own?7:3;if(m.snow)e.chips+=own?6:2}
    if(grade>e.tier){e.sparks+=own?3+grade*2:2;e.crownAt=t}
    e.tier=grade;
    const dustPower=m.hover?.52:m.snow?.77:Math.min(.90,.50+scrub*.40),sparkColor=hit?jetColor[1]:spark[grade];
    for(let i=0;e.poof>=1&&i<8;i++,e.poof--){
      const idx=e.tally++%n,w=wheels[idx],side=w.side||((e.tally&1)*2-1);
      spawn(w,side,e.material[idx],e,'puff',dustPower,own);
    }
    for(let i=0;e.chips>=1&&i<8;i++,e.chips--){
      const idx=(e.tally+Math.floor(e.chips))%n,w=wheels[idx],side=w.side||(ran()<.5?-1:1);
      spawn(w,side,e.material[idx],e,'chip',.98,own);
    }
    for(let i=0;e.sparks>=1&&i<8;i++,e.sparks--){
      const idx=Math.floor(ran()*n),w=wheels[idx],side=w.side||(ran()<.5?-1:1);
      spawn(w,side,e.material[idx],e,'spark',.96,own,sparkColor);
    }
  }
  // All item effects share the road particle draw and the opaque scene depth.
  // Build signed screen-facing widths in world units, so gliders, buildings and
  // the racer still occlude them. Scratch vectors and stroke templates are reused.
  const volt=[C('#464084'),C('#81baff'),C('#ffffe9')],contact=[C('#ffc640'),C('#fff7c3')];
  const hitColors={
    green:[C('#188e67'),C('#adffd8')],shell:[C('#c83944'),C('#fff0ce')],
    spiny:[C('#6393fb'),C('#ecfcff')],bomb:[C('#ff7a35'),C('#fff1aa')],
    fireball:[C('#fc542c'),C('#ffd891')],horn:[C('#de6a6e'),C('#ffecaf')],
    banana:[C('#db932c'),C('#fff0a3')],hit:[C('#d8a13d'),C('#fff8c0')]
  };
  const channel=[[0,0,0],[.20,.64,.12],[-.26,1.31,.16],[.36,2.12,.32],[.23,2.50,.34],[.81,3.52,.48],[.48,4.18,.56],[1.47,5.71,.81],[1.15,7.1,1.04]];
  const forkA=[[.36,2.12,.32],[-.40,2.50,.13],[-.70,2.95,.35],[-1.30,3.18,.50]];
  const forkB=[[.48,4.18,.56],[1.32,4.34,.72],[1.54,4.76,.74],[2.39,5.08,.95]];
  const rayA=v(),rayB=v(),quad=Array.from({length:4},v),refPos=v();
  let hitHero=null;
  const hitList=[],slots=Array.from({length:12},()=>({r:null,d:0}));
  function paintStroke(motor,a,b,w0,w1,col,alpha){
    const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
    // A cross product with the view direction points along the stroke's width.
    const vx=motor.cam.x-(a[0]+b[0])*.5,vy=motor.cam.y-(a[1]+b[1])*.5,vz=motor.cam.z-(a[2]+b[2])*.5;
    const nx=dy*vz-dz*vy,ny=dz*vx-dx*vz,nz=dx*vy-dy*vx,len=Math.sqrt(nx*nx+ny*ny+nz*nz);
    if(len<.0001||alpha<.01)return;
    w0/=len;w1/=len;
    point(quad[0],a[0]+nx*w0,a[1]+ny*w0,a[2]+nz*w0);point(quad[1],a[0]-nx*w0,a[1]-ny*w0,a[2]-nz*w0);
    point(quad[2],b[0]+nx*w1,b[1]+ny*w1,b[2]+nz*w1);point(quad[3],b[0]-nx*w1,b[1]-ny*w1,b[2]-nz*w1);
    tri(quad[0],quad[1],quad[2],col,col,col,alpha,alpha,alpha);
    tri(quad[1],quad[3],quad[2],col,col,col,alpha,alpha,alpha);
  }
  function brightStroke(motor,a,b,w,col,alpha,detailed=true){
    if(detailed)paintStroke(motor,a,b,w*3.5,w*2.8,volt[0],alpha*.41);
    paintStroke(motor,a,b,w*1.9,w*1.55,col,alpha*.83);
    paintStroke(motor,a,b,w,w*.76,volt[2],alpha);
  }
  function channelPath(motor,path,cx,cy,cz,sn,cs,side,width,power,detail){
    for(let j=0;j<path.length;j++){
      const p=path[j],x=p[0]*side;
      point(rayB,cx+x*cs+p[2]*sn,cy+p[1],cz-x*sn+p[2]*cs);
      if(j)brightStroke(motor,rayA,rayB,width,volt[1],power,detail);
      rayA.set(rayB);
    }
  }
  function paintDischarge(motor,r,p,age,detail){
    const sn=Math.sin(r.strikeYaw),cs=Math.cos(r.strikeYaw),side=(r.id&1)?-1:1;
    const lift=p.scale*1.38,peak=.30;
    if(age<peak){
      const alpha=(1-unit((age-.12)/(peak-.12)))*(calm?.90:.87+.13*Math.cos(age*23));
      channelPath(motor,channel,p.x,p.y+lift,p.z,sn,cs,side,detail?.069:.086,alpha,detail);
      if(detail){
        channelPath(motor,forkA,p.x,p.y+lift,p.z,sn,cs,side,.037,alpha*.83,false);
        channelPath(motor,forkB,p.x,p.y+lift,p.z,sn,cs,side,.033,alpha*.70,false);
      }
    }
    if(detail&&r===hitHero&&age<.38){
      const fade=unit((.38-age)/.27),ripple=1.55+1.50*age/.38;
      radial(p.x,p.y+.096,p.z,ripple,0,0,0,0,ripple,volt[1],volt[0],.88*fade);
      bloom(p.x,p.y+lift,p.z,1.52*fade,.92*fade,volt[2],volt[1],.76*fade);
    }
    if(age>.97)return;
    const alpha=(1-unit((age-.33)/.64))*(calm?.88:.83+.17*Math.cos(age*13));
    const wheelset=r.fxStamp===poseFrame?r.socketBuffer?.wheels:null;
    const n=detail?4:2,csCar=Math.cos(p.yaw),snCar=Math.sin(p.yaw);
    for(let j=0;j<n;j++){
      const sign=j&1?1:-1;
      const w=wheelset?.[j],sx=sign*.89*p.scale,sz=(j>1?1:-.85)*p.scale;
      const tx=w?w.x:p.x+sx*csCar+sz*snCar,ty=w?w.y:p.y+.34*p.scale,tz=w?w.z:p.z-sx*snCar+sz*csCar;
      point(refPos,p.x+.24*sx*csCar,p.y+.99*p.scale,p.z-.24*sx*snCar);
      point(rayA,(refPos[0]+tx)*.5+csCar*.28*sign,ty+p.scale*(.49+.13*Math.sin(age*15+j)),(refPos[2]+tz)*.5-snCar*.28*sign);
      brightStroke(motor,refPos,rayA,.060,volt[1],alpha,detail);
      point(rayB,tx,ty+.12*p.scale,tz);brightStroke(motor,rayA,rayB,.062,contact[0],alpha,detail);
      if(detail){
        point(rayA,tx+csCar*.10*sign,ty+.11*p.scale,tz-snCar*.10*sign);
        point(rayB,tx+csCar*.44*sign,ty+.32*p.scale,tz-snCar*.44*sign);
        paintStroke(motor,rayA,rayB,.055,.006,contact[1],alpha);
      }
    }
    // Two broken arcs crawl along the outside of the axle instead of being
    // hidden behind the chassis as the driver turns sideways and shrinks.
    if(detail){
      const side=Math.sin(age*8+r.id*.71),hero=r===hitHero,radius=.63+(hero?1.06:.72)*p.scale+.12*side;
      for(let c=0;c<2;c++)for(let j=0;j<=4;j++){
        const u=j*.25,a=p.yaw+age*3.2+c*Math.PI+j*(hero?.47:.30),rad=radius*(j%2?.84:1.11);
        const dy=hero?(c?.10+.43*(j%2):.22+u*1.18+.36*(j%2)):.28+.25*(j%2);
        point(rayB,p.x+Math.sin(a)*rad,p.y+dy+.08*side,p.z+Math.cos(a)*rad);
        if(j)brightStroke(motor,rayA,rayB,hero?.085:.048,c?volt[1]:contact[0],alpha,false);
        rayA.set(rayB);
      }
    }
  }
  function paintImpactDebris(motor,r,p,age,detailed){
    const kind=r.impactKind,palette=hitColors[kind]||hitColors.hit;
    const banana=kind==='banana',shell=kind==='shell'||kind==='green',explosive=kind==='bomb'||kind==='spiny'||kind==='fireball';
    const f=unit(age/(banana?.72:explosive?.77:.56)),alpha=1-f*f;
    if(alpha<.03)return;
    const n=detailed?(explosive?11:8):4;
    const cx=r.impactX+(r.impactVX||0)*age*.53,cy=r.impactY,cz=r.impactZ+(r.impactVZ||0)*age*.53;
    if(detailed&&r===hitHero&&!banana&&f<.57){
      const tail=unit(1-f/.57),radius=(explosive?1.15:.70)+f;
      bloom(cx,cy+.52,cz,radius,radius*.68,palette[1],palette[0],tail*.91);
    }
    for(let j=0;j<n;j++){
      const a=r.impactYaw+j*2.39996+.28,dx=Math.sin(a),dz=Math.cos(a);
      const radius=.60+(explosive?4.1:2.4)*(1-(1-f)*(1-f))*(.69+(j%3)*.145);
      const x=cx+dx*radius,z=cz+dz*radius,y=cy+(banana?.13:.42)+(banana?.28:1.05+(j%3)*.3)*4*f*(1-f);
      const width=(banana?.13:shell?.14:.087)*(1-f*.77),length=(banana?.39:shell?.28:.51)*(1-.40*f);
      point(rayA,x,y,z);point(rayB,x+dx*length,y+(j%3-1)*.14*(1-f),z+dz*length);
      paintStroke(motor,rayA,rayB,width,shell?width*.62:.012,palette[0],alpha);
      rayA[1]+=.032;rayB[1]+=.032;
      paintStroke(motor,rayA,rayB,width*.53,.006,palette[1],alpha);
      if(shell&&detailed&&j%2===0){
        // Flat shell plates tumble beside the bright impact, with a pale cut rim.
        point(refPos,x,y,z);point(quad[0],x-dz*width,y+width,z+dx*width);
        tri(refPos,quad[0],rayB,palette[0],palette[1],palette[0],alpha,alpha,alpha*.72);
      }
    }
    if(banana&&detailed){
      for(let j=0;j<2;j++){
        const a=p.yaw,cs=Math.cos(a),sn=Math.sin(a),side=j?1:-1;
        point(rayA,p.x+cs*side*.70-sn*.63,p.y+.16,p.z-sn*side*.70-cs*.63);
        point(rayB,rayA[0]-sn*(.42+f*.54),rayA[1]+.09,rayA[2]-cs*(.42+f*.54));
        paintStroke(motor,rayA,rayB,.07,.015,palette[1],alpha*.82);
      }
    }
  }
  const puffRim=Array.from({length:7},v);
  const smokeColors=[C('#ffdb7c'),C('#e76639'),C('#673f4b'),C('#c9fcff'),C('#759dff'),C('#434574')];
  function paintItemWaves(motor,t){
    let seen=0;
    for(let i=itemBursts.length-1;i>=0&&seen<3;i--){
      const b=itemBursts[i],age=t-b.start;
      if(age<0||age>.52||!visible(motor,b.x,b.y,b.z,b.size))continue;
      seen++;
      const f=unit(age/.52),color=b.kind==='spiny'?3:0;
      const radius=b.size*(1-(1-f)*(1-f)),width=Math.min(radius,.12+.19*f),alpha=(1-f)*.94;
      const palette=hitColors[b.kind]||hitColors.bomb;
      for(let j=0;j<20;j++){
        const a=j*TAU/20,k=(j+1)*TAU/20;
        point(quad[0],b.x+Math.sin(a)*radius,b.y+.06,b.z+Math.cos(a)*radius);
        point(quad[1],b.x+Math.sin(a)*(radius-width),b.y+.12,b.z+Math.cos(a)*(radius-width));
        point(quad[2],b.x+Math.sin(k)*radius,b.y+.06,b.z+Math.cos(k)*radius);
        point(quad[3],b.x+Math.sin(k)*(radius-width),b.y+.12,b.z+Math.cos(k)*(radius-width));
        tri(quad[0],quad[1],quad[2],palette[1],palette[0],palette[1],alpha,alpha*.25,alpha);
        tri(quad[1],quad[3],quad[2],palette[0],palette[0],palette[1],alpha*.25,alpha*.25,alpha);
      }
      if(b.kind==='horn')continue;
      for(let j=0;j<6;j++){
        const a=j*TAU/6+.27,rad=b.size*(.09+.29*f),x=b.x+rad*Math.cos(a),z=b.z+rad*Math.sin(a);
        const y=b.y+.24+Math.sin(Math.PI*f)*(.55+(j%3)*.28),size=b.size*(.07+.095*f)*(j%2?.83:1);
        point(refPos,x,y,z);
        for(let k=0;k<7;k++){
          const theta=k*TAU/7+j*.52,sx=size*Math.cos(theta),sy=size*Math.sin(theta);
          point(puffRim[k],x+sx*cameraRight[0]+sy*cameraUp[0],y+sy*cameraUp[1],z+sx*cameraRight[2]+sy*cameraUp[2]);
        }
        const core=smokeColors[color+(f>.5?2:j%2)],rim=smokeColors[color+(f>.42?2:1)],alpha=.75*(1-f);
        for(let k=0;k<7;k++)tri(refPos,puffRim[k],puffRim[(k+1)%7],core,rim,rim,alpha,0,0);
      }
    }
  }
  function paintItemImpacts(motor,racers,t){
    if(!Array.isArray(racers))return;
    hitHero=racers[0];hitList.length=0;
    for(const r of racers){
      if(r.rescue||r.falling||r.done||r.hitPose?.frame!==poseFrame)continue;
      const d=Math.hypot(r.x-motor.cam.x,r.z-motor.cam.z);
      if(d>54)continue;
      const row=slots[hitList.length];if(!row)break;
      row.r=r;row.d=d;hitList.push(row);
    }
    if(!hitList.length)return;
    hitList.sort((a,b)=>a.d-b.d);const count=Math.min(5,hitList.length);
    if(hitList.length>count){
      const hero=hitList.findIndex(row=>row.r===racers[0]);
      if(hero>=count)hitList[count-1]=hitList[hero];
    }
    for(let i=count-1;i>=0;i--){
      const row=hitList[i],r=row.r,p=r.hitPose,rich=r===racers[0]||i<2;
      const shock=t-(r.strikeAt??-Infinity),hit=t-(r.impactAt??-Infinity);
      if(shock>=0&&shock<1.03)paintDischarge(motor,r,p,shock,rich);
      else if(hit>=0&&hit<.80&&r.impactKind!=='lightning')paintImpactDebris(motor,r,p,hit,rich);
    }
  }
  // Cache the driving-line chevrons in course coordinates. A mark is omitted
  // as a whole if any of its samples touches a gap or a stage finish.
  const guide={circuit:null,racer:null,key:-1,strips:[],shown:false,start:0,phase:'ahead'};
  const guideInk=C('#14243a'),guideIce=C('#60dcf1'),guideGold=C('#ffd06d'),guideRuby=C('#ff8493');
  const guideCoords=[[-.93,-.72],[-.93,-.17],[0,.72],[0,.14],[.93,-.72],[.93,-.17]];
  function pace(circuit,racer,note){
    if(!circuit||!racer){guide.shown=false;return}
    if(guide.circuit!==circuit||guide.key!==note.turnKey||guide.racer!==racer){
      guide.circuit=circuit;guide.key=note.turnKey;guide.racer=racer;guide.start=note.time;guide.strips.length=0;
      const bend=circuit.paceTurns?.find(b=>b.start===note.turnKey);
      if(!bend){guide.shown=false;return}
      const direction=bend.dir==='left'?-1:1;
      const spread=Math.min(4.8,Math.max(2.2,bend.length*.22)),scale=clamp(circuit.width(bend.start)*.19,.77,1.32);
      for(let k=0;k<3;k++){
        const station=bend.start+(k-.55)*spread,lane=direction*scale*(1.04+k*.48);
        const strip=[];
        for(let layer=0;layer<2;layer++)for(const [across,along] of guideCoords){
          const width=layer?.84:1,lead=layer?.035:0;
          const s=station+(along*width+lead)*scale*1.64,l=lane+(across+direction*along*.72)*width*scale;
          if(circuit.d.stages&&(s<0||s>=circuit.L*circuit.finishFraction))break;
          const p=circuit.at(s,l);p.s=s;p.l=l;p.w=circuit.width(s);
          if(circuit.gap(p))break;
          strip.push({x:p.x,y:p.y+circuit.lift(p)+.091,z:p.z,f:p.f});
        }
        if(strip.length===12)guide.strips.push(strip);
      }
    }
    guide.phase=note.turnPhase;guide.shown=true;
  }
  const guidePoints=Array.from({length:12},v);
  function paintGuide(motor,info,t){
    if(!guide.shown||info.raceKey?.[0]!==guide.racer||guide.racer.rescue||guide.racer.falling||guide.racer.spin||guide.racer.wingOpen>.35)return;
    const fade=unit((t-guide.start)*6+.28),col=guide.phase==='ahead'?guideIce:guide.phase==='near'?guideGold:guideRuby;
    for(let j=0;j<guide.strips.length;j++){
      const strip=guide.strips[j],p=strip[2];
      if(!visible(motor,p.x,p.y,p.z,2))continue;
      for(let k=0;k<12;k++){
        const q=strip[k],lift=guide.circuit.d.impactLift?.(q.f,t)||0;
        point(guidePoints[k],q.x,q.y+lift,q.z);
      }
      const alpha=fade*(.76+j*.065);
      for(let layer=0;layer<2;layer++){
        const n=6*layer,P=guidePoints,head=layer?volt[2]:guideInk,tail=layer?col:guideInk;
        const a=alpha*(layer?1:.82);
        tri(P[n],P[n+1],P[n+2],tail,tail,head,a,a,a);
        tri(P[n],P[n+2],P[n+3],tail,head,head,a,a,a);
        tri(P[n+3],P[n+2],P[n+5],head,head,tail,a,a,a);
        tri(P[n+3],P[n+5],P[n+4],head,tail,tail,a,a,a);
      }
    }
  }
  let raceKey,lastTheme='',lastTime=-1;
  function clear(){for(const r of marks)r.life=0;for(const p of particles)p.life=0;for(const e of emitters.values()){e.last=-1;e.feetN=0;e.live=false}lastTime=-1}
  // Rehearse the real effect branches offscreen in idle slices. In particular,
  // allocating a stream does not compile the first-use JS paths for a plume,
  // ribbon, discharge or a hovering wheel.
  let rehearsalStep=0,rehearsing=false,probe=null;
  function rehearse(){
    if(rehearsalStep>=3)return true;
    if(!probe){
      const r={id:0,x:0,z:0,strikeYaw:0,impactYaw:0,impactX:0,impactY:0,impactZ:0};
      const wheels=[-1,1].map(side=>({x:side*.9,y:.1,z:-.91,width:.37,side,roadY:0,surface:'ice'}));
      const outlets=[-1,1].map(side=>({x:side*.44,y:.56,z:-1.25,dx:0,dy:0,dz:-1,radius:.15}));
      probe={motor:{cam:{x:0,y:3,z:-7},s:0,c:1,cp:1,sp:0,asp:1.7,f:1,drawFX(){}},
        info:{raceKey:[r],screen:'race',speed:90,slip:.29,driftBlend:.85,driftLevel:3,theme:'ice',surface:'ice',
          grounded:true,boost:true,boostStrength:1,car:{x:0,y:.1,z:0,yaw:0},sockets:{wheels,outlets}},r};
    }
    const info=probe.info,r=probe.r,start=80+rehearsalStep;
    const rng=seed;rehearsing=true;
    for(let j=0;j<3;j++){
      const t=start+j*.06;r.strikeAt=rehearsalStep===1?t-.08:-Infinity;r.impactAt=t-.07;r.impactKind='shell';
      r.hitPose={x:0,y:.1,z:0,yaw:0,scale:.9,frame:typeof poseFrame==='number'?poseFrame:0};
      info.car.z=j*.94;for(const w of info.sockets.wheels)w.z=info.car.z-.91;
      draw(probe.motor,info,t);
    }
    clear();seed=rng;rehearsing=false;rehearsalStep++;
    if(rehearsalStep===3)probe=null;
    return rehearsalStep===3;
  }
  function prepare(renderer,fleet=[]){
    for(let i=0;i<fleet.length;i++){const key=i?fleet[i].id:-1;if(!emitters.has(key))emitters.set(key,makeEmitter())}
    // Do not replace a live race if a renderer is restored outside the grid.
    const cpuReady=lastTime>=0||rehearse();
    const streamReady=renderer.prepareFX?.(batch.d.byteLength)??true;
    return cpuReady&&streamReady;
  }
  function draw(motor,info,t){
    if(!motor||!motor.cam||!info||typeof motor.drawFX!=='function')return;
    const grid=info.screen==='countdown',driving=grid||info.screen==='race';
    if(!driving&&info.screen!=='finish'){if(lastTime>=0)clear();return}
    const tireTime=grid?Math.max(0,info.gridTime||0):3.45+t;
    if(raceKey!==info.raceKey||lastTheme!==info.theme||tireTime<lastTime){clear();raceKey=info.raceKey;lastTheme=info.theme}
    const dt=lastTime<0?0:limit(tireTime-lastTime,0,.1);lastTime=tireTime;
    flames.length=0;batch.n=0;
    if(!rehearsing&&info.car&&typeof track!=='undefined'&&track?.d.drawWaterReflections)track.d.drawWaterReflections(motor,t,tri);
    if(driving){
      update(info,tireTime,dt,true);
      if(info.rivals)for(const other of info.rivals)if(other)update(other,tireTime,dt,false);
    }
    let jetVertices=0;
    for(const e of flames){
      e.jetDepth=(e.jetCar.x-motor.cam.x)*motor.s+(e.jetCar.z-motor.cam.z)*motor.c;
      jetVertices+=e.nozzles.length*(e.own?180:150);
    }
    flames.sort((a,b)=>b.jetDepth-a.jetDepth);
    if(info.screen==='race')paintGuide(motor,info,t);
    point(cameraRight,motor.c,0,-motor.s);point(cameraUp,-motor.s*motor.sp,motor.cp,-motor.c*motor.sp);
    drawMarks(motor,tireTime);
    if(info.screen==='race'){
      if(info.starLight)paintStarLight(motor,info);
      if(info.rivals)for(const other of info.rivals)if(other?.starLight)paintStarLight(motor,other);
    }
    if(driving)for(const e of emitters.values()){
      if(batch.n+360>roadBudget-jetVertices)break;
      paintWheelLight(motor,e,tireTime);
    }
    drawParticles(motor,dt,roadBudget-jetVertices);
    for(const e of flames){
      for(let j=0;j<e.nozzles.length;j++){const w=e.nozzles[j];
        if(batch.n+(e.own?180:150)>roadBudget)break;
        if(visible(motor,w.x,w.y,w.z,1.65)){
          flame(w,t,j*2.4+(e.own?0:1.7),e.jet,e.kick,e.coolJet?jetIce:jetColor);
          jetCrown(motor,w,t,j,e);
        }
      }
    }
    if(info.screen==='race'){if(!rehearsing)paintItemWaves(motor,t);paintItemImpacts(motor,info.raceKey,t)}
    if(batch.n)motor.drawFX(batch);
  }
  return {draw,pace,prepare};
})();
function roadEffectsWorld(motor,info,t){RubyRoadFX.draw(motor,info,t)}
