// Marisol Bay — combat and chase effects: tracer lines, muzzle flashes,
// hit sparks, smoke puffs and the explosion flash when a car is wrecked.
import * as THREE from 'three';

export function createEffects(scene) {
  return { scene, tracers: [], sparks: [], flashes: [] };
}

export function fireTracer(effects, from, to) {
  const geo = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 1 }));
  effects.scene.add(line);
  effects.tracers.push({ line, life: 0.12 });
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
  flash.position.copy(from);
  effects.scene.add(flash);
  effects.flashes.push({ mesh: flash, life: 0.07 });
}

export function spawnSparks(effects, at, colour) {
  for (let i = 0; i < 8; i += 1) {
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), new THREE.MeshBasicMaterial({ color: colour ?? 0xffcf3f }));
    spark.position.copy(at);
    spark.userData.vx = (Math.random() - 0.5) * 8;
    spark.userData.vy = Math.random() * 5;
    spark.userData.vz = (Math.random() - 0.5) * 8;
    effects.scene.add(spark);
    effects.sparks.push({ mesh: spark, life: 0.45 });
  }
}

export function spawnSmoke(effects, at) {
  const puff = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 6), new THREE.MeshLambertMaterial({ color: 0x555555, transparent: true, opacity: 0.55 }));
  puff.position.copy(at); puff.position.y = 1.2;
  effects.scene.add(puff);
  effects.sparks.push({ mesh: puff, life: 1.4, smoke: true });
}

export function updateEffects(effects, dt) {
  for (let i = effects.tracers.length - 1; i >= 0; i -= 1) {
    const t = effects.tracers[i]; t.life -= dt;
    t.line.material.opacity = Math.max(0, t.life / 0.12);
    if (t.life <= 0) { effects.scene.remove(t.line); t.line.geometry.dispose(); effects.tracers.splice(i, 1); }
  }
  for (let i = effects.flashes.length - 1; i >= 0; i -= 1) {
    const f = effects.flashes[i]; f.life -= dt;
    if (f.life <= 0) { effects.scene.remove(f.mesh); effects.flashes.splice(i, 1); }
  }
  for (let i = effects.sparks.length - 1; i >= 0; i -= 1) {
    const s = effects.sparks[i]; s.life -= dt;
    s.mesh.position.x += (s.mesh.userData.vx ?? 0) * dt;
    s.mesh.position.y += (s.mesh.userData.vy ?? 0) * dt;
    s.mesh.position.z += (s.mesh.userData.vz ?? 0) * dt;
    if (s.smoke) s.mesh.scale.addScalar(dt * 1.5);
    if (s.life <= 0) { effects.scene.remove(s.mesh); effects.sparks.splice(i, 1); }
  }
}
