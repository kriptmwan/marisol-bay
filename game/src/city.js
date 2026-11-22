// Marisol Bay — the city itself: ground, roads, canvas-textured buildings,
// the beach and sea, the docks, marina, plaza, garage, warehouse and yacht.
// Every texture is drawn on a canvas at boot; the game makes no network request.
import * as THREE from 'three';
import { WORLD, LANDMARKS, PALETTE } from './config.js';

export function makeCanvasTexture(width, height, painter) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  painter(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function makeBuildingTexture(base, trim) {
  return makeCanvasTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = trim; ctx.fillRect(0, 0, w, 10);
    ctx.fillStyle = '#2b3440';
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const lit = (row * 4 + col) % 3 === 0;
        ctx.fillStyle = lit ? '#ffe9a8' : '#33404f';
        ctx.fillRect(12 + col * 28, 26 + row * 26, 18, 14);
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, h - 26, w, 26);
  });
}

export function makeRoadTexture() {
  return makeCanvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#33363d'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f2c94c';
    ctx.fillRect(w / 2 - 3, 8, 6, 28); ctx.fillRect(w / 2 - 3, 52, 6, 28); ctx.fillRect(w / 2 - 3, 96, 6, 28);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, 0, w, 3); ctx.fillRect(0, h - 3, w, 3);
  });
}

export function makeSandTexture() {
  return makeCanvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e8d29a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(180,140,80,0.5)';
    for (let i = 0; i < 90; i += 1) ctx.fillRect(Math.random() * w, Math.random() * h, 3, 2);
  });
}

