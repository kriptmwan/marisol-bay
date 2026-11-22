// Marisol Bay — the HUD: wanted stars, health, cash, speed, ammo, weapon
// wheel, mission objective, radio, save toast, and a round rotating minimap
// drawn on a 2D canvas (city blocks, roads, beacon, player arrow, police).
import { WORLD, formatCash } from './config.js';

export function createHud() {
  const hud = document.getElementById('hud');
  const minimap = document.getElementById('minimap');
  const mapCtx = minimap.getContext('2d');
  const objective = document.getElementById('objective-text');
  const stars = document.getElementById('stars');
  const health = document.getElementById('health-fill');
  const healthText = document.getElementById('health-text');
  const cash = document.getElementById('cash');
  const speed = document.getElementById('speed');
  const ammo = document.getElementById('ammo');
  const weapon = document.getElementById('weapon');
  const radio = document.getElementById('radio');
  const toast = document.getElementById('toast');
  const wheel = document.getElementById('weapon-wheel');
  let toastTimer = 0;
  return {
    hud, minimap, mapCtx, objective, stars, health, healthText, cash, speed, ammo, weapon, radio, toast, wheel,
    showToast(message) { toast.textContent = message; toast.style.opacity = '1'; window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { toast.style.opacity = '0'; }, 2600); },
    setObjective(text) { objective.textContent = text; },
    setWeapon(name, unlockedSmg) {
      weapon.textContent = name;
      wheel.innerHTML = `<span class="slot ${name === 'Pistol' ? 'active' : ''}">1 Pistol</span><span class="slot ${name === 'SMG' ? 'active' : ''}">${unlockedSmg ? '2 SMG' : '2 SMG 🔒 M6'}</span>`;
    },
  };
}

export function updateHud(hud, game) {
  hud.stars.textContent = '★'.repeat(game.wanted) + '☆'.repeat(5 - game.wanted);
  hud.stars.className = game.wanted >= 4 ? 'stars hot' : game.wanted >= 2 ? 'stars warm' : 'stars';
  hud.health.style.width = `${Math.max(0, game.player.health)}%`;
  hud.healthText.textContent = `HP ${Math.ceil(Math.max(0, game.player.health))}`;
  hud.cash.textContent = formatCash(game.cash);
  const speedKmh = Math.round(Math.abs(game.player.currentCar ? game.player.currentCar.speed : game.player.speed) * 3.2);
  hud.speed.textContent = game.player.onFoot ? 'On foot' : `${speedKmh} km/h`;
  const weaponDef = game.weapons[game.currentWeapon];
  hud.ammo.textContent = `${weaponDef.ammo} / ${weaponDef.reserve}`;
  hud.radio.textContent = game.audio.state.muted ? 'Muted (M)' : game.radioLabel;
}

export function drawMinimap(hud, game) {
  const ctx = hud.mapCtx, size = 168, centre = size / 2;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath(); ctx.arc(centre, centre, centre - 2, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#1d2b1a'; ctx.fillRect(0, 0, size, size);
  // Rotate the map so the player's heading is up.
  ctx.translate(centre, centre);
  ctx.rotate(game.cameraHeading + Math.PI / 2);
  const scale = size / (WORLD.size * 0.62);
  const px = game.player.x, pz = game.player.z;
  ctx.fillStyle = '#3f6b34';
  ctx.fillRect(-WORLD.half * scale - px * scale, -WORLD.half * scale - pz * scale, WORLD.size * scale, WORLD.size * scale);
  ctx.fillStyle = '#1e7fa8';
  ctx.fillRect(-WORLD.half * scale - px * scale, (190 - pz) * scale, WORLD.size * scale, 60 * scale);
  ctx.strokeStyle = '#33363d'; ctx.lineWidth = 4;
  for (let i = -4; i <= 4; i += 1) {
    const v = i * 40;
    ctx.beginPath(); ctx.moveTo((v - px) * scale, (-200 - pz) * scale); ctx.lineTo((v - px) * scale, (200 - pz) * scale); ctx.stroke();
    ctx.beginPath(); ctx.moveTo((-200 - px) * scale, (v - pz) * scale); ctx.lineTo((200 - px) * scale, (v - pz) * scale); ctx.stroke();
  }
  // Mission beacon.
  const target = game.missionTarget;
  if (target) {
    ctx.fillStyle = '#ffcf3f';
    ctx.beginPath(); ctx.arc((target.x - px) * scale, (target.z - pz) * scale, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  }
  // Police dots.
  ctx.fillStyle = '#3a86ff';
  for (const car of game.police.cars) ctx.fillRect((car.x - px) * scale - 3, (car.z - pz) * scale - 3, 6, 6);
  // Traffic dots.
  ctx.fillStyle = '#e8e8e8';
  for (const car of game.traffic.cars) {
    const p = car.mesh.group.position;
    ctx.fillRect((p.x - px) * scale - 2, (p.z - pz) * scale - 2, 4, 4);
  }
  ctx.restore();
  // Player arrow, fixed at centre, pointing up.
  ctx.fillStyle = '#ff5a3c';
  ctx.beginPath(); ctx.moveTo(centre, centre - 10); ctx.lineTo(centre - 7, centre + 8); ctx.lineTo(centre + 7, centre + 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(centre, centre, centre - 2, 0, Math.PI * 2); ctx.stroke();
}
