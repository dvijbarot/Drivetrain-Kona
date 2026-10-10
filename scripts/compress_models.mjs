// Optional build step after Blender export. Draco decoder is hosted locally.
import {readdir,copyFile,mkdir,rename,readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
await mkdir('public/draco',{recursive:true});
for(const name of ['draco_decoder.js','draco_decoder.wasm','draco_wasm_wrapper.js']){
 await copyFile(join('node_modules/three/examples/jsm/libs/draco/gltf',name),join('public/draco',name));
}
const files=(await readdir('public/models')).filter(name=>name.endsWith('.glb')&&!name.endsWith('.tmp.glb'));
const manifest=[];
for(const name of files){
 const src=join('public/models',name),dest=join('public/models',name.replace('.glb','.tmp.glb'));
 const data=await readFile(src),length=data.readUInt32LE(12),json=JSON.parse(data.subarray(20,20+length).toString());
 if(!json.extensionsUsed?.includes('KHR_draco_mesh_compression')){
  const result=spawnSync('npx',['--yes','@gltf-transform/cli@4.5.1','draco',src,dest,'--method','edgebreaker'],{stdio:'inherit'});
  if(result.status!==0)throw new Error('Draco compression failed for '+name);
  await rename(dest,src);
 }
 const final=await readFile(src),n=final.readUInt32LE(12),j=JSON.parse(final.subarray(20,20+n).toString());
 manifest.push({file:name,bytes:final.length,triangles:j.meshes.reduce((sum,m)=>sum+m.primitives.reduce((a,p)=>a+(j.accessors[p.indices]?.count||0)/3,0),0),assemblies:j.nodes.map(n=>n.name),lod:name.includes('-low')?'Low':'High',compression:'Draco'});
}
await writeFile('public/models/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Saved asset manifest for '+manifest.length+' models.');
