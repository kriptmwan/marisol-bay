// Marisol Bay — living traffic: 12 AI cars looping the road grid and
// 14 pedestrians strolling the sidewalks, so the city never feels empty.
import * as THREE from 'three';
import { createCarMesh, pickCarColour } from './vehicles.js';

export function createTraffic(scene, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const horizontal = i % 2 === 0;
    const lane = -160 + ((i * 53) % 9) * 40;
    const mesh = createCarMesh(pickCarColour(i + 3), i % 5 === 0);
    scene.add(mesh.group);
    cars.push({
      mesh, horizontal, lane, pos: -180 + ((i * 97) % 360),
      speed: 8 + (i % 4) * 2.5, heading: horizontal ? 0 : Math.PI / 2,
    });
  }
  const pedestrians = [];
  const shirtColours = [0x4fc3f7, 0xf2c94c, 0xe87ab0, 0x9b59d0, 0xffffff, 0x3aa655];
  for (let i = 0; i < 14; i += 1) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.4), new THREE.MeshLambertMaterial({ color: shirtColours[i % shirtColours.length] }));
    body.position.y = 1.0; group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshLambertMaterial({ color: 0xe8b98a }));
    head.position.y = 1.75; group.add(head);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.35), new THREE.MeshLambertMaterial({ color: 0x2a2a2a }));
    legs.position.y = 0.4; group.add(legs);
    const x = -160 + ((i * 61) % 320), z = -140 + ((i * 83) % 280);
    group.position.set(x, 0, z);
    scene.add(group);
    pedestrians.push({ group, x, z, heading: (i * 0.9) % (Math.PI * 2), speed: 1.6 + (i % 3) * 0.5, wander: Math.random() * 10 });
  }
  return { cars, pedestrians };
}

export function updateTraffic(traffic, dt, time) {
  for (const car of traffic.cars) {
    car.pos += car.speed * dt;
    if (car.pos > 195) car.pos = -195;
    if (car.horizontal) { car.mesh.group.position.set(car.pos, 0, car.lane); car.mesh.group.rotation.y = 0; }
    else { car.mesh.group.position.set(car.lane, 0, car.pos); car.mesh.group.rotation.y = Math.PI / 2; }
    for (const wheel of car.mesh.wheels) wheel.rotation.z -= car.speed * dt * 2;
  }
  for (const ped of traffic.pedestrians) {
    ped.wander += dt;
    if (ped.wander > 6) { ped.wander = 0; ped.heading += (Math.random() - 0.5) * 1.6; }
    ped.x += Math.cos(ped.heading) * ped.speed * dt;
    ped.z += Math.sin(ped.heading) * ped.speed * dt;
    if (Math.abs(ped.x) > 185) ped.heading = Math.PI - ped.heading;
    if (Math.abs(ped.z) > 185) ped.heading = -ped.heading;
    ped.group.position.set(ped.x, Math.abs(Math.sin(time * 6 + ped.speed)) * 0.05, ped.z);
    ped.group.rotation.y = -ped.heading;
  }
}

export function countNearbyTraffic(traffic, x, z, radius) {
  let n = 0;
  for (const car of traffic.cars) {
    const p = car.mesh.group.position;
    if (Math.hypot(p.x - x, p.z - z) < radius) n += 1;
  }
  return n;
}
