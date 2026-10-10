import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { createHash } from 'node:crypto';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const file=(name)=>join(root,name);
const manifest=JSON.parse(readFileSync(file('assets/manifest.json'),'utf8'));
function size(path) {
  const b=readFileSync(file(path));
  assert.equal(b.toString('hex',0,8),'89504e470d0a1a0a',path+' must be PNG');
  return [b.readUInt32BE(16),b.readUInt32BE(20)];
}
test('expected manifest and complete, distinct assets',()=>{
  assert.equal(manifest.directions.length,9);
  assert.equal(manifest.reactions.length,9);
  assert.equal(manifest.originals.length,2);
  const names=[...manifest.directions,...manifest.reactions].map(a=>a.path);
  assert.equal(new Set(names).size,18);
  for(const a of [...manifest.directions,...manifest.reactions]){
    assert.deepEqual(size(a.path),[512,512],a.path);
    assert.ok(statSync(file(a.path)).size>40000,'PNG too small '+a.path);
  }
  for(const a of manifest.originals)assert.deepEqual(size(a.path),[1254,1254]);
});
test('direction ordering matches the sample page mascot grid',()=>{
  assert.deepEqual(manifest.directions.map(x=>x.id),['up-left','up','up-right','left','center','right','down-left','down','down-right']);
});
test('all source path bounds are valid 418 pixel cells',()=>{
  for(const x of [...manifest.directions,...manifest.reactions]){
    const [l,t,r,b]=x.sourceBox;
    assert.equal(r-l,418);assert.equal(b-t,418);
    assert.ok(l>=0&&r<=1254&&t>=0&&b<=1254);
  }
});
test('HTML and JS references exist and do not depend on a server build',()=>{
  const h=readFileSync(file('index.html'),'utf8');
  assert.match(h,/src\/main\.js/);assert.match(h,/src\/manifest\.js/);
  assert.match(h,/assets\/directions\/center\.png/);
  const s=readFileSync(file('src/main.js'),'utf8');
  assert.match(s,/pointermove/);assert.match(s,/showReaction/);
  assert.ok(statSync(file('src/styles.css')).size>15000);
});

test('asset SHA256 integrity checksums are exact',()=>{
  const checks=readFileSync(file('ASSET_SHA256.txt'),'utf8').trim().split('\n');
  assert.equal(checks.length,21);
  for(const line of checks){const [want,path]=line.split(/\s{2}/);const actual=createHash('sha256').update(readFileSync(file(path))).digest('hex');assert.equal(actual,want,path);}
});
