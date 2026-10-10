import { Component, Suspense, createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Line, useProgress } from '@react-three/drei';
import { EffectComposer, N8AO, Bloom, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import gsap from 'gsap';
gsap.ticker.lagSmoothing(0);
import type { Snapshot, Inputs } from './mechanics';
import { beltPath, pulleyRadii } from './mechanics';
import type { Focus, View } from './content';
import { partById, parts } from './content';
import { ModelAsset, Chassis, AssetQuality } from './Assets';
import type { BodyMode } from './Assets';
import { PhotoExterior } from './PhotoExterior';
import { assetPath } from './assetPath';

export type SceneProps={s:Snapshot;inputs:Inputs;selected:string;onSelect:(id:string)=>void;onInspect:(id:string)=>void;onReveal:()=>void;focus:Focus;view:View;explode:number;labels:boolean;hidden:string[];isolated:string|null;dim:boolean;playing:boolean;rate:number;time:number;quality:string;cameraReset:number;cameraView:string;power:boolean;body:BodyMode;chassis:boolean;floor:boolean;hoodOpen:boolean;onSoftwareRenderer?:()=>void;};
const Ctx=createContext<SceneProps & {labelNodes:Map<string,HTMLButtonElement>;photoRegistered:boolean;photoRef:React.RefObject<HTMLImageElement|null>}>(null!);
const MatCtx=createContext({opacity:1,selected:false});
const XROT:[number,number,number]=[0,0,Math.PI/2];
function Material({color='#8e99a4',metal=.8,rough=.3,opacity=1}:{color?:string;metal?:number;rough?:number;opacity?:number}){
 const m=useContext(MatCtx);
 return <meshPhysicalMaterial color={color} metalness={metal} roughness={rough} clearcoat={metal>.5?.18:0} clearcoatRoughness={.35} envMapIntensity={1} side={THREE.DoubleSide} transparent={opacity*m.opacity<1} opacity={opacity*m.opacity} depthWrite={opacity*m.opacity>.8} emissive={m.selected?'#90b7c8':'#000000'} emissiveIntensity={m.selected?.035:0}/>;
}
function Detailed({url,names,opacity=1,clip}:{url:string;names:string[];opacity?:number;clip?:[number,number,number,number]}){const m=useContext(MatCtx);return <ModelAsset url={url} names={names} opacity={opacity*m.opacity} selected={m.selected} clip={clip}/>;}
function Part({id,children}:{id:string;children:ReactNode}){
 const c=useContext(Ctx); const [hover,setHover]=useState(false);
 const p=partById(id);
 const assemblyIsolation=c.isolated==='converter'?'Converter':c.isolated==='engine'?'Engine':c.isolated;
 const focusedAssembly=c.focus==='engine'?'Engine':c.focus==='converter'?'Converter':c.focus==='ivt'?'IVT':c.focus==='awd'?'AWD':null;
 const hidden=focusedAssembly!==null&&p.assembly!==focusedAssembly&&!(c.focus==='awd'&&id==='chassis') || c.hidden.includes(id) || c.hidden.includes('converter')&&p.assembly==='Converter' || c.hidden.includes('engine')&&p.assembly==='Engine' || (assemblyIsolation!==null && assemblyIsolation!==id && assemblyIsolation!==p.assembly);
 if(hidden)return null;
 const selected=c.selected===id || c.selected==='converter'&&p.assembly==='Converter';
 const related=partById(c.selected).assembly===p.assembly;
 const opacity=c.dim&&!selected?related?.5:.13:1;
 return <MatCtx.Provider value={{opacity,selected:selected||hover}}><group onClick={e=>{e.stopPropagation();c.onSelect(id)}} onPointerOver={e=>{e.stopPropagation();setHover(true);document.body.style.cursor='pointer'}} onPointerOut={()=>{setHover(false);document.body.style.cursor='auto'}}>{children}</group></MatCtx.Provider>;
}
function Box({pos=[0,0,0],size=[1,1,1],color,opacity=1}:{pos?:[number,number,number];size?:[number,number,number];color?:string;opacity?:number}){
 const geometry=useMemo(()=>new RoundedBoxGeometry(...size,2,Math.min(...size)*.14),[size.join(',')]);
 return <mesh position={pos} geometry={geometry} castShadow receiveShadow><Material color={color} opacity={opacity}/></mesh>;
}
function Shaft({pos=[0,0,0],length=1,r=.08,color='#9aa6b1',axis='x',opacity=1}:{pos?:[number,number,number];length?:number;r?:number;color?:string;axis?:'x'|'z'|'y';opacity?:number}){
 return <mesh position={pos} rotation={axis==='x'?XROT:axis==='z'?[Math.PI/2,0,0]:[0,0,0]} castShadow><cylinderGeometry args={[r,r,length,48]}/><Material color={color} opacity={opacity}/></mesh>;
}
function Turned({profile,color='#a6adb3',arc=Math.PI*2,opacity=1}:{profile:[number,number][];color?:string;arc?:number;opacity?:number}){
 const geometry=useMemo(()=>{const g=new THREE.LatheGeometry(profile.map(([x,r])=>new THREE.Vector2(r,x)),96,0,arc);g.rotateZ(-Math.PI/2);return g},[JSON.stringify(profile),arc]);
 return <mesh geometry={geometry} castShadow receiveShadow><Material color={color} rough={.30} opacity={opacity}/></mesh>;
}
function Ring({x=0,r=.5,tube=.035,color='#9aa6b1',arc=Math.PI*2,opacity=1}:{x?:number;r?:number;tube?:number;color?:string;arc?:number;opacity?:number}){
 return <mesh position={[x,0,0]} rotation={[0,Math.PI/2,0]} castShadow><torusGeometry args={[r,tube,10,64,arc]}/><Material color={color} opacity={opacity}/></mesh>;
}
function Gear({r=.45,width=.12,color='#9aa6b1',teeth=28}:{r?:number;width?:number;color?:string;teeth?:number}){
 const geometry=useMemo(()=>{
  const shape=new THREE.Shape(),pitch=2*Math.PI/teeth;
  // A bevelled involute-like silhouette; tooth dimensions are representative.
  for(let j=0;j<teeth;j++){
   const points=[[-.5,.90],[-.34,.90],[-.28,.95],[-.18,1.03],[.18,1.03],[.28,.95],[.34,.90],[.5,.90]];
   points.forEach(([a,f],k)=>{const angle=(j+a)*pitch,x=r*f*Math.cos(angle),y=r*f*Math.sin(angle);if(j===0&&k===0)shape.moveTo(x,y);else shape.lineTo(x,y)});
  }
  shape.closePath();const hole=new THREE.Path();hole.absarc(0,0,r*.23,0,Math.PI*2,true);shape.holes.push(hole);
  const g=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelSegments:2,bevelSize:Math.min(width*.09,r*.014),bevelThickness:Math.min(width*.09,r*.014),curveSegments:24});g.rotateY(Math.PI/2);g.translate(-width/2,0,0);return g;
 },[width,r,teeth]);
 return <group><mesh geometry={geometry} castShadow><Material color={color} rough={.32}/></mesh><Ring x={width/2+.001} r={r*.70} tube={.008} color="#aab2b8"/><Ring x={-width/2-.001} r={r*.70} tube={.008} color="#aab2b8"/><Shaft length={width+.08} r={r*.22}/></group>;
}
function CamLobe(){
 const geometry=useMemo(()=>{
  const s=new THREE.Shape();s.moveTo(-.045,0);s.bezierCurveTo(-.06,-.069,.06,-.069,.045,0);s.bezierCurveTo(.042,.053,.028,.106,0,.106);s.bezierCurveTo(-.028,.106,-.042,.053,-.045,0);
  const g=new THREE.ExtrudeGeometry(s,{depth:.044,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:2,curveSegments:24});g.rotateY(Math.PI/2);g.translate(-.022,0,0);return g;
 },[]);
 return <mesh geometry={geometry} castShadow><Material color="#a6afb5" rough={.27}/></mesh>;
}
function ValveSpring(){
 const geometry=useMemo(()=>{
  const points=Array.from({length:100},(_,j)=>{const t=j/99,a=t*5.5*Math.PI*2;return new THREE.Vector3(.027*Math.cos(a),-.015+t*.14,.027*Math.sin(a))});
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),100,.004,7,false);
 },[]);
 return <mesh geometry={geometry}><Material color="#6e7982" rough={.32}/></mesh>;
}
function StaticInstances({geometry,matrices,color}:{geometry:THREE.BufferGeometry;matrices:THREE.Matrix4[];color:string}){
 const ref=useRef<THREE.InstancedMesh>(null!);
 useLayoutEffect(()=>{matrices.forEach((m,j)=>ref.current.setMatrixAt(j,m));ref.current.instanceMatrix.needsUpdate=true;ref.current.computeBoundingSphere()},[matrices]);
 return <instancedMesh ref={ref} args={[geometry,undefined,matrices.length]} castShadow><Material color={color}/></instancedMesh>;
}
function Spin({rpm,children,axis='x'}:{rpm:number;children:ReactNode;axis?:'x'|'z'}){
 const ref=useRef<THREE.Group>(null!);const c=useContext(Ctx);const prev=useRef(c.time);
 useFrame((_,dt)=>{if(c.playing){if(c.time<prev.current&&prev.current<29)ref.current.rotation[axis]=0;else ref.current.rotation[axis]+=rpm/60*Math.PI*2*dt*.018*c.rate;}else if(c.time!==prev.current)ref.current.rotation[axis]+=(c.time-prev.current)*rpm/60*Math.PI*2*.018;prev.current=c.time;});
 return <group ref={ref}>{children}</group>;
}
function Assembly({pos,offset,children}:{pos:[number,number,number];offset:[number,number,number];children:ReactNode}){
 const c=useContext(Ctx);const ref=useRef<THREE.Group>(null!);const invalidate=useThree(state=>state.invalidate);
 useFrame((_,dt)=>{const a=1-Math.exp(-dt*8),target=new THREE.Vector3(...pos).addScaledVector(new THREE.Vector3(...offset),c.explode);ref.current.position.lerp(target,a);if(ref.current.position.distanceToSquared(target)>.000001)invalidate();});
 return <group ref={ref} position={pos}>{children}</group>;
}
function Label({id,pos,short}:{id:string;pos:[number,number,number];short?:string}){
 const c=useContext(Ctx);
 const ref=useRef<THREE.Group>(null!);const v=useMemo(()=>new THREE.Vector3(),[]);
 useEffect(()=>()=>{const el=c.labelNodes.get(id);if(el)el.style.display='none'},[id,c.labelNodes]);
 useFrame(({camera,size})=>{
  const el=c.labelNodes.get(id);if(!el||!ref.current)return;
  const assembly=partById(id).assembly,focused=c.focus==='engine'?'Engine':c.focus==='converter'?'Converter':c.focus==='ivt'?'IVT':c.focus==='awd'?'AWD':null;
  const isolate=c.isolated==='converter'?'Converter':c.isolated==='engine'?'Engine':c.isolated;
  const show=c.labels&&!c.hidden.includes(id)&&!(c.hidden.includes('converter')&&assembly==='Converter')&&!(c.hidden.includes('engine')&&assembly==='Engine')&&(!focused||focused===assembly)&&(!isolate||isolate===id||isolate===assembly)&&(c.focus!=='overview'||['engine','converter','reardiff'].includes(id));
  ref.current.getWorldPosition(v);v.project(camera);
  el.style.display=show&&v.z<1&&v.z>-1?'flex':'none';el.style.left=(v.x*.5+.5)*size.width+'px';el.style.top=(-v.y*.5+.5)*size.height+'px';
  if(short){const name=el.querySelector('span');if(name)name.textContent=short;}
 });
 return <group ref={ref} position={pos}/>;
}
function Piston({x,phase}:{x:number;phase:number}){
 const ref=useRef<THREE.Group>(null!);const rod=useRef<THREE.Group>(null!);const c=useContext(Ctx);const theta=useRef(c.time*c.s.engineRPM/60*Math.PI*2*.018),prev=useRef(c.time);
 useFrame((_,dt)=>{if(c.playing){if(c.time<prev.current&&prev.current<29)theta.current=0;else theta.current+=c.s.engineRPM/60*Math.PI*2*dt*.018*c.rate;}else if(c.time!==prev.current)theta.current+=(c.time-prev.current)*c.s.engineRPM/60*Math.PI*2*.018;prev.current=c.time;
  const angle=theta.current+phase,r=.2,L=.65,pinY=r*Math.cos(angle),pinZ=r*Math.sin(angle);
  const py=pinY+Math.sqrt(L*L-pinZ*pinZ);ref.current.position.y=py;
  rod.current.position.set(x,(py+pinY)/2,pinZ/2);rod.current.rotation.x=Math.atan2(-pinZ,py-pinY);
 });
 return <><group ref={ref} position={[x,.7,0]}><mesh rotation={[0,0,Math.PI/2]}><Turned profile={[[-.115,.177],[-.105,.202],[-.03,.205],[.018,.202],[.023,.192],[.029,.204],[.061,.204],[.066,.192],[.073,.204],[.091,.201],[.103,.18],[.107,0]]} color="#c8cbd0"/></mesh>{[.085,.045].map(y=><mesh key={y} position={[0,y,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.205,.005,8,64]}/><Material color="#4b5055"/></mesh>)}<Shaft pos={[0,-.035,0]} length={.40} r={.035} color="#9da7ad"/></group><group ref={rod}><Box size={[.077,.65,.087]} color="#abb3b9"/>{[-1,1].map(side=><Box key={side} pos={[side*.045,0,0]} size={[.025,.53,.115]} color="#9ca5ab"/>)}<group position={[0,-.325,0]}><Ring r={.093} tube={.023} color="#aab3ba"/><Shaft length={.145} r={.071} color="#889198"/>{[-.063,.063].map(z=><Shaft key={z} pos={[0,-.018,z]} axis="y" length={.13} r={.013} color="#626c75"/>)}</group><group position={[0,.325,0]}><Ring r={.041} tube={.012} color="#bbc3c7"/></group></group></>;

}
function Engine(){
 const c=useContext(Ctx);const exterior=c.view==='Exterior',packed=c.focus==='overview'||c.focus==='awd';
 return <group scale={packed?.28:1} position={packed?[.30,.48,-1.48]:[0,0,0]} rotation={packed?[0,Math.PI,0]:[0,0,0]}>
 <Assembly pos={packed?[0,0,0]:[-1.6,.35,-2.05]} offset={[-1.5,.1,0]}>
  <Part id="engine">
   <Detailed url="/models/engine-castings.glb" names={[exterior||c.view==='Transparent'?'block':'block_cut']} opacity={c.view==='Transparent'?.24:1} clip={!exterior&&c.view!=='Transparent'?[0,0,1,-.045]:undefined}/>
   <Assembly pos={[0,0,0]} offset={[0,.70,0]}><Detailed url="/models/engine-castings.glb" names={['head']} opacity={c.view==='Transparent'?.24:1} clip={!exterior&&c.view!=='Transparent'?[0,0,1,-.045]:undefined}/></Assembly>
   <Assembly pos={[0,0,0]} offset={[0,1.20,0]}>{(exterior||c.view==='Transparent'||c.explode>.1)&&<Detailed url="/models/engine-castings.glb" names={['cover']} opacity={c.view==='Transparent'?.16:1}/>}</Assembly>
   <Assembly pos={[0,0,0]} offset={[0,-.7,0]}><Detailed url="/models/engine-castings.glb" names={['pan']} clip={!exterior&&c.view!=='Transparent'?[0,0,1,-.045]:undefined} opacity={c.view==='Transparent'?.24:1}/></Assembly>
   <Assembly pos={[0,0,0]} offset={[-.75,0,0]}><Detailed url="/models/engine-castings.glb" names={['timing','ancillary']} opacity={c.view==='Transparent'?.32:1}/></Assembly>
   {(exterior||packed)&&<Detailed url="/models/engine-castings.glb" names={['intake','exhaust']} opacity={c.view==='Transparent'?.30:1}/>}
  </Part>
  <Part id="crankshaft"><Spin rpm={c.s.engineRPM}><Shaft length={2.05} r={.095} color="#b7afb0"/>{[-.675,-.225,.225,.675].map((x,j)=><group key={x} rotation={[j===0||j===3?0:Math.PI,0,0]}><Box pos={[x,.02,0]} size={[.14,.48,.34]} color="#7a8185"/><Shaft pos={[x,.2,0]} length={.2} r={.071} color="#bbc3c9"/><Shaft pos={[x-.11,0,0]} length={.046} r={.16} color="#89939a"/></group>)}{[-.98,-.45,0,.45,.98].map(x=><Shaft key={x} pos={[x,0,0]} length={.09} r={.108} color="#d0d6d9"/>)}</Spin>{[-.675,-.225,.225,.675].map((x,j)=><Piston key={x} x={x} phase={j===0||j===3?0:Math.PI}/>)}</Part>
  <Part id="flexplate"><Assembly pos={[1.06,0,0]} offset={[.25,0,0]}><Spin rpm={c.s.engineRPM}><Gear r={.39} width={.07} color="#a9b1b7" teeth={72}/>{Array.from({length:6},(_,j)=><group key={j} rotation={[j/6*Math.PI*2,0,0]}><Shaft pos={[.05,.24,0]} length={.028} r={.025} color="#4e575c"/></group>)}</Spin></Assembly></Part>
  <Part id="cams"><Assembly pos={[0,1.42,0]} offset={[0,.85,0]}>{[-.19,.19].map((z,k)=><group key={z} position={[0,0,z]}><Spin rpm={c.s.engineRPM/2}><Shaft length={1.9} r={.05} color="#a7a7a1"/>{[-.675,-.225,.225,.675].map((x,j)=><group key={x} position={[x,0,0]} rotation={[j*Math.PI/2+k*Math.PI/2,0,0]}>{[-.065,.065].map(dx=><group key={dx} position={[dx,0,0]}><CamLobe/></group>)}</group>)}</Spin></group>)}</Assembly></Part>
  <Part id="valves"><Assembly pos={[0,1.16,0]} offset={[0,.45,0]}>{[-.675,-.225,.225,.675].map((x,j)=><ValveSet key={x} x={x} cylinder={j}/>)}</Assembly></Part>
  <Label id="engine" pos={[-.2,1.95,0]} short="2.0L MPI engine"/>
 </Assembly></group>;
}
function ValveSet({x,cylinder}:{x:number;cylinder:number}){
 const c=useContext(Ctx),intake=useRef<THREE.Group>(null!),exhaust=useRef<THREE.Group>(null!),theta=useRef(c.time*c.s.engineRPM/60*Math.PI*2*.018),prev=useRef(c.time);
 useFrame((_,dt)=>{if(c.playing){if(c.time<prev.current&&prev.current<29)theta.current=0;else theta.current+=c.s.engineRPM/60*Math.PI*2*dt*.018*c.rate;}else if(c.time!==prev.current)theta.current+=(c.time-prev.current)*c.s.engineRPM/60*Math.PI*2*.018;prev.current=c.time;
  const p=(theta.current+[0,Math.PI*3,Math.PI,Math.PI*2][cylinder])%(Math.PI*4);
  intake.current.position.y=p<Math.PI?-.07*Math.sin(p):0;exhaust.current.position.y=p>3*Math.PI?-.07*Math.sin(p-3*Math.PI):0;
 });
 return <group position={[x,0,0]}>{[-1,1].map(side=><group ref={side<0?intake:exhaust} key={side} position={[0,0,side*.19]}>{[-.065,.065].map(dx=><group key={dx} position={[dx,0,0]}><Shaft axis="y" length={.22} r={.015} color="#b4c5cd"/><Shaft axis="y" pos={[0,-.12,0]} length={.02} r={.065} color="#839aa8"/><ValveSpring/></group>)}</group>)}</group>;
}
function BladeWheel({r,color,reverse=false}:{r:number;color:string;reverse?:boolean}){
 const c=useContext(Ctx);
 const geometry=useMemo(()=>{
  const stator=r<.4,verts:number[]=[],indices:number[]=[];
  const rows=20,cols=5;
  for(let j=0;j<=rows;j++){
   const t=j/rows,rad=(stator?.19:.20)+(r-(stator?.19:.20))*t;
   const sweep=(stator?.62:.38)*Math.sin(t*Math.PI/2),bowl=stator?0:-.15*Math.sin(Math.PI*t);
   for(let k=0;k<=cols;k++){
    const v=k/cols,x=bowl+v*(stator?.15:.15)*(Math.sin(Math.PI*t)*.65+.35),angle=sweep+(v-.5)*(stator?.28:.07);
    verts.push(reverse?-x:x,rad*Math.cos(angle),rad*Math.sin(angle));
   }
  }
  for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const a=j*(cols+1)+k,b=a+cols+1;indices.push(a,b,a+1,b,b+1,a+1)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();return g;
 },[r,reverse]);
 const count=r<.4?16:32;
 const matrices=useMemo(()=>Array.from({length:count},(_,j)=>{const o=new THREE.Object3D();o.rotation.x=j/count*Math.PI*2;o.updateMatrix();return o.matrix.clone()}),[count]);
 return <group>
  {r>.4&&<group rotation={reverse?[0,Math.PI,0]:[0,0,0]}><Turned profile={[[0,.19],[-.065,.26],[-.13,.4],[-.15,.48],[-.13,.58],[-.065,.66],[0,r]]} arc={c.view==='Exterior'?Math.PI*2:Math.PI*1.15} color={color}/></group>}
  <Shaft length={.16} r={r<.4?.18:.20} color="#a1a9b1"/><Ring r={r} tube={.019} color={color}/>
  <StaticInstances geometry={geometry} matrices={matrices} color={color}/>
 </group>;
}
function Fluid(){
 const c=useContext(Ctx);const inst=useRef<THREE.InstancedMesh>(null!);const t=useRef(0);const dummy=useMemo(()=>new THREE.Object3D(),[]);
 const paths=useMemo(()=>Array.from({length:10},(_,j)=>{
  const angle=j/10*Math.PI*2;return Array.from({length:61},(_,k)=>{
   const a=k/60*Math.PI*2, r=.46+.28*Math.cos(a),x=.18*Math.sin(a),swirl=angle+.3*Math.sin(a);
   return new THREE.Vector3(x,r*Math.sin(swirl),r*Math.cos(swirl));
  });
 }),[]);
 useFrame((_,dt)=>{if(!inst.current)return;if(c.playing)t.current+=dt*c.rate*c.s.engineRPM/1500*(c.s.lockup?.15:1);else t.current=c.time*c.s.engineRPM/1500;
  for(let j=0;j<100;j++){const angle=Math.floor(j/10)/10*Math.PI*2,phase=(j%10/10+t.current*.27)%1,a=phase*Math.PI*2,r=.46+.28*Math.cos(a),swirl=angle+.3*Math.sin(a);
   dummy.position.set(.18*Math.sin(a),r*Math.sin(swirl),r*Math.cos(swirl));dummy.scale.setScalar(c.s.lockup?.35:1);dummy.updateMatrix();inst.current.setMatrixAt(j,dummy.matrix);
  }inst.current.instanceMatrix.needsUpdate=true;
 });
 return <group>{paths.map((p,j)=><Line key={j} points={p} color="#6ac4e1" transparent opacity={.22} lineWidth={1}/>)}<instancedMesh ref={inst} args={[undefined,undefined,100]}><sphereGeometry args={[.025,6,6]}/><meshBasicMaterial color="#9edff2" transparent opacity={.9}/></instancedMesh></group>;
}
function Converter(){
 const c=useContext(Ctx);const exterior=c.view==='Exterior';const flow=c.view==='Fluid flow';const e=c.explode;const packed=c.focus==='overview'||c.focus==='awd';
 return <group position={packed?[-.105,.48,-1.48]:[0,0,0]} scale={packed?.22:1}><Assembly pos={packed?[0,0,0]:[-.05,.35,-2.05]} offset={[-.1,.35,0]}>
  <Part id="housing"><Spin rpm={c.s.engineRPM}><Turned profile={[[-.39,.17],[-.37,.34],[-.33,.52],[-.26,.66],[-.16,.75],[0,.775],[.19,.73],[.29,.57],[.34,.33],[.34,.15]]} color="#9ea5ac" opacity={exterior?1:flow?.08:c.view==='Transparent'?.15:.4} arc={exterior||c.view==='Transparent'?Math.PI*2:Math.PI*1.25}/><Ring r={.772} tube={.013} color="#676f77"/><Shaft pos={[.40,0,0]} length={.2} r={.14} color="#a3abb2"/>{Array.from({length:6},(_,j)=><group key={j} rotation={[j/6*Math.PI*2,0,0]}><Box pos={[-.32,.58,0]} size={[.12,.12,.19]} color="#b5bac0"/><Shaft pos={[-.40,.58,0]} length={.03} r={.029} color="#4a535b"/></group>)}</Spin></Part>
  <Part id="impeller"><Assembly pos={[-.16,0,0]} offset={[-.95,0,0]}><Spin rpm={c.s.engineRPM}><BladeWheel r={.70} color="#b7a58f"/></Spin><Label id="impeller" pos={[0,-.95,0]} short="Impeller"/></Assembly></Part>
  <Part id="stator"><Assembly pos={[0,0,0]} offset={[.15,0,0]}><Spin rpm={c.s.statorLocked?0:c.s.turbineRPM*.65}><BladeWheel r={.37} color="#9a92a7"/><Ring r={.18} tube={.048} color="#8b6db2"/>{Array.from({length:8},(_,j)=><group key={j} rotation={[j/8*Math.PI*2,0,0]}><Box pos={[0,.18,0]} size={[.12,.035,.025]} color="#d3c5eb"/></group>)}</Spin><Label id="stator" pos={[0,.65,0]} short="Stator + one-way clutch"/></Assembly></Part>
  <Part id="turbine"><Assembly pos={[.16,0,0]} offset={[1.05,0,0]}><Spin rpm={c.s.turbineRPM}><BladeWheel r={.69} color="#9aafb9" reverse/><Shaft length={.6} r={.10} color="#72bdcd"/></Spin><Label id="turbine" pos={[0,-.95,0]} short="Turbine"/></Assembly></Part>
  <Part id="lockup"><Assembly pos={[c.s.lockup?-.27:-.35,0,0]} offset={[-1.65,0,0]}><Spin rpm={c.s.turbineRPM}><Ring r={.57} tube={.053} color="#a8d79b" opacity={flow?.18:1}/><Shaft length={.028} r={.58} color="#7b9b74" opacity={flow?.10:1}/><Shaft length={.04} r={.20} color="#afc5a9" opacity={flow?.18:1}/>{Array.from({length:8},(_,j)=><group key={j} rotation={[j/8*Math.PI*2,0,0]}><Box pos={[0,.31,0]} size={[.05,.04,.15]} color="#c9d2c5"/></group>)}</Spin><Label id="lockup" pos={[0,1,0]} short="Lock-up clutch"/></Assembly></Part>
  {flow&&e<.15&&<Fluid/>}
  <Label id="converter" pos={[0,1.2,0]} short="Torque converter"/>
 </Assembly></group>;
}
function Sheave({center,faceRight,color}:{center:number;faceRight:boolean;color:string}){
 const c=useContext(Ctx);
 const ref=useRef<THREE.Group>(null!);const invalidate=useThree(state=>state.invalidate);
 useFrame((_,dt)=>{ref.current.position.x=THREE.MathUtils.damp(ref.current.position.x,center,12,dt);if(Math.abs(ref.current.position.x-center)>.0001)invalidate()});
 // Facing conical discs: chain runs between tapered faces.
 const profile:[number,number][]=[[-.16,.19],[-.16,.34],[-.13,.64],[-.12,.85],[-.102,.884],[-.085,.89],[.085,.22],[.105,.19]];
 return <group ref={ref} position={[center,0,0]} rotation={faceRight?[0,Math.PI,0]:[0,0,0]}><Turned profile={profile} color={color} arc={c.view==='Exterior'||c.view==='Exploded'?Math.PI*2:Math.PI*1.35}/><Ring r={.875} tube={.005} arc={c.view==='Exterior'||c.view==='Exploded'?Math.PI*2:Math.PI*1.35} color="#d1d5d8"/><Shaft length={.22} r={.18} color="#afb5ba"/>{[.26,.40,.56,.72,.83].map(radius=><Ring key={radius} r={radius} tube={.0018} x={.085-(radius-.22)*.257} arc={c.view==='Exterior'||c.view==='Exploded'?Math.PI*2:Math.PI*1.35} color="#7b858b"/>)}</group>;

}
function Chain({r1,r2}:{r1:number;r2:number}){
 const c=useContext(Ctx);const inst=useRef<THREE.InstancedMesh>(null!);const dummy=useMemo(()=>new THREE.Object3D(),[]);
 const linkGeometry=useMemo(()=>{
  const plates=[-.057,-.034,-.011,.011,.034,.057].map(x=>new RoundedBoxGeometry(.014,.035,.044,1,.004).translate(x,0,0));
  const pins=[-.013,.013].map(z=>new THREE.CylinderGeometry(.006,.006,.13,10).rotateZ(Math.PI/2).translate(0,0,z).toNonIndexed());
  return mergeGeometries([...plates,...pins])!;
 },[]);
 const path=useMemo(()=>beltPath(r1,r2),[r1,r2]);const travel=useRef(0);
 useFrame((_,dt)=>{if(!inst.current)return;if(c.playing)travel.current+=c.s.connected?c.s.turbineRPM/60*Math.PI*2*r1*dt*.018*c.rate:0;else travel.current=c.time*c.s.turbineRPM/60*Math.PI*2*r1*.018;
  const count=path.length;const shift=-travel.current/(2*1.85+Math.PI*(r1+r2))*count;
  for(let j=0;j<count;j++){let idx=((j+shift)%count+count)%count;const k=Math.floor(idx),f=idx-k,p=path[k],q=path[(k+1)%count];
    const z=THREE.MathUtils.lerp(p[0],q[0],f),y=THREE.MathUtils.lerp(p[1],q[1],f),theta=Math.acos((r1-r2)/1.85);
    const x1=-.325+(r1-.22)*.257,x2=-.14-(r2-.22)*.257;
    const blend=Math.abs(Math.hypot(z,y)-r1)<.005?0:Math.abs(Math.hypot(z-1.85,y)-r2)<.005?1:THREE.MathUtils.clamp((z-r1*Math.cos(theta))/(1.85+(r2-r1)*Math.cos(theta)),0,1);
    dummy.position.set(THREE.MathUtils.lerp(x1,x2,blend),y,z);
    dummy.rotation.set(-Math.atan2(q[1]-p[1],q[0]-p[0]),0,0);dummy.updateMatrix();inst.current.setMatrixAt(j,dummy.matrix);
  }inst.current.instanceMatrix.needsUpdate=true;
 });
 return <Part id="chain"><group position={[-c.explode*.9,0,0]}><instancedMesh ref={inst} args={[linkGeometry,undefined,160]} castShadow><Material color="#acb7bc" rough={.28}/></instancedMesh></group></Part>;
}
function Pulley({primary,r}:{primary:boolean;r:number}){
 const c=useContext(Ctx);const id=primary?'primary':'secondary';const offset=-.35+2*(r-.22)*.257;
 const actuatorX=primary?.56:-.74,movable=primary?offset:-.115-2*(r-.22)*.257,extension=Math.abs(movable-actuatorX);
 return <group position={[0,0,primary?0:1.85]}>
  <Part id={id}><Spin rpm={!c.s.connected?0:primary?c.s.turbineRPM:c.s.outputRPM}><Shaft length={1.5} r={.105} color="#72bdcd"/><Sheave center={primary?-.30:-.165} faceRight={primary} color="#95a4af"/><group position={[c.explode*(primary?.65:-.65),0,0]}><Sheave center={primary?offset:-.115-2*(r-.22)*.257} faceRight={!primary} color="#8fa0ae"/></group>{c.view!=='Exterior'&&<Ring r={r} tube={.013} x={primary?-.325+(r-.22)*.257:-.14-(r-.22)*.257} color="#83ccd9"/>}</Spin></Part>
  <Part id="hydraulics"><Assembly pos={[actuatorX,0,0]} offset={[primary?1.35:-1.35,0,0]}><Shaft length={.17} r={.42} color="#8d78aa"/><Shaft pos={[(movable-actuatorX)/2,0,0]} length={extension} r={.13} color="#b899dd"/><Line points={[[.58,0,0],[.62,-.8,0],[.62,-.8,primary?.65:-1.2]]} color="#b99add" lineWidth={2}/></Assembly></Part>
  <Part id="bearings">{[-.61,.65].map(x=><Assembly key={x} pos={[x,0,0]} offset={[x<0?-.4:.8,0,0]}><Ring r={.145} tube={.036}/>{Array.from({length:10},(_,j)=><mesh key={j} position={[0,.144*Math.sin(j/10*Math.PI*2),.144*Math.cos(j/10*Math.PI*2)]}><sphereGeometry args={[.025,8,8]}/><Material color="#d6e0e5"/></mesh>)}</Assembly>)}</Part>
  <Label id={id} pos={[0,1.14,0]} short={primary?'Primary pulley':'Secondary pulley'}/>
 </group>;
}
function IVT(){
 const c=useContext(Ctx);const r=pulleyRadii(c.s.ratio);
 const outer=c.view==='Exterior',packed=c.focus==='overview'||c.focus==='awd';
 return <group position={packed?[-.43,.48,-1.48]:[0,0,0]} scale={packed?[-.22,.22,.22]:[1,1,1]}><Assembly pos={packed?[0,0,0]:[1,.35,-2.05]} offset={[1.2,.25,0]}>
  <Part id="primary"><Detailed url="/models/ivt-casting.glb" names={['case','bell','pan']} opacity={outer?1:c.view==='Transparent'?.15:.10} clip={!outer&&c.view!=='Transparent'?[1,0,0,.12]:undefined}/></Part>
  <Pulley primary r={r.input}/><Pulley primary={false} r={r.output}/><Chain r1={r.input} r2={r.output}/>
  <Part id="hydraulics"><Box pos={[.20,-1.02,.92]} size={[.72,.15,1.60]} color="#726183"/>{Array.from({length:6},(_,j)=><Shaft key={j} pos={[.21,-1.11,.35+j*.19]} axis="x" length={.6} r={.034} color="#b899dd"/>)}</Part>
  <Part id="range"><group position={[.90,.0,1.85]}><Spin rpm={c.s.outputRPM}><Gear r={.35} color="#9caf9a"/></Spin><group position={[0,-.35,.5]}><Gear r={.22} color="#aecda4"/></group><Box pos={[.0,.24,.4]} size={[.15,.07,.33]} color={c.inputs.gear==='P'?'#e8a358':'#849581'}/></group></Part>
  <Label id="chain" pos={[-.16,.15,.9]} short="Metal chain belt"/>
 </Assembly></group>;
}
function Differential({rear=false}){
 const c=useContext(Ctx),id=rear?'reardiff':'frontdiff',rpm=(rear?c.s.rearWheelRPM:c.s.wheelRPM)*c.s.direction;
 return <Assembly pos={rear?[0,.347,1.33]:[-.38,.347,-1.33]} offset={rear?[0,.05,.65]:[-.10,-.1,.05]}><group scale={rear?.30:.27}>
  <Part id={id}>
   <Turned profile={[[-.49,.14],[-.42,.24],[-.35,.46],[-.24,.57],[.24,.57],[.36,.43],[.45,.23],[.49,.14]]} color="#929b9f" opacity={c.view==='Exterior'?1:c.view==='Transparent'?.18:.65} arc={c.view==='Exterior'||c.view==='Transparent'?Math.PI*2:Math.PI*1.2}/>
   {[-.42,.42].map(x=><group key={x}><Ring x={x} r={.24} tube={.033} color="#babfc4"/>{Array.from({length:6},(_,j)=><group key={j} rotation={[j/6*Math.PI*2,0,0]}><Shaft pos={[x,.255,0]} length={.06} r={.024} color="#bbc3c8"/></group>)}</group>)}
   <Spin rpm={rpm}><Gear r={.48} width={.11} color="#a4ada8" teeth={52}/><Shaft r={.29} length={.58} color="#717c77"/><Ring x={-.22-c.explode*.5} r={.28} tube={.035} color="#bdc4bd"/><Ring x={.22+c.explode*.5} r={.28} tube={.035} color="#bdc4bd"/></Spin>{[-1,1].map(side=><group key={side} position={[side*(.22+c.explode*.75),0,0]}><Spin rpm={(side===-1?(rear?c.s.rearLeftRPM:c.s.leftRPM):(rear?c.s.rearRightRPM:c.s.rightRPM))*c.s.direction}><Gear r={.19} width={.09} color="#b7c3b6" teeth={16}/></Spin></group>)}<Spin rpm={rpm}><group rotation={[0,0,Math.PI/2]}><Spin rpm={(c.s.rightRPM-c.s.leftRPM)/2}><Gear r={.14} width={.065} color="#bac8bc" teeth={12}/></Spin></group></Spin>
  </Part>
  <Label id={id} pos={[0,1.0,0]} short={rear?'Rear differential':'Front differential'}/>
 </group></Assembly>;
}
function Axle({rear=false}){
 const c=useContext(Ctx),z=rear?1.33:-1.33,center=rear?0:-.38,track=rear?.800:.7955;
 return <Part id="axles">{[-1,1].map(side=>{
  const end=side*track,near=center+side*.06,mid=(end+near)/2,L=Math.abs(end-near);
  return <group key={side} position={[mid,.347,z]}><Spin rpm={(side<0?(rear?c.s.rearLeftRPM:c.s.leftRPM):(rear?c.s.rearRightRPM:c.s.rightRPM))*c.s.direction}><Shaft length={L} r={.019} color="#899a8c"/>{[-1,1].map(k=><group key={k} position={[k*(L/2-.055),0,0]}><Shaft length={.075} r={.036} color="#8d9699"/>{Array.from({length:6},(_,j)=><Ring key={j} x={(j-2.5)*.010} r={.041-Math.abs(j-2.5)*.002} tube={.006} color="#343b3e"/>)}</group>)}</Spin></group>;
 })}</Part>;
}
function Wheel({side,rear=false}:{side:number;rear?:boolean}){
 const c=useContext(Ctx),z=rear?1.33:-1.33;
 const rpm=(side<0?(rear?c.s.rearLeftRPM:c.s.leftRPM):(rear?c.s.rearRightRPM:c.s.rightRPM))*c.s.direction;
 return <Assembly pos={[side*(rear?.800:.7955),.347,z]} offset={[side*.30,0,rear?.16:-.16]}><group rotation={[0,rear?0:-c.inputs.steering/100*.40,0]}>
  <Part id="wheels"><group scale={[side,1,1]}><Spin rpm={rpm*side}><Detailed url="/models/wheel-18.glb" names={['wheel']}/><Detailed url="/models/wheel-18.glb" names={['rotor']}/></Spin><Detailed url="/models/wheel-18.glb" names={['caliper']}/></group></Part>
 </group></Assembly>;
}
function AWD(){
 const c=useContext(Ctx);
 return <><Differential/><Differential rear/><Axle/><Axle rear/>
  <Assembly pos={[-.25,.347,-1.18]} offset={[0,-.10,.18]}><Part id="pto"><Shaft axis="z" length={.17} r={.067} color="#a2a9a1"/><Box pos={[-.03,0,.035]} size={[.18,.16,.20]} color="#9aa09e" opacity={c.view==='Exterior'?1:.30}/><group rotation={[0,Math.PI/2,0]}><Spin rpm={c.s.wheelRPM*3.8*c.s.direction}><Gear r={.055} width={.024} color="#c1c9bf" teeth={16}/></Spin></group></Part></Assembly>
  <Assembly pos={[0,.28,.02]} offset={[0,-.12,.12]}><Part id="prop"><Spin rpm={c.s.wheelRPM*3.8*c.s.direction} axis="z"><Shaft axis="z" length={2.02} r={.029} color="#a1a8ab"/>{[-.85,.85].map(z=><group key={z} position={[0,0,z]}><Shaft axis="z" length={.12} r={.045} color="#adb4b7"/>{Array.from({length:6},(_,j)=><group key={j} rotation={[0,0,j/6*Math.PI*2]}><Shaft pos={[.041,0,0]} axis="z" length={.019} r={.006} color="#737d83"/></group>)}</group>)}<Line points={[[.03,0,-.9],[.03,0,.9]]} color="#b7cab0" lineWidth={1}/></Spin><group position={[0,0,-.12]}><mesh rotation={[0,0,0]}><torusGeometry args={[.039,.01,8,32]}/><Material color="#42494d"/></mesh><Box pos={[0,.05,0]} size={[.15,.025,.04]} color="#6d787d"/></group></Part><Label id="prop" pos={[.18,.16,0]} short="Propeller shaft"/></Assembly>
  <Assembly pos={[0,.347,1.08]} offset={[0,.1,.46]}><Part id="coupling"><group rotation={[0,Math.PI/2,0]} scale={.30}>
   <Turned profile={[[-.45,.12],[-.38,.23],[-.25,.32],[.28,.32],[.36,.24],[.42,.16]]} color="#9ba3a5" opacity={c.view==='Exterior'?1:.22}/>
   {Array.from({length:9},(_,j)=><group key={j} position={[(j-4)*(.033+c.explode*.055),0,0]}><Spin rpm={(j%2===0?c.s.wheelRPM:c.s.rearWheelRPM)*3.8*c.s.direction}><Ring r={.245} tube={.012} color={j%2===0?'#b6c6ad':'#807c6a'}/><Shaft length={.019} r={.225} color={j%2===0?'#a5b5a1':'#7a7664'}/></Spin></group>)}<Box pos={[.03,-.34,0]} size={[.34,.15,.23]} color="#545e61"/>
  </group></Part><Label id="coupling" pos={[0,.25,0]} short="HTRAC coupling"/></Assembly>
  <Wheel side={-1}/><Wheel side={1}/><Wheel side={-1} rear/><Wheel side={1} rear/>
 </>;
}
function PowerPath({points,color,active=1}:{points:[number,number,number][];color:string;active?:number}){
 const c=useContext(Ctx);const inst=useRef<THREE.InstancedMesh>(null!);const curve=useMemo(()=>new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal'),[points]);const t=useRef(0);const dummy=useMemo(()=>new THREE.Object3D(),[]);
 useFrame((_,dt)=>{if(!inst.current)return;if(c.playing)t.current+=dt*c.rate;else t.current=c.time;for(let j=0;j<18;j++){const phase=(t.current*.13+j/18)%1;dummy.position.copy(curve.getPoint(c.s.overrun?1-phase:phase));dummy.scale.setScalar(active);dummy.updateMatrix();inst.current.setMatrixAt(j,dummy.matrix)}inst.current.instanceMatrix.needsUpdate=true;});
 return <><Line points={points} color={color} lineWidth={1.6} transparent opacity={active*.25}/><instancedMesh ref={inst} args={[undefined,undefined,18]}><sphereGeometry args={[.011,8,8]}/><meshBasicMaterial color={color} transparent opacity={active*.85}/></instancedMesh></>;
}
function Power(){
 const c=useContext(Ctx);if(!c.power||c.explode>.15||!['overview','awd'].includes(c.focus))return null;
 const paths:Array<{p:[number,number,number][];color:string;active:number}>=[
 {p:[[.55,.48,-1.48],[-.105,.48,-1.48],[-.43,.48,-1.48]],color:'#e8b172',active:1},
 {p:[[-.43,.48,-1.48],[-.43,.48,-1.07],[-.38,.347,-1.33]],color:'#86c4d2',active:c.s.connected?1:0},
 {p:[[-.38,.347,-1.33],[-.60,.347,-1.33],[-.80,.347,-1.33]],color:'#b6cda9',active:c.s.connected?1:0},
 {p:[[-.38,.347,-1.33],[.15,.347,-1.33],[.80,.347,-1.33]],color:'#b6cda9',active:c.s.connected?1:0},
 {p:[[-.38,.347,-1.33],[-.25,.347,-1.16],[0,.28,-.99],[0,.28,.86],[0,.347,1.08],[0,.347,1.33]],color:'#b6cda9',active:c.s.rearActivity},
 {p:[[0,.347,1.33],[-.40,.347,1.33],[-.80,.347,1.33]],color:'#b6cda9',active:c.s.rearActivity},
 {p:[[0,.347,1.33],[.40,.347,1.33],[.80,.347,1.33]],color:'#b6cda9',active:c.s.rearActivity}
 ];
 return <group>{paths.map((p,j)=><PowerPath key={j} points={p.p} color={p.color} active={p.active}/>)}</group>;
}
const cameras:Record<Focus,{pos:[number,number,number];target:[number,number,number]}>={
 overview:{pos:[-4.8,3.4,-5.5],target:[0,.65,0]},engine:{pos:[-4.8,3.8,-5.2],target:[-1.6,1.05,-2.05]},converter:{pos:[-3,2,1.2],target:[-.05,.35,-2.05]},ivt:{pos:[4.2,3.3,3.6],target:[1,.35,-1.1]},awd:{pos:[4.3,3.4,5],target:[0,.40,0]},comparison:{pos:[9,8,11],target:[0,.15,1.1]}
};
function CameraRig(){
 const c=useContext(Ctx);const controls=useRef<any>(null);const {camera,size,invalidate,gl}=useThree();
 useEffect(()=>{
 const shot=cameras[c.focus];const target=new THREE.Vector3(...shot.target);
 const pos=new THREE.Vector3(...shot.pos);
 const vehicle=c.focus==='overview'||c.focus==='awd',distance=vehicle?6.8:8.5;
 if(c.cameraView==='Top')pos.copy(target).add(new THREE.Vector3(.001,distance,.001));
 if(c.cameraView==='Side')pos.copy(target).add(new THREE.Vector3(distance,1.4,.001));
 if(c.cameraView==='Front')pos.copy(target).add(new THREE.Vector3(0,1.4,-distance));
 if(c.cameraView==='Underside'){target.set(0,.347,0);pos.set(3,-2.2,-4.2)}
 if(c.cameraView==='Wheel detail'){target.set(.80,.347,-1.33);pos.set(1.95,.78,-2.25)}
 if(c.cameraView==='Engine bay'){target.set(0,.66,-1.38);pos.set(-1.4,2.0,-2.4)}
 if(c.photoRegistered){target.set(0,.75,0);pos.set(-7.4,1.65,-.10)}
 if(c.explode>.5&&c.focus!=='overview'&&c.focus!=='awd')pos.add(new THREE.Vector3(1.5,1,1.5));
 const aspect=size.width/size.height,padding=Math.max(1,(c.focus==='overview'||c.focus==='awd'?1.35:1.3)/aspect);pos.sub(target).multiplyScalar(padding).add(target);
 const start=camera.position.clone(),startTarget=controls.current?.target.clone()||new THREE.Vector3(0,.15,1.1);
 const state={progress:0};
 gl.domElement.dataset.cameraSettled='false';gl.domElement.dataset.cameraPreset=c.cameraView;
 if(controls.current){controls.current.enabled=false;controls.current.enableDamping=false;}
 const tween=gsap.to(state,{progress:1,duration:1.15,ease:'power2.inOut',onUpdate:()=>{
  camera.position.lerpVectors(start,pos,state.progress);invalidate();
  if(controls.current){controls.current.target.lerpVectors(startTarget,target,state.progress);controls.current.update();}
 },onComplete:()=>{if(controls.current){controls.current.enabled=!c.photoRegistered;controls.current.enableDamping=true;}gl.domElement.dataset.cameraSettled='true';invalidate();}});
 return ()=>{tween.kill();if(controls.current){controls.current.enabled=true;controls.current.enableDamping=true;}};
 },[c.focus,c.cameraReset,c.cameraView,c.explode>.5,c.photoRegistered,size.width,size.height]);
 return <OrbitControls ref={controls} makeDefault enabled={!c.photoRegistered} enableDamping dampingFactor={.075} minDistance={.6} maxDistance={30} maxPolarAngle={Math.PI*.84}/>;
}
/** Register the real side photograph to the visible wheel centres. This is a
 * two-point presentation alignment, not a claim of OEM CAD registration. */
function PhotoRegistration(){
 const c=useContext(Ctx);
 const front=useMemo(()=>new THREE.Vector3(-.80,.347,-1.33),[]);
 const rear=useMemo(()=>new THREE.Vector3(-.80,.347,1.33),[]);
 const a=useMemo(()=>new THREE.Vector3(),[]),b=useMemo(()=>new THREE.Vector3(),[]);
 useEffect(()=>{
  const el=c.photoRef.current;
  if(!c.photoRegistered&&el){for(const property of ['left','top','width','transform'])el.style.removeProperty(property);delete el.dataset.registered;}
 },[c.photoRegistered,c.photoRef]);
 useFrame(({camera,size})=>{
  const el=c.photoRef.current;if(!c.photoRegistered||!el)return;
  camera.updateMatrixWorld();
  a.copy(front).project(camera);b.copy(rear).project(camera);
  const ax=(a.x*.5+.5)*size.width,ay=(-a.y*.5+.5)*size.height;
  const bx=(b.x*.5+.5)*size.width,by=(-b.y*.5+.5)*size.height;
  // Measured wheel centres in Hyundai frame 001 (normalized 16:9 image).
  const fx=.253,fy=.665*9/16,rx=.790,ry=.660*9/16;
  const width=Math.hypot(bx-ax,by-ay)/Math.hypot(rx-fx,ry-fy);
  const angle=Math.atan2(by-ay,bx-ax)-Math.atan2(ry-fy,rx-fx);
  el.style.width=width+'px';el.style.left=(ax-width*(fx*Math.cos(angle)-fy*Math.sin(angle)))+'px';
  el.style.top=(ay-width*(fx*Math.sin(angle)+fy*Math.cos(angle)))+'px';
  el.style.transform=`rotate(${angle}rad)`;el.dataset.registered='true';
 });
 return null;
}
function World(){
 const c=useContext(Ctx),vehicle=c.focus==='overview'||c.focus==='awd';
 return <><color attach="background" args={['#111111']}/><fog attach="fog" args={['#111111',18,45]}/>
 <ambientLight intensity={.12}/><hemisphereLight args={['#f2efe9','#303030',.45]}/>
 <directionalLight position={[-3,7,-5]} intensity={2.0} color="#f0f3f7" castShadow shadow-mapSize={c.quality==='Low'?512:2048} shadow-bias={-.0002} shadow-normalBias={.025} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5}/>
 <rectAreaLight width={5} height={3} position={[4,4,1]} rotation={[-Math.PI/4,Math.PI/2,0]} intensity={5} color="#d3e0e7"/>
 <directionalLight position={[-5,2,4]} intensity={1.1} color="#c8d4dc"/>
 <Suspense fallback={null}><Environment files={assetPath(c.quality==='Low'?'/studio-low.hdr':'/studio.hdr')} environmentIntensity={.86} environmentRotation={[0,.65,0]}/></Suspense>
 <gridHelper visible={c.cameraView!=='Underside'} args={[30,60,'#303030','#232323']} position={[0,vehicle?-.008:-.74,0]}/>
 <mesh visible={c.cameraView!=='Underside'} rotation={[-Math.PI/2,0,0]} position={[0,vehicle?-.01:-.75,0]} receiveShadow><planeGeometry args={[100,100]}/><meshStandardMaterial color="#161c21" roughness={.84} metalness={.1}/></mesh>
 <AssetQuality.Provider value={c.quality}><Suspense fallback={null}>
 {vehicle&&c.chassis&&<Part id="chassis"><Chassis floor={c.floor} bay={c.focus==='overview'} opacity={c.dim&&c.selected!=='chassis'?.28:1}/></Part>}
 <Engine/><Converter/><IVT/><AWD/><Power/>
 </Suspense></AssetQuality.Provider><CameraRig/><PhotoRegistration/>
 {c.quality==='High'&&<EffectComposer multisampling={4}><N8AO aoRadius={vehicle?.15:.35} intensity={1.1} distanceFalloff={1} quality="medium"/><Bloom luminanceThreshold={2} intensity={.08} mipmapBlur/><ToneMapping mode={ToneMappingMode.ACES_FILMIC}/></EffectComposer>}
 </>;
}
class SceneBoundary extends Component<{children:ReactNode},{error:boolean}>{
 state={error:false};static getDerivedStateFromError(){return {error:true}};render(){return this.state.error?<div className="scene-error">The 3D view could not start.<br/>Enable WebGL in your browser, then reload. The lesson text and controls remain available.</div>:this.props.children}
}
export default function DrivetrainScene(props:SceneProps){
 const labelNodes=useMemo(()=>new Map<string,HTMLButtonElement>(),[]);const loading=useProgress(state=>state.active);
 const photoRef=useRef<HTMLImageElement>(null);const [photoRegistered,setPhotoRegistered]=useState(false);
 const photoActive=['overview','awd'].includes(props.focus)&&props.body!=='Hidden'&&!props.hoodOpen&&(!props.isolated||props.isolated==='body')&&!props.hidden.includes('body')&&props.explode<.02&&!['Top','Underside','Wheel detail','Engine bay'].includes(props.cameraView);
 const solid=photoActive&&props.body==='Solid';
 return <SceneBoundary><div className={'canvas-host '+(solid?'exterior-active':'')}>
 <Canvas frameloop={props.playing&&!solid?'always':'demand'} onCreated={({gl})=>{gl.localClippingEnabled=true;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=.98;const ctx=gl.getContext(),ext=ctx.getExtension('WEBGL_debug_renderer_info');if(ext&&/swiftshader|llvmpipe|software/i.test(ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL)))props.onSoftwareRenderer?.()}} shadows={props.quality!=='Low'} dpr={props.quality==='Low'?1:[1,1.7]} camera={{position:[-4.8,3.4,-5.5],fov:38,near:.025,far:100}} gl={{antialias:props.quality!=='Low',powerPreference:'high-performance'}} onPointerMissed={()=>{document.body.style.cursor='auto'}}><Ctx.Provider value={{...props,playing:props.playing&&!solid,labelNodes,photoRegistered:photoActive&&photoRegistered,photoRef}}><World/></Ctx.Provider></Canvas>
 <div className="world-labels" hidden={solid}>{parts.map(p=><button key={p.id} ref={el=>{if(el)labelNodes.set(p.id,el);else labelNodes.delete(p.id)}} style={{display:'none'}} className={'part-label '+(props.selected===p.id?'selected':'')} onClick={()=>props.onSelect(p.id)}><i style={{background:p.color}}/><span>{p.name}</span></button>)}</div>
 <PhotoExterior active={photoActive} xray={props.body==='Ghost'} low={props.quality==='Low'} cameraView={props.cameraView} reset={props.cameraReset} imageRef={photoRef} onRegistered={setPhotoRegistered} onInspect={props.onInspect} onReveal={props.onReveal}/>
 {loading&&!solid&&<div className="asset-loading" role="status"><span className="loader"/>Loading detailed assembly…</div>}</div></SceneBoundary>;
}
