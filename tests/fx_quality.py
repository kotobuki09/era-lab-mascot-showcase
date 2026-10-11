#!/usr/bin/env python3
"""Regression for the V9 missing-expression glyphs and raised sleeves.

Run after scripts/build_fx.py. Source PNGs remain untouched; check that all
separate icons, emotion marks and gesture layers survive atlas extraction.
"""
import sys
import json
from pathlib import Path
import numpy as np
from PIL import Image

ROOT=Path(sys.argv[1] if len(sys.argv)>1 else 'dist')
FX=ROOT/'assets/rig'
meta=json.loads((FX/'fx-report.json').read_text())
assert meta['version']=='10.0' and meta['body_is_immutable']
expected={'calm':0,'joy':4,'surprised':3,'excited':3,'curious':1,
          'sleepy':4,'thinking':0,'love':4,'victory':6}
assert set(meta['frames'])==set(expected)
assert all(meta['frames'][name]['icon_components']==count
           for name,count in expected.items()),'An emotion symbol was dropped'
assert all(meta['frames'][name]['arm'] == (name in ('sleepy','thinking','love','victory'))
           for name in expected)
atlas=Image.open(FX/'reactions_fx.webp').convert('RGBA')
assert atlas.size==(1536,1536)
for i,name in enumerate(expected):
    part=atlas.crop(((i%3)*512,(i//3)*512,(i%3+1)*512,(i//3+1)*512))
    alpha=np.asarray(part)[:,:,3]
    n=int(np.count_nonzero(alpha>40))
    if name=='calm':assert n==0,'Neutral expression must not overlay stale art'
    elif name=='thinking':assert n>900,'Thinking forearm missing'
    else:assert n>110,'Missing visual FX for '+name
    dx,dy=meta['frames'][name]['shift']
    for x0,y0,x1,y1 in meta['frames'][name]['icon_boxes']:
        crop=alpha[max(0,y0+dy):min(512,y1+dy),
                   max(0,x0+dx):min(512,x1+dx)]
        assert crop.size and np.count_nonzero(crop>20)>35,(name,(x0,y0,x1,y1))
    # Avoid restoring the entire jacket and reintroducing the old jitter.
    assert n<32000,(name,'too many moving body pixels',n)
body=np.asarray(Image.open(FX/'body.webp').convert('RGBA'))
assert body.shape==(512,512,4)
print('PASS: 25 detached decorations and 4 complete animated arm gestures; fixed original body')
