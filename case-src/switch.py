"""Bake front-on Switch castings and front glass in their shared hardware coordinates.

The screen, both sticks, and the individual button caps are live DOM elements.
NumPy and Pillow are needed only to regenerate this texture.
"""
from pathlib import Path
import numpy as np
from PIL import Image

W,H=1200,512
DEST=Path(__file__).resolve().parents[1]/'src'/'switch-body.webp'
y,x=np.mgrid[:H,:W].astype(np.float32)+.5
u,v=x/W,y/H
img=Image.new('RGBA',(W,H))
rng=np.random.default_rng(20170303)

def smooth(a,b,z):
    t=np.clip((z-a)/(b-a),0,1)
    return t*t*(3-2*t)

def contour(l,t,r,b,rs):
    mx,my=(l+r)*.5,(t+b)*.5
    a=np.where(y<my,np.where(x<mx,rs[0],rs[1]),np.where(x<mx,rs[3],rs[2]))
    qx=np.abs(x-mx)-(r-l)*.5+a
    qy=np.abs(y-my)-(b-t)*.5+a
    return a-np.minimum(np.maximum(qx,qy),0)-np.hypot(np.maximum(qx,0),np.maximum(qy,0))

def put(d,color):
    rgb=np.broadcast_to(color,(H,W,3))
    data=np.concatenate((np.clip(rgb,0,255),np.clip(d+.5,0,1)[...,None]*255),axis=2)
    img.alpha_composite(Image.fromarray(data.astype('uint8')))

def molded(d,base,fillet,texture,level=1):
    # Quarter-round lip transitioning to the face. Upper-left studio key.
    h=np.clip(d/fillet,0,1); side=(1-h)**.78
    dy,dx=np.gradient(d)
    nx,ny=-dx*side,-dy*side
    nz=np.sqrt(np.maximum(0,1-nx*nx-ny*ny))
    lam=np.maximum(0,-.5*nx-.67*ny+.57*nz)
    spark=np.maximum(0,-.49*nx-.58*ny+.65*nz)**16
    col=base*((.735+.465*lam)*(.78+.22*nz))[...,None]
    col=col+(spark**.9)[...,None]*np.array([89,96,100])*level
    rim=np.exp(-((d-2.6)/1.48)**2)*(.15+.70*np.maximum(0,-.9*nx-.48*ny))
    col=col+rim[...,None]*np.array([69,78,82])*level
    if texture:
        flake=rng.normal(0,texture,(H,W))
        col=col+flake[...,None]
    put(d,col)

def wash(col):
    return np.asarray(col,dtype='f')[None,None,:]+np.zeros((H,W,1),'f')

# The top shoulder housings peek beyond the colored front caps.
for left in [True,False]:
    l,r=(10,159) if left else (W-159,W-10)
    d=contour(l,0,r,245,(88,15,16,44) if left else (15,88,44,16))
    molded(d,wash((28,33,38)),6,.4,.80)

# Exposed metal and rubber sandwich around the black tablet.
d=contour(164,3,W-164,H-3,(22,22,22,22))
base=wash((48,52,57)) + (1-v)[...,None]*4.8
molded(d,base,6,1.1,.86)
d=contour(169,5,W-169,H-6,(18,18,18,18))
# Hard edge of a large softbox on piano-black glass, with a broad, low bounce.
diag=u+v*.151; reflex=1-smooth(.435,.441,diag)
glass=wash((13,15,18))
glass+=(.62*(1-v)+.38*(1-u))[...,None]*[6,7,9]
glass+=(reflex*(.25+.75*(1-v)))[...,None]*[14,16,19]
glass+=np.exp(-((diag-.76)/.19)**2)[...,None]*[1.5,2,2.6]
molded(d,glass,4.6,0,.60)
# An unlit LCD recess lies below the panel even when the viewer changes screen.
sl,sr=237.6,962.4
st=(H-(sr-sl)*9/16)/2
sb=H-st
put(contour(sl-2.8,st-2.6,sr+2.8,sb+3.4,(5,5,5,5)),wash((33,37,39)))
put(contour(sl-1.5,st-1.5,sr+1.5,sb+1.5,(4,4,4,4)),wash((2,4,7)))

# Tiny front-firing speaker ports are recessed in the glass below the LCD.
for center in (226,W-226):
    d=contour(center-12,sb+11,center+12,sb+15,(2,2,2,2))
    put(d, wash((48,49,52)))
    d=contour(center-11,sb+11,center+11,sb+14,(1.5,1.5,1.5,1.5))
    put(d,wash((4,6,10)))
# Ambient-light sensor in the lower-left corner.
d=contour(202,sb+18,206,sb+22,(2,2,2,2))
put(d,wash((27,38,39)))

# Outer profiles have rounded outside shoulders and near-square rail faces.
for left in [True,False]:
    l,r=(1,168) if left else (W-168,W-1)
    rr=(83,9,10,73) if left else (9,83,73,10)
    n=(x-l)/(r-l); along=n if left else 1-n
    if left:
        main=wash((0,177,216)); tint=np.array([13,25,26])
    else:
        main=wash((247,60,62)); tint=np.array([14,17,17])
    face=main+(1-v)[...,None]*tint
    # Slight crown on the injection-molded face; retain rich blue/red at the edges.
    face=face*(.90+.087*np.sin(along*np.pi)+.042*(1-v))[...,None]
    face+=np.exp(-((along-.28+v*.22)/.45)**2)[...,None]*np.array([7,7,7])
    d=contour(l,5,r,H-3,rr)
    molded(d,face*.69,9,1.25,.84)
    d=contour(l+.9,6,r-.8,H-6,rr)
    molded(d,face,14,1.4,.96)
    # Slender anodized rail so the controller reads as a separate part.
    rail = r+1.1 if left else l-4
    d=contour(rail,13,rail+3.2,H-15,(1.3,1.3,1.3,1.3))
    k=np.clip((x-rail)/3.2,0,1)
    put(d,wash((13,17,20))+np.exp(-((k-.22)/.13)**2)[...,None]*[50,51,51])

img.save(DEST,'WEBP',quality=95,method=6,alpha_quality=100)
