#!/usr/bin/env python3
"""Restore detached emotion glyphs and raised sleeve gestures above a fixed mascot torso.

Inputs are the approved transparent 512x512 original PNGs and the alignment
report from build_rig.py. No generated artwork and no changes to original art.
"""
from pathlib import Path
import argparse, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi

CELL=512
REACTIONS=('calm','joy','surprised','excited','curious','sleepy','thinking','love','victory')
# Only local, intentional arm gestures. The rest of the garment is immutable.
# Coordinates are tied to the original source assets and deliberately exclude
# most of the chest, zipper and orbital logo.
ARM_POLYGONS={
    'sleepy': [ [(111,351),(137,326),(160,344),(193,359),(228,413),(229,454),(94,468),(88,417)] ],
    'thinking': [[(112,363),(137,341),(167,355),(200,378),(216,450),(86,462),(81,410)]],
    'love': [[(91,347),(126,325),(174,339),(201,375),(211,459),(75,467),(73,403)],
             [(313,358),(331,339),(365,321),(394,339),(436,399),(437,462),(296,464)]],
    'victory': [[(42,295),(53,271),(111,264),(148,279),(168,322),(184,450),(37,467),(25,414)]],
}

def detached_components(image):
    a=np.asarray(image.getchannel('A'))
    labels,num=ndi.label(a>10)
    if not num:return np.zeros_like(a,dtype=np.uint8),[]
    sizes=np.bincount(labels.ravel())
    sizes[0]=0
    main=int(sizes.argmax())
    mask=np.zeros_like(a,dtype=bool)
    boxes=[]
    slices=ndi.find_objects(labels)
    for i,sl in enumerate(slices,1):
        if sl is None or i==main or sizes[i]<65: continue
        top,bottom=sl[0].start,sl[0].stop
        left,right=sl[1].start,sl[1].stop
        # Detached stars, hearts, question marks, Z and exclamation points.
        # Reject incidental specks and pixels low in the static jacket.
        if top>390 or bottom>410 or (right-left)>110 or (bottom-top)>110:
            continue
        island=labels==i
        dilated=ndi.binary_dilation(island,iterations=1)
        # Expand outlines without accidentally copying the entire mascot.
        mask|=(dilated & (labels!=main))
        boxes.append((int(left),int(top),int(right),int(bottom)))
    return mask.astype('uint8')*255,boxes

def foreground_arms(name):
    mask=Image.new('L',(CELL,CELL),0)
    drawer=ImageDraw.Draw(mask)
    for points in ARM_POLYGONS.get(name,[]):
        drawer.polygon(points,fill=255)
    return mask.filter(ImageFilter.GaussianBlur(2.0))

def rgba_layer(original,mask):
    arr=np.array(original.convert('RGBA'),copy=True)
    m=np.asarray(mask,dtype=np.uint16)
    arr[...,3]=(arr[...,3].astype(np.uint16)*m//255).astype('uint8')
    return Image.fromarray(arr,'RGBA')

def translate(layer,dx,dy):
    out=Image.new('RGBA',(CELL,CELL))
    out.paste(layer,(dx,dy))
    return out

def build(source,dest):
    source=Path(source);dest=Path(dest)
    report=json.loads((dest/'alignment-report.json').read_text())
    atlas=Image.new('RGBA',(CELL*3,CELL*3))
    meta={'version':'10.0','frames':{},'body_is_immutable':True}
    for i,name in enumerate(REACTIONS):
        src=Image.open(source/'reactions'/f'{name}.png').convert('RGBA')
        detached,boxes=detached_components(src)
        icon=rgba_layer(src,detached)
        arm=rgba_layer(src,foreground_arms(name))
        # Same pivot as the moving head, while the torso never changes.
        dx,dy=map(int,report['frames'][f'reactions/{name}']['shift'])
        overlay=Image.alpha_composite(translate(arm,dx,dy),translate(icon,dx,dy))
        atlas.alpha_composite(overlay,((i%3)*CELL,(i//3)*CELL))
        meta['frames'][name]={'icon_boxes':boxes,'icon_components':len(boxes),
                              'arm':name in ARM_POLYGONS,'shift':[dx,dy]}
    atlas.save(dest/'reactions_fx.webp',format='WEBP',lossless=True,method=6)
    (dest/'fx-report.json').write_text(json.dumps(meta,indent=2))
    print('PASS: emotion effects restored:',
          {k:v['icon_components'] for k,v in meta['frames'].items()})

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--source',default='assets')
    parser.add_argument('--dest',default='dist/assets/rig')
    args=parser.parse_args()
    build(args.source,args.dest)
