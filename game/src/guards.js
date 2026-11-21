// Guards: learnable patrols, vision cones, hearing, and the suspicion
// system. A guard is never instantly fatal on a first glimpse: suspicion
// rises while the archivist is visible and decays when hidden, so a near
// miss costs nerve, not the run — until suspicion fills and the chase
// begins.

import {
  GUARD_RADIUS,
  GUARD_PATROL_SPEED,
  GUARD_CHASE_SPEED,
  GUARD_INVESTIGATE_SPEED,
  VISION_RANGE,
  VISION_HALF_ANGLE,
  CATCH_RADIUS,
  SUSPICION_RISE_BASE,
  SUSPICION_DECAY,
  SUSPICION_SUSPICIOUS_AT,
  SUSPICION_CHASE_AT,
  SUSPICION_CALM_BELOW,
  CHASE_LOST_SIGHT_SECONDS,
  HEARING_RADIUS,
  SHADOW_SNEAK_FACTOR,
  LIGHT_BONUS_FACTOR,
} from './config.js';
import { lineOfSightClear, pointInShadow, pointInLanternLight } from './level.js';

export const GUARD_STATES = ['calm', 'suspicious', 'alarmed', 'chase', 'investigate'];

function angleTowards(fromX, fromY, toX, toY) {
  return Math.atan2(toY - fromY, toX - fromX);
}

function turnTowards(current, target, maxTurn) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > maxTurn) return current + maxTurn;
  if (diff < -maxTurn) return current - maxTurn;
  return target;
}

function moveGuardTowards(guard, tx, ty, speed, dt, solids) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  const nx = guard.x + (dx / dist) * step;
  const ny = guard.y + (dy / dist) * step;
  // Guards walk around shelves rather than through them: if the step is
  // blocked, slide along one axis, then the other.
  const blocked = (x, y) =>
    solids.some((s) => {
      const cx = Math.max(s.x, Math.min(x, s.x + s.w));
      const cy = Math.max(s.y, Math.min(y, s.y + s.h));
      return (x - cx) * (x - cx) + (y - cy) * (y - cy) < GUARD_RADIUS * GUARD_RADIUS;
    });
  if (!blocked(nx, ny)) {
    guard.x = nx;
    guard.y = ny;
  } else if (!blocked(nx, guard.y)) {
    guard.x = nx;
  } else if (!blocked(guard.x, ny)) {
    guard.y = ny;
  }
  return Math.hypot(tx - guard.x, ty - guard.y) < 4;
}

// Patrol definitions: waypoint loops with a pause and a look-around at
// each stop. Pause lengths get a small seeded jitter at build time so
// routes stay learnable but not metronomic.
export function buildGuards(random) {
  const routes = [
    {
      name: 'Warden Brisk',
      waypoints: [
        [360, 100],
        [360, 380],
        [120, 380],
        [120, 100],
      ],
      pause: 1.1,
      speed: 58,
    },
    {
      name: 'Warden Low',
      waypoints: [
        [300, 622],
        [700, 622],
        [700, 522],
        [300, 522],
      ],
      pause: 0.8,
      speed: 66,
    },
    {
      name: 'Warden Map',
      waypoints: [
        [600, 200],
        [782, 200],
        [782, 440],
        [600, 440],
      ],
      pause: 1.4,
      speed: 55,
    },
    {
      name: 'Warden Vault',
      waypoints: [
        [960, 300],
        [1180, 300],
        [1180, 560],
        [960, 560],
      ],
      pause: 1.0,
      speed: 64,
    },
    {
      name: 'Warden Lantern',
      waypoints: [
        [900, 100],
        [1150, 100],
        [1150, 220],
        [900, 220],
      ],
      pause: 0.9,
      speed: 70,
    },
  ];
  return routes.map((route, index) => {
    const [sx, sy] = route.waypoints[0];
    const [nx, ny] = route.waypoints[1];
    return {
      id: index,
      name: route.name,
      x: sx,
      y: sy,
      facing: angleTowards(sx, sy, nx, ny),
      waypoints: route.waypoints,
      waypointIndex: 1,
      pauseSeconds: route.pause + random() * 0.5,
      pauseLeft: 0,
      lookPhase: random() * Math.PI * 2,
      speed: route.speed,
      state: 'calm',
      suspicion: 0,
      lastSeenX: null,
      lastSeenY: null,
      investigateX: null,
      investigateY: null,
      investigateLeft: 0,
      lostSightFor: 0,
      stepPhase: random() * Math.PI * 2,
      stepped: false,
    };
  });
}

// Can this guard currently see the player? Cone + range + line of sight,
// with shadow and lantern light shaping how far the eye reaches.
export function guardSeesPlayer(guard, player, level) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > VISION_RANGE) return { visible: false, dist };
  let diff = Math.atan2(dy, dx) - guard.facing;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > VISION_HALF_ANGLE) return { visible: false, dist };
  if (!lineOfSightClear(guard.x, guard.y, player.x, player.y, level.solids)) {
    return { visible: false, dist };
  }
  const inShadow = pointInShadow(player.x, player.y, level.shadows);
  const sneaking = player.sneaking;
  const effectiveRange = VISION_RANGE * (inShadow && sneaking ? 0.55 : inShadow ? 0.78 : 1);
  if (dist > effectiveRange) return { visible: false, dist };
  return { visible: true, dist, inShadow, sneaking };
}

export function suspicionRiseRate(guard, player, seen, level) {
  const closeness = 1 - seen.dist / VISION_RANGE;
  let rate = SUSPICION_RISE_BASE * (0.35 + 0.65 * closeness);
  if (seen.inShadow && seen.sneaking) rate *= SHADOW_SNEAK_FACTOR;
  if (pointInLanternLight(player.x, player.y, level.lanterns) && !player.sneaking) {
    rate *= LIGHT_BONUS_FACTOR;
  }
  return rate;
}

