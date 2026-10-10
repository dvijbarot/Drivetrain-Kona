import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, defaults, pulleyRadii, beltLength, beltPath, stepVehicle, rpmGuidance } from '../src/mechanics.ts';
import { chapters, lessonInputs, parts } from '../src/content.ts';
test('pulley ratio and fixed chain length hold throughout the full slider range',()=>{
 const target=beltLength(.58,.58);
 for(let ratio=.65;ratio<=2.65;ratio+=.01){
  const r=pulleyRadii(ratio);
  assert.ok(Math.abs(r.output/r.input-ratio)<1e-10);
  assert.ok(Math.abs(beltLength(r.input,r.output)-target)<1e-9);
  const path=beltPath(r.input,r.output);
  assert.equal(path.length,160);
  assert.ok(path.every(p=>p.every(Number.isFinite)));
  // All loop points are on an arc or tangent span, without crossing either pulley.
  for(const p of path){assert.ok(Math.hypot(p[0],p[1])>=r.input-.002);assert.ok(Math.hypot(p[0]-1.85,p[1])>=r.output-.002);}
 }
});
test('Drive at a red light stalls the turbine while the engine and impeller keep spinning',()=>{
 const s=calculate({...defaults,speed:0,throttle:0,brake:100});
 assert.equal(s.turbineRPM,0);assert.equal(s.engineRPM,750);assert.equal(s.slip,100);assert.ok(s.statorLocked);assert.ok(s.multiplication>1);assert.equal(s.lockup,false);
});
test('chain travel direction matches the positive-axis pulley surface velocity',()=>{
 for(const ratio of [.65,1,2.65]){
  const r=pulleyRadii(ratio),path=beltPath(r.input,r.output),p=path[3],previous=path[2];
  // World coordinates are (x, y, z) = (axial, path vertical, path horizontal).
  // Positive x angular velocity has tangent (dy,dz)=(-z,y).
  assert.ok(-p[0]*(previous[1]-p[1])+p[1]*(previous[0]-p[0])>0);
 }
});
test('steady cruising locks the converter and matches its input and output speed',()=>{
 const s=calculate({...defaults,speed:95,throttle:12});
 assert.ok(s.lockup);assert.equal(s.engineRPM,s.turbineRPM);assert.equal(s.slip,0);assert.equal(s.multiplication,1);assert.equal(s.statorLocked,false);
});
test('Park and Neutral do not provide a powered wheel path; Reverse changes wheel direction',()=>{
 for(const gear of ['P','N'] as const){const s=calculate({...defaults,gear,speed:0});assert.equal(s.connected,false);assert.equal(s.rearActivity,0);assert.equal(s.outputRPM,0);assert.ok(s.engineRPM>0);}
 assert.equal(calculate({...defaults,gear:'R',speed:7}).direction,-1);
});
test('differential average speed is preserved during a turn',()=>{
 const s=calculate({...defaults,steering:85});assert.ok(s.rightRPM>s.leftRPM);assert.ok(Math.abs((s.rightRPM+s.leftRPM)/2-s.wheelRPM)<1e-9);
});
test('low grip and strong throttle increase conceptual rear activity',()=>{
 const cruise=calculate({...defaults,speed:95,throttle:12,traction:'Dry'});
 const snow=calculate({...defaults,speed:20,throttle:65,traction:'Snow'});
 assert.ok(snow.rearActivity>cruise.rearActivity);assert.ok(snow.rearActivity<=1);
 assert.ok(snow.wheelRPM>snow.rearWheelRPM);
 assert.ok(Math.abs((snow.rearLeftRPM+snow.rearRightRPM)/2-snow.rearWheelRPM)<1e-9);
});
test('programmed IVT steps remain continuous and protection prevents engine overspeed',()=>{
 for(let speed=0;speed<150;speed+=.1){const s=calculate({...defaults,speed,throttle:85,driveMode:'Sport'});assert.ok(s.engineRPM<=6200);assert.ok(s.turbineRPM<=s.engineRPM);assert.ok(s.stepped);const next=calculate({...defaults,speed:speed+.001,throttle:85,driveMode:'Sport'});assert.ok(Math.abs(next.ratio-s.ratio)<.001);}
 const s=calculate({...defaults,speed:140,manual:true,virtualGear:1});assert.ok(s.currentVirtual>1);assert.ok(s.engineRPM<=6200);
});
test('vehicle integration produces creep, responds to brakes, and keeps Park stopped',()=>{
 assert.ok(stepVehicle({...defaults,speed:0,throttle:0},1).speed>0);
 assert.ok(stepVehicle({...defaults,brake:100},1).speed<defaults.speed);
 assert.equal(stepVehicle({...defaults,gear:'P'},1).speed,0);
});
test('RPM guidance follows speed, throttle, mode and range',()=>{
 const stopped=rpmGuidance({...defaults,speed:0,throttle:0,brake:100},750);
 assert.equal(stopped.label,'Stopped in Drive');assert.equal(stopped.status,'In range');
 const cruise=rpmGuidance({...defaults,speed:100,throttle:12},calculate({...defaults,speed:100,throttle:12}).engineRPM);
 assert.equal(cruise.label,'Highway cruise');assert.ok(cruise.target<2500);
 const launch=rpmGuidance({...defaults,speed:8,throttle:85,driveMode:'Sport'},4200);
 assert.equal(launch.label,'Strong acceleration');assert.ok(launch.target>cruise.target);
 const park=rpmGuidance({...defaults,gear:'P',speed:0},2000);
 assert.equal(park.label,'Range disconnected');assert.equal(park.status,'Above range');
});
test('all 30 lessons use real component IDs and finite coherent snapshots',()=>{
 assert.equal(chapters.length,30);
 for(let k=0;k<30;k++){assert.ok(parts.some(p=>p.id===chapters[k].part));for(let t=0;t<=30;t++){const s=calculate(lessonInputs(k,t));assert.ok(Number.isFinite(s.ratio));assert.ok(s.engineRPM>=0);assert.ok(s.slip>=0&&s.slip<=100);}}
});
