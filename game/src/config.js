// Lantern Watch: The Ember Archive — tuning constants.
// Every number that shapes how the game feels lives here, in one place,
// so the rest of the code reads as rules rather than magic numbers.

export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 720;
export const WALL_THICKNESS = 24;

export const FIXED_DT = 1 / 60;
export const MAX_STEPS_PER_FRAME = 5;

export const PLAYER_RADIUS = 10;
export const PLAYER_WALK_SPEED = 150;
export const PLAYER_SNEAK_SPEED = 72;
export const PLAYER_PICKUP_RADIUS = 30;

export const PEBBLE_START_COUNT = 5;
export const PEBBLE_MAX_RANGE = 270;
export const PEBBLE_FLIGHT_SECONDS = 0.38;
export const PEBBLE_NOISE_RADIUS = 230;

export const GUARD_RADIUS = 13;
export const GUARD_PATROL_SPEED = 62;
export const GUARD_CHASE_SPEED = 108;
export const GUARD_INVESTIGATE_SPEED = 78;
export const VISION_RANGE = 178;
export const VISION_HALF_ANGLE = 0.56;
export const CATCH_RADIUS = 20;

export const SUSPICION_RISE_BASE = 58;
export const SUSPICION_DECAY = 30;
export const SUSPICION_SUSPICIOUS_AT = 45;
export const SUSPICION_CHASE_AT = 100;
export const SUSPICION_CALM_BELOW = 28;
export const CHASE_LOST_SIGHT_SECONDS = 3;

export const HEARING_RADIUS = 95;
export const SHADOW_SNEAK_FACTOR = 0.42;
export const LIGHT_BONUS_FACTOR = 1.3;

export const DEFAULT_SEED = 20261121;
export const CONE_RAY_COUNT = 26;

export const COLOURS = {
  floorA: '#2b2118',
  floorB: '#332819',
  rug: '#5a2e2e',
  wall: '#17100a',
  shelf: '#6b4423',
  shelfEdge: '#8a5a2e',
  crate: '#7a5c33',
  shadow: 'rgba(6, 8, 20, 0.55)',
  light: 'rgba(255, 196, 92, 0.16)',
  lantern: '#ffcf6e',
  ember: '#ff8c3b',
  key: '#ffd94d',
  exit: '#37d67a',
  player: '#e8dcc8',
  playerCloak: '#3b5a8a',
  guard: '#c94f4f',
  guardTrim: '#f2e6c9',
  coneCalm: 'rgba(255, 214, 110, 0.20)',
  coneSuspicious: 'rgba(255, 150, 40, 0.30)',
  coneAlarmed: 'rgba(255, 60, 50, 0.34)',
  hud: 'rgba(10, 8, 6, 0.82)',
  text: '#f5ecd7',
  muted: '#c9b896',
};
