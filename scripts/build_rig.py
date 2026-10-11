#!/usr/bin/env python3
"""Build aligned face/head sheets from ERA Lab's original 18 PNG drawings.

Following nilbuild/page-mascot design rules: ONE fixed torso and a common
neck anchor. V6 improperly copied colored hoodie pixels into moving sprites.
No generative images and no changes to the user's approved original PNGs.
"""
import argparse
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi

DIRECTIONS = ("up-left", "up", "up-right", "left", "center", "right",
              "down-left", "down", "down-right")
REACTIONS = ("calm", "joy", "surprised", "excited", "curious", "sleepy",
             "thinking", "love", "victory")
CELL=512
ANCHOR=(255,400)

def morph(mask, radius):
    k=max(3,int(radius)|1)
    img=Image.fromarray((mask*255).astype("uint8"),"L")
    return np.asarray(img.filter(ImageFilter.MaxFilter(k))
                       .filter(ImageFilter.MinFilter(k)))>120

def extract_head(image):
    src=np.asarray(image.convert("RGBA"))
    if src.shape != (CELL,CELL,4):
        raise ValueError("Each approved original frame must be 512x512 RGBA")
    c=src[...,:3].astype(np.int16)
    r,g,b=c[...,0],c[...,1],c[...,2]
    y,x=np.indices((CELL,CELL))
    visible=src[...,3]>25
    skin=(r>90)&(r>g+8)&(g>b+8)&(r>b+22)&visible
    hair=(r<=140)&(r>=g-10)&(r>=b-7)&(g<145)&(b<145)&visible
    seeds=((skin&(y<424))|(hair&(y<344)))
    seeds&=(x>34)&(x<478)
    labels,n=ndi.label(morph(seeds,11))
    if n<1:raise ValueError("Missing face/hair foreground")
    sizes=np.bincount(labels.ravel());sizes[0]=0
    if sizes.max()<20000:raise ValueError("Head component too small")
    core=ndi.binary_fill_holes(labels==int(sizes.argmax()))
    core=morph(core,9)
    keep=np.asarray(Image.fromarray((core*255).astype("uint8")).filter(ImageFilter.MaxFilter(7)))>125
    # Keep the entire chin/expressive hands, not the navy/white jacket.
    neck=morph(skin&(x>42)&(x<470),17)
    neck=np.asarray(Image.fromarray((neck*255).astype("uint8")).filter(ImageFilter.MaxFilter(9)))>125
    keep[y>=345]&=neck[y>=345]
    # Keep only dark outlines adjacent to skin below the cheeks: old PNG
    # drawings contain jacket strands otherwise visible behind the neck.
    face_support=ndi.binary_dilation(skin,iterations=8)
    keep[y>=302]&=face_support[y>=302]
    soft=np.asarray(Image.fromarray((keep*255).astype("uint8")).filter(ImageFilter.GaussianBlur(.65)))
    out=src.copy()
    out[...,3]=(out[...,3].astype(np.uint16)*soft.astype(np.uint16)//255).astype("uint8")
    return Image.fromarray(out,"RGBA"),skin

def neck_tip(head,skin):
    alpha=np.asarray(head.getchannel("A"))>45
    cols=np.indices(alpha.shape)[1]
    yy,xx=np.where(alpha&skin&(cols>224)&(cols<294))
    if len(yy)<120:raise ValueError("Insufficient neck skin to align")
    bottom=int(np.quantile(yy,.998))
    low=(yy>=bottom-18)&(xx>224)&(xx<294)
    if low.sum()<15:raise ValueError("Insufficient anchor width")
    return int(round(np.median(xx[low]))),bottom

def translate(frame,dx,dy):
    out=Image.new("RGBA",(CELL,CELL))
    out.paste(frame,(int(dx),int(dy)))
    return out

def immutable_body(center,head):
    # Single approved original hoodie, without old face ghost bands.
    px=np.array(center.convert("RGBA"),copy=True)
    c=px[...,:3].astype(np.int16)
    red,green,blue=c[...,0],c[...,1],c[...,2]
    y=np.indices((CELL,CELL))[0]
    skin=((red>90)&(red>green+8)&(green>blue+8)&
          (red>blue+22)&(px[...,3]>25))
    # Clear all face pixels above the collar, then remove just the real
    # skin/neck plus a narrow black outline. Do NOT remove navy hood edges.
    cut=(y<330)
    for row in range(330,397):
        xs=np.flatnonzero(skin[row])
        if xs.size:
            left=max(0,int(xs.min())-9)
            right=min(CELL,int(xs.max())+10)
            cut[row,left:right]=True
    px[...,3][cut]=0
    body=Image.fromarray(px,"RGBA")
    backing=Image.new("RGBA",(CELL,CELL))
    # Permanent dark fabric under a movable chibi neck.
    ImageDraw.Draw(backing).ellipse((186,322,324,422),fill=(19,27,49,255))
    backing.alpha_composite(body)
    fixed=np.array(backing)
    fixed[:330,:,3]=0
    return Image.fromarray(fixed,"RGBA")

def build(source,dest):
    source,dest=Path(source),Path(dest)
    dest.mkdir(parents=True,exist_ok=True)
    frames,metrics={},{}
    for kind,names in (("directions",DIRECTIONS),("reactions",REACTIONS)):
        for name in names:
            src=Image.open(source/kind/(name+".png")).convert("RGBA")
            head,skin=extract_head(src)
            neck_x,neck_y=neck_tip(head,skin)
            dx,dy=ANCHOR[0]-neck_x,ANCHOR[1]-neck_y
            if abs(dx)>22 or abs(dy)>38:
                raise ValueError(f"Frame too far from neck anchor: {kind}/{name}: {(dx,dy)}")
            aligned=translate(head,dx,dy)
            opaque=np.asarray(aligned.getchannel("A"))>60
            if np.count_nonzero(opaque[439:])>50:
                raise ValueError(f"Dynamic jacket fragment: {kind}/{name}")
            frames[kind,name]=aligned
            metrics[kind+"/"+name]={
                "original_neck":[neck_x,neck_y],"shift":[int(dx),int(dy)],
                "visible_pixels":int(np.count_nonzero(opaque)),
                "pixel_bounds":list(aligned.getbbox() or ())
            }
    center=Image.open(source / "directions/center.png").convert("RGBA")
    head,_=extract_head(center)
    body=immutable_body(center,head)
    body.save(dest/"body.webp",format="WEBP",lossless=True,method=6)
    for kind,names in (("directions",DIRECTIONS),("reactions",REACTIONS)):
        atlas=Image.new("RGBA",(3*CELL,3*CELL))
        for i,name in enumerate(names):
            atlas.alpha_composite(frames[kind,name],((i%3)*CELL,(i//3)*CELL))
        atlas.save(dest/(kind+".webp"),format="WEBP",lossless=True,method=6)
        check=Image.open(dest/(kind+".webp")).convert("RGBA")
        assert check.size==(1536,1536)
        for i in range(9):
            cell=check.crop(((i%3)*CELL,(i//3)*CELL,(i%3+1)*CELL,(i//3+1)*CELL))
            assert cell.getchannel("A").getbbox(),(kind,i)
    assert len(frames)==18
    (dest/"alignment-report.json").write_text(json.dumps({
        "version":"8.0","anchor":list(ANCHOR),"frames":metrics,
        "body_source":"assets/directions/center.png",
        "body_is_single_immutable_layer":True,
        "source_artwork_unchanged":True
    },indent=2),encoding="utf-8")
    print("PASS: 18 anchored head frames; one stationary torso; no moving jacket pixels")

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--source",default="assets")
    parser.add_argument("--dest",default="dist/assets/rig")
    args=parser.parse_args()
    build(args.source,args.dest)
