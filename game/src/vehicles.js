// Marisol Bay — cars: how one is built, how it drives, how it is stolen.
// A car is a box body, cabin, wheels and headlights; sport cars are lower and faster.
import * as THREE from 'three';
import { CAR, clampNumber } from './config.js';

const BODY_COLOURS = [0xd23b3b, 0x2f6fd0, 0xf2c94c, 0x3aa655, 0xe8e8e8, 0x222831, 0xe87ab0, 0x7a4fd0];

export function pickCarColour(index) { return BODY_COLOURS[index % BODY_COLOURS.length]; }

export function createCarMesh(colour, sport) {
  const group = new THREE.Group();
  group.name = sport ? 'SportCar' : 'CityCar';
  const bodyMat = new THREE.MeshLambertMaterial({ color: colour });
  const body = new THREE.Mesh(new THREE.BoxGeometry(sport ? 4.4 : 4.0, 0.85, 2.0), bodyMat);
  body.position.y = 0.65; group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.7, 1.8), new THREE.MeshLambertMaterial({ color: 0x1d2733 }));
  cabin.position.set(-0.2, 1.35, 0); group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheels = [];
  for (const [wx, wz] of [[1.4, 0.95], [1.4, -0.95], [-1.4, 0.95], [-1.4, -0.95]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.x = Math.PI / 2; wheel.position.set(wx, 0.42, wz);
    group.add(wheel); wheels.push(wheel);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const z of [-0.6, 0.6]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, 0.4), lightMat);
    light.position.set(2.05, 0.7, z); group.add(light);
  }
  return { group, wheels, sport: !!sport };
}

export function createParkedCar(x, z, heading, sport, index) {
  const mesh = createCarMesh(pickCarColour(index), sport);
  mesh.group.position.set(x, 0, z);
  mesh.group.rotation.y = heading;
  return {
    mesh, x, z, heading, speed: 0, sport: !!sport,
    maxSpeed: sport ? CAR.sportMaxSpeed : CAR.maxSpeed,
    parked: true, stolen: false, name: sport ? 'Comet Sport' : 'City Sedan',
  };
}

export function updateDrivenCar(car, input, dt) {
  const forward = (input.up ? 1 : 0) - (input.down ? 1 : 0);
  if (forward > 0) car.speed += CAR.accel * dt;
  else if (forward < 0) car.speed -= (car.speed > 0.5 ? CAR.brake : CAR.accel * 0.6) * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
  if (input.brake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), CAR.brake * dt);
  car.speed = clampNumber(car.speed, -CAR.reverseSpeed, car.maxSpeed);
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  if (Math.abs(car.speed) > 0.2) car.heading += steer * CAR.turn * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 10);
  car.x += Math.cos(car.heading) * car.speed * dt;
  car.z -= Math.sin(car.heading) * car.speed * dt;
  car.x = clampNumber(car.x, -196, 196); car.z = clampNumber(car.z, -196, 196);
  car.mesh.group.position.set(car.x, 0, car.z);
  car.mesh.group.rotation.y = car.heading;
  for (const wheel of car.mesh.wheels) wheel.rotation.z -= car.speed * dt * 2;
  return car.speed;
}

export function nearestParkedCar(cars, x, z, maxDistance) {
  let best = null, bestD = maxDistance;
  for (const car of cars) {
    if (!car.parked) continue;
    const d = Math.hypot(car.x - x, car.z - z);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}
