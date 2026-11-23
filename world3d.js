/* Actual 3D city renderer: Three.js, perspective camera, 3D vehicles and NPCs. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
const $=id=>document.getElementById(id);
const scene=new THREE.Scene();scene.background=new THREE.Color('#ef9b88');scene.fog=new THREE.Fog('#ef9b88',100,235);
const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,450);
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true});}catch(e){$('error').textContent='3D graphics unavailable: '+e.message;$('error').classList.remove('hidden');throw e;}
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.outputColorSpace=THREE.SRGBColorSpace;
$('world').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffd6ae,0x355a78,2.4));
const sunlight=new THREE.DirectionalLight(0xffd2a1,2.5);sunlight.position.set(-45,85,-35);sunlight.castShadow=true;sunlight.shadow.mapSize.set(1024,1024);sunlight.shadow.camera.left=-115;sunlight.shadow.camera.right=115;sunlight.shadow.camera.top=115;sunlight.shadow.camera.bottom=-115;scene.add(sunlight);
const M=c=>new THREE.MeshStandardMaterial({color:c,roughness:.7});
function cube(w,h,d,color,x,y,z,parent=scene){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),typeof color==='string'?M(color):color);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function message(text){window.dispatchEvent(new CustomEvent('game-message',{detail:{message:text}}));}
function playing(){return !!window.gameAPI?.playing();}
// Ground, roads, sidewalks, and lane markings
cube(230,.4,230,'#357c62',0,-.35,0);
const roads=[-60,-30,0,30,60];
for(const r of roads){cube(12,.1,205,'#292e40',r,.02,0);cube(205,.1,12,'#292e40',0,.03,r);for(let n=-96;n<=96;n+=12){cube(.18,.025,4,'#e9dcaa',r,.1,n);cube(4,.025,.18,'#e9dcaa',n,.11,r);}}
const obstacles=[];const buildingColors=['#d6a1ad','#8aa7bf','#d4c5bc','#b7a4cf','#e5ba95'];
const glass=new THREE.MeshStandardMaterial({color:'#395f85',metalness:.5,roughness:.2});
for(let x=-75;x<=75;x+=15)for(let z=-75;z<=75;z+=15){
  if(roads.some(r=>Math.abs(x-r)<11||Math.abs(z-r)<11))continue;
  const seed=Math.abs(x*13+z*17);if(seed%11===0)continue;
  const h=9+seed%28;cube(10,.4,10,'#8893a1',x,.2,z);cube(8,h,8,buildingColors[seed%buildingColors.length],x,h/2+.4,z);
  for(let y=3;y<h-1;y+=4)for(const off of [-2,1.5])cube(1.4,2,.09,glass,x+off,y,z+4.06);
  obstacles.push({x,z,r:5.3});
}
// Palm trees with broad horizontal fronds
function palm(x,z){const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.22,.4,7,8),M('#8d6948'));trunk.position.set(x,3.5,z);scene.add(trunk);for(let i=0;i<7;i++){const leaf=new THREE.Mesh(new THREE.ConeGeometry(.65,5,4),M('#237e5b'));leaf.position.set(x+Math.sin(i*Math.PI*2/7)*1.4,7,z+Math.cos(i*Math.PI*2/7)*1.4);leaf.rotation.z=Math.PI/2;leaf.rotation.y=i*Math.PI*2/7;scene.add(leaf);}}
[[-88,-88],[-88,88],[88,-88],[88,88],[-45,-45],[45,-45],[-45,45],[45,45],[-15,-15],[15,15]].forEach(([x,z])=>palm(x,z));
// Character models
function person(x,z,shirt){const g=new THREE.Group();cube(.85,1.2,.5,shirt,0,1.35,0,g);const head=new THREE.Mesh(new THREE.SphereGeometry(.36,12,12),M('#dca787'));head.position.y=2.35;g.add(head);cube(.28,.75,.35,'#202842',-.24,.43,0,g);cube(.28,.75,.35,'#202842',.24,.43,0,g);g.position.set(x,0,z);scene.add(g);return g;}
const player=person(0,0,'#1ee6d1');const npcs=[];
[[4,-18],[-4,20],[34,10],[-34,-18],[18,4],[-18,-4],[62,18],[-62,45],[4,48]].forEach(([x,z],i)=>npcs.push({mesh:person(x,z,['#ff7bb4','#62b8ff','#f3c35b','#c3a2ff'][i%4]),x,z,phase:i*.7}));
// 5 large visible upright 3D rings with numeric labels
const missionCoords=[[0,-30],[30,0],[-30,0],[0,30],[60,30]];
const markers=missionCoords.map(([x,z],i)=>{const g=new THREE.Group();const ring=new THREE.Mesh(new THREE.TorusGeometry(2.2,.25,12,40),new THREE.MeshBasicMaterial({color:'#24ffe0'}));ring.position.y=3.5;g.add(ring);const pole=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,3.5,10),new THREE.MeshBasicMaterial({color:'#27e9cf',transparent:true,opacity:.45}));pole.position.y=1.75;g.add(pole);g.position.set(x,0,z);scene.add(g);return{g,x,z,index:i};});
// Cars, enter and exit with R
const specs={compact:{color:'#4baaff',speed:17},sport:{color:'#ff4f91',speed:27},super:{color:'#f9d348',speed:38}};
let car=null,carType=null,driving=false;
function createCar(type){const g=new THREE.Group();cube(2.4,.65,4.4,specs[type].color,0,.8,0,g);cube(1.85,.8,2,'#244261',0,1.45,-.25,g);for(const x of [-1.17,1.17])for(const z of [-1.4,1.4]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.44,.44,.25,14),M('#16191e'));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.43,z);g.add(wheel);}cube(1.5,.15,.18,'#fff2b6',0,.85,-2.25,g);g.position.set(player.position.x+4,0,player.position.z);scene.add(g);return g;}
window.addEventListener('spawn-car',e=>{const type=e.detail.id;if(!specs[type])return;if(car)scene.remove(car);driving=false;player.visible=true;carType=type;car=createCar(type);message('Your car has arrived! Walk up and press R.');});
function toggleCar(){if(!car){message('Buy a car from MarketPhone (P) first.');return;}if(driving){driving=false;player.visible=true;player.position.set(Math.min(car.position.x+3,96),0,car.position.z);message('Exited car.');return;}if(Math.hypot(player.position.x-car.position.x,player.position.z-car.position.z)>6){message('Walk closer to your car.');return;}driving=true;player.visible=false;message('Driving! WASD to move, R to exit.');}
// Nonviolent glowing target practice, equipped at start
let equipped=true,upgraded=false,neon=false;
const targets=[[8,-12],[-8,12],[38,8],[-38,-8]].map(([x,z])=>{const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.85,1),new THREE.MeshBasicMaterial({color:'#ffe468'}));m.position.set(x,2.4,z);scene.add(m);return m;});
window.addEventListener('gear-upgrade',e=>{if(e.detail.id==='pulse')upgraded=true;if(e.detail.id==='neon'){neon=true;targets.forEach(t=>t.material.color.set('#a46bff'));}});
function pulse(){if(!equipped){message('Press Q to equip your pulse trainer.');return;}const t=targets.find(t=>t.visible&&Math.hypot(t.position.x-player.position.x,t.position.z-player.position.z)<(upgraded?11:6));if(!t){message('Get closer to a glowing practice target.');return;}t.visible=false;message('Practice target completed!');}
function nearObstacle(x,z,r=1){return obstacles.some(o=>Math.abs(x-o.x)<o.r+r&&Math.abs(z-o.z)<o.r+r);}
const keys=Object.create(null);
window.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();if(playing()&&['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
  if(!playing())return;
  keys[k]=true;if(e.repeat)return;
  if(k==='e'&&!driving){const m=markers.find(m=>Math.hypot(player.position.x-m.x,player.position.z-m.z)<6);if(m)window.dispatchEvent(new CustomEvent('economic-mission',{detail:{index:m.index}}));else message('Walk closer to a glowing mission marker.');}
  if(k==='f'&&!driving){const n=npcs.find(n=>Math.hypot(player.position.x-n.mesh.position.x,player.position.z-n.mesh.position.z)<4);message(n?'Citizen: Every decision has an opportunity cost!':'No citizen nearby.');}
  if(k==='r')toggleCar();
  if(k==='q'&&!driving){equipped=!equipped;message(equipped?'Pulse trainer equipped.':'Pulse trainer stored.');}
  if(e.code==='Space'&&!driving)pulse();
});
window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
window.addEventListener('blur',()=>{Object.keys(keys).forEach(k=>keys[k]=false);});
window.addEventListener('game-restart',()=>{player.position.set(0,0,0);player.visible=true;driving=false;if(car){scene.remove(car);car=null;}carType=null;equipped=true;upgraded=false;neon=false;targets.forEach(t=>{t.visible=true;t.material.color.set('#ffe468');});});
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),time=clock.elapsedTime;
  if(playing()){
    let dx=Number(!!(keys.d||keys.arrowright))-Number(!!(keys.a||keys.arrowleft));
    let dz=Number(!!(keys.s||keys.arrowdown))-Number(!!(keys.w||keys.arrowup));
    const len=Math.hypot(dx,dz);if(len){dx/=len;dz/=len;const obj=driving&&car?car:player;const speed=driving?specs[carType].speed:12;const nx=THREE.MathUtils.clamp(obj.position.x+dx*speed*dt,-95,95);const nz=THREE.MathUtils.clamp(obj.position.z+dz*speed*dt,-95,95);if(!nearObstacle(nx,obj.position.z,driving?1.6:.5))obj.position.x=nx;if(!nearObstacle(obj.position.x,nz,driving?1.6:.5))obj.position.z=nz;obj.rotation.y=Math.atan2(-dx,-dz);if(driving)player.position.copy(car.position);}
  }
  npcs.forEach((n,i)=>{n.mesh.position.x=n.x+Math.sin(time*.35+n.phase)*1.6;n.mesh.position.z=n.z+Math.cos(time*.35+n.phase)*1.6;});
  markers.forEach((m,i)=>{m.g.rotation.y=time*.45;m.g.position.y=Math.sin(time*2+i)*.22;});
  targets.forEach((t,i)=>{if(t.visible){t.rotation.y+=dt;t.position.y=2.4+Math.sin(time*2+i)*.3;}});
  const focus=driving&&car?car.position:player.position;const desired=new THREE.Vector3(focus.x+10,focus.y+(driving?12:9),focus.z+17);camera.position.lerp(desired,Math.min(1,dt*5));camera.lookAt(focus.x,focus.y+1.3,focus.z);renderer.render(scene,camera);
}
camera.position.set(10,9,17);animate();
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
console.log('Market City 3D initialized');
