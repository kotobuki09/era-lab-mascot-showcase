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
test('gaze hysteresis prevents flicker around angle-sector thresholds',()=>{
  const calc=vm.runInNewContext('('+extractFunction('axisWithHysteresis')+')');
  assert.equal(calc(.29,0),0);
  assert.equal(calc(.37,0),1);
  assert.equal(calc(.29,1),1);
  assert.equal(calc(.19,1),0);
  assert.equal(calc(-.37,0),-1);
  assert.equal(calc(-.29,-1),-1);
  assert.equal(calc(-.18,-1),0);
});
test('interruptible latest-frame compositor avoids stale image swaps',()=>{
  assert.match(src,/const run=\+\+activeFade/);
  assert.match(src,/if\(run!==activeFade\|\|key!==requested\)return/);
  assert.match(src,/if\(next\.classList\.contains\('is-visible'\)\)/);
  assert.match(src,/const TRANSITION_MS=112/);
  assert.doesNotMatch(src,/fadeBusy/);
});
test('continuous pointer gaze uses time independent ease and has hysteresis',()=>{
  assert.match(src,/1-Math\.exp\(-dt\/105\)/);
  assert.match(src,/document\.hidden/);
  assert.match(src,/performance\.now\(\)<gaze\.holdUntil/);
  assert.match(src,/const enter=\.34,exit=\.23/);
});
test('direction graphics have a separate gaze wrapper from breathing and reaction',()=>{
  const html=readFileSync(join(root,'index.html'),'utf8');
  assert.match(html,/<div class="sprite-look"><div class="sprite-breathe">/);
  const styles=readFileSync(join(root,'src/styles.css'),'utf8');
  assert.match(styles,/\.sprite-look\{position:absolute/);
  assert.match(styles,/body\.motion-off \.sprite-look\{transform:none!important/);
});
