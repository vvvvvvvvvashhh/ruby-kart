"""Bake a front-view pearl-white Wii U GamePad. Its controls and LCD stay live.

Geometry is specified in the same 1000 × 548 coordinate system as wiiu-skin.css.
Large surfaces, cast shadows and legends are painted once. Device tilt only shifts
the existing small specular sprites.
"""
from pathlib import Path
import numpy as np
from PIL import Image

DST = Path(__file__).resolve().parent.parent / 'src'
S = 1.35
rng = np.random.default_rng(201211)
Y, X = np.mgrid[:round(548*S), :round(1000*S)].astype('float32') / S
U, V = X/1000, Y/548
img = Image.new('RGBA', (X.shape[1], X.shape[0]))

def dist(l,t,r,b,rad):
    dx=np.abs(X-(l+r)/2) - (r-l)/2 + rad
    dy=np.abs(Y-(t+b)/2) - (b-t)/2 + rad
    return rad - np.hypot(np.maximum(dx,0),np.maximum(dy,0))-np.minimum(np.maximum(dx,dy),0)

def layer(rgb,d):
    c=np.broadcast_to(rgb,(*X.shape,3))
    a=np.clip(.5+S*d,0,1)
    pixels=np.concatenate((np.clip(c,0,255),255*a[...,None]),axis=2).astype('uint8')
    img.alpha_composite(Image.fromarray(pixels))

def shape(d,base,bevel=5,edge=1,shine=1):
    h=np.clip(d/bevel,0,1)
    dy,dx=np.gradient(d)
    nx=-dx*S*(1-h);ny=-dy*S*(1-h)
    nz=np.sqrt(np.maximum(0,1-nx*nx-ny*ny))
    key=np.maximum(0,-nx*.55-ny*.62+nz*.56)
    diffuse=(-.46*nx-.69*ny+.56*nz-.56)*edge
    gloss=np.maximum(0,key)**13*shine
    c=np.asarray(base)+diffuse[...,None]*[60,62,66]+(nz-1)[...,None]*[36,31,21]*edge
    c+=gloss[...,None]*[110,105,98]
    layer(c,d)

def ring(cx,cy,rx,ry,base,bevel=3,edge=1,shine=1):
    d=(1-np.hypot((X-cx)/rx,(Y-cy)/ry))*min(rx,ry)
    shape(d,base,bevel,edge,shine)

def cutshadow(cx,cy,rx,ry):
    # Occlusion where the raised control shadows its own well.
    rho=np.hypot((X-cx)/rx,(Y-cy)/ry)
    layer([69,78,89],(1-rho)*ry)
    ring(cx,cy,rx-1.1,ry-1.1,[145,150,156],3)
    ring(cx,cy-1,rx-3,ry-3,[76,84,94],2,.85,.44)
    ring(cx,cy+.5,rx-6.2,ry-6.2,[164,168,169],2,.75,.54)

def grain(strength):
    return rng.normal(0,strength,X.shape)[...,None]

def save(name):
    img.save(DST/('wiiu-'+name+'.webp'),quality=94,method=6,alpha_quality=100)

