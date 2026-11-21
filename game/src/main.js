// Boot and the fixed-step loop for Lantern Watch: The Ember Archive.
// The simulation advances only in 1/60s steps accumulated from the
// animation-frame timestamps, so play is identical at any frame rate.
// Input is polled once per step; one-shot keys are consumed once per
// frame so a single press never fires twice.

import { WORLD_WIDTH, WORLD_HEIGHT, FIXED_DT, MAX_STEPS_PER_FRAME, DEFAULT_SEED } from './config.js';
import { mulberry32, parseSeedFromUrl, createSimClock } from './random.js';
import { buildLevel, pointInRect } from './level.js';
import { buildGuards, updateGuards } from './guards.js';
import { createPlayer, movePlayer, throwPebble, updatePebble, collectNearby } from './player.js';
import { createSoundBank } from './audio.js';
import { createInput } from './input.js';
import { drawScene } from './render.js';
import { shotNameFromUrl, applyShotPose } from './shots.js';

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function buildState(seed) {
  const random = mulberry32(seed);
  const level = buildLevel(random);
  const guards = buildGuards(random);
  return {
    seed,
    mode: 'title',
    level,
    guards,
    player: createPlayer(level.playerStart),
    clock: createSimClock(),
    timeSeconds: 0,
    toastText: '',
    toastLeft: 0,
    stats: { timesSpotted: 0, timeText: '00:00' },
  };
}

export function bootGame(canvas) {
  const ctx = canvas.getContext('2d');
  const seed = parseSeedFromUrl(window.location.search) ?? DEFAULT_SEED;
  const sounds = createSoundBank();
  const input = createInput(canvas);
  let state = buildState(seed);
  const shot = shotNameFromUrl(window.location.search);

  function playSound(name, detail) {
    if (name === 'footstep') sounds.footstep(detail);
    else if (name === 'guardStep') sounds.guardStep(detail.distance, detail.chase);
    else if (name === 'pebble') sounds.pebbleLand();
    else if (name === 'alert') sounds.alertSting();
    else if (name === 'pickup') sounds.pickupChime();
    else if (name === 'key') sounds.keyChime();
    else if (name === 'win') sounds.winFanfare();
    else if (name === 'caught') sounds.caughtSting();
  }

  function showToast(text, seconds) {
    state.toastText = text;
    state.toastLeft = seconds;
  }

  // One fixed simulation step. `move` is the held direction, `pebble`
  // a click target or null. All randomness and time here are seeded.
  function stepSimulation(dt, move, sneaking, pebble) {
    if (state.mode !== 'playing') return;
    state.timeSeconds = state.clock.advanceStep(dt);
    state.stats.timeText = formatTime(state.timeSeconds);
    if (state.toastLeft > 0) state.toastLeft -= dt;

    const player = state.player;
    player.sneaking = sneaking;
    movePlayer(player, move.dx, move.dy, dt, state.level.solids);
    if (player.stepped) playSound('footstep', player.sneaking);
    if (pebble !== null && throwPebble(player, pebble.x, pebble.y)) {
      showToast('Pebble thrown — the wardens will look.', 1.6);
    }

    const events = { noises: [], sounds: [], guardSteps: [] };
    updatePebble(player, dt, events);
    const taken = collectNearby(player, state.level, events);
    for (const item of taken) {
      if (item.kind === 'key') showToast(`Wing ${item.wing} key taken (${player.keys}/3).`, 2.2);
      else showToast('Ember gathered — the archive glows a little brighter.', 1.6);
    }

    const caught = updateGuards(state.guards, player, state.level, dt, events);
    for (const sound of events.sounds) {
      if (sound === 'alert') state.stats.timesSpotted += 1;
      playSound(sound);
    }
    for (const step of events.guardSteps) {
      playSound('guardStep', { distance: Math.hypot(step.x - player.x, step.y - player.y), chase: step.chase });
    }

    // The exit vault: locked until every wing key is held.
    const vault = state.level.exitVault;
    if (pointInRect(player.x, player.y, vault)) {
      if (player.keys >= 3) {
        state.mode = 'win';
        playSound('win');
      } else if (state.toastLeft <= 0) {
        showToast(`The vault is locked — ${3 - player.keys} key(s) still hidden in the archive.`, 2);
      }
    }
    if (caught) {
      state.mode = 'caught';
      playSound('caught');
    }
  }

  function restart() {
    state = buildState(seed);
    state.mode = 'playing';
    input.clearClick();
  }

  function handlePressed(pressed) {
    for (const key of pressed) {
      sounds.unlock();
      if (key === 'Enter' || key === ' ') {
        if (state.mode === 'title') state.mode = 'playing';
      } else if (key === 'h' || key === 'H') {
        if (state.mode === 'playing') state.mode = 'help';
        else if (state.mode === 'help') state.mode = 'playing';
      } else if (key === 'p' || key === 'P') {
        if (state.mode === 'playing') state.mode = 'paused';
        else if (state.mode === 'paused') state.mode = 'playing';
      } else if (key === 'r' || key === 'R') {
        if (state.mode !== 'title') restart();
      } else if (key === 'e' || key === 'E') {
        if (state.mode === 'playing') {
          const events = { noises: [], sounds: [], guardSteps: [] };
          collectNearby(state.player, state.level, events);
          for (const sound of events.sounds) playSound(sound);
        }
      }
    }
  }

  if (shot !== null) {
    state.mode = 'playing';
    applyShotPose(state, shot, (dt) => stepSimulation(dt, { dx: 0, dy: 0 }, false, null));
  }

  // Test and screenshot hook: read-only state for the playtest driver.
  // It never changes the simulation; positioning through it is how the
  // automated playtest stages a cone encounter before driving the
  // archivist with real keyboard input.
  window.__ember = {
    get state() {
      return state;
    },
    get seed() {
      return seed;
    },
    restart,
  };

  let lastTimestamp = null;
  let accumulator = 0;
  function frame(timestamp) {
    if (lastTimestamp === null) lastTimestamp = timestamp;
    let elapsed = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;
    if (elapsed > 0.25) elapsed = 0.25;
    handlePressed(input.consumePressed());

    if (state.mode === 'playing') {
      accumulator += elapsed;
      let steps = 0;
      while (accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
        const move = input.moveVector();
        const pebble = input.wasClicked() ? input.consumePebbleTarget() : null;
        stepSimulation(FIXED_DT, move, input.isSneaking(), pebble);
        accumulator -= FIXED_DT;
        steps += 1;
        if (state.mode !== 'playing') {
          accumulator = 0;
          break;
        }
      }
      if (steps === MAX_STEPS_PER_FRAME) accumulator = 0;
    } else {
      input.consumePebbleTarget();
      accumulator = 0;
    }
    drawScene(ctx, state);
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);
  return { getState: () => state, restart };
}

const canvas = document.getElementById('game');
if (canvas instanceof HTMLCanvasElement) {
  canvas.width = WORLD_WIDTH;
  canvas.height = WORLD_HEIGHT;
  bootGame(canvas);
}
