import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const src=readFileSync(join(root,'src/main.js'),'utf8');
function extractFunction(name){
  const begin=src.indexOf('function '+name+'(');
  assert.ok(begin>=0,name+' should exist');
  let start=src.indexOf('{',begin),depth=0, end=start;
  for(;end<src.length;end++){
    if(src[end]==='{')depth++;
    if(src[end]==='}'&&!--depth)break;
  }
  return src.slice(begin,end+1);
}
test('angular cursor sectors follow eight directions with center deadzone',()=>{
  const calc=vm.runInNewContext('('+extractFunction('chooseSector')+')');
  assert.equal(calc(0,0,-1,60),-1);
  assert.equal(calc(55,0,-1,60),-1);
  assert.equal(calc(120,0,-1,60),0);
  assert.equal(calc(120,120,-1,60),1);
  assert.equal(calc(0,120,-1,60),2);
  assert.equal(calc(-120,120,-1,60),3);
  assert.equal(calc(-120,0,-1,60),4);
  assert.equal(calc(-120,-120,-1,60),5);
  assert.equal(calc(0,-120,-1,60),6);
  assert.equal(calc(120,-120,-1,60),7);
});
test('hysteresis holds edges and avoids center flicker',()=>{
  const calc=vm.runInNewContext('('+extractFunction('chooseSector')+')');
  assert.equal(calc(55,0,0,60),0);
  assert.equal(calc(47,0,0,60),-1);
  assert.equal(calc(Math.cos(.45)*120,Math.sin(.45)*120,0,60),0);
  assert.equal(calc(Math.cos(.7)*120,Math.sin(.7)*120,0,60),1);
});
test('persistent decoded images avoid src swaps and ghosted crossfades',()=>{
  assert.match(src,/node\.decode\(\)/);
  assert.match(src,/spriteHost\.append\(node\)/);
  assert.match(src,/frameNodes = new Map\(\), decoded = new Set\(\)/);
  assert.doesNotMatch(extractFunction('commitFrame'),/\.src\s*=|offsetWidth|setTimeout/);
  assert.doesNotMatch(src,/TRANSITION_MS|activeFade|fadeTimer|next\.src/);
  const css=readFileSync(join(root,'src/styles.css'),'utf8');
  assert.match(css,/\.sprite-frame\.is-active\{opacity:1;visibility:visible\}/);
  assert.match(src,/spriteLook\.style\.transform/);
  assert.doesNotMatch(src,/scheduleBlink\(\)/);
});
test('direction graphics have a separate gaze wrapper from breathing and reaction',()=>{
  const html=readFileSync(join(root,'index.html'),'utf8');
  assert.match(html,/<div class="sprite-look"><div class="sprite-breathe">/);
  const styles=readFileSync(join(root,'src/styles.css'),'utf8');
  assert.match(styles,/\.sprite-look\{position:absolute/);
  assert.match(styles,/body\.motion-off \.sprite-look\{transform:none!important/);
});
