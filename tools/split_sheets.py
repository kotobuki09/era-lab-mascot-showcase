from PIL import Image
from pathlib import Path
import json, hashlib
ROOT=Path(__file__).resolve().parent.parent
SOURCES=[(ROOT/'assets/originals/directions-master.png','directions',['up-left','up','up-right','left','center','right','down-left','down','down-right']),(ROOT/'assets/originals/reactions-master.png','reactions',['calm','joy','surprised','excited','curious','sleepy','thinking','love','victory'])]
manifest={'version':'2.0.0','character':'ERA Lab Male Researcher','directions':[],'reactions':[],'originals':[]}
for src,kind,names in SOURCES:
 im=Image.open(src).convert('RGBA');assert im.size==(1254,1254)
 orig=ROOT/'assets/originals'/f'{kind}-master.png' # Preserve master artwork without modifying it
 manifest['originals'].append({'kind':kind,'path':f'assets/originals/{kind}-master.png','width':1254,'height':1254})
 n=im.width//3
 for i,name in enumerate(names):
  r,c=divmod(i,3)
  patch=im.crop((c*n,r*n,(c+1)*n,(r+1)*n))
  # Adjacent rows on the source sheet touch. Remove only detached spillover
  # bands from the previous/next cell, never the character's own artwork.
  if r==1:
   from PIL import ImageDraw
   bands=ImageDraw.Draw(patch)
   if kind=='directions':
    bands.rectangle((0,0,n-1,3),fill=(0,0,0,0))
    bands.rectangle((0,413,n-1,417),fill=(0,0,0,0))
   else:
    bands.rectangle((0,0,n-1,17),fill=(0,0,0,0))
    if c==1:
     bands.rectangle((0,0,5,n-1),fill=(0,0,0,0))
  # Exact 418x418 cell with minimal cross-cell artifact cleanup; pad to 512 RGBA.
  out=Image.new('RGBA',(512,512),(0,0,0,0))
  out.alpha_composite(patch,((512-n)//2,(512-n)//2))
  dest=ROOT/'assets'/kind/f'{name}.png';out.save(dest,optimize=True,compress_level=4)
  bbox=patch.getchannel('A').getbbox()
  manifest[kind].append({'id':name,'label':name.replace('-',' ').title(),'path':f'assets/{kind}/{name}.png','width':512,'height':512,'sourceIndex':i,'sourceBox':[c*n,r*n,(c+1)*n,(r+1)*n], 'opaqueBounds':list(bbox) if bbox else None})
# small favicon from directional center frame
center=Image.open(ROOT/'assets/directions/center.png').convert('RGBA');center.thumbnail((160,160),Image.Resampling.LANCZOS)
icon=Image.new('RGBA',(192,192),(0,0,0,0));icon.alpha_composite(center,((192-center.width)//2,(192-center.height)//2));icon.save(ROOT/'assets/favicon.png')
(ROOT/'assets/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(ROOT/'src/manifest.js').write_text('window.ERA_MASCOT_FRAMES = '+json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+';\n')
(ROOT/'ASSET_SHA256.txt').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.relative_to(ROOT).as_posix()+'\n' for p in sorted((ROOT/'assets').rglob('*.png'))))
print('created:',len(manifest['directions']),'directions,',len(manifest['reactions']),'reactions')
print('assets sizes',sum(f.stat().st_size for f in (ROOT/'assets').rglob('*.png')))
