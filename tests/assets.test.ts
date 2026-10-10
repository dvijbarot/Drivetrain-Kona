import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function glb(name:string){
 const d=readFileSync(new URL('../public/models/'+name+'.glb',import.meta.url));
 assert.equal(d.readUInt32LE(0),0x46546c67,'Valid binary glTF');
 const length=d.readUInt32LE(12);return JSON.parse(d.subarray(20,20+length).toString());
}
const assemblies:Record<string,string[]>={
 'wheel-18':['wheel','rotor','caliper'],
 'engine-castings':['block','block_cut','head','cover','pan','timing','intake','exhaust','ancillary'],
 'kona-sx2-body':['hood','roof','glass','body','trim','light','interior'],
 'kona-sx2-chassis':['floor','frame','suspension','utilities','bay'],
 'ivt-casting':['case','pan','bell'],
};
test('every GLB LOD retains the independently selectable assembly contract',()=>{
 for(const [file,names] of Object.entries(assemblies))for(const suffix of ['', '-low']){
  const j=glb(file+suffix),nodes=j.nodes.map((n:{name:string})=>n.name);
  for(const name of names)assert.ok(nodes.includes(name),file+suffix+' missing '+name);
  for(const m of j.meshes)for(const p of m.primitives){
   assert.ok(p.attributes.NORMAL!==undefined,'Normals retained');
   assert.ok(p.attributes.TEXCOORD_0!==undefined,'Surface UV coordinates retained');
   assert.ok(p.attributes.COLOR_0!==undefined,'Baked contact shading retained');
  }
 }
});
test('wheel, brake rotor and fixed caliper stay separate and wheel dimensions are in meters',()=>{
 const j=glb('wheel-18'),wheel=j.nodes.find((n:{name:string})=>n.name==='wheel');
 const positions=j.meshes[wheel.mesh].primitives.map((p:{attributes:{POSITION:number}})=>j.accessors[p.attributes.POSITION]);
 const maxRadius=Math.max(...positions.map((p:{min:number[];max:number[]})=>Math.max(Math.abs(p.min[1]),Math.abs(p.min[2]),Math.abs(p.max[1]),Math.abs(p.max[2]))));
 assert.ok(Math.abs(maxRadius-.34685)<.006,'Nominal 215/55 R18 radius');
 assert.notEqual(wheel.mesh,j.nodes.find((n:{name:string})=>n.name==='caliper').mesh);
});
test('low graphics meshes reduce geometry without changing assembly placement',()=>{
 for(const file of Object.keys(assemblies)){
  const hi=glb(file),lo=glb(file+'-low');
  const triangles=(j:any)=>j.meshes.reduce((sum:number,m:any)=>sum+m.primitives.reduce((a:number,p:any)=>a+j.accessors[p.indices].count/3,0),0);
  assert.ok(triangles(lo)<triangles(hi)*.85,file+' has an actual mesh LOD');
  for(const node of hi.nodes){const counterpart=lo.nodes.find((n:any)=>n.name===node.name);assert.deepEqual(counterpart.translation,node.translation);}
 }
});
