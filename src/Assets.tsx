import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { assetPath } from './assetPath';

export type BodyMode = 'Hidden' | 'Ghost' | 'Solid';
export const AssetQuality=createContext('High');

// Original GLB assemblies, generated with the editable Blender recipe in scripts/.
// Meshes are consolidated by assembly and material, keeping inspection affordable.
const microNormal = (() => {
  const width=128, data=new Uint8Array(width*width*4);
  let seed=5489;
  for(let j=0;j<width*width;j++){
    seed=(Math.imul(seed,1664525)+1013904223)|0;
    const v=((seed>>>16)&255)/255;
    data[j*4]=124+v*8;data[j*4+1]=124+(1-v)*8;data[j*4+2]=255;data[j*4+3]=255;
  }
  const t=new THREE.DataTexture(data,width,width,THREE.RGBAFormat);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(10,10);t.needsUpdate=true;
  return t;
})();

function refinedMaterial(source:THREE.Material){
  const old=source as THREE.MeshStandardMaterial;
  const m=new THREE.MeshPhysicalMaterial({
    name:old.name,color:old.color,metalness:old.metalness,roughness:old.roughness,
    side:THREE.DoubleSide,envMapIntensity:1,vertexColors:old.vertexColors,
  });
  if(/paint/i.test(m.name)){
    m.color.set('#606565');m.clearcoat=1;m.clearcoatRoughness=.16;m.metalness=.62;m.roughness=.27;
  }else if(/glass/i.test(m.name)){
    m.clearcoat=1;m.clearcoatRoughness=.05;m.roughness=.10;m.metalness=.30;
  }else if(/cast/i.test(m.name)){
    m.color.setRGB(.23,.25,.27);m.normalMap=microNormal;m.normalScale.set(.33,.33);m.roughness=.52;
    m.metalness=.80;
  }else if(/chrome/i.test(m.name)){
    m.color.setRGB(.40,.42,.44);m.metalness=1;m.roughness=.38;
  }else if(/machined/i.test(m.name)){
    m.metalness=1;m.roughness=.34;
  }else if(/rubber/i.test(m.name)){
    m.color.setRGB(.008,.009,.010);m.metalness=0;m.normalMap=microNormal;m.normalScale.set(.08,.08);
  }else if(/LED diffuser/i.test(m.name)){
    m.emissive=new THREE.Color('#d6e9f4');m.emissiveIntensity=.4;
  }else if(/Red lamp/i.test(m.name)){
    m.emissive=new THREE.Color('#b3262e');m.emissiveIntensity=.3;m.clearcoat=1;
  }
  return m;
}

export function ModelAsset({url,names,opacity=1,selected=false,clip,position,scale=1}: {
  url:string;names?:string[];opacity?:number;selected?:boolean;
  clip?:[number,number,number,number];position?:[number,number,number];scale?:number|[number,number,number];
}){
  const quality=useContext(AssetQuality);
  const assetURL=assetPath(quality==='Low'?url.replace('.glb','-low.glb'):url);
  const {scene}=useGLTF(assetURL,assetPath('/draco/'));
  const group=useRef<THREE.Group>(null!);
  const {object,materials}=useMemo(()=>{
    const object=scene.clone(true),materials:THREE.MeshPhysicalMaterial[]=[];
    object.traverse(o=>{
      if(o instanceof THREE.Mesh){
        let ancestor:THREE.Object3D|null=o,match=!names;
        while(ancestor&&!match){match=!!names?.includes(ancestor.name);ancestor=ancestor.parent;}
        o.visible=match;
        const old=Array.isArray(o.material)?o.material:[o.material];
        const refined=old.map(m=>{const mat=refinedMaterial(m);materials.push(mat);return mat});
        o.material=Array.isArray(o.material)?refined:refined[0];
        o.castShadow=true;o.receiveShadow=true;
      }
    });
    return {object,materials};
  },[scene,JSON.stringify(names)]);
  const plane=useMemo(()=>new THREE.Plane(),[]);
  useEffect(()=>{
    materials.forEach(m=>{
      m.transparent=opacity<1;m.opacity=opacity;m.depthWrite=opacity>.85;
      if(opacity<.4)m.side=THREE.FrontSide;else m.side=THREE.DoubleSide;
      m.clippingPlanes=clip?[plane]:[];m.clipShadows=true;
      if(selected){m.emissive.set('#a9c9d2');m.emissiveIntensity=.025}
      else if(!/LED|lamp/i.test(m.name)){m.emissive.set('#000');m.emissiveIntensity=0}
      m.needsUpdate=true;
    });
    object.traverse(o=>{if(o instanceof THREE.Mesh)o.raycast=opacity<.15?()=>{}:THREE.Mesh.prototype.raycast});
  },[opacity,selected,clip?.join(','),materials,plane,object]);
  useEffect(()=>()=>materials.forEach(m=>m.dispose()),[materials]);
  useFrame(()=>{
    if(clip&&group.current){group.current.updateWorldMatrix(true,false);plane.set(new THREE.Vector3(clip[0],clip[1],clip[2]),clip[3]);plane.applyMatrix4(group.current.matrixWorld);}
  });
  return <group ref={group} position={position} scale={scale}><primitive object={object}/></group>;
}

export function VehicleBody({mode,hoodOpen,explode,onSelect}:{mode:BodyMode;hoodOpen:boolean;explode:number;onSelect:(id:string)=>void}){
  const shell=useRef<THREE.Group>(null!),hood=useRef<THREE.Group>(null!);
  const invalidate=useThree(state=>state.invalidate);
  useFrame((_,dt)=>{
    shell.current.position.y=THREE.MathUtils.damp(shell.current.position.y,explode*1.3,8,dt);
    hood.current.rotation.x=THREE.MathUtils.damp(hood.current.rotation.x,hoodOpen?.98:0,7,dt);
    if(Math.abs(shell.current.position.y-explode*1.3)>.0001||Math.abs(hood.current.rotation.x-(hoodOpen?.98:0))>.0001)invalidate();
  });
  return <group ref={shell} visible={mode!=='Hidden'} onClick={event=>{event.stopPropagation();onSelect('body')}}>
    <ModelAsset url="/models/kona-sx2-body.glb" names={['body','roof','trim','light']} opacity={mode==='Ghost'?.13:1}/>
    <ModelAsset url="/models/kona-sx2-body.glb" names={['glass']} opacity={mode==='Ghost'?.06:.58}/>
    {mode==='Solid'&&<ModelAsset url="/models/kona-sx2-body.glb" names={['interior']} opacity={1}/>}
    {mode==='Solid'&&[-1,1].flatMap(side=>[-1.33,1.33].map(z=><mesh key={side+':'+z} position={[side*.765,.347,z]} rotation={[0,0,Math.PI/2]}>
      <cylinderGeometry args={[.425,.425,.30,64,1,true,0,Math.PI]}/><meshStandardMaterial color="#111315" roughness={.9} side={THREE.DoubleSide}/>
    </mesh>))}
    <group ref={hood} position={[0,1.075,-.9]}>
      <group position={[0,-1.075,.9]}><ModelAsset url="/models/kona-sx2-body.glb" names={['hood']} opacity={mode==='Ghost'?.13:1}/></group>
    </group>
  </group>;
}

export function Chassis({floor=true,bay=true,opacity=1}:{floor?:boolean;bay?:boolean;opacity?:number}){
  const names=['frame','suspension','utilities',...(floor?['floor']:[]),...(bay?['bay']:[])];
  return <ModelAsset url="/models/kona-sx2-chassis.glb" names={names} position={[0,.012,0]} opacity={opacity}/>;
}

