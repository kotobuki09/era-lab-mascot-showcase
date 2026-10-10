"""Create a single self-contained HTML preview, with embedded PNGs and app sources."""
from pathlib import Path
import json,base64,re
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text()
manifest=json.loads((root/'assets/manifest.json').read_text())
def b64(path):
 return 'data:image/png;base64,'+base64.b64encode((root/path).read_bytes()).decode()
for record in manifest['directions']+manifest['reactions']+manifest['originals']:
 record['path']=b64(record['path'])
manifest_code='window.ERA_MASCOT_FRAMES='+json.dumps(manifest,separators=(',',':'))+';'
css=(root/'src/styles.css').read_text()
css=re.sub(r"@import url\([^;]+;\s*",'',css)
js=(root/'src/main.js').read_text()
html=html.replace('<link rel="stylesheet" href="./src/styles.css">','<style>'+css+'</style>')
html=html.replace('<script defer src="./src/manifest.js"></script>','')
html=html.replace('<script defer src="./src/main.js"></script>','')
for group in ('directions','reactions'):
 for p in (root/'assets'/group).glob('*.png'):
  html=html.replace('./assets/'+group+'/'+p.name,b64('assets/'+group+'/'+p.name))
for p in (root/'assets/originals').glob('*.png'):
 html=html.replace('./assets/originals/'+p.name,b64('assets/originals/'+p.name))
html=html.replace('./assets/favicon.png',b64('assets/favicon.png'))
html=html.replace('</body>','<script>'+manifest_code+'</script>\n<script>'+js+'</script>\n</body>')
out=Path('/mnt/data/ERA_Lab_Mascot_Live_Demo_Offline.html')
out.write_text(html)
print('Single HTML demo',out, 'size',out.stat().st_size)
