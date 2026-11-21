// The night archivist: movement, collision, pebbles, and pickups.
// Movement is axis-separated against the solids so the player slides
// along shelves instead of sticking to their corners.

import {
  PLAYER_RADIUS,
  PLAYER_WALK_SPEED,
  PLAYER_SNEAK_SPEED,
  PLAYER_PICKUP_RADIUS,
  PEBBLE_START_COUNT,
  PEBBLE_MAX_RANGE,
  PEBBLE_FLIGHT_SECONDS,
  PEBBLE_NOISE_RADIUS,
} from './config.js';
import { circleHitsRect } from './level.js';

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    facing: -Math.PI / 2,
    sneaking: false,
    moving: false,
    pebbles: PEBBLE_START_COUNT,
    embers: 0,
    keys: 0,
    keysTaken: [],
    stepPhase: 0,
    stepped: false,
    pebble: null, // {fromX, fromY, toX, toY, t} while a pebble is flying
  };
}

function blockedAt(x, y, solids) {
  return solids.some((solid) => circleHitsRect(x, y, PLAYER_RADIUS, solid));
}

export function movePlayer(player, dx, dy, dt, solids) {
  const speed = player.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
  const length = Math.hypot(dx, dy);
  player.moving = length > 0;
  if (!player.moving) return;
  const nx = dx / length;
  const ny = dy / length;
  player.facing = Math.atan2(ny, nx);
  const stepX = nx * speed * dt;
  const stepY = ny * speed * dt;
  if (!blockedAt(player.x + stepX, player.y, solids)) player.x += stepX;
  if (!blockedAt(player.x, player.y + stepY, solids)) player.y += stepY;
  player.stepPhase += dt * (player.sneaking ? 4 : 7);
  player.stepped = false;
  if (player.stepPhase > Math.PI * 2) {
    player.stepPhase -= Math.PI * 2;
    player.stepped = true;
  }
}

export function throwPebble(player, targetX, targetY) {
  if (player.pebbles <= 0 || player.pebble !== null) return false;
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 12) return false;
  const clamped = Math.min(dist, PEBBLE_MAX_RANGE);
  player.pebbles -= 1;
  player.pebble = {
    fromX: player.x,
    fromY: player.y,
    toX: player.x + (dx / dist) * clamped,
    toY: player.y + (dy / dist) * clamped,
    t: 0,
  };
  return true;
}

export function updatePebble(player, dt, events) {
  if (player.pebble === null) return;
  player.pebble.t += dt / PEBBLE_FLIGHT_SECONDS;
  if (player.pebble.t >= 1) {
    events.noises.push({ x: player.pebble.toX, y: player.pebble.toY, radius: PEBBLE_NOISE_RADIUS });
    events.sounds.push('pebble');
    player.pebble = null;
  }
}

// Pick up anything in reach. E (or walking over it) collects; the
// caller reports what was taken for the HUD toast and the chime.
export function collectNearby(player, level, events) {
  const taken = [];
  for (const ember of level.embers) {
    if (!ember.taken && Math.hypot(ember.x - player.x, ember.y - player.y) < PLAYER_PICKUP_RADIUS) {
      ember.taken = true;
      player.embers += 1;
      taken.push({ kind: 'ember' });
      events.sounds.push('pickup');
    }
  }
  for (const key of level.keys) {
    if (!key.taken && Math.hypot(key.x - player.x, key.y - player.y) < PLAYER_PICKUP_RADIUS) {
      key.taken = true;
      player.keys += 1;
      player.keysTaken.push(key.wing);
      taken.push({ kind: 'key', wing: key.wing });
      events.sounds.push('key');
    }
  }
  return taken;
}
