// Marisol Bay — the player on foot: walk, run, turn, enter and leave cars.
// The player is a simple two-tone figure so the camera can always find them.
import * as THREE from 'three';
import { PLAYER, clampNumber } from './config.js';
import { resolveBuildingCollision } from './city.js';

export function createPlayer(scene, x, z) {
  const group = new THREE.Group();
  group.name = 'Player';
  const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), new THREE.MeshLambertMaterial({ color: 0xff5a3c }));
  jacket.position.y = 1.15; group.add(jacket);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), new THREE.MeshLambertMaterial({ color: 0xe8b98a }));
  head.position.y = 2.0; group.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.45), new THREE.MeshLambertMaterial({ color: 0x22304a }));
  legs.position.y = 0.45; group.add(legs);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.14, 12), new THREE.MeshLambertMaterial({ color: 0xffe9a8 }));
  cap.position.y = 2.28; group.add(cap);
  group.position.set(x, 0, z);
  scene.add(group);
  return {
    group, x, z, heading: 0, speed: 0, health: PLAYER.maxHealth,
    onFoot: true, currentCar: null, moving: false,
  };
}

export function updatePlayerOnFoot(player, input, cameraHeading, dt, colliders) {
  const speed = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  let mx = 0, mz = 0;
  if (input.up) { mx += Math.cos(cameraHeading); mz -= Math.sin(cameraHeading); }
  if (input.down) { mx -= Math.cos(cameraHeading); mz += Math.sin(cameraHeading); }
  if (input.left) { mx += Math.sin(cameraHeading); mz += Math.cos(cameraHeading); }
  if (input.right) { mx -= Math.sin(cameraHeading); mz -= Math.cos(cameraHeading); }
  const len = Math.hypot(mx, mz);
  player.moving = len > 0;
  if (len > 0) {
    mx /= len; mz /= len;
    player.x += mx * speed * dt; player.z += mz * speed * dt;
    player.heading = Math.atan2(-mz, mx);
    player.speed = speed;
  } else player.speed = 0;
  player.x = clampNumber(player.x, -196, 196);
  player.z = clampNumber(player.z, -196, 196);
  resolveBuildingCollision(player.group.position, PLAYER.radius, colliders);
  player.x = player.group.position.x; player.z = player.group.position.z;
  player.group.position.set(player.x, 0, player.z);
  player.group.rotation.y = player.heading;
  // Walk bob.
  player.group.children[0].position.y = 1.15 + (player.moving ? Math.abs(Math.sin(performance.now() / 90)) * 0.08 : 0);
}

export function placePlayerAt(player, x, z, heading) {
  player.x = x; player.z = z; player.heading = heading ?? player.heading;
  player.group.position.set(x, 0, z);
  player.group.rotation.y = player.heading;
}
