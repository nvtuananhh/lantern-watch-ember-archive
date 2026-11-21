// The Ember Archive itself: walls, cover, shadow, light, keys, embers,
// the exit vault, and the geometry helpers guards and rendering use.
// The whole level fits one 1280x720 screen, so every wing, patrol route
// and hiding place is readable at a glance in a screenshot.

import { WORLD_WIDTH, WORLD_HEIGHT, WALL_THICKNESS } from './config.js';

export function makeRect(x, y, w, h) {
  return { x, y, w, h };
}

export function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

export function circleHitsRect(cx, cy, radius, rect) {
  const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

// Do segments (x1,y1)-(x2,y2) and (x3,y3)-(x4,y4) cross? Standard
// orientation test; touching counts as crossing so a ray grazing a
// shelf edge is blocked, as a player would expect.
export function segmentsCross(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d1 = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
  const d2 = (x4 - x3) * (y2 - y3) - (y4 - y3) * (x2 - x3);
  const d3 = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
  const d4 = (x2 - x1) * (y4 - y1) - (y2 - y1) * (x4 - x1);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

export function segmentHitsRect(x1, y1, x2, y2, rect) {
  if (pointInRect(x1, y1, rect) || pointInRect(x2, y2, rect)) return true;
  const { x, y, w, h } = rect;
  return (
    segmentsCross(x1, y1, x2, y2, x, y, x + w, y) ||
    segmentsCross(x1, y1, x2, y2, x + w, y, x + w, y + h) ||
    segmentsCross(x1, y1, x2, y2, x + w, y + h, x, y + h) ||
    segmentsCross(x1, y1, x2, y2, x, y + h, x, y)
  );
}

// True when nothing solid stands between the two points.
export function lineOfSightClear(x1, y1, x2, y2, solids) {
  for (const solid of solids) {
    if (segmentHitsRect(x1, y1, x2, y2, solid)) return false;
  }
  return true;
}

// Distance along a ray before it hits a solid, capped at maxDistance.
// Walks the ray in short steps and refines by bisection-free stepping:
// fine enough at 4px steps that cone edges hug the shelves.
export function raycastDistance(ox, oy, angle, maxDistance, solids) {
  const step = 4;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  for (let d = step; d <= maxDistance; d += step) {
    const px = ox + dx * d;
    const py = oy + dy * d;
    for (const solid of solids) {
      if (pointInRect(px, py, solid)) return d;
    }
  }
  return maxDistance;
}

export function buildLevel(random) {
  const solids = [];
  const addWall = (x, y, w, h) => solids.push({ ...makeRect(x, y, w, h), kind: 'wall' });
  const addShelf = (x, y, w, h) => solids.push({ ...makeRect(x, y, w, h), kind: 'shelf' });
  const addCrate = (x, y, w, h) => solids.push({ ...makeRect(x, y, w, h), kind: 'crate' });

  // Outer shell.
  addWall(0, 0, WORLD_WIDTH, WALL_THICKNESS);
  addWall(0, WORLD_HEIGHT - WALL_THICKNESS, WORLD_WIDTH, WALL_THICKNESS);
  addWall(0, 0, WALL_THICKNESS, WORLD_HEIGHT);
  addWall(WORLD_WIDTH - WALL_THICKNESS, 0, WALL_THICKNESS, WORLD_HEIGHT);

  // Wing dividers, each with one learnable doorway gap.
  addWall(430, WALL_THICKNESS, 18, 480); // Wing I | Wing II, gap at the bottom
  addWall(850, 180, 18, WORLD_HEIGHT - 180 - WALL_THICKNESS); // Wing II | Wing III, gap at the top

  // Bookshelves: tall cover that blocks sight and movement.
  addShelf(120, 150, 180, 26);
  addShelf(120, 300, 180, 26);
  addShelf(120, 450, 180, 26);
  addShelf(540, 120, 200, 26);
  addShelf(540, 280, 26, 170);
  addShelf(620, 470, 180, 26);
  addShelf(940, 200, 190, 26);
  addShelf(940, 380, 26, 160);
  addShelf(1040, 520, 180, 26);

  // Crates: low cover, same blocking rules, easier to read as hide spots.
  addCrate(360, 560, 44, 44);
  addCrate(780, 80, 44, 44);
  addCrate(1150, 300, 44, 44);
  addCrate(60, 600, 44, 44);

  const shadows = [
    makeRect(90, 110, 240, 120),
    makeRect(510, 80, 260, 110),
    makeRect(910, 160, 260, 120),
    makeRect(170, 540, 250, 110),
    makeRect(980, 430, 230, 120),
    makeRect(560, 560, 230, 100),
  ];

  const lanterns = [
    { x: 200, y: 88, r: 92 },
    { x: 640, y: 210, r: 96 },
    { x: 1085, y: 118, r: 92 },
    { x: 300, y: 622, r: 92 },
    { x: 760, y: 602, r: 92 },
    { x: 1180, y: 622, r: 82 },
  ];

  // Seeded sparkle offsets so embers shimmer identically for one seed.
  const embers = [
    { x: 160, y: 220 },
    { x: 330, y: 520 },
    { x: 500, y: 600 },
    { x: 700, y: 320 },
    { x: 900, y: 92 },
    { x: 1150, y: 180 },
  ].map((ember) => ({ ...ember, taken: false, phase: random() * Math.PI * 2 }));

  const keys = [
    { x: 200, y: 385, wing: 'I', taken: false },
    { x: 640, y: 178, wing: 'II', taken: false },
    { x: 1105, y: 455, wing: 'III', taken: false },
  ];

  const exitVault = makeRect(1178, 38, 58, 58);
  const playerStart = { x: 70, y: 672 };

  return { solids, shadows, lanterns, embers, keys, exitVault, playerStart };
}

export function zoneNameFor(x) {
  if (x < 448) return 'Wing I · Reading Room';
  if (x < 868) return 'Wing II · Map Gallery';
  return 'Wing III · Vault Antechamber';
}

export function pointInShadow(x, y, shadows) {
  return shadows.some((rect) => pointInRect(x, y, rect));
}

export function pointInLanternLight(x, y, lanterns) {
  return lanterns.some((lamp) => {
    const dx = x - lamp.x;
    const dy = y - lamp.y;
    return dx * dx + dy * dy <= lamp.r * lamp.r;
  });
}
