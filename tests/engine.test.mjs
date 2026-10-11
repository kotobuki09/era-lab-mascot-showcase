import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const js=readFileSync(join(root,'src/main.js'),'utf8');
const css=readFileSync(join(root,'src/styles.css'),'utf8');
const html=readFileSync(join(root,'index.html'),'utf8');
const rig=readFileSync(join(root,'scripts/build_rig.py'),'utf8');
test('based on page-mascot: two fixed 3x3 background-position layers',()=>{
  assert.match(js,/function cellPosition\(index\)/);
  assert.match(js,/\(index%3\)\*50/);
  assert.match(js,/directionSheet\.style\.backgroundPosition=cellPosition\(index\)/);
  assert.match(js,/layer\.style\.backgroundPosition=cellPosition\(index\)/);
  assert.match(css,/background-size:300% 300%/);
  assert.match(css,/background-image:url\('\.\.\/assets\/rig\/directions\.webp\?v=9'\)/);
  assert.match(css,/background-image:url\('\.\.\/assets\/rig\/reactions\.webp\?v=9'\)/);
});
test('the body is one immutable image and is never changed by JS',()=>{
  assert.match(html,/id="mascot-body" class="mascot-static-body" src="\.\/assets\/rig\/body\.webp\?v=9"/);
  assert.match(html,/id="mascot-directions"/);
  assert.match(html,/id="mascot-reactions"/);
  assert.match(html,/id="mascot-reactions-next"/);
  assert.doesNotMatch(js,/mascot-body|sprite-base|sprite-next|frameNodes/);
  assert.doesNotMatch(js.slice(js.indexOf('function setFrame('),js.indexOf('function say(')),/\.src\s*=/);
  assert.match(rig,/immutable_body/);
  assert.match(rig,/source \/ "directions\/center\.png"/);
});
test('angular tracking uses official page-mascot sector hysteresis and deadzone',()=>{
  assert.match(js,/const CLOCKWISE=\['right','down-right','down','down-left','left','up-left','up','up-right'\]/);
  assert.match(js,/const SECTOR=Math\.PI\*2\/CLOCKWISE\.length/);
  assert.match(js,/const HYSTERESIS=\.12/);
  assert.match(js,/const DEAD_ZONE=70/);
  assert.match(js,/Math\.hypot\(dx,dy\)<DEAD_ZONE/);
  assert.match(js,/Math\.abs\(wrap\(angle-current\*SECTOR\)\)<SECTOR\/2\+HYSTERESIS/);
  assert.match(js,/window\.addEventListener\('scroll',aim/);
});
test('reactions change head pose, preserve torso, then return to tracking',()=>{
  assert.match(js,/setFrame\('reactions:'\+id\)/);
  assert.match(js,/setFrame\('directions:'\+state\.wantedDirection\)/);
  assert.match(js,/headTrack\.animate\(SQUASH,\{duration:320,easing:'linear'\}\)/);
  assert.doesNotMatch(js,/\bstage\.animate\(SQUASH/);
  assert.match(js,/state\.reaction=null/);
});
test('source artwork and the gallery remain intact',()=>{
  assert.match(html,/id="asset-gallery"/);
  assert.match(html,/assets\/originals\/directions-master\.png/);
  assert.match(html,/assets\/originals\/reactions-master\.png/);
  assert.match(js,/function renderGallery\(\)/);
  assert.match(rig,/"up-left", "up", "up-right"/);
  assert.match(rig,/"calm", "joy", "surprised"/);
});
test('accessibility and reduced motion are respected',()=>{
  assert.match(js,/prefers-reduced-motion: reduce/);
  assert.match(js,/if\(!state\.motion \|\| typeof headTrack\.animate!==\'function\'\)return/);
  assert.match(js,/e\.key==='Enter'/);
  assert.match(js,/event\.pointerType==='touch'/);
  assert.match(html,/id="motion-toggle"/);
});

test('reaction animation preserves stage transform and eases crossfade',()=>{
  assert.match(css,/\.mascot-stage\{position:absolute;left:50%;top:47%;[^}]*transform:translate\(-50%,-50%\)/);
  assert.match(js,/const headTrack=\$\('\.mascot-head-track'\)/);
  assert.match(js,/const reactionLayers=\[\$\('#mascot-reactions'\),\$\('#mascot-reactions-next'\)\]/);
  assert.match(js,/const next=activeReactionLayer===0\?1:0/);
  assert.match(css,/transition:opacity 170ms cubic-bezier\(\.2,\.7,\.2,1\)/);
  assert.match(css,/body\.motion-off \.mascot-sheet\{transition:none!important\}/);
});