export function buildCity(scene) {
  const group = new THREE.Group();
  group.name = 'MarisolBayCity';
  scene.add(group);
  const colliders = [];
  const landmarks = {};

  const sun = new THREE.DirectionalLight(0xffe0b3, 2.4);
  sun.position.set(120, 180, 60);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x8a6f4d, 1.1));
  scene.fog = new THREE.Fog(0x9fc4e8, 260, 520);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.size + 160, WORLD.size + 160),
    new THREE.MeshLambertMaterial({ color: 0x6fae5e }),
  );
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05;
  group.add(ground);

  // Beach + sea on the south-east shore.
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(440, 46), new THREE.MeshLambertMaterial({ map: makeSandTexture() }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.02, 205); group.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(560, 160), new THREE.MeshLambertMaterial({ color: PALETTE.sea }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.0, 300); group.add(sea);

  // Road grid.
  const roadTex = makeRoadTexture();
  roadTex.wrapS = THREE.RepeatWrapping; roadTex.wrapT = THREE.RepeatWrapping;
  for (let i = -4; i <= 4; i += 1) {
    const x = i * WORLD.roadGap;
    const roadV = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadWidth, WORLD.size), new THREE.MeshLambertMaterial({ map: roadTex }));
    roadV.rotation.x = -Math.PI / 2; roadV.position.set(x, 0.06, 0);
    roadV.material.map = roadTex.clone(); roadV.material.map.repeat.set(1, 10); roadV.material.map.needsUpdate = true;
    group.add(roadV);
    const roadH = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size, WORLD.roadWidth), new THREE.MeshLambertMaterial({ map: roadTex }));
    roadH.rotation.x = -Math.PI / 2; roadH.position.set(0, 0.06, x);
    roadH.material.map = roadTex.clone(); roadH.material.map.repeat.set(10, 1); roadH.material.map.needsUpdate = true;
    group.add(roadH);
  }

  // Buildings: one per block, skipped on roads, plaza and landmark plots.
  const skins = [
    makeBuildingTexture('#f2e3c6', '#c98a4b'), makeBuildingTexture('#e8a87c', '#7a4a2b'),
    makeBuildingTexture('#7fb3d5', '#2f5d7a'), makeBuildingTexture('#d98880', '#7a3b34'),
    makeBuildingTexture('#f7d774', '#a67c1b'), makeBuildingTexture('#9bbf8a', '#4a6b3a'),
  ];
  const blocks = [];
  for (let gx = -4; gx <= 4; gx += 1) {
    for (let gz = -4; gz <= 4; gz += 1) {
      const cx = gx * WORLD.roadGap + 20, cz = gz * WORLD.roadGap + 20;
      if (Math.abs(cx) < 28 && Math.abs(cz) < 28) continue; // plaza
      if (Math.hypot(cx - 150, cz - 165) < 55) continue; // docks
      if (Math.hypot(cx + 150, cz - 120) < 45) continue; // warehouse yard
      if (Math.hypot(cx + 120, cz + 40) < 40) continue; // garage yard
      blocks.push([cx, cz]);
    }
  }
  blocks.forEach(([cx, cz], i) => {
    const w = 14 + ((i * 37) % 10), d = 14 + ((i * 53) % 10), h = 10 + ((i * 29) % 34);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ map: skins[i % skins.length] }));
    mesh.position.set(cx, h / 2, cz);
    group.add(mesh);
    colliders.push({ x: cx, z: cz, halfW: w / 2 + 0.6, halfD: d / 2 + 0.6 });
    // Rooftop water tank on tall blocks.
    if (h > 30) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3, 8), new THREE.MeshLambertMaterial({ color: 0x8a97a3 }));
      tank.position.set(cx + w / 4, h + 1.5, cz); group.add(tank);
    }
  });

  function addLandmark(key, kind) {
    const def = LANDMARKS[key];
    const marker = new THREE.Group();
    marker.position.set(def.x, 0, def.z);
    if (kind === 'docks' || kind === 'marina') {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(70, 1.2, 14), new THREE.MeshLambertMaterial({ color: 0x8a6f4d }));
      pier.position.y = 0.6; marker.add(pier);
      for (let i = 0; i < 5; i += 1) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4), new THREE.MeshLambertMaterial({ color: i % 2 ? 0xb5651d : 0x4a7a3a }));
        crate.position.set(-28 + i * 13, 2.7, -3); marker.add(crate);
      }
      const crane = new THREE.Mesh(new THREE.BoxGeometry(3, 22, 3), new THREE.MeshLambertMaterial({ color: 0xd8a13a }));
      crane.position.set(24, 11, 4); marker.add(crane);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(22, 2, 2), new THREE.MeshLambertMaterial({ color: 0xd8a13a }));
      arm.position.set(14, 20, 4); marker.add(arm);
    } else if (kind === 'yacht') {
      const hull = new THREE.Mesh(new THREE.BoxGeometry(16, 3, 5), new THREE.MeshLambertMaterial({ color: 0xf5f5f0 }));
      hull.position.y = 1.5; marker.add(hull);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(8, 3, 4), new THREE.MeshLambertMaterial({ color: 0x2f5d7a }));
      cabin.position.y = 4.5; marker.add(cabin);
    } else if (kind === 'warehouse') {
      const shed = new THREE.Mesh(new THREE.BoxGeometry(34, 10, 20), new THREE.MeshLambertMaterial({ color: 0x9aa5ad }));
      shed.position.y = 5; marker.add(shed);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(36, 1, 22), new THREE.MeshLambertMaterial({ color: 0x5a6b76 }));
      roof.position.y = 10.5; marker.add(roof);
      colliders.push({ x: def.x, z: def.z, halfW: 18, halfD: 11 });
    } else if (kind === 'garage') {
      const bay = new THREE.Mesh(new THREE.BoxGeometry(22, 7, 14), new THREE.MeshLambertMaterial({ color: 0xc96a3b }));
      bay.position.y = 3.5; marker.add(bay);
      colliders.push({ x: def.x, z: def.z, halfW: 12, halfD: 8 });
    } else if (kind === 'plaza') {
      const fountain = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 2, 16), new THREE.MeshLambertMaterial({ color: 0x7fb3d5 }));
      fountain.position.y = 1; marker.add(fountain);
      for (let i = 0; i < 6; i += 1) {
        const palm = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 7, 6), new THREE.MeshLambertMaterial({ color: 0x6b4a2b }));
        const a = (i / 6) * Math.PI * 2;
        palm.position.set(Math.cos(a) * 18, 3.5, Math.sin(a) * 18); marker.add(palm);
        const top = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 6), new THREE.MeshLambertMaterial({ color: 0x3f8f3a }));
        top.position.set(Math.cos(a) * 18, 7.4, Math.sin(a) * 18); marker.add(top);
      }
    } else {
      const block = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 12), new THREE.MeshLambertMaterial({ color: 0xe8e0d0 }));
      block.position.y = 4; marker.add(block);
      colliders.push({ x: def.x, z: def.z, halfW: 7, halfD: 7 });
    }
    group.add(marker);
    landmarks[key] = marker;
    return marker;
  }
  addLandmark('docks', 'docks');
  addLandmark('marina', 'marina');
  addLandmark('plaza', 'plaza');
  addLandmark('garage', 'garage');
  addLandmark('warehouse', 'warehouse');
  addLandmark('yacht', 'yacht');
  addLandmark('hospital', 'block');
  addLandmark('hotel', 'block');

  // Palm trees along the beach road.
  for (let i = 0; i < 16; i += 1) {
    const x = -160 + i * 21;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 6, 6), new THREE.MeshLambertMaterial({ color: 0x6b4a2b }));
    trunk.position.set(x, 3, 182); group.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 6), new THREE.MeshLambertMaterial({ color: 0x3f8f3a }));
    crown.position.set(x, 6.4, 182); group.add(crown);
  }
  return { group, colliders, landmarks, sun };
}

export function resolveBuildingCollision(position, radius, colliders) {
  for (const c of colliders) {
    const dx = position.x - c.x, dz = position.z - c.z;
    if (Math.abs(dx) < c.halfW + radius && Math.abs(dz) < c.halfD + radius) {
      const pushX = (c.halfW + radius) - Math.abs(dx);
      const pushZ = (c.halfD + radius) - Math.abs(dz);
      if (pushX < pushZ) position.x = c.x + Math.sign(dx || 1) * (c.halfW + radius);
      else position.z = c.z + Math.sign(dz || 1) * (c.halfD + radius);
    }
  }
}

export function setSunsetLighting(sun, scene, t) {
  // t 0 = midday, 1 = full sunset. The sky warms as the story advances.
  const day = new THREE.Color(PALETTE.skyDay), dusk = new THREE.Color(PALETTE.skySunset);
  scene.background = day.clone().lerp(dusk, t);
  sun.color.setHex(0xffe0b3).lerp(new THREE.Color(0xff7a3c), t);
  sun.intensity = 2.4 - t * 0.9;
}
