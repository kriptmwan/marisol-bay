// Marisol Bay — staged screenshot scenes behind ?shot=cover|drive|chase|docks.
// Each scene sets up the real game state (mission, wanted, car, police) and
// lets it run a few seconds, so the frame is what a player really sees.
// main.js calls stageShot(name, game) then paints it and sets __shotReady
// once five wall-clock seconds have passed since staging.
function placeShotCar(g, x, z, heading, speed) {
  const car = g.player.currentCar;
  if (!car) return;
  car.x = x; car.z = z; car.heading = heading; car.speed = speed;
  g.player.x = x; g.player.z = z;
}

export function stageShot(name, game) {
  const g = game;
  g.screen = 'play';
  g.started = true;
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  if (name === 'drive') {
    g.missions.index = 0; g.startMission(0);
    g.stealNearestCar(true);
    placeShotCar(g, -90, 0, 0, 20);
    g.wanted = 0; g.wantedTimer = 0;
    g.cameraHeading = 0;
  } else if (name === 'chase') {
    g.missions.index = 3; g.startMission(3);
    g.stealNearestCar(true);
    // x=0 road heading north: the hotel (mission target) sits off to the
    // left instead of dead ahead, so it never fills the frame.
    placeShotCar(g, 0, 120, Math.PI / 2, 24);
    g.cameraHeading = Math.PI / 2;
    g.setWanted(3, true);
    g.spawnPoliceNear(3, 22);
  } else if (name === 'docks') {
    g.missions.index = 1; g.startMission(1);
    g.placePlayer(135, 150, -0.7);
    g.setWanted(1, true);
    g.cameraHeading = -0.7;
  } else {
    // cover: a 3-star chase in a car, minimap + objective + wanted on the HUD.
    g.missions.index = 3; g.startMission(3);
    g.stealNearestCar(true);
    placeShotCar(g, -90, -40, 0, 22);
    g.cameraHeading = 0;
    g.setWanted(3, true);
    g.spawnPoliceNear(3, 22);
  }
  g.hud.setObjective(g.missionObjectiveText());
  // Let traffic, police and the camera settle. Ready is wall-clock based
  // (a few seconds after staging) so slow software renderers still settle.
  g.shotFrames = 0;
  g.shotSettle = 30;
  g.shotStartWall = performance.now();
}