def draw_body():
    bg=np.array([200.,205.,210.])+((.3+.8*(1-U))*(.8+.2*(1-V)))[...,None]*[16,15,12]
    for l,r in [(63,202),(798,937)]:
        shape(dist(l,4,r,39,13),[172,180,185],7,1.18,.58)
        shape(dist(l+4,5,r-4,32,10),[221,225,224],5,.85,.58)
    # Wide ovalized side grips, a subtly flattened lower center, visible split at the edge.
    inset=3.5+7.5*((V-.45)/.63)**2
    top=9+3*(2*U-1)**2
    bottom=543-3.8*np.exp(-((U-.5)/.32)**4)
    d=dist(inset,top,1000-inset,bottom,83)
    wall=np.array([140.,149.,160.])+((1-U)*.32+.18*np.cos(U*10))[...,None]*[23,23,21]
    shape(d,wall,8,1.15,.45)
    shape(dist(inset+1,top+.5,999-inset,bottom-4.6,81),[125,136,144],5,.75,.35)
    face_d=dist(inset+2.8,top+.5,997.2-inset,bottom-8,79)
    band=U+.17*V
    spec=np.exp(-((band-.245)/.18)**4)*(.65-.30*V)
    grip=np.exp(-((U-.050-.014*(V-.4)**2)/.046)**2)*(.40+.45*(1-V))
    rhs=np.exp(-((U-.965)/.018)**2)*(.37+.30*V)
    face=bg+(spec+grip*.80+rhs*.38)[...,None]*[15,14,13] + grain(.82)
    face+=(1-V)[...,None]*[3.5,3,1]
    # Broad wings, pressed by a bevelled die, stay visibly proud of the screen island.
    face+=np.exp(-((U-.90)/.105)**2)[...,None]*[2,3,5]
    shape(face_d,face,16,1.18,.65)
    # Screen retainer and the black lacquered glass gasket; the live LCD covers the center.
    shape(dist(181,84,819,460,12),[221,224,226],7,.90,.40)
    shape(dist(187.5,90.5,812.5,453.5,7),[134,144,153],3,.80,.40)
    shape(dist(190.4,92.5,809.6,451.6,5),[41,45,51],4,.70,.46)
    glass=25 + 9*(1-U)+7*(1-V)+7.5*(1-np.clip((U+V*.16-.54)/.019,0,1))*(1-V*.55)
    shape(dist(193.5,96,806.5,448.5,3.8),glass[...,None]+[0,1,3],2.5,.43,.33)
    # Wide smoked IR bar and a glass coated camera lens.
    shape(dist(373,27,627,54,9),[158,168,175],3,.55,.36)
    shape(dist(375,28.7,625,52.2,7),[36,40,46],2,.40,.40)
    ir=18+(1-np.clip((U+V*.12-.51)/.012,0,1))*13+(1-V)*4
    layer(ir[...,None]+[0,0,3],dist(378,30,622,50.8,6))
    for x in (397,603): ring(x,40.8,5.3,3.7,[41,36,47],2,.22,.16)
    ring(500,40.8,13.2,12.4,[24,27,34],3,.45,.55)
    ring(500,40.8,9.1,8.8,[58,67,78],2,.55,.65)
    ring(500,40.8,6.9,6.5,[17,30,48],1.9,.45,.55)
    ring(500.7,40.5,3.6,3.8,[26,57,75],1.2,.44,.40)
    ring(498.7,38.9,1.7,1.4,[171,205,213],.7,.4,.10)
    # Two physical analog recesses. The cap sprites move independently over these wells.
    for x in (107,893):cutshadow(x,88,46.8,47.0)
    # Action-cap collars. Diamond geometry has the same readout/hit coordinates as CSS.
    for x,y in [(874,185),(911,222),(874,259),(837,222)]:cutshadow(x,y,20.7,20.7)
    # Indented single cross socket. Elastic rocker can tilt over the fixed molding.
    def cross(cx,cy,r,a):
        return np.maximum(dist(cx-r,cy-a,cx+r,cy+a,3),dist(cx-a,cy-r,cx+a,cy+r,3))
    shape(cross(125,225,42.5,15.9),[150,157,163],3,.78,.35)
    shape(cross(125,225,40.1,14.0),[72,80,87],2,.48,.32)
    # The speakers are actual recessed pinholes with individual lower edge kickers.
    for x in (145,855):
        for row,n in enumerate([3,5,6,6,5,3]):
            for k in range(n):
                cx=x+(k-(n-1)/2)*4.8;cy=391+(row-2.5)*4.5
                ring(cx,cy,1.45,1.50,[184,190,190],1,.75,.32)
                ring(cx,cy-.2,1.02,1.05,[60,65,71],.63,.3,.32)
    # Battery LED guide and microphone.
    ring(615,489,9.6,3.8,[165,175,177],2,.58,.28)
    ring(615,489,7.5,2.2,[104,200,217],1.15,.35,.20)
    ring(444,487,2.6,2.6,[89,96,100],1.0,.44,.26)
    save('body')

def tile(w,h=0):
    global X,Y,img,S
    h=h or w; S=2.8
    Y,X=np.mgrid[:round(h*S),:round(w*S)].astype('float32')/S
    img=Image.new('RGBA',(X.shape[1],X.shape[0]))

def draw_stick():
    tile(100)
    # Collar, rounded silicone sidewall and concave thumb rest.
    ring(50,53,42.5,43.0,[145,148,150],5)
    ring(50,49.6,43.1,42.1,[181,185,185],5,1.1,.42)
    ring(50,47.5,41.3,41.0,[222,224,219],3.7,.95,.50)
    r=np.hypot((X-50)/38,(Y-47.5)/37.8)
    bowl=(164+27*(Y/100)+16*r**1.5+6*(X/100))[...,None]+[2.5,3.3,1.5]+grain(1.15)
    layer(bowl,(1-r)*37.8)
    # A very fine circular ridge is easier to feel and read than painted graphics.
    rr=np.hypot(X-50,Y-47.6)
    ry=(Y-47.6)/36
    rim=(197+11*ry+3*(X/100))[...,None]+[2,2,0]
    layer(rim,.50-abs(rr-35.4))
    save('stick')

def draw_key():
    tile(100)
    ring(50,55,47,42.7,[152,159,163],5,.88,.45)
    tone=206+17*(1-X/100)+11*(1-Y/100)+np.exp(-((X+.24*Y-26)/12)**2)*6
    ring(50,49,47,45.3,tone[...,None]+[3,3,1]+grain(.45),6,1.08,.65)
    save('key')

def draw_cross():
    tile(100)
    def cross(y,r,a):
        return np.maximum(dist(50-r,y-a,50+r,y+a,2.8),dist(50-a,y-r,50+a,y+r,2.8))
    shape(cross(53,47,16.6),[141,148,152],4,1.10,.55)
    color=(204+14*(1-X/100)+11*(1-Y/100))[...,None]+[3,2,0]+grain(.48)
    shape(cross(48,47,16.6),color,3.5,.86,.36)
    # Four tactile index ridges; each follows the corresponding directional contact.
    for x,y,horiz in [(50,16,True),(50,79,True),(18,48,False),(82,48,False)]:
        a,b=(5.0,.9) if horiz else (.95,4.6)
        shape(dist(x-a,y-b,x+a,y+b, min(a,b)*.9),[176,182,181],.9,.45,.35)
    save('cross')

if __name__=='__main__':
    draw_body()
    draw_stick()
    draw_key()
    draw_cross()
