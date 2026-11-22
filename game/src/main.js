// Marisol Bay — boot and the one game loop. Input, camera, wanted, combat,
// missions, police, save/load and the ?shot= staging hook all meet here.
// ?shot=cover|drive|chase|docks stages that scene, paints it and sets
// window.__shotReady for a screenshot. No network request is ever made.
import * as THREE from 'three';
import { WORLD, PLAYER, SAVE_KEY, START_CASH, WEAPONS, WANTED, LANDMARKS, clampNumber } from './config.js';
import { buildCity, resolveBuildingCollision, setSunsetLighting } from './city.js';
import { createPlayer, updatePlayerOnFoot, placePlayerAt } from './player.js';
import { createParkedCar, nearestParkedCar, updateDrivenCar } from './vehicles.js';
import { createTraffic, updateTraffic } from './traffic.js';
import { createPolice, updatePolice, policeSeenByPlayer, spawnPoliceCar } from './police.js';
import { createMissionManager, currentMission, startMission, checkMissionProgress, missionObjectiveText, missionTarget, updateMissionBeacon } from './missions.js';
import { createHud, updateHud, drawMinimap } from './hud.js';
import { createAudioEngine, RADIO_STATIONS } from './audio.js';
import { createEffects, fireTracer, spawnSparks, spawnSmoke, updateEffects } from './effects.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
let seed = Number.isInteger(seedParam) ? seedParam : 20261122;
function seededRandom() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87bfe8);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

const city = buildCity(scene);
const player = createPlayer(scene, -42, -26);
const traffic = createTraffic(scene, 12);
const police = createPolice(scene);
const missions = createMissionManager(scene);
const hud = createHud();
const audio = createAudioEngine();
const effects = createEffects(scene);

// Parked cars the player can steal, spread along the roads.
const parkedCars = [];
const parkedSpots = [[-44, -30, 1.57], [4, 20, 1.57], [-36, 40, 1.57], [44, -60, 1.57], [84, 20, 1.57], [-96, -80, 1.57], [44, 100, 1.57], [-36, 120, 1.57], [124, -20, 1.57], [-116, 80, 1.57], [84, 60, 1.57], [4, -100, 1.57]];
parkedSpots.forEach(([x, z, h], i) => {
  const car = createParkedCar(x, z, h, i === 4 || i === 9, i);
  scene.add(car.mesh.group);
  parkedCars.push(car);
});
// The Plaza sports car for mission 3, parked on the road just north of the fountain.
const plazaSport = createParkedCar(4, 18, 1.57, true, 7);
scene.add(plazaSport.mesh.group); parkedCars.push(plazaSport);

