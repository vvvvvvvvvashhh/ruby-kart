// Wii U Triforce Cup. The eight bends below follow the centers on the 480 px race map.
// https://www.mariowiki.com/File:MK8_SNES_Rainbow_Road_Map.png
// Scene reference (Nintendo Music): https://image-assets.m.nintendo.com/64b18f2e-693d-4971-a40e-a973aa0c36a1?im=a
function rainbowDefinition(){
  const half=7.6, scale=.68, points=[], start=[60,182];
  const corners=[[60,59],[337,59],[337,154],[195,154],[195,239],[420,239],[420,422],[60,422]];
  const radii=[15,14,14,13,14,15,15,14];
  const world=p=>[(p[0]-start[0])*scale,(start[1]-p[1])*scale];
  const push=p=>points.push(world(p));
  let last=start.slice();
  function line(end){
    const n=Math.max(1,Math.ceil(Math.hypot(end[0]-last[0],end[1]-last[1])/4));
    for(let i=1;i<=n;i++)push([last[0]+(end[0]-last[0])*i/n,last[1]+(end[1]-last[1])*i/n]);
    last=end;
  }
  push(start);
  for(let i=0;i<corners.length;i++){
    const b=corners[i],a=i?corners[i-1]:start,c=corners[i+1]||start;
    const d1=Math.hypot(b[0]-a[0],b[1]-a[1]),d2=Math.hypot(c[0]-b[0],c[1]-b[1]);
    const u=[(b[0]-a[0])/d1,(b[1]-a[1])/d1],v=[(c[0]-b[0])/d2,(c[1]-b[1])/d2],r=radii[i];
    const enter=[b[0]-u[0]*r,b[1]-u[1]*r],center=[enter[0]+v[0]*r,enter[1]+v[1]*r];
    line(enter);
    for(let k=1;k<=12;k++){const h=k*Math.PI/24;
      last=[center[0]-v[0]*r*Math.cos(h)+u[0]*r*Math.sin(h),center[1]-v[1]*r*Math.cos(h)+u[1]*r*Math.sin(h)];push(last)}
  }
  line(start);points.pop();
  let Lref=0;const odometer=[0];
  for(let i=1;i<=points.length;i++){let a=points[i-1],b=points[i%points.length];Lref+=Math.hypot(b[0]-a[0],b[1]-a[1]);odometer[i]=Lref}
  function frac(x,y){const target=world([x,y]);let best=1e20,s=0;
    for(let i=0;i<points.length;i++){let a=points[i],b=points[(i+1)%points.length],dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((target[0]-a[0])*dx+(target[1]-a[1])*dz)/(dx*dx+dz*dz))),d=(a[0]+u*dx-target[0])**2+(a[1]+u*dz-target[1])**2;if(d<best){best=d;s=odometer[i]+Math.hypot(dx,dz)*u}}return s/Lref}
  const F=corners.map(p=>frac(...p)),gap0=frac(283,422),gapa=frac(273,422),gapb=frac(247,422),gap1=frac(242,422);
  const gaps=[{f0:gap0,f1:gapa,l0:-1.65,l1:1.65},{f0:gapa,f1:gapb,l0:-2.58,l1:2.58},{f0:gapb,f1:gap1,l0:-1.65,l1:1.65}];
  const ramps=[{f:frac(244,154),l0:1.65,l1:5.45,length:4.2,rise:.9},{f:frac(206,239),l0:-6.3,l1:-2.95,length:4.5,rise:1.10},{f:gap0,l0:-1.66,l1:1.66,length:4.4,rise:1.24}];
  const thwomps=[
    {f:frac(265,59),l:0,phase:.29},
    {f:frac(265,239),l:-2.8,phase:1.48},{f:frac(315,239),l:2.8,phase:2.2},
    {f:frac(259,422),l:-4.7,phase:.32,scale:.82},{f:frac(259,422),l:4.7,phase:2.25,scale:.82},
    {f:frac(60,335),l:-3.3,phase:1.12,scale:.82},{f:frac(60,312),l:3.3,phase:2.55,scale:.82}
  ];
  const bell=(f,c,w)=>Math.exp(-Math.pow((f-c)/w,2));
  const narrow0=frac(389,422),narrow1=frac(332,422);
  function width(f){const edge=.008,inward=Math.max(0,Math.min(1,(f-narrow0)/edge,(narrow1-f)/edge));return half-1.46*inward}
  function height(f){return 8.8+2.1*bell(f,F[0],.044)+3.6*bell(f,F[2],.054)+2.7*bell(f,F[4],.047)+9.4*bell(f,(F[5]+F[6])*.5,.089)-1.2*bell(f,F[7],.045)}
  function bank(f){return -(.11*bell(f,F[0],.019)+.105*bell(f,F[1],.018)+.105*bell(f,F[2],.018)-.12*bell(f,F[3],.018)-.14*bell(f,F[4],.019)+.24*bell(f,F[5],.024)+.28*bell(f,F[6],.028)+.105*bell(f,F[7],.019))}
  function surfaceLift(f,l){for(const p of ramps){let d=(p.f-f)*Lref;if(d>=0&&d<=p.length&&l>=p.l0&&l<=p.l1)return p.rise*(1-d/p.length)}return 0}
  function impactLift(f,t){
    let lift=0;
    for(let h of thwomps){let d=Math.abs(f-h.f)*Lref;if(d>23.5)continue;
      let age=((t+h.phase)%4.6+4.6)%4.6,front=age*18.5;if(age>1.52)continue;
      let fade=Math.min(1,age*12)*Math.max(0,1-d/23.5),crest=Math.exp(-((d-front)**2)/8.2),trailing=Math.exp(-((d-front+5.4)**2)/6.2);
      lift=Math.max(lift,fade*(.83*crest+.19*trailing));
    }
    return lift
  }
  const spectrum=['#f05579','#ff9759','#f4de75','#a8df77','#4dd4a7','#6cd8e6','#718bf1','#b580eb'];
  function shade(col,k,extra=0){let n=parseInt(col.slice(1),16);return '#'+[(n>>16)&255,(n>>8)&255,n&255].map(x=>Math.min(255,Math.max(0,Math.round(x*k+extra))).toString(16).padStart(2,'0')).join('')}
  const panelTiles=new Map();
  function build(api){
    const {L,at,pt,add}=api,tw=half/4;
    const startWalls=new RoadSurfaceIndex();
    const q=(g,a,b,c,d,col)=>g.quad(a,b,c,d,col);
    let state=0xa8120fff;const rand=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
    function localChunk(s,dynamic=false,span=1.40){
      let origin=at(s,0),g=new Geo(),yaw=dynamic?origin.yaw:0,co=Math.cos(yaw),si=Math.sin(yaw);
      const p=(s,l,h=0)=>{let a=pt(s,l,h),x=a[0]-origin.x,z=a[2]-origin.z;return [x*co-z*si,a[1]-origin.y,z*co+x*si]};
      const anim=dynamic?t=>{
        const a=impactLift((s-span/2)/L,t),b=impactLift((s+span/2)/L,t);
        return {y:(a+b)*.5,pitch:Math.atan2(b-a,span)}
      }:null;
      return {g,p,flush:(r=23)=>add(g,origin.x,origin.y,origin.z,yaw,1,r,anim)};
    }
    // Tiny RGB emitters sit below a tinted, bevelled cover. Bake nine reusable atlas
    // panels once; the race never needs image files or external requests.
    function panelUV(paint){
      if(panelTiles.has(paint))return panelTiles.get(paint);
      if(typeof ac==='undefined'||!ac.createImageData||!ac.putImageData)return null;
      const data=ac.createImageData(256,64);if(!data||!data.data)return null;
      const uv=atlasTag('R8 panel '+paint,'#ffffff'),ox=Math.floor(uv[0]*atlas.width),oy=Math.floor(uv[1]*atlas.height);
      let n=parseInt(paint.slice(1),16),base=[(n>>16)&255,(n>>8)&255,n&255];
      const px=data.data;
      for(let y=0;y<64;y++)for(let x=0;x<256;x++){
        const u=(x+.5)/256,v=(y+.5)/64,dx=(u*9)%1-.5,dy=(v*9)%1-.5;
        const diode=Math.exp(-(dx*dx+dy*dy)*12),edge=Math.min(u,1-u,v,1-v);
        const facing=(u<.5?u:1-u)<(v<.5?v:1-v)?u<.5:v<.5;
        const gloss=Math.exp(-((u*.47+v-.40)**2)/.024);
        // Lead came, a bright bevel, then the coloured crystal. The shine
        // and fasteners occupy the panel's own texels, even on the CPU path.
        let m=.75+.072*diode+.065*gloss+.020*Math.cos((u-v)*6.28),gleam=7+18*gloss;
        if(edge<.018){m=.40;gleam=8}
        else if(edge<.045){m=facing?.88:.61;gleam=facing?44:8}
        const copper=(Math.min(u,1-u)-.078)**2+(Math.min(v,1-v)-.078)**2;
        if(copper<.00020){m=copper<.000047?.74:.48;gleam=copper<.000047?54:13}
        // A silkscreen circuit trace hugs two corners below the glass.
        if(edge>.11&&edge<.122&&Math.abs(u-v)>.44){m=.75;gleam=28}
        let k=(y*256+x)*4;for(let j=0;j<3;j++)px[k+j]=Math.min(255,Math.round(base[j]*m+gleam));px[k+3]=255;
      }
      ac.putImageData(data,ox,oy);
      const corners=[[uv[0],uv[3]],[uv[2],uv[3]],[uv[2],uv[1]],[uv[0],uv[1]]];panelTiles.set(paint,corners);return corners;
    }
    const pigments=[...spectrum,'#e5eaff'];
    const glass=new Map(pigments.map(paint=>[paint,panelUV(paint)]));
    const averages=new Map(pigments.map(paint=>[paint,shade(paint,.76,11)]));
    const edges=[0,L]; const rows=Math.round(L/1.9);
    for(let i=1;i<rows;i++)edges.push(i*L/rows);
    for(let h of gaps)edges.push(h.f0*L,h.f1*L);
    edges.sort((a,b)=>a-b);const breaks=edges.filter((s,i)=>i===0||s-edges[i-1]>.035);
    for(let first=0;first<breaks.length-1;){
      const affected=s=>thwomps.some(h=>Math.abs(s-h.f*L)<25.4);
      const dynamic=affected(breaks[first]);let end=first+1;
      while(!dynamic&&end<breaks.length-1&&end<first+9&&!affected(breaks[end]))end++;
      const {g,p,flush}=localChunk((breaks[first]+breaks[end])/2,dynamic,breaks[end]-breaks[first]);
      // One inset structural plate casts the bridge shadow. Tiny glass seams
      // and outer trim share this plate and never cast onto one another.
      const caster=g.shadowHull=new Geo();
      for(let row=first;row<end;row++){
        const a=breaks[row],b=breaks[row+1],s=(a+b)/2,f=s/L,wa=width(a/L),wb=width(b/L),w=width(f);
        const hole=gaps.find(v=>f>=v.f0&&f<v.f1), intervals=hole?[[-1,hole.l0/w],[hole.l1/w,1]]:[[-1,1]];
        for(const [u0,u1] of intervals){
          g.mat=4;
          q(caster,p(a,wa*u0,-.32),p(a,wa*u1,-.32),p(b,wb*u1,-.32),p(b,wb*u0,-.32),'#49424e');
          q(g,p(b,wb*u0,-.94),p(b,wb*u1,-.94),p(a,wa*u1,-.94),p(a,wa*u0,-.94),'#292744');
          let llines=[u0];for(let j=1;j<8;j++){let u=-1+j/4;if(u>u0+.002&&u<u1-.002)llines.push(u)}llines.push(u1);
          for(let j=0;j+1<llines.length;j++){
            // Grout and bevels are inside the texture. Flush panels share every
            // vertex with the neighboring panel, rim or authored hole.
            const A=llines[j],B=llines[j+1],outerL=A===-1?.18:0,outerR=B===1?.18:0;
            const aa=A*wa+outerL,ab=B*wa-outerR,ba=A*wb+outerL,bb=B*wb-outerR;
            const middle=at(s,w*(A+B)/2);
            let colidx=((Math.floor((middle.x+.14*middle.z+9.47)/tw)+8000)%8);
            if(Math.abs(Math.sin(middle.yaw))>.78)colidx=((Math.floor(s/tw+1.5)+8000)%8);
            let paint=spectrum[colidx],white=thwomps.some(t=>Math.abs(t.f*L-s)<2.25&&Math.abs(t.l-w*(A+B)/2)<2.55*(t.scale||1));
            if(white)paint='#e5eaff';
            // Store a much wider run of colour for footprints spanning several
            // adjacent panes. Its phase is constant across each face.
            // Leave a guard below the next material ID on mediump mobile shaders.
            const glassPhase=Math.min(.99,(s*.017+(A+B)*.052+1)%1);g.mat=8+glassPhase;
            const a1=p(a,aa,0),a2=p(a,ab,0),b2=p(b,bb,0),b1=p(b,ba,0),uv=glass.get(paint);
            if(uv)g.face(a1,a2,b2,b1,averages.get(paint),null,uv);
            else q(g,a1,a2,b2,b1,shade(paint,.91+.077*((row*7+j*13)%9)/8));
            // The metal return below each floating module catches the color of the neighboring panel.
            for(let edge of [0,1]){const u=edge?B:A;if(Math.abs(u-u0)>.0001&&Math.abs(u-u1)>.0001)continue;
              const lip=Math.abs(u)===1?Math.sign(u)*.08:0,la=u*wa+lip,lb=u*wb+lip;
              const band=(top,bottom,kind,col)=>{g.mat=kind;q(g,p(a,la,top),p(b,lb,top),p(b,lb,bottom),p(a,la,bottom),col)};
              band(0,-.21,10+glassPhase,shade(paint,.46,9));
              band(-.21,-.55,11+glassPhase,shade(paint,.72,7));
              band(-.55,-.94,10+glassPhase,shade(paint,.39,5));
            }
          }
        }
        for(let side of [-1,1]){
          // A single rim face meets the glass exactly. Alternate the alloy
          // tint along its length rather than stacking tiny moving decals.
          g.mat=4;
          q(g,p(a,side*(wa-.18),0),p(a,side*(wa+.08),0),p(b,side*(wb+.08),0),p(b,side*(wb-.18),0),
            row%6===0?'#b6afb4':'#a9a1ae');
        }
      }
      flush(dynamic?12:25);first=end
    }
    for(const ramp of ramps){
      const lip=ramp.f*L,a=lip-ramp.length,{g,p,flush}=localChunk(lip),l=ramp.l0,r=ramp.l1,v=ramp.rise;
      g.mat=4;q(g,p(a,l,.02),p(a,r,.02),p(lip,r,v),p(lip,l,v),'#6d456d');q(g,p(lip,l,0),p(lip,r,0),p(lip,r,v),p(lip,l,v),'#92849b');
      for(let k=0;k<5;k++){let b=a+k*ramp.length/5,c=a+(k+1)*ramp.length/5;
        let y=x=>.035+(x-a)/ramp.length*v;g.mat=2;
        q(g,p(b,l+.07,y(b)),p(b,r-.07,y(b)),p(c-.045,r-.07,y(c-.045)),p(c-.045,l+.07,y(c-.045)),['#8bd8ff','#cca9ff','#edb2ed','#ffb28f','#ffec9c'][k]);
      }
      flush(9)
    }
    // The original banner is supported outside the racing deck. Each letter is separate.
    function star(g,x,y,z,r,color,eyes=true){
      const face=[],back=[];for(let i=0;i<10;i++){let a=Math.PI/2+i*Math.PI/5,r0=r*(i%2?.47:1);face.push([x+Math.cos(a)*r0,y+Math.sin(a)*r0,z-r*.18]);back.push([x+Math.cos(a)*r0,y+Math.sin(a)*r0,z+r*.16])}
      for(let i=0;i<10;i++){let j=(i+1)%10;g.tri([x,y,z-r*.29],face[i],face[j],shade(color,i%2?.94:1,.0));g.quad(face[i],back[i],back[j],face[j],shade(color,.64,8))}
      if(eyes)for(let k of [-1,1]){g.ell(x+k*r*.155,y+.047*r,z-r*.29,.061*r,.146*r,.038*r,'#483b52',8,4);g.ell(x+k*r*.155-r*.014,y+r*.103,z-r*.323,.022*r,.041*r,.012*r,'#fffdf2',6,3)}
    }
    let gate=new Geo();
    for(let side of [-1,1]){
      let x=side*(half+1.28);
      gate.mat=4;gate.box(x,.17,0,2.22,.42,2.95,'#8a8eb2');
      gate.box(x,.66,0,1.87,.7,2.55,'#bfc6cd');
      gate.box(x,3.18,0,.9,4.63,1.07,'#aaa0bd');
      for(let j=0;j<5;j++){gate.mat=2;gate.box(x,1.28+j*.86,-.57,.90,.52,.13,spectrum[(j+(side>0?2:0))%8])}
      gate.mat=4;gate.tube(x,5.45,0,x-side*1.88,7.14,0,.49,.48,'#c8ced0',8);
      for(let j=0;j<3;j++){gate.mat=2;gate.box(x-side*j*.59,5.64+j*.50,-.35,.81,.73,.56,spectrum[(j+(side>0?0:3))%8])}
    }
    gate.mat=4;gate.box(0,6.42,.38,14.4,.63,.75,'#47435f');
    const glyphs={M:['10001','11011','10101','10101','10001','10001','10001'],A:['01110','10001','10001','11111','10001','10001','10001'],R:['11110','10001','10001','11110','10100','10010','10001'],I:['111','010','010','010','010','010','111'],O:['01110','10001','10001','10001','10001','10001','01110'],K:['10001','10010','10100','11000','10100','10010','10001'],T:['11111','00100','00100','00100','00100','00100','00100']};
    const logo='MARIO KART',unit=.264,size=Array.from(logo).reduce((n,c)=>n+(c===' '?2:glyphs[c][0].length+1),0)-1;
    let gx=-size*unit*.5;
    Array.from(logo).forEach((letter,k)=>{
      if(letter===' '){gx+=unit*2;return}let matrix=glyphs[letter],w=matrix[0].length,color=['#fc684f','#ffd04d','#7be57e','#63bcfc','#e8a555','#73d2fc','#93db6d','#fb716e','#ffcc5f','#7abdfa'][k];let lift=.35*(1-Math.abs((k-4.5)/4.5));
      for(let r=0;r<matrix.length;r++){const row=matrix[r];for(let j=0;j<w;){if(row[j]!=='1'){j++;continue}let h=j;while(h<w&&row[h]==='1')h++;let x=gx+(j+h-1)*unit/2,y=6.25+(6-r)*unit+lift;gate.mat=4;gate.box(x,y,.02,(h-j)*unit+.095,unit+.09,.63,'#4c3f63');gate.mat=2;gate.box(x,y,-.325,(h-j)*unit-.005,unit-.007,.09,shade(color,1-r*.024));j=h}}gx+=(w+1)*unit;
    });
    for(let side of [-1,1])for(let j=0;j<4;j++){gate.mat=2;gate.box(side*(1.62+j*.73),8.73-j*.28,.2,.80,.80,.78,spectrum[(j+(side>0?2:5))%8])}
    gate.mat=5;star(gate,0,9.24,0,1.38,'#ffdf62');
    const startAt=at(0);add(gate,startAt.x,startAt.y,startAt.z,startAt.yaw,1,15);
    for(const side of [-1,1]){
      const x=side*(half+1.28);
      api.solidLocal(startAt,startAt.yaw,x,-.04,0,{tag:'rainbowGateFoot',halfX:1.11,halfZ:1.475,h:.42});
      api.solidLocal(startAt,startAt.yaw,x,.31,0,{tag:'rainbowGatePlinth',halfX:.935,halfZ:1.275,h:.70});
      api.solidLocal(startAt,startAt.yaw,x,.865,0,{tag:'rainbowGateMast',halfX:.45,halfZ:.535,h:4.63});
    }
    api.solidLocal(startAt,startAt.yaw,0,6.105,.38,{tag:'rainbowGateSpan',halfX:7.2,halfZ:.375,h:.63});
    // Short raised wall sections are unique to the start line on this course.
    {let {g,p,flush}=localChunk(0);for(let s=-6;s<7;s+=1)for(let side of [-1,1]){
      let low=side*(half+.12),high=side*(half+1.8),y=s< -4?(.26+(s+6)*.26):s>4?1.01-(s-4)*.22:1.02;
      g.mat=4;q(g,p(s,low,0),p(s+1,low,0),p(s+1,low,y),p(s,low,y),s%2?'#7285a7':'#8b96b0');q(g,p(s,low,y),p(s+1,low,y),p(s+1,high,y),p(s,high,y),'#b8bcd2');
      startWalls.addFace(pt(s,low,y),pt(s+1,low,y),pt(s+1,high,y),pt(s,high,y));
    }flush(17)}
    // Curved return shell, recessed eyes, stony brows, relief-cut teeth and a colored mosaic.
    const th=new Geo();
    const ww=2.18,hh=4.62,dep=1.61,be=.37;
    function profile(w,d){let a=.32;return [[-w+a,-d],[w-a,-d],[w,-d+a],[w,d-a],[w-a,d],[-w+a,d],[-w,d-a],[-w,-d+a]]}
    let loops=[[0,ww-.23,dep-.17],[.28,ww,dep],[hh-.35,ww,dep],[hh,ww-.26,dep-.21]].map(([y,w,d])=>profile(w,d).map(p=>[p[0],y,p[1]]));
    th.mat=4;for(let j=0;j+1<loops.length;j++)for(let i=0;i<8;i++){let k=(i+1)%8;q(th,loops[j][i],loops[j][k],loops[j+1][k],loops[j+1][i],['#9595a1','#777a8d','#727a89','#777d8c','#9b9ba7','#9599a8','#9298a3','#b1acb1'][i])}
    for(let j of [0,3])for(let i=0;i<8;i++)th.tri([0,j?hh:0,0],loops[j][i],loops[j][(i+1)%8],j?'#b6b5c6':'#66677c');
    let facetColors=['#d7c4d6','#a3a4b4','#b6b4c7','#acaaca','#e2d9bf','#9bafcc','#bec7c6','#c0afc5'];
    for(let zsign of [-1,1]){
      let z=zsign*(dep+.012);
      for(let a=0;a<10;a++)for(let k=0;k<11;k++){let x=-1.83+a*.372,y=.28+k*.369,pick=(a*13+k*7+(a*k)%11)%8;let accent=(k===2||k===7)&&a%3!==0;
        let c=accent?shade(spectrum[(a+k)%8],.38,94):shade(facetColors[pick],.80+((k*3+a*7)%9)*.023);
        q(th,[x,y,z],[x+.357,y,z],[x+.357,y+.352,z],[x,y+.352,z],c)}
      let zz=zsign*(dep+.059),pp=(x,y,d=0)=>[x,y,zz+zsign*d];
      for(let a of [-1,1]){
        let eye=shape=>shape.map(k=>pp(k[0]*a,k[1],k[2]||0));let V=eye([[.18,2.51],[1.52,3.02],[1.3,1.98],[.32,1.94]]);q(th,...V,'#302c45');
        V=eye([[.37,2.42,.011],[1.31,2.77,.011],[1.14,2.17,.011],[.48,2.08,.011]]);q(th,...V,'#fff2e1');
        th.ell(a*.66,2.36,zz+zsign*.05,.17,.27,.065,'#ad4059',9,5);th.ell(a*.64,2.34,zz+zsign*.095,.085,.174,.044,'#343046',8,4);
        V=eye([[.04,2.63,.12],[1.51,3.32,.12],[1.83,3.06,.12],[.27,2.37,.12]]);q(th,...V,'#9d8f9c');
        V=eye([[.03,2.77,.14],[1.43,3.46,.14],[1.61,3.31,.14],[.19,2.62,.14]]);q(th,...V,'#d4ccd2');
        V=eye([[1.43,2.38,.06],[1.81,2.64,.06],[1.72,1.46,.06],[1.29,1.62,.06]]);q(th,...V,'#c4bbc2');
      }
      q(th,pp(-1.22,.69,.07),pp(-.90,1.47,.07),pp(.85,1.47,.07),pp(1.22,.69,.07),'#4b3a4d');
      for(let j=0;j<6;j++){let x=-.96+j*.32,top=1.38-.12*Math.abs(j-2.5)/2.5;th.tri(pp(x,top,.08),pp(x+.30,top,.08),pp(x+.16,top-(j%2?.33:.25),.08),'#f1e8d9');th.tri(pp(x+.02,.76,.08),pp(x+.30,.76,.08),pp(x+.17,.98,.08),'#d4d4cc')}
    }
    for(let h of thwomps){
      const p=at(h.f*L,h.l),sc=h.scale||1,move=t=>({y:api.thwompHeight(t,h.phase)});
      add(th,p.x,p.y+.03,p.z,p.yaw,sc,7,move);
      h.physical=true;
      api.solid(p.x,p.y+.03,p.z,{tag:'thwomp',hazard:'石咚咚',yaw:p.yaw,halfX:ww*sc,halfZ:dep*sc,h:hh*sc,anim:move});
      const spots=new Geo();spots.castsShadow=false;spots.mat=5;
      for(let k=0;k<6;k++){let a=TAU*k/6,r=2.8+(k%2)*.38;star(spots,Math.sin(a)*r,.3+k%3*.7,Math.cos(a)*r,.095+.025*(k%3),spectrum[(k*3)%8],false)}
      add(spots,p.x,p.y+.1,p.z,0,sc,6,t=>({y:.6+api.thwompHeight(t,h.phase)+.17*Math.sin(3*t),yaw:t*.44}));
      const stamp=new Geo();stamp.mat=2;
      for(let a of [-1,1])for(let b of [-1,1]){stamp.box(a*1.97,.025,b*1.52,.59,.03,.08,'#d7dcff');stamp.box(a*2.20,.026,b*1.32,.08,.03,.44,'#d7dcff')}
      add(stamp,p.x,p.y+.032,p.z,p.yaw,sc,5);
      // A fresh ring follows the descending block, then dissipates beneath the deck.
      const ring=new Geo();ring.castsShadow=false;ring.mat=2;for(let k=0;k<32;k++){let a=k*TAU/32,b=(k+1)*TAU/32,r=2.54;
        q(ring,[r*Math.sin(a),0,r*Math.cos(a)],[r*Math.sin(b),0,r*Math.cos(b)],[(r+.13)*Math.sin(b),0,(r+.13)*Math.cos(b)],[(r+.13)*Math.sin(a),0,(r+.13)*Math.cos(a)],spectrum[k%8])}
      add(ring,p.x,p.y+.07,p.z,0,sc,5,t=>{const y=api.thwompHeight(t,h.phase);return {y:y<1.5?Math.max(.05,y+.07):-80,yaw:t*.3}})
    }
    // Glass navigation fins float outside the apex. Long slashes
    // point into the bend while the little star chart identifies the sector.
    const navTile=finishTile('rainbow/navigation',(c,w,h)=>{
      c.fillStyle='#232950';c.beginPath();c.moveTo(5,6);c.lineTo(234,6);c.lineTo(253,32);c.lineTo(228,58);c.lineTo(5,58);c.closePath();c.fill();
      c.strokeStyle='#9eabff';c.lineWidth=2;c.stroke();
      c.strokeStyle='#6885b9';c.lineWidth=1.5;c.beginPath();c.moveTo(13,43);c.lineTo(34,21);c.lineTo(50,37);c.lineTo(75,16);c.stroke();
      c.fillStyle='#ffe3a9';for(const [x,y] of [[13,43],[34,21],[50,37],[75,16]]){c.beginPath();c.arc(x,y,2.5,0,TAU);c.fill()}
      for(let k=0;k<3;k++){
        const x=96+k*42;c.fillStyle=['#b1b7fa','#7ee8ef','#f5f9d3'][k];c.beginPath();
        c.moveTo(x,14);c.lineTo(x+16,14);c.lineTo(x+35,32);c.lineTo(x+16,50);c.lineTo(x,50);c.lineTo(x+19,32);c.closePath();c.fill();
      }
    });
    for(let i=0;i<F.length;i++){
      const s=F[i]*L-6,dir=(i===3||i===4)?-1:1,turn=at(s,-dir*(width(F[i])+2.9)),panel=new Geo();
      panel.mat=2;panel.face([-2.42,1.36,0],[2.42,1.36,0],[2.42,-.05,0],[-2.42,-.05,0],'#ffffff',null,
        [[navTile[dir>0?0:2],navTile[1]],[navTile[dir>0?2:0],navTile[1]],[navTile[dir>0?2:0],navTile[3]],[navTile[dir>0?0:2],navTile[3]]]);
      add(panel,turn.x,turn.y+1.55,turn.z,turn.yaw,1,5);
    }
    const env=new Geo();const cx=119,cz=-45;
    function groundY(x,z){return -40+.56*Math.sin(x*.021+z*.012)+.42*Math.cos(z*.031-x*.018)}
    const ngrid=18,grid=39;for(let i=-ngrid/2;i<ngrid/2;i++)for(let j=-ngrid/2;j<ngrid/2;j++){
      const V=(a,b)=>{let x=cx+a*grid,z=cz+b*grid;return [x,groundY(x,z),z]};
      let a=V(i,j),b=V(i+1,j),c=V(i+1,j+1),d=V(i,j+1),t=rand();env.tri(a,b,c,t>.6?'#34555c':'#36515d');env.tri(a,c,d,t>.44?'#314d5c':'#395660')
    }add(env,0,0,0,0,1,640);
    // Donut Plains-style lake, coves and overlapping medallions of moonlight.
    let lake=new Geo(),shore=[],centre=[cx,-38.7,cz];
    for(let i=0;i<100;i++){let a=i*TAU/100,k=1+.15*Math.cos(a*3)+.10*Math.sin(2*a+.4)+.045*Math.cos(7*a-.5);
      shore.push([cx+88*k*Math.cos(a),-38.71,cz+70*k*Math.sin(a)])}
    for(let i=0;i<100;i++){let a=shore[i],b=shore[(i+1)%100],b2=[cx+(b[0]-cx)*1.032,-38.73,cz+(b[2]-cz)*1.032],a2=[cx+(a[0]-cx)*1.032,-38.73,cz+(a[2]-cz)*1.032];
      lake.tri(centre,a,b,i%7>3?'#327a9c':'#337c9d');q(lake,a,b,b2,a2,'#76949b')}
    for(let i=0;i<130;i++){let a=rand()*TAU,r=Math.sqrt(rand())*.94,x=cx+r*76*Math.cos(a),z=cz+r*62*Math.sin(a),w=.6+rand()*3.2;const depth=.08+rand()*.17;lake.quad([x-w/2,-38.675,z-depth*.5],[x+w*.38,-38.675,z-.13],[x+w/2,-38.675,z+depth*.5],[x-w*.42,-38.675,z+.13],i%8===1?'#add2cf':'#5793a5')}
    add(lake,0,0,0,0,1,330);
    const canopy=[];
    for(let k=0;k<4;k++)canopy.push(distantDecoration(g=>{g.tube(0,0,0,0,2.25,0,.28,.18,'#61535c',6);
      let leaf=['#457b78','#586b7a','#3d6570','#46746c'][k];
      g.ell(0,3.15,0,1.9,2.32,1.7,leaf,8,5);g.ell(-.59,3.55,.16,1.26,1.82,1.35,shade(leaf,1.07),8,4);return g}));
    const lodge=[];
    for(let i=0;i<4;i++)lodge.push(distantDecoration(g=>{let hat=['#d8777e','#a6b5cb','#9197be','#dc927e'][i],roof=shade(hat,.81);
      g.tube(0,.04,0,0,2.43,0,1.58,1.34,'#e0ceab',14);g.tube(0,.04,0,0,.33,0,1.64,1.55,'#817d86',14);
      g.ell(0,2.52,0,2.30,1.79,2.18,roof,16,7);g.tube(0,2.07,0,0,2.36,0,2.01,2.24,'#dad4bb',16);
      g.ell(0,3.89,0,.67,.42,.64,'#e7dfd0',10,4);
      for(let j=0;j<7;j++){let a=j*TAU/7,rad=1.75;g.ell(Math.cos(a)*rad,3.29,Math.sin(a)*rad,.41,.39,.41,'#e6d9ce',8,5)}
      g.box(0,1.05,-1.44,.75,1.63,.13,'#67545a');g.mat=5;
      for(let s of [-1,1]){g.box(s*.91,1.23,-1.16,.44,.54,.12,'#ffcf7d');g.box(s*.91,1.24,-1.23,.06,.54,.04,'#8e6f68')}
      return g}));
    for(let i=0;i<8;i++){
      let a=i*TAU/8+.32,r=104+(i%3)*14,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
      for(let j=0;j<3;j++){let v=a+j*2.1,xx=x+Math.sin(v)*7,zz=z+Math.cos(v)*6;add(lodge[(i+j)%4],xx,groundY(xx,zz),zz,v,1+rand()*.42,5)}
    }
    for(let k=0;k<35;k++){let a=rand()*TAU,r=102+rand()*104,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
      for(let j=0;j<3;j++){let xx=x+(rand()-.5)*10,zz=z+(rand()-.5)*10;add(canopy[(k+j)%4],xx,groundY(xx,zz),zz,rand()*TAU,1+rand()*.82,7)}}
    // The distant hills retain individual color bands instead of an empty star field.
    const hills=['#7c83bd','#899dbe','#a5acc6','#9790c0','#6599ba','#beb4ca'];
    for(let i=0;i<30;i++){let a=i*TAU/30,r=223+rand()*70,h=28+rand()*37,w=13+rand()*16,x=cx+Math.sin(a)*r,z=cz+Math.cos(a)*r,g=new Geo();
      g.ell(0,-h*.05,0,w,h,w*.83,hills[i%6],14,9);
      add(g,x,-29-rand()*7,z,a,1,h+8);
      if(i%3===0){let cloud=new Geo();for(let j=0;j<4;j++)cloud.ell((j-1.5)*8,Math.sin(j*.9)*3,0,9,4.1+j%2,8.8,['#a9b0d0','#97a8ca','#a1adcb','#a4b3cf'][j],10,5);add(cloud,x+21,-4+rand()*13,z-8,a,1,30)}
    }
    return (x,z,p,maxY)=>{
      if((p.f*L>=7&&(1-p.f)*L>=6)||Math.abs(p.l)<=half+.08)return undefined;
      return startWalls.heightAt(x,z,maxY);
    };
  }
  return {id:'rainbow',name:'SNES 彩虹之路',english:'Rainbow Road',edgeKind:(f,side,L)=>f*L<7||(1-f)*L<6?'rail':'void',shoulder:()=>.10,laps:3,half,points,height,bank,width,build,thwomps,gaps,ramps,surfaceLift,impactLift};
}
