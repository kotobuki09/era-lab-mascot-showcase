#!/usr/bin/env python3
"""Ensure the built sprites are actually aligned, not only the UI controls."""
import json,sys
from pathlib import Path
from PIL import Image
import numpy as np
p=Path(sys.argv[1] if len(sys.argv)>1 else "dist/assets/rig")
r=json.loads((p/"alignment-report.json").read_text(encoding="utf-8"))
assert r["body_is_single_immutable_layer"] and r["source_artwork_unchanged"]
assert tuple(r["anchor"])==(255,400) and len(r["frames"])==18
assert max(abs(v["shift"][0]) for v in r["frames"].values())<=22
assert max(abs(v["shift"][1]) for v in r["frames"].values())<=38
body=Image.open(p/"body.webp").convert("RGBA")
assert body.size==(512,512)
assert np.count_nonzero(np.asarray(body)[430:,:,3]>180)>1000
assert np.count_nonzero(np.asarray(body)[:330,:,3])==0, "old face ghost above collar"
for kind in ("directions","reactions"):
    atlas=Image.open(p/(kind+".webp")).convert("RGBA")
    assert atlas.size==(1536,1536)
    for i in range(9):
        tile=np.asarray(atlas.crop((i%3*512,i//3*512,(i%3+1)*512,(i//3+1)*512)))
        assert np.count_nonzero(tile[:,:,3]>70)>20000
        assert np.count_nonzero(tile[439:,:,3]>65)<50
# Regression boxes identified by comparing the user's reported image with V7.
directions=np.asarray(Image.open(p/"directions.webp").convert("RGBA"))
for label,i,(x0,x1,y0,y1),ceiling in (
    ("down-right left spur",8,(110,143,325,353),28),
    ("down-left right spur",6,(366,400,330,355),28),
    ("left neck edge",3,(328,370,319,350),170),
    ("right neck edge",5,(140,185,319,350),200),
):
    region=directions[i//3*512+y0:i//3*512+y1,
                      i%3*512+x0:i%3*512+x1,3]
    assert int(np.count_nonzero(region>55))<ceiling, label
print("PASS: 18 aligned faces, stationary body, no neck spurs or face ghosts")
