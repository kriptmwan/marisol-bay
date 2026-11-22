[![Marisol Bay — Make GTA 6](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/kriptmwan/marisol-bay/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/kriptmwan/marisol-bay/reward.svg)](https://make.fun/bounty/gta6-01)

# Marisol Bay

An open-world crime game in a sun-soaked coastal city, built for the make.fun **Make GTA 6** bounty (gta6-01). Everything is original — the city, the story, the art and the sound — and it runs offline in a desktop browser from the static files under `game/`, with no network request.

## Play

Serve `game/` with any static server (`node serve.ts`, then open http://localhost:8080) and click **Start New Game**.

- **On foot and by car** — walk the streets, steal any parked car with `E`, drive it, get out with `E` again.
- **A living city** — 12 AI traffic cars looping the road grid, 14 pedestrians on the sidewalks, a plaza fountain, palms along the beach, docks, marina, garage, warehouse and a yacht.
- **Wanted 0–5 stars** — stealing cars and shooting raise your heat. Police cars chase and ram, roadblocks appear at 3 stars, a helicopter with a spotlight hunts you at 4–5 stars. Break line of sight for ~20 seconds and the heat drops.
- **8-mission story** — Borrow a Ride, The Drop, Hot Wheels, Smoke Screen, Getaway Driver, Armed Response, The Big Score, and King of Marisol Bay. Each pays cash, saves the game, and unlocks the next. Timed checkpoints, a 3-star escape, warehouse combat and a 60-second 5-star survival finale.
- **Combat** — pistol with tracers and ammo, SMG unlocked after mission 6. Switch with `1` / `2`; the weapon wheel shows what you carry.
- **HUD** — rotating round minimap with the mission beacon, police and traffic dots; wanted stars, health, cash, speed, ammo, radio station and the current objective.
- **Sound and save** — WebAudio engine hum, sirens, gunshots, mission stingers and three procedural radio stations (`R` to change, `M` to mute). Progress saves to `localStorage` after every mission (`L` saves any time); **Continue Save** picks it up.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk / drive (Shift to run, Space to brake) |
| E | Steal / exit car |
| Mouse click | Shoot |
| Mouse drag | Orbit camera |
| 1 / 2 | Pistol / SMG |
| R | Next radio station |
| M | Mute |
| L | Save |
| Esc | Pause |

## Layout

- `game/index.html` — page, HUD and screens
- `game/src/config.js` — tuning, palette, landmarks
- `game/src/city.js` — city, roads, buildings, docks, lighting
- `game/src/player.js` — on-foot movement
- `game/src/vehicles.js` — car building and driving physics
- `game/src/traffic.js` — AI traffic and pedestrians
- `game/src/police.js` — wanted response: chases, roadblocks, helicopter
- `game/src/missions.js` — the 8-mission story chain
- `game/src/hud.js` — HUD and rotating minimap
- `game/src/audio.js` — synthesised sound and radio
- `game/src/effects.js` — tracers, sparks, smoke
- `game/src/shots.js` — staged screenshot scenes (`?shot=cover|drive|chase|docks`)
- `game/src/main.js` — boot, game loop, combat, save/load
- `game/vendor/three.module.min.js` — vendored three.js (MIT)
- `main.ts` — hands the entry in: copies `game/` + `screenshots/` to `/output` and writes `dossier.json`
- `screenshots/` — 4 real headless-Chromium renders of the game

## Screenshots

`1-cover.jpg` is a 3-star police chase with the minimap, wanted stars and mission objective on screen; `2-drive.jpg` is driving through traffic; `3-chase.jpg` is a police chase; `4-docks.jpg` is the docks mission.
