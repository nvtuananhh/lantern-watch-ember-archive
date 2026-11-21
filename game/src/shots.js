// Screenshot poses: deterministic staged states reached only through
// the ?shot= URL parameter, so screenshots are real renders of the
// game's own code. Normal play never reads these poses. Each pose sets
// exact positions and then lets the fixed-step simulation run, so the
// same seed always stages the same picture.

import { FIXED_DT } from './config.js';

export function shotNameFromUrl(search) {
  const params = new URLSearchParams(search);
  const shot = params.get('shot');
  if (shot === 'start' || shot === 'play' || shot === 'alert' || shot === 'exit') return shot;
  return null;
}

// Advance the world a fixed number of steps with no input, for the
// cover pose: guards mid-patrol, cones alive, nothing staged by hand.
export function advanceQuietly(stepFn, steps) {
  for (let i = 0; i < steps; i++) stepFn(FIXED_DT);
}

export function applyShotPose(state, shot, stepFn) {
  const { player, guards, level } = state;
  if (shot === 'start') {
    state.mode = 'playing';
    advanceQuietly(stepFn, 90);
    return;
  }
  if (shot === 'play') {
    state.mode = 'playing';
    // Archivist pressed flat behind a shelf while a cone sweeps past.
    player.x = 250;
    player.y = 344;
    player.sneaking = true;
    const guard = guards[0];
    guard.x = 300;
    guard.y = 262;
    guard.facing = Math.PI / 2;
    guard.suspicion = 18;
    guard.state = 'calm';
    advanceQuietly(stepFn, 6);
    player.x = 250;
    player.y = 344;
    return;
  }
  if (shot === 'alert') {
    state.mode = 'playing';
    // Guard face to face with the archivist in the open gallery.
    player.x = 660;
    player.y = 290;
    player.sneaking = false;
    const guard = guards[2];
    guard.x = 560;
    guard.y = 180;
    guard.facing = Math.atan2(player.y - guard.y, player.x - guard.x);
    guard.suspicion = 72;
    guard.state = 'suspicious';
    guard.lastSeenX = player.x;
    guard.lastSeenY = player.y;
    state.toastText = 'A warden has seen you — break line of sight!';
    state.toastLeft = 3;
    return;
  }
  if (shot === 'exit') {
    // The win moment: every key gathered, the archivist at the vault.
    for (const key of level.keys) key.taken = true;
    player.keys = 3;
    player.keysTaken = ['I', 'II', 'III'];
    player.embers = 5;
    player.x = level.exitVault.x + 20;
    player.y = level.exitVault.y + 20;
    state.stats.timesSpotted = 1;
    state.mode = 'win';
    state.timeSeconds = 187;
    state.stats.timeText = '03:07';
  }
}
