// Marisol Bay — every tuning number and colour in one place.
// A sun-soaked coastal city: 400 x 400 world units, a road grid every 40,
// the docks and marina on the south-east shore, the plaza at the centre.
export const WORLD = { size: 400, half: 200, roadGap: 40, roadWidth: 10 };
export const SAVE_KEY = 'marisol-bay-save-v1';
export const START_CASH = 250;
export const PLAYER = { walkSpeed: 9, runSpeed: 14, radius: 0.9, maxHealth: 100 };
export const CAR = { accel: 22, brake: 34, maxSpeed: 46, sportMaxSpeed: 58, reverseSpeed: 14, turn: 1.9 };
export const WANTED = {
  maxStars: 5,
  decaySeconds: 20,
  stealStars: 1,
  shootStars: 1,
  killStars: 1,
  roadblockAt: 3,
  helicopterAt: 4,
};
export const MISSION_PAYOUTS = [400, 650, 1200, 900, 1500, 1800, 3500, 5000];
export const WEAPONS = {
  pistol: { name: 'Pistol', damage: 34, ammo: 48, reserve: 120, rate: 0.22, range: 70, spread: 0.02 },
  smg: { name: 'SMG', damage: 18, ammo: 90, reserve: 240, rate: 0.09, range: 60, spread: 0.05 },
};
export const PALETTE = {
  skyDay: 0x87bfe8, skySunset: 0xff9a5c, sea: 0x1e7fa8, sand: 0xe8d29a,
  asphalt: 0x33363d, sidewalk: 0x9a9a92, grass: 0x5da24a,
  buildingA: 0xf2e3c6, buildingB: 0xe8a87c, buildingC: 0x7fb3d5, buildingD: 0xd98880,
  police: 0x1a2a4a, taxi: 0xf2c94c, hud: '#ffe9a8', accent: '#ffcf3f',
};
export const LANDMARKS = {
  docks: { x: 150, z: 165, label: 'Docks' },
  marina: { x: 120, z: 170, label: 'Marina' },
  plaza: { x: 0, z: 0, label: 'Plaza' },
  garage: { x: -120, z: -40, label: 'Garage' },
  warehouse: { x: -150, z: 120, label: 'Warehouse' },
  yacht: { x: 165, z: 185, label: 'Yacht' },
  hospital: { x: 80, z: -120, label: 'Hospital' },
  hotel: { x: -40, z: 80, label: 'Hotel' },
};
export function clampNumber(value, min, max) { return Math.max(min, Math.min(max, value)); }
export function distance2D(ax, az, bx, bz) { return Math.hypot(ax - bx, az - bz); }
export function formatCash(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
