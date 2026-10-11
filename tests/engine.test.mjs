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
  assert.match(js,/reactionSheet\.style\.backgroundPosition=cellPosition\(index\)/);
  assert.match(css,/background-size:300% 300%/);
  assert.match(css,/background-image:url\('\.\.\/assets\/rig\/directions\.webp'\)/);
  assert.match(css,/background-image:url\('\.\.\/assets\/rig\/reactions\.webp'\)/);
});
test('the body is one immutable image and is never changed by JS',()=>{
  assert.match(html,/id="mascot-body" class="mascot-static-body" src="\.\/assets\/rig\/body\.webp"/);
  assert.match(html,/id="mascot-directions"/);
  assert.match(html,/id="mascot-reactions"/);
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
  assert.match(js,/stage\.animate\(SQUASH,\{duration:420,easing:'linear'\}\)/);
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
  assert.match(js,/if\(state\.motion && typeof stage\.animate/);
  assert.match(js,/e\.key==='Enter'/);
  assert.match(js,/event\.pointerType==='touch'/);
  assert.match(html,/id="motion-toggle"/);
});
