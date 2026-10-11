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
for kind in ("directions","reactions"):
    atlas=Image.open(p/(kind+".webp")).convert("RGBA")
    assert atlas.size==(1536,1536)
    for i in range(9):
        tile=np.asarray(atlas.crop((i%3*512,i//3*512,(i%3+1)*512,(i//3+1)*512)))
        assert np.count_nonzero(tile[:,:,3]>70)>20000
        assert np.count_nonzero(tile[439:,:,3]>65)<50
print("PASS: 18 aligned faces, invariant garment and no torso leaks")