export function updateGuards(guards, player, level, dt, events) {
  let caught = false;
  for (const guard of guards) {
    const seen = guardSeesPlayer(guard, player, level);
    if (seen.visible) {
      guard.suspicion = Math.min(100, guard.suspicion + suspicionRiseRate(guard, player, seen, level) * dt);
      guard.lastSeenX = player.x;
      guard.lastSeenY = player.y;
      guard.lostSightFor = 0;
    } else {
      guard.suspicion = Math.max(0, guard.suspicion - SUSPICION_DECAY * dt);
      guard.lostSightFor += dt;
    }

    // Hearing: brisk footsteps nearby, or a pebble landing, draw a look.
    if (!seen.visible && player.moving && !player.sneaking) {
      const d = Math.hypot(player.x - guard.x, player.y - guard.y);
      if (d < HEARING_RADIUS && guard.state === 'calm') {
        guard.suspicion = Math.min(SUSPICION_SUSPICIOUS_AT, guard.suspicion + 14 * dt);
        guard.facing = turnTowards(guard.facing, angleTowards(guard.x, guard.y, player.x, player.y), 2.2 * dt);
      }
    }
    for (const noise of events.noises) {
      const d = Math.hypot(noise.x - guard.x, noise.y - guard.y);
      if (d < noise.radius && guard.state !== 'chase') {
        guard.investigateX = noise.x;
        guard.investigateY = noise.y;
        guard.investigateLeft = 2.6;
        if (guard.state === 'calm') guard.state = 'investigate';
        guard.suspicion = Math.max(guard.suspicion, 30);
      }
    }

    // State transitions from the suspicion meter.
    if (guard.suspicion >= SUSPICION_CHASE_AT) {
      if (guard.state !== 'chase') events.sounds.push('alert');
      guard.state = 'chase';
    } else if (guard.state === 'chase') {
      if (guard.lostSightFor > CHASE_LOST_SIGHT_SECONDS && guard.suspicion < SUSPICION_SUSPICIOUS_AT) {
        guard.state = 'calm';
      }
    } else if (guard.suspicion >= SUSPICION_SUSPICIOUS_AT) {
      if (guard.state === 'calm' || guard.state === 'investigate') {
        guard.state = 'suspicious';
        guard.investigateX = guard.lastSeenX;
        guard.investigateY = guard.lastSeenY;
        guard.investigateLeft = 2.2;
      }
    } else if (guard.state === 'suspicious' && guard.suspicion < SUSPICION_CALM_BELOW) {
      guard.state = 'calm';
    }

    // Movement by state.
    if (guard.state === 'chase' && guard.lastSeenX !== null) {
      guard.facing = turnTowards(guard.facing, angleTowards(guard.x, guard.y, guard.lastSeenX, guard.lastSeenY), 5 * dt);
      moveGuardTowards(guard, guard.lastSeenX, guard.lastSeenY, GUARD_CHASE_SPEED, dt, level.solids);
      if (Math.hypot(player.x - guard.x, player.y - guard.y) < CATCH_RADIUS && seen.visible) caught = true;
      if (Math.hypot(player.x - guard.x, player.y - guard.y) < CATCH_RADIUS * 0.8 && guard.lostSightFor < 0.5) caught = true;
    } else if (guard.state === 'suspicious' || guard.state === 'investigate') {
      if (guard.investigateX !== null) {
        guard.facing = turnTowards(guard.facing, angleTowards(guard.x, guard.y, guard.investigateX, guard.investigateY), 3.5 * dt);
        const arrived = moveGuardTowards(guard, guard.investigateX, guard.investigateY, GUARD_INVESTIGATE_SPEED, dt, level.solids);
        if (arrived) {
          guard.investigateLeft -= dt;
          guard.lookPhase += dt * 2.4;
          guard.facing += Math.sin(guard.lookPhase) * 1.6 * dt;
          if (guard.investigateLeft <= 0) {
            guard.investigateX = null;
            guard.state = guard.suspicion >= SUSPICION_SUSPICIOUS_AT ? 'suspicious' : 'calm';
            if (guard.state === 'suspicious') guard.investigateLeft = 1.2;
          }
        }
      } else {
        guard.state = 'calm';
      }
    } else {
      // Patrol: walk the loop, pause and look around at each waypoint.
      if (guard.pauseLeft > 0) {
        guard.pauseLeft -= dt;
        guard.lookPhase += dt * 1.8;
        guard.facing += Math.sin(guard.lookPhase) * 1.1 * dt;
      } else {
        const [wx, wy] = guard.waypoints[guard.waypointIndex];
        guard.facing = turnTowards(guard.facing, angleTowards(guard.x, guard.y, wx, wy), 3 * dt);
        const arrived = moveGuardTowards(guard, wx, wy, guard.speed, dt, level.solids);
        if (arrived) {
          guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
          guard.pauseLeft = guard.pauseSeconds;
        }
      }
    }

    // Footstep ticks for the audio layer, paced by distance travelled.
    guard.stepPhase += dt * (guard.state === 'chase' ? 7 : 4.4);
    guard.stepped = false;
    if (guard.stepPhase > Math.PI * 2) {
      guard.stepPhase -= Math.PI * 2;
      guard.stepped = true;
      events.guardSteps.push({ x: guard.x, y: guard.y, chase: guard.state === 'chase' });
    }
  }
  return caught;
}

export function highestSuspicion(guards) {
  return guards.reduce((max, guard) => Math.max(max, guard.suspicion), 0);
}
