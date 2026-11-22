// Marisol Bay — the wanted system: police cars that chase and ram, roadblocks
// at 3 stars, and a helicopter with a spotlight at 4-5 stars. Wanted decays
// after ~20 seconds unseen, so a clean getaway is always possible.
import * as THREE from 'three';
import { WANTED } from './config.js';
import { createCarMesh } from './vehicles.js';

export function createPolice(scene) {
  const group = new THREE.Group(); group.name = 'PoliceForce'; scene.add(group);
  const heliGroup = new THREE.Group();
  const heliBody = new THREE.Mesh(new THREE.BoxGeometry(4, 1.6, 2), new THREE.MeshLambertMaterial({ color: 0x1a2a4a }));
  heliGroup.add(heliBody);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(7, 0.15, 0.5), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  rotor.position.y = 1.1; heliGroup.add(rotor);
  const spot = new THREE.Mesh(new THREE.ConeGeometry(3.5, 18, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
  spot.position.y = -10; heliGroup.add(spot);
  heliGroup.visible = false; scene.add(heliGroup);
  return { group, cars: [], heliGroup, rotor, roadblocks: [], roadblockGroup: new THREE.Group() };
}

export function wantedCarCount(stars) { return Math.min(stars, 4); }

export function spawnPoliceCar(police, scene, x, z) {
  const mesh = createCarMesh(0x1a2a4a, false);
  // Police livery: white doors + light bar.
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 1.2), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  bar.position.set(-0.2, 1.85, 0); mesh.group.add(bar);
  const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.5), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
  bar2.position.set(-0.2, 1.85, 0.6); mesh.group.add(bar2);
  mesh.group.position.set(x, 0, z);
  scene.add(mesh.group);
  const car = { mesh, x, z, heading: 0, speed: 0, health: 100 };
  police.cars.push(car);
  return car;
}

export function buildRoadblocks(police, scene, playerX, playerZ) {
  clearRoadblocks(police, scene);
  const spots = [[30, 0], [-30, 0], [0, 30], [0, -30]];
  for (const [dx, dz] of spots) {
    const group = new THREE.Group();
    for (let i = -1; i <= 1; i += 1) {
      const barrier = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 3.4), new THREE.MeshLambertMaterial({ color: i === 0 ? 0xff7a2a : 0xffffff }));
      barrier.position.set(i * 1.4, 0.55, 0); group.add(barrier);
    }
    const bx = playerX + dx, bz = playerZ + dz;
    group.position.set(bx, 0, bz);
    scene.add(group);
    police.roadblocks.push({ group, x: bx, z: bz });
  }
}

export function clearRoadblocks(police, scene) {
  for (const rb of police.roadblocks) scene.remove(rb.group);
  police.roadblocks = [];
}

export function updatePolice(police, scene, playerPos, playerSpeed, stars, dt, time, onRam) {
  const want = wantedCarCount(stars);
  while (police.cars.length < want) {
    const a = Math.random() * Math.PI * 2;
    spawnPoliceCar(police, scene, playerPos.x + Math.cos(a) * 55, playerPos.z + Math.sin(a) * 55);
  }
  while (police.cars.length > want) {
    const car = police.cars.pop();
    scene.remove(car.mesh.group);
  }
  for (const car of police.cars) {
    const dx = playerPos.x - car.x, dz = playerPos.z - car.z;
    const dist = Math.hypot(dx, dz) || 1;
    const targetHeading = Math.atan2(-dz, dx);
    let dh = targetHeading - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
    const top = stars >= 4 ? 40 : stars >= 3 ? 34 : 28;
    car.speed = Math.min(top, car.speed + 16 * dt);
    car.x += Math.cos(car.heading) * car.speed * dt;
    car.z -= Math.sin(car.heading) * car.speed * dt;
    car.mesh.group.position.set(car.x, 0, car.z);
    car.mesh.group.rotation.y = car.heading;
    if (dist < 3.2) {
      onRam(car, dist);
      car.speed *= 0.4;
      car.x -= Math.cos(car.heading) * 2; car.z += Math.sin(car.heading) * 2;
    }
  }
  // Roadblocks at 3+ stars, helicopter at 4-5.
  if (stars >= WANTED.roadblockAt && police.roadblocks.length === 0) buildRoadblocks(police, scene, playerPos.x, playerPos.z);
  if (stars < WANTED.roadblockAt && police.roadblocks.length > 0) clearRoadblocks(police, scene);
  const heli = police.heliGroup;
  if (stars >= WANTED.helicopterAt) {
    heli.visible = true;
    heli.position.set(playerPos.x + Math.sin(time * 0.4) * 14, 32, playerPos.z + Math.cos(time * 0.4) * 14);
    heli.rotation.y = time * 0.3;
    police.rotor.rotation.y = time * 22;
  } else heli.visible = false;
}

export function policeSeenByPlayer(police, playerPos) {
  for (const car of police.cars) if (Math.hypot(car.x - playerPos.x, car.z - playerPos.z) < 60) return true;
  return false;
}