const game = {
  scene, camera, player, traffic, police, missions, hud, audio, effects, parkedCars,
  cash: START_CASH, wanted: 0, wantedTimer: 0, lastCrime: 0,
  weapons: { pistol: { ...WEAPONS.pistol }, smg: { ...WEAPONS.smg } },
  currentWeapon: 'pistol', smgUnlocked: false, radioLabel: RADIO_STATIONS[0],
  cameraHeading: 0.7, screen: 'title', started: false,
  missionTarget: null, shotFrames: 0, shotSettle: 0, enemies: [], time: 0,
  startMission(index) { const m = startMission(missions, index); game.missionTarget = missionTarget(missions); if (m && m.startWanted) game.setWanted(m.startWanted, true); if (m && m.combat) game.spawnGuards(); return m; },
  setWanted(stars, silent) { game.wanted = clampNumber(stars, 0, WANTED.maxStars); game.wantedTimer = 0; game.lastCrime = game.time; if (!silent && stars > 0) hud.showToast(`Wanted level ${stars} — the police are coming!`); },
  addWanted(stars) { game.setWanted(game.wanted + stars); },
  placePlayer(x, z, heading) { placePlayerAt(player, x, z, heading); },
  spawnPoliceNear(count, distance) {
    for (let i = 0; i < count; i += 1) {
      // Behind the player, on the camera side: angle PI - cameraHeading.
      const a = Math.PI - game.cameraHeading + (i - (count - 1) / 2) * 0.45;
      spawnPoliceCar(police, scene, player.x + Math.cos(a) * distance, player.z + Math.sin(a) * distance);
    }
  },
  missionObjectiveText() { return missionObjectiveText(missions); },
  stealNearestCar(force) {
    if (!player.onFoot) return false;
    const car = nearestParkedCar(parkedCars, player.x, player.z, force ? 400 : 6);
    if (!car) { if (!force) hud.showToast('No car close enough — walk up to a parked car and press E.'); return false; }
    car.parked = false; car.stolen = true;
    player.currentCar = car; player.onFoot = false;
    player.x = car.x; player.z = car.z;
    player.group.visible = false;
    if (!car.wasStolen) { car.wasStolen = true; game.addWanted(WANTED.stealStars); hud.showToast(`Stole a ${car.name} — wanted +1 star!`); audio.playStinger('cash'); }
    return true;
  },
  exitCar() {
    if (player.onFoot || !player.currentCar) return;
    const car = player.currentCar;
    player.currentCar = null; player.onFoot = true;
    placePlayerAt(player, car.x + 3, car.z + 3, player.heading);
    player.group.visible = true;
  },
  spawnGuards() {
    game.enemies = [];
    const spots = [[-158, 112], [-142, 128], [-150, 108], [-138, 116]];
    spots.forEach(([x, z], i) => {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), new THREE.MeshLambertMaterial({ color: 0x222222 }));
      body.position.y = 1.15; group.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshLambertMaterial({ color: 0xd8a080 }));
      head.position.y = 2.0; group.add(head);
      group.position.set(x, 0, z); scene.add(group);
      game.enemies.push({ group, x, z, health: 100, shootTimer: 1 + i * 0.7 });
    });
    missions.enemiesLeft = game.enemies.length;
  },
  saveGame() {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({ missionIndex: missions.index, cash: game.cash, smgUnlocked: game.smgUnlocked, health: player.health, x: player.x, z: player.z }));
      hud.showToast('Game saved — progress kept in this browser.');
    } catch { /* storage off: the run still plays */ }
  },
  loadGame() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      game.cash = s.cash ?? START_CASH; game.smgUnlocked = !!s.smgUnlocked;
      player.health = s.health ?? PLAYER.maxHealth;
      if (typeof s.x === 'number') placePlayerAt(player, s.x, s.z, 0);
      game.startMission(Math.min(s.missionIndex ?? 0, 7));
      return true;
    } catch { return false; }
  },
};

const input = { up: false, down: false, left: false, right: false, run: false, brake: false };
const keyMap = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', ShiftLeft: 'run', ShiftRight: 'run', Space: 'brake' };
let lastShotAt = 0, mouseDown = false, dragX = 0;

