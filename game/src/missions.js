// Marisol Bay — the 8-mission story chain. Each mission has a briefing, a
// beacon target, a payout and a wanted twist; completing one saves the game
// and unlocks the next. The manager only knows missions; main.js wires the
// world effects (wanted, weapons, timers) through its callbacks.
import * as THREE from 'three';
import { LANDMARKS, MISSION_PAYOUTS } from './config.js';

export const MISSION_LIST = [
  { id: 1, title: 'Borrow a Ride', briefing: 'Steal a car and drive it to the Docks. Press E near a parked car.', target: LANDMARKS.docks, radius: 14, payout: MISSION_PAYOUTS[0], needCar: true },
  { id: 2, title: 'The Drop', briefing: 'Deliver the package to the Marina. The police will notice — escape with 1 star.', target: LANDMARKS.marina, radius: 12, payout: MISSION_PAYOUTS[1], startWanted: 1 },
  { id: 3, title: 'Hot Wheels', briefing: 'Steal the sports car from the Plaza and bring it to the Garage. Expect 2 stars.', target: LANDMARKS.garage, radius: 12, payout: MISSION_PAYOUTS[2], startWanted: 2, needSport: true },
  { id: 4, title: 'Smoke Screen', briefing: 'Lose a 3-star wanted level. Break line of sight and stay unseen for 20 seconds.', target: LANDMARKS.hotel, radius: 16, payout: MISSION_PAYOUTS[3], startWanted: 3, loseWanted: true },
  { id: 5, title: 'Getaway Driver', briefing: 'Timed drive: hit the checkpoints — Plaza, Hospital, Docks — before the clock runs out.', target: LANDMARKS.plaza, radius: 12, payout: MISSION_PAYOUTS[4], timed: 90, checkpoints: [LANDMARKS.plaza, LANDMARKS.hospital, LANDMARKS.docks] },
  { id: 6, title: 'Armed Response', briefing: 'Clear the Warehouse guards. Left-click to shoot — SMG unlocked after this job.', target: LANDMARKS.warehouse, radius: 14, payout: MISSION_PAYOUTS[5], combat: true, enemies: 4 },
  { id: 7, title: 'The Big Score', briefing: 'Grab the loot at the Docks, then escape a 4-star wanted level with the helicopter on you.', target: LANDMARKS.docks, radius: 12, payout: MISSION_PAYOUTS[6], startWanted: 4 },
  { id: 8, title: 'King of Marisol Bay', briefing: 'Survive 5 stars for 60 seconds, then reach the Yacht. Finish this and the bay is yours.', target: LANDMARKS.yacht, radius: 12, payout: MISSION_PAYOUTS[7], startWanted: 5, surviveSeconds: 60 },
];

export function createMissionManager(scene) {
  const beacon = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 26, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffcf3f, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  beam.position.y = 13; beacon.add(beam);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.35, 8, 24), new THREE.MeshBasicMaterial({ color: 0xffcf3f }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.4; beacon.add(ring);
  beacon.visible = false;
  scene.add(beacon);
  return {
    index: 0, beacon, timer: 0, checkpointIndex: 0, surviveLeft: 0,
    enemiesLeft: 0, active: false, completed: false,
  };
}

export function currentMission(manager) { return MISSION_LIST[manager.index] ?? null; }

export function startMission(manager, index) {
  const mission = MISSION_LIST[index];
  if (!mission) { manager.active = false; manager.completed = true; manager.beacon.visible = false; return null; }
  manager.index = index; manager.active = true; manager.completed = false;
  manager.timer = mission.timed ?? 0; manager.checkpointIndex = 0;
  manager.surviveLeft = mission.surviveSeconds ?? 0;
  manager.enemiesLeft = mission.enemies ?? 0;
  const target = mission.checkpoints ? mission.checkpoints[0] : mission.target;
  manager.beacon.position.set(target.x, 0, target.z);
  manager.beacon.visible = true;
  return mission;
}

export function missionTarget(manager) {
  const mission = currentMission(manager);
  if (!mission) return null;
  if (mission.checkpoints) return mission.checkpoints[Math.min(manager.checkpointIndex, mission.checkpoints.length - 1)];
  return mission.target;
}

export function updateMissionBeacon(manager, time) {
  if (!manager.beacon.visible) return;
  manager.beacon.rotation.y = time * 0.8;
  manager.beacon.children[1].scale.setScalar(1 + Math.sin(time * 3) * 0.12);
}

export function checkMissionProgress(manager, playerPos, inCar, inSportCar, wanted, enemiesLeft, dt) {
  const mission = currentMission(manager);
  if (!mission || !manager.active) return { done: false };
  if (mission.timed) {
    manager.timer -= dt;
    if (manager.timer <= 0) return { done: false, failed: true, reason: 'Out of time — the getaway window closed.' };
  }
  if (mission.surviveSeconds) {
    if (wanted >= 5) manager.surviveLeft -= dt;
    if (manager.surviveLeft <= 0) {
      // Survived: now the yacht is the target.
      manager.beacon.position.set(mission.target.x, 0, mission.target.z);
    }
  }
  if (mission.combat && enemiesLeft <= 0 && manager.enemiesLeft > 0) {
    manager.enemiesLeft = 0;
    return { done: true, mission };
  }
  if (mission.loseWanted) {
    if (wanted === 0) return { done: true, mission };
    return { done: false };
  }
  const target = missionTarget(manager);
  const dist = Math.hypot(playerPos.x - target.x, playerPos.z - target.z);
  if (mission.checkpoints) {
    if (dist < mission.radius) {
      manager.checkpointIndex += 1;
      if (manager.checkpointIndex >= mission.checkpoints.length) return { done: true, mission };
      const next = mission.checkpoints[manager.checkpointIndex];
      manager.beacon.position.set(next.x, 0, next.z);
    }
    return { done: false };
  }
  if (mission.needCar && !inCar) return { done: false };
  if (mission.needSport && !inSportCar) return { done: false };
  if (mission.surviveSeconds && manager.surviveLeft > 0) return { done: false };
  if (dist < mission.radius) return { done: true, mission };
  return { done: false };
}

export function missionObjectiveText(manager) {
  const mission = currentMission(manager);
  if (!mission) return 'All missions complete — King of Marisol Bay.';
  let extra = '';
  if (mission.timed) extra = ` — ${Math.ceil(manager.timer)}s left`;
  if (mission.surviveSeconds && manager.surviveLeft > 0) extra = ` — survive ${Math.ceil(manager.surviveLeft)}s`;
  if (mission.checkpoints) extra = ` — checkpoint ${manager.checkpointIndex + 1}/${mission.checkpoints.length}`;
  if (mission.combat) extra = ` — guards left: ${manager.enemiesLeft}`;
  return `M${mission.id}: ${mission.title} — ${mission.briefing}${extra}`;
}
