export type Gear = 'P' | 'R' | 'N' | 'D';
export type DriveMode = 'Normal' | 'Sport' | 'Snow';
export type Traction = 'Dry' | 'Wet' | 'Snow' | 'Low grip';
export type Inputs = {
  throttle: number; brake: number; speed: number; gear: Gear; driveMode: DriveMode;
  traction: Traction; steering: number; manual: boolean; virtualGear: number;
  ratio: number; autoRatio: boolean; rpmOverride: boolean; rpm: number;
};
export const defaults: Inputs = { throttle: 22, brake: 0, speed: 28, gear: 'D', driveMode: 'Normal', traction: 'Dry', steering: 0, manual: false, virtualGear: 3, ratio: 1.65, autoRatio: true, rpmOverride: false, rpm: 1800 };
export const virtualRatios = [2.65, 2.25, 1.89, 1.57, 1.30, 1.07, .85, .65];
export const clamp = (v:number, a:number, b:number) => Math.max(a,Math.min(b,v));
export const lerp = (a:number,b:number,t:number) => a+(b-a)*t;
export type Snapshot = ReturnType<typeof calculate>;
export type RpmGuidance = {min:number;max:number;target:number;label:string;status:'Below range'|'In range'|'Above range';explanation:string};
export function calculate(i:Inputs) {
  const connected = i.gear==='D'||i.gear==='R';
  const speed = i.gear==='P'?0:Math.abs(i.speed);
  const roadWheelRPM = speed/3.6 / (2*Math.PI*.335) * 60; // illustrative rolling radius
  const slipFactor=connected&&i.throttle>50?(i.traction==='Low grip'?.35:i.traction==='Snow'?.16:i.traction==='Wet'?.05:0)*i.throttle/100:0;
  const wheelRPM=roadWheelRPM*(1+slipFactor);
  const sporty = i.driveMode === 'Sport';
  const targetRPM = 1000 + i.throttle*(sporty?52:42) + (sporty?1000:0);
  let actualVirtual=i.virtualGear;
  if(i.manual&&connected){
    if(speed<8)actualVirtual=1;
    while(actualVirtual<8&&wheelRPM*3.8*virtualRatios[actualVirtual-1]>6000)actualVirtual++;
  }
  const stepped = connected && !i.manual && i.autoRatio && (i.throttle>65 || sporty&&i.throttle>35);
  let programmedRatio=2.65;
  if(stepped)for(let k=1;k<8;k++){
    const t=clamp((speed-k*16+3)/6,0,1),smooth=t*t*(3-2*t);
    programmedRatio-=(virtualRatios[k-1]-virtualRatios[k])*smooth;
  }
  const requestedRatio = i.manual && connected ? virtualRatios[actualVirtual-1] : !i.autoRatio ? i.ratio : stepped?programmedRatio:clamp(targetRPM/Math.max(300,wheelRPM*3.8), .65,2.65);
  const ratio=clamp(Math.min(requestedRatio,6000/Math.max(1,wheelRPM*3.8)),.65,2.65);
  const turbineRPM = connected ? wheelRPM*3.8*ratio : 750*.94 + i.throttle*42;
  const lockup = connected && speed>48 && i.throttle<43 && i.brake<12 && !i.rpmOverride;
  const engineRPM = lockup ? turbineRPM : Math.min(6200,Math.max(750 + i.throttle*(speed<3?22:6), turbineRPM + Math.max(55,(targetRPM-turbineRPM)*.32), i.rpmOverride?i.rpm:0));
  const actualTurbine = connected ? turbineRPM : engineRPM*.94;
  const speedRatio = clamp(actualTurbine/engineRPM,0,1);
  const slip = lockup ? 0 : (1-speedRatio)*100;
  const multiplication = lockup || speedRatio>.86 ? 1 : lerp(1.95,1,clamp(speedRatio/.86,0,1));
  const statorLocked = connected && speedRatio<.85 && !lockup;
  const rearActivity = connected ? clamp(.06 + i.throttle/100*.45 + (i.traction==='Dry'?0:i.traction==='Wet'?.15:.35) + (i.driveMode==='Snow'?.1:0),0,.9) : 0;
  const wheelDifference = clamp(i.steering/100*.18,-.18,.18);
  const phase = !connected ? 'Range disconnected' : lockup ? 'Lock-up engaged' : speedRatio<.15 ? 'Stall / launch' : speedRatio<.85 ? 'Torque multiplication' : 'Fluid coupling';
  const currentVirtual = i.manual ? actualVirtual : virtualRatios.reduce((best,r,idx)=>Math.abs(r-ratio)<Math.abs(virtualRatios[best]-ratio)?idx:best,0)+1;
  return { engineRPM:Math.round(engineRPM), turbineRPM:Math.round(actualTurbine), wheelRPM, rearWheelRPM:roadWheelRPM, rearLeftRPM:roadWheelRPM*(1-wheelDifference),rearRightRPM:roadWheelRPM*(1+wheelDifference), slipFactor, ratio, slip, multiplication, lockup, statorLocked, rearActivity, connected, phase, currentVirtual, stepped, protectedRatio:ratio<requestedRatio-.01, overrun:connected&&i.gear==='D'&&i.throttle<1&&speed>12, leftRPM:wheelRPM*(1-wheelDifference),rightRPM:wheelRPM*(1+wheelDifference), outputRPM:connected?actualTurbine/ratio:0, direction:i.gear==='R'?-1:1 };
}
export function rpmGuidance(i:Inputs, actualRpm:number):RpmGuidance {
  const speed=Math.abs(i.speed),connected=i.gear==='D'||i.gear==='R';
  let min=750,max=1050,label='Idle / stationary',explanation='At a stop, the converter lets the engine idle while the driven side can remain still.';
  if(!connected){min=750;max=1200;label='Range disconnected';explanation='Park and Neutral do not need elevated RPM. Use throttle only to observe the unloaded engine response.';}
  else if(i.brake>25&&speed<3){min=750;max=1000;label='Stopped in Drive';explanation='Normal idle is appropriate. The impeller turns, the turbine is stalled, and the converter produces creep torque.';}
  else if(speed<10&&i.throttle<15){min=750;max=1300;label='Creep / parking speed';explanation='Little or no throttle is normally needed; control creep with the brake.';}
  else if(i.brake>10){min=900;max=1800;label='Deceleration';explanation='Release the accelerator and let vehicle speed fall. Higher RPM may reflect engine braking or a selected virtual ratio.';}
  else if(i.throttle>=65){min=i.driveMode==='Sport'?3500:3000;max=5200;label='Strong acceleration';explanation='The IVT may hold the engine in a higher power band while road speed catches up. This is expected under heavy demand.';}
  else if(i.throttle>=30){min=i.driveMode==='Sport'?2500:2000;max=i.driveMode==='Sport'?4200:3500;label='Moderate acceleration';explanation='A lower IVT ratio raises engine speed for response, then relaxes as the requested acceleration is reached.';}
  else if(speed>=80){min=i.driveMode==='Sport'?2100:1300;max=i.driveMode==='Sport'?3200:2400;label='Highway cruise';explanation='Light throttle and converter lock-up should keep RPM relatively low. Sport can deliberately hold more RPM for response.';}
  else if(speed>=30){min=i.driveMode==='Sport'?1900:1100;max=i.driveMode==='Sport'?3000:2200;label='Steady road speed';explanation='With light load, the IVT should favour a taller ratio and the converter may lock when conditions allow.';}
  else {min=1100;max=2400;label='Urban driving';explanation='A modest RPM band suits gentle acceleration and steady low-speed travel.';}
  if(i.traction==='Snow'||i.traction==='Low grip'){max=Math.min(max,3200);explanation+=' On low grip, use smoother throttle and avoid unnecessary RPM spikes.';}
  const target=Math.round(((min+max)/2)/50)*50;
  const status=actualRpm<min-100?'Below range':actualRpm>max+100?'Above range':'In range';
  return {min,max,target,label,status,explanation};
}
export function stepVehicle(i:Inputs, dt:number):Inputs {
  if(i.gear==='P')return {...i,speed:0};
  const grip = i.traction==='Dry'?1:i.traction==='Wet'?.72:i.traction==='Snow'?.4:.24;
  const connected=i.gear==='D'||i.gear==='R';
  const acceleration=connected?(i.throttle/100*3.7+.13)*grip:0;
  const drag=.06+i.speed*.0025;
  const change=(acceleration-i.brake/100*7-drag)*3.6*dt;
  return {...i,speed:clamp(i.speed+change,0,i.gear==='R'?22:150)};
}
// Exact open-belt tangent geometry. Both pulleys share a fixed-length chain.
export function beltLength(r1:number,r2:number,d=1.85) {
  const a=Math.asin((r2-r1)/d);
  return 2*Math.sqrt(d*d-(r2-r1)**2) + Math.PI*(r1+r2) + 2*a*(r2-r1);
}
export function pulleyRadii(ratio:number) {
  // Solve scale at fixed ratio and fixed loop length, rather than stretching the chain.
  const target=beltLength(.58,.58);
  let lo=.1,hi=1;
  for(let n=0;n<45;n++){const r=(lo+hi)/2;const r2=r*ratio;if(Math.abs(r2-r)<1.84 && beltLength(r,r2)<target)lo=r;else hi=r;}
  const input=(lo+hi)/2;return {input,output:input*ratio};
}
export function beltPath(r1:number,r2:number,segments=160) {
  const d=1.85, a=Math.asin((r2-r1)/d);
  const theta=Math.acos((r1-r2)/d);
  const points:Array<[number,number]>=[];
  // Coordinates: horizontal center distance maps to world z; vertical maps to y.
  const addArc=(cx:number,r:number,from:number,to:number,n:number)=>{for(let k=0;k<n;k++){const t=lerp(from,to,k/n);points.push([cx+r*Math.cos(t),r*Math.sin(t)]);}};
  addArc(0,r1,theta,2*Math.PI-theta,48);
  const p1:[number,number]=[r1*Math.cos(theta),-r1*Math.sin(theta)];
  const p2:[number,number]=[d+r2*Math.cos(theta),-r2*Math.sin(theta)];
  for(let k=0;k<32;k++)points.push([lerp(p1[0],p2[0],k/32),lerp(p1[1],p2[1],k/32)]);
  addArc(d,r2,2*Math.PI-theta,2*Math.PI+theta,48);
  const p3:[number,number]=[d+r2*Math.cos(theta),r2*Math.sin(theta)];
  const p4:[number,number]=[r1*Math.cos(theta),r1*Math.sin(theta)];
  for(let k=0;k<32;k++)points.push([lerp(p3[0],p4[0],k/32),lerp(p3[1],p4[1],k/32)]);
  // Uniform arc-length sampling keeps chain links equally spaced.
  const dist=[0];for(let k=1;k<=points.length;k++){const p=points[k%points.length],q=points[k-1];dist.push(dist[k-1]+Math.hypot(p[0]-q[0],p[1]-q[1]));}
  const uniform:Array<[number,number]>=[];
  for(let k=0;k<segments;k++){const s=dist[dist.length-1]*k/segments;let j=1;while(dist[j]<s)j++;const t=(s-dist[j-1])/(dist[j]-dist[j-1]);const p=points[j%points.length],q=points[j-1];uniform.push([lerp(q[0],p[0],t),lerp(q[1],p[1],t)]);}
  return uniform;
}
