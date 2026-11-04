"""Bake the fixed studio lights on the molded case. The LCDs and controls remain live."""
from pathlib import Path
import numpy as np
from PIL import Image

DEST = Path(__file__).resolve().parent.parent / 'src'
W = 1160
rng = np.random.default_rng(318)
def stage(h):
    global X, Y, U, V
    Y, X = np.mgrid[:h, :W].astype('f') + .5
    U, V = X / W, Y / h
    return Image.new('RGBA', (W, h))
def smooth(a, b, value):
    t = np.clip((value-a)/(b-a), 0, 1)
    return t*t*(3-2*t)
def mix(a,b,t):
    return np.asarray(a) + (np.asarray(b)-a) * t[...,None]
def distance(left, top, right, bottom, radius):
    """Signed interior distance to a rounded rectangle, seen from directly above."""
    x = np.abs(X-(left+right)/2) - (right-left)/2 + radius
    y = np.abs(Y-(top+bottom)/2) - (bottom-top)/2 + radius
    return radius - (np.hypot(np.maximum(0,x),np.maximum(0,y)) + np.minimum(np.maximum(x,y),0))
def put(img, rgb, d):
    rgb=np.broadcast_to(rgb, (*X.shape,3))
    alpha=np.clip(d+.5,0,1)*255
    layer=np.concatenate((np.clip(rgb,0,255), alpha[...,None]),axis=2).astype('uint8')
    img.alpha_composite(Image.fromarray(layer))
def molded(img,d,surface,bevel,finish='ruby'):
    h = np.clip(d / bevel,0,1)
    # Surface normal of a quarter-round fillet in an orthographic product view.
    dy,dx=np.gradient(d)
    side = 1-h
    nx,ny=-dx*side,-dy*side
    nz=np.sqrt(np.maximum(0,1-nx*nx-ny*ny))
    diff=np.maximum(0,-.50*nx-.68*ny+.54*nz)
    bright=(diff-.54)
    from_left=np.maximum(0,-nx*.9-ny*.4)
    surf=surface + bright[...,None]*np.array([81,45,54]) + (nz-1)[...,None]*np.array([36,25,20])
    key=np.maximum(0, -nx*.45-ny*.65+nz*.61)**14
    surf+=key[...,None]*np.array([133,120,112])
    line=np.exp(-((d-1.7)/1.0)**2)*(.08+.7*from_left)
    surf+=line[...,None]*np.array([187,157,144])
    if finish=='ruby':
        flake=rng.normal(0,1.5,X.shape)+rng.binomial(1,.027,X.shape)*8
        surf+=flake[...,None]*np.array([1,.70,.72])
    put(img,surf,d)
def plate(warm=(182,19,45), dark=(102,4,30)):
    light=.27+.45*(1-U)+.22*np.cos((U+V*.12)*5.1)+.12*(1-V)
    face=mix(dark,warm,np.clip(light,0,1))
    face+=np.exp(-((U-.19+V*.16)/.19)**2)[...,None]*[16,9,8]
    face+=np.exp(-((U-.91+V*.12)/.12)**2)[...,None]*[19,4,6]
    return face
def save(img,name):
    img.save(DEST/('case-'+name+'.webp'),quality=93,method=6,alpha_quality=100)
def make_deck():
    # Both halves share the same plan outline. Only a narrow rim catches light.
    img=stage(585)
    d=distance(2,2,W-2,583,36)
    edge=mix((58,3,18),(139,13,39),.35+.47*(1-U)+.10*np.cos(U*9.8))
    molded(img,d,edge,8)
    d=distance(5,5,W-5,578,33)
    face=plate()
    face-=np.exp(-((Y-5)/15)**2)[...,None]*[30,9,12]
    molded(img,d,face,10)
    save(img,'deck')
def make_lid():
    img=stage(585)
    d=distance(2,2,W-2,583,36);surf=plate((175,18,46),(50,4,21))
    molded(img,d,surf,12)
    d=distance(10,11,W-11,574,29)
    trim = mix((15,9,15),(44,34,40),.75*(1-U))
    molded(img,d,trim,6,'black')
    d=distance(16,17,W-17,567,24)
    # Broad, hard-edged room reflection, as on piano-black acrylic.
    band=U+V*.215
    reflection=1-smooth(.455,.464,band)
    glass=mix((12,11,17),(34,31,41),.6*(1-U)+.22*(1-V))
    glass+= (reflection*(.2+.8*(1-V)))[...,None]*[14,13,16]
    glass+= (np.maximum(0,1-band/.48)**1.6)[...,None]*[11,12,18]
    glass+= np.exp(-((band-.86)/.20)**2)[...,None]*[3,1,3]
    molded(img,d,glass,5.5,'black')
    save(img,'lid')
def make_barrel():
    img=stage(62)
    # Recessed shaft and pivot rings, then two independent cheeks and the long knuckle.
    d=distance(7,9,W-7,55,16)
    body=plate((86,17,33),(28,7,18))
    molded(img,d,body,8)
    def cylinder(left,right,top,bottom,stub):
        rad=(bottom-top)/2
        y=np.clip((Y-(top+bottom)/2)/rad,-1,1)
        z=np.sqrt(np.maximum(0,1-y*y))
        slope=y*.98
        # Two reflected rectangular studio panels separated by the rounded crown.
        key=.36+.38*np.cos(U*4.4-.4)+.20*np.cos(U*10.8+.5)
        stripe=np.exp(-((slope+.52)/.18)**2)*(.51+.45*key)
        sky=(1-smooth(-.66,-.38,slope))*.35
        d=distance(left,top,right,bottom,8 if stub else 11)
        col=mix((97,4,26),(179,17,47),np.clip(.50+.43*np.cos(U*6.3-.6),0,1))
        col=col*(.40+.60*z-.15*slope)[...,None]+(stripe+sky)[...,None]*[101,79,76]
        col+=np.exp(-((slope-.44)/.16)**2)[...,None]*[27,3,8]
        # Rolled annular end wall and sharp highlight one pixel inside the joint.
        xend=np.minimum(X-left,right-X)
        col-=np.exp(-((xend-1)/4)**2)[...,None]*[60,22,28]
        col+=np.exp(-((xend-6)/2.1)**2)[...,None]*(.5+.5*z[...,None])*[41,27,24]
        put(img,col,d)
    cylinder(3,130,5,56,True)
    cylinder(139,W-139,1,59,False)
    cylinder(W-130,W-3,5,56,True)
    save(img,'hinge')
if __name__=='__main__':
    make_deck()
    make_lid()
    make_barrel()