window.addEventListener('keydown', (e) => {
  if (keyMap[e.code] !== undefined) { input[keyMap[e.code]] = true; if (e.code === 'Space') e.preventDefault(); }
  if (e.code === 'KeyE') { if (player.onFoot) game.stealNearestCar(false); else game.exitCar(); }
  if (e.code === 'Escape') togglePause();
  if (e.code === 'Digit1') { game.currentWeapon = 'pistol'; hud.setWeapon('Pistol', game.smgUnlocked); }
  if (e.code === 'Digit2' && game.smgUnlocked) { game.currentWeapon = 'SMG'; hud.setWeapon('SMG', true); }
  if (e.code === 'KeyR') { game.radioLabel = audio.nextStation(); hud.showToast(`Radio: ${game.radioLabel}`); }
  if (e.code === 'KeyM') { hud.showToast(audio.toggleMute() ? 'Sound muted' : 'Sound on'); }
  if (e.code === 'KeyL') game.saveGame();
  if (e.code === 'Enter' && game.screen === 'title') startGame(false);
  if (e.code === 'Enter' && game.screen === 'over') restartGame();
});
window.addEventListener('keyup', (e) => { if (keyMap[e.code] !== undefined) input[keyMap[e.code]] = false; });
canvas.addEventListener('mousedown', (e) => { mouseDown = true; dragX = e.clientX; audio.unlock(); if (game.screen === 'play') shootFromCamera(); });
window.addEventListener('mouseup', () => { mouseDown = false; });
window.addEventListener('mousemove', (e) => {
  if (!mouseDown) return;
  game.cameraHeading -= (e.clientX - dragX) * 0.005; dragX = e.clientX;
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function togglePause() {
  if (game.screen === 'play') { game.screen = 'paused'; document.getElementById('pause-screen').style.display = 'flex'; }
  else if (game.screen === 'paused') { game.screen = 'play'; document.getElementById('pause-screen').style.display = 'none'; }
}

function startGame(fromSave) {
  audio.unlock();
  game.started = true; game.screen = 'play';
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  if (fromSave && game.loadGame()) { hud.showToast('Save loaded — welcome back to Marisol Bay.'); }
  else { game.cash = START_CASH; game.startMission(0); }
  hud.setWeapon('Pistol', game.smgUnlocked);
  hud.setObjective(game.missionObjectiveText());
  game.missionTarget = missionTarget(missions);
}

function restartGame() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  player.health = PLAYER.maxHealth; game.cash = START_CASH; game.wanted = 0; game.smgUnlocked = false;
  game.weapons = { pistol: { ...WEAPONS.pistol }, smg: { ...WEAPONS.smg } };
  placePlayerAt(player, -42, -26, 0); player.group.visible = true; player.onFoot = true; player.currentCar = null;
  document.getElementById('over-screen').style.display = 'none';
  startGame(false);
}

document.getElementById('start-btn').addEventListener('click', () => startGame(false));
document.getElementById('continue-btn').addEventListener('click', () => startGame(true));
document.getElementById('resume-btn').addEventListener('click', togglePause);
document.getElementById('restart-btn').addEventListener('click', restartGame);

function shootFromCamera() {
  const now = performance.now();
  const def = game.weapons[game.currentWeapon];
  if (now - lastShotAt < def.rate * 1000) return;
  if (def.ammo <= 0) { hud.showToast('Out of ammo — find cover!'); audio.playStinger('fail'); return; }
  lastShotAt = now; def.ammo -= 1;
  audio.playGunshot();
  const origin = new THREE.Vector3(player.x, player.onFoot ? 1.6 : 1.4, player.z);
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  dir.x += (seededRandom() - 0.5) * def.spread; dir.y += (seededRandom() - 0.5) * def.spread; dir.normalize();
  const end = origin.clone().add(dir.multiplyScalar(def.range));
  fireTracer(effects, origin, end);
  // Hit a guard?
  let hitEnemy = null;
  for (const enemy of game.enemies) {
    if (Math.hypot(enemy.x - origin.x, enemy.z - origin.z) < 30) {
      const toEnemy = new THREE.Vector3(enemy.x - origin.x, 0, enemy.z - origin.z).normalize();
      const aim = new THREE.Vector3(); camera.getWorldDirection(aim);
      if (toEnemy.dot(new THREE.Vector3(aim.x, 0, aim.z).normalize()) > 0.86) { hitEnemy = enemy; break; }
    }
  }
  if (hitEnemy) {
    hitEnemy.health -= def.damage;
    spawnSparks(effects, new THREE.Vector3(hitEnemy.x, 1.5, hitEnemy.z), 0xff5533);
    if (hitEnemy.health <= 0) {
      spawnSmoke(effects, new THREE.Vector3(hitEnemy.x, 1, hitEnemy.z));
      scene.remove(hitEnemy.group);
      game.enemies = game.enemies.filter((e) => e !== hitEnemy);
      missions.enemiesLeft = game.enemies.length;
      hud.showToast('Guard down!');
    }
  }
  if (def.ammo === 0) hud.showToast('Magazine empty — keep moving!');
}

function updateCamera(dt) {
  const target = player.onFoot ? new THREE.Vector3(player.x, 0, player.z) : new THREE.Vector3(player.currentCar.x, 0, player.currentCar.z);
  if (!player.onFoot && player.currentCar) {
    // Chase camera follows the car's heading.
    const want = player.currentCar.heading;
    let dh = want - game.cameraHeading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    game.cameraHeading += dh * Math.min(1, dt * 2.5);
  }
  const dist = player.onFoot ? 11 : 15, height = player.onFoot ? 6 : 7;
  const cx = target.x - Math.cos(game.cameraHeading) * dist;
  const cz = target.z + Math.sin(game.cameraHeading) * dist;
  camera.position.lerp(new THREE.Vector3(cx, height, cz), Math.min(1, dt * 6));
  camera.lookAt(target.x, 2, target.z);
}

function gameOver() {
  game.screen = 'over';
  document.getElementById('over-screen').style.display = 'flex';
  document.getElementById('over-text').textContent = `Busted in Marisol Bay — ${game.cash} in cash, mission ${missions.index + 1} of 8.`;
  audio.playStinger('fail');
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  game.time += dt;
  if (game.screen === 'play') {
    if (player.onFoot) updatePlayerOnFoot(player, input, game.cameraHeading, dt, city.colliders);
    else if (player.currentCar) {
      const speed = updateDrivenCar(player.currentCar, input, dt);
      resolveBuildingCollision(player.currentCar.mesh.group.position, 2.2, city.colliders);
      player.currentCar.x = player.currentCar.mesh.group.position.x;
      player.currentCar.z = player.currentCar.mesh.group.position.z;
      player.x = player.currentCar.x; player.z = player.currentCar.z;
      audio.setEngine(speed, player.currentCar.maxSpeed);
    } else audio.setEngine(0, 1);
    updateTraffic(traffic, dt, game.time);
    // Wanted decay: 20s unseen, then one star drops.
    if (game.wanted > 0) {
      const seen = policeSeenByPlayer(police, player) || game.time - game.lastCrime < 4;
      if (!seen) { game.wantedTimer += dt; if (game.wantedTimer >= WANTED.decaySeconds) { game.wanted -= 1; game.wantedTimer = 0; hud.showToast('Wanted level dropped — you lost them!'); } }
      else game.wantedTimer = 0;
    }
    updatePolice(police, scene, player, 0, game.wanted, dt, game.time, (car) => {
      player.health -= 6 * dt * 10; spawnSparks(effects, new THREE.Vector3(player.x, 1.2, player.z), 0xff2222);
      if (player.health <= 0) { player.health = 0; gameOver(); }
    });
    audio.setSiren(game.wanted > 0, game.time);
    // Enemy guards shoot back during mission 6.
    for (const enemy of game.enemies) {
      enemy.shootTimer -= dt;
      const d = Math.hypot(enemy.x - player.x, enemy.z - player.z);
      if (d < 40 && enemy.shootTimer <= 0) {
        enemy.shootTimer = 1.6;
        fireTracer(effects, new THREE.Vector3(enemy.x, 1.6, enemy.z), new THREE.Vector3(player.x, 1.4, player.z));
        player.health -= 7; audio.playGunshot();
        if (player.health <= 0) { player.health = 0; gameOver(); }
      }
    }
    updateMissionBeacon(missions, game.time);
    game.missionTarget = missionTarget(missions);
    const progress = checkMissionProgress(missions, player, !player.onFoot, !!(player.currentCar && player.currentCar.sport), game.wanted, game.enemies.length, dt);
    if (progress.failed) {
      hud.showToast(progress.reason); audio.playStinger('fail');
      game.startMission(missions.index);
    } else if (progress.done) {
      const m = progress.mission;
      game.cash += m.payout;
      audio.playStinger('mission'); audio.playStinger('cash');
      hud.showToast(`Mission complete: ${m.title} — +${m.payout}!`);
      if (m.id === 6) { game.smgUnlocked = true; hud.setWeapon(game.currentWeapon === 'smg' ? 'SMG' : 'Pistol', true); hud.showToast('SMG unlocked! Press 2 to switch weapons.'); }
      game.saveGame();
      const next = game.startMission(missions.index + 1);
      if (!next) { hud.showToast('KING OF MARISOL BAY — all 8 missions complete!'); }
    }
    hud.setObjective(game.missionObjectiveText());
    updateHud(hud, game);
    drawMinimap(hud, game);
    setSunsetLighting(city.sun, scene, Math.min(1, missions.index / 8));
    updateEffects(effects, dt);
    updateCamera(dt);
  }
  if (shotName) {
    game.shotFrames += 1;
    // performance.now() is real wall time; the rAF timestamp lags badly
    // under software rendering, so the settle check must not use it.
    if (performance.now() - (game.shotStartWall || performance.now()) > 5000) window.__shotReady = true;
  }
  renderer.render(scene, camera);
}

hud.setWeapon('Pistol', false);
if (!shotName) document.getElementById('hud').style.display = 'none';
if (shotName) stageShot(shotName, game);
// Debug handle for automated playtests (read-only state inspection).
window.__marisolBay = game;
window.__marisolBayMissions = missions;
requestAnimationFrame(frame);
