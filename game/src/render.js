// Canvas rendering: the archive floor, lantern light and shadow, the
// raycast vision cones, the guards and the archivist, the HUD, the
// minimap, and every screen (title, help, pause, win, caught). All art
// is drawn shapes — no image assets — so the screenshots are pure code.

import { WORLD_WIDTH, WORLD_HEIGHT, COLOURS, VISION_RANGE, VISION_HALF_ANGLE, CONE_RAY_COUNT } from './config.js';
import { raycastDistance, pointInShadow, pointInLanternLight, zoneNameFor } from './level.js';
import { highestSuspicion } from './guards.js';

function coneColour(guard) {
  if (guard.state === 'chase') return COLOURS.coneAlarmed;
  if (guard.state === 'suspicious' || guard.state === 'investigate') return COLOURS.coneSuspicious;
  return COLOURS.coneCalm;
}

function coneEdgeColour(guard) {
  if (guard.state === 'chase') return '#ff5040';
  if (guard.state === 'suspicious' || guard.state === 'investigate') return '#ff9632';
  return '#ffd66e';
}

function drawVisionCone(ctx, guard, solids) {
  const points = [];
  for (let i = 0; i <= CONE_RAY_COUNT; i++) {
    const angle = guard.facing - VISION_HALF_ANGLE + (i / CONE_RAY_COUNT) * VISION_HALF_ANGLE * 2;
    const dist = raycastDistance(guard.x, guard.y, angle, VISION_RANGE, solids);
    points.push([guard.x + Math.cos(angle) * dist, guard.y + Math.sin(angle) * dist]);
  }
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  for (const [px, py] of points) ctx.lineTo(px, py);
  ctx.closePath();
  ctx.fillStyle = coneColour(guard);
  ctx.fill();
  ctx.strokeStyle = coneEdgeColour(guard);
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.75;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawFloor(ctx, level, timeSeconds) {
  ctx.fillStyle = COLOURS.floorA;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.fillStyle = COLOURS.floorB;
  for (let y = 24; y < WORLD_HEIGHT - 24; y += 48) {
    for (let x = 24 + ((y / 48) % 2) * 24; x < WORLD_WIDTH - 24; x += 48) {
      ctx.fillRect(x, y, 44, 44);
    }
  }
  // Rugs marking each wing's heart.
  ctx.fillStyle = COLOURS.rug;
  ctx.fillRect(150, 520, 200, 90);
  ctx.fillRect(540, 560, 200, 90);
  ctx.fillRect(920, 80, 220, 70);
  ctx.strokeStyle = 'rgba(245, 236, 215, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(150, 520, 200, 90);
  ctx.strokeRect(540, 560, 200, 90);
  ctx.strokeRect(920, 80, 220, 70);

  // Lantern light pools on the floor.
  for (const lamp of level.lanterns) {
    const gradient = ctx.createRadialGradient(lamp.x, lamp.y, 8, lamp.x, lamp.y, lamp.r);
    gradient.addColorStop(0, 'rgba(255, 205, 110, 0.30)');
    gradient.addColorStop(1, 'rgba(255, 205, 110, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, lamp.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Shadow zones: the safe dark.
  ctx.fillStyle = COLOURS.shadow;
  for (const rect of level.shadows) ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(200, 214, 255, 0.35)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  for (const rect of level.shadows) {
    ctx.fillText('S H A D O W', rect.x + rect.w / 2, rect.y + 16);
  }
  // Wing signs.
  ctx.fillStyle = 'rgba(245, 236, 215, 0.55)';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('WING I · READING ROOM', 225, 52);
  ctx.fillText('WING II · MAP GALLERY', 650, 52);
  ctx.fillText('WING III · VAULT', 1065, 280);
}

function drawSolids(ctx, level) {
  for (const solid of level.solids) {
    if (solid.kind === 'wall') {
      ctx.fillStyle = COLOURS.wall;
      ctx.fillRect(solid.x, solid.y, solid.w, solid.h);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(solid.x, solid.y, solid.w, 3);
    } else if (solid.kind === 'shelf') {
      ctx.fillStyle = COLOURS.shelf;
      ctx.fillRect(solid.x, solid.y, solid.w, solid.h);
      ctx.fillStyle = COLOURS.shelfEdge;
      ctx.fillRect(solid.x, solid.y, solid.w, 4);
      ctx.fillRect(solid.x, solid.y + solid.h - 4, solid.w, 4);
      // Book spines.
      ctx.fillStyle = 'rgba(255, 220, 150, 0.5)';
      const horizontal = solid.w > solid.h;
      const count = Math.floor((horizontal ? solid.w : solid.h) / 16);
      for (let i = 0; i < count; i++) {
        if (horizontal) ctx.fillRect(solid.x + 6 + i * 16, solid.y + 8, 7, solid.h - 16);
        else ctx.fillRect(solid.x + 8, solid.y + 6 + i * 16, solid.w - 16, 7);
      }
    } else {
      ctx.fillStyle = COLOURS.crate;
      ctx.fillRect(solid.x, solid.y, solid.w, solid.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(solid.x + 3, solid.y + 3, solid.w - 6, solid.h - 6);
      ctx.beginPath();
      ctx.moveTo(solid.x, solid.y);
      ctx.lineTo(solid.x + solid.w, solid.y + solid.h);
      ctx.moveTo(solid.x + solid.w, solid.y);
      ctx.lineTo(solid.x, solid.y + solid.h);
      ctx.stroke();
    }
  }
  // Lanterns glow on top of the walls.
  for (const lamp of level.lanterns) {
    ctx.fillStyle = COLOURS.lantern;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a4a12';
    ctx.fillRect(lamp.x - 2, lamp.y - 12, 4, 6);
  }
}

function drawPickups(ctx, level, timeSeconds) {
  for (const ember of level.embers) {
    if (ember.taken) continue;
    const flicker = 1 + 0.25 * Math.sin(timeSeconds * 5 + ember.phase);
    ctx.fillStyle = COLOURS.ember;
    ctx.beginPath();
    ctx.arc(ember.x, ember.y, 8 * flicker, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9b0';
    ctx.beginPath();
    ctx.arc(ember.x, ember.y, 3.5 * flicker, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const key of level.keys) {
    if (key.taken) continue;
    const bob = Math.sin(timeSeconds * 3 + key.x) * 2;
    ctx.save();
    ctx.translate(key.x, key.y + bob);
    ctx.fillStyle = COLOURS.key;
    ctx.beginPath();
    ctx.arc(-4, -3, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(0, 0, 14, 4);
    ctx.fillRect(9, 0, 4, 9);
    ctx.fillRect(14, 0, 4, 9);
    ctx.restore();
    ctx.fillStyle = 'rgba(255, 217, 77, 0.9)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`KEY ${key.wing}`, key.x, key.y - 18 + bob);
  }
  // The exit vault.
  const vault = level.exitVault;
  const allKeys = level.keys.every((key) => key.taken);
  ctx.fillStyle = allKeys ? '#1f7a4a' : '#3a3f3a';
  ctx.fillRect(vault.x, vault.y, vault.w, vault.h);
  ctx.strokeStyle = allKeys ? COLOURS.exit : '#8a8f8a';
  ctx.lineWidth = 3;
  ctx.strokeRect(vault.x, vault.y, vault.w, vault.h);
  ctx.fillStyle = allKeys ? COLOURS.exit : '#c9c9c9';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT VAULT', vault.x + vault.w / 2, vault.y + vault.h + 18);
  ctx.beginPath();
  ctx.arc(vault.x + vault.w / 2, vault.y + vault.h / 2, 9, 0, Math.PI * 2);
  ctx.stroke();
}

function drawGuard(ctx, guard) {
  ctx.fillStyle = COLOURS.guard;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOURS.guardTrim;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 13, Math.PI, Math.PI * 2);
  ctx.fill();
  // Facing tick and lantern.
  ctx.strokeStyle = '#fff2cf';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(guard.x + Math.cos(guard.facing) * 19, guard.y + Math.sin(guard.facing) * 19);
  ctx.stroke();
  ctx.fillStyle = COLOURS.lantern;
  ctx.beginPath();
  ctx.arc(guard.x + Math.cos(guard.facing) * 17, guard.y + Math.sin(guard.facing) * 17, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // State mark: ? when suspicious, ! when chasing.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  if (guard.state === 'chase') ctx.fillText('!', guard.x, guard.y - 20);
  else if (guard.state === 'suspicious' || guard.state === 'investigate') ctx.fillText('?', guard.x, guard.y - 20);
  // Personal suspicion arc.
  if (guard.suspicion > 1) {
    ctx.strokeStyle = guard.suspicion > 70 ? '#ff5040' : '#ffb03a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 19, -Math.PI / 2, -Math.PI / 2 + (guard.suspicion / 100) * Math.PI * 2);
    ctx.stroke();
  }
}

function drawPlayer(ctx, player, level, timeSeconds) {
  const hidden = pointInShadow(player.x, player.y, level.shadows) && player.sneaking;
  ctx.fillStyle = hidden ? 'rgba(120, 170, 255, 0.25)' : 'rgba(255,255,255,0.10)';
  ctx.beginPath();
  ctx.arc(player.x, player.y, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOURS.playerCloak;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOURS.player;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOURS.lantern;
  ctx.beginPath();
  ctx.arc(player.x + Math.cos(player.facing) * 9, player.y + Math.sin(player.facing) * 9, 3, 0, Math.PI * 2);
  ctx.fill();
  if (hidden) {
    ctx.fillStyle = '#9ec2ff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIDDEN', player.x, player.y - 24);
  }
  if (player.pebble !== null) {
    const t = Math.min(1, player.pebble.t);
    const px = player.pebble.fromX + (player.pebble.toX - player.pebble.fromX) * t;
    const py = player.pebble.fromY + (player.pebble.toY - player.pebble.fromY) * t - Math.sin(t * Math.PI) * 26;
    ctx.fillStyle = '#d8d2c4';
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  void timeSeconds;
}

function drawMinimap(ctx, state) {
  const scale = 0.125;
  const mw = WORLD_WIDTH * scale;
  const mh = WORLD_HEIGHT * scale;
  const ox = WORLD_WIDTH - mw - 12;
  const oy = WORLD_HEIGHT - mh - 38;
  ctx.fillStyle = 'rgba(8, 6, 5, 0.78)';
  ctx.fillRect(ox - 4, oy - 4, mw + 8, mh + 8);
  ctx.save();
  ctx.beginPath();
  ctx.rect(ox, oy, mw, mh);
  ctx.clip();
  ctx.fillStyle = '#241a10';
  ctx.fillRect(ox, oy, mw, mh);
  for (const solid of state.level.solids) {
    ctx.fillStyle = '#8a6a42';
    ctx.fillRect(ox + solid.x * scale, oy + solid.y * scale, Math.max(1, solid.w * scale), Math.max(1, solid.h * scale));
  }
  for (const key of state.level.keys) {
    if (key.taken) continue;
    ctx.fillStyle = COLOURS.key;
    ctx.fillRect(ox + key.x * scale - 2, oy + key.y * scale - 2, 4, 4);
  }
  const vault = state.level.exitVault;
  ctx.fillStyle = COLOURS.exit;
  ctx.fillRect(ox + vault.x * scale, oy + vault.y * scale, vault.w * scale, vault.h * scale);
  for (const guard of state.guards) {
    ctx.fillStyle = '#ff5040';
    ctx.beginPath();
    ctx.arc(ox + guard.x * scale, oy + guard.y * scale, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(ox + state.player.x * scale, oy + state.player.y * scale, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = COLOURS.muted;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('MAP', ox, oy - 8);
}

function drawHud(ctx, state) {
  const suspicion = highestSuspicion(state.guards);
  ctx.fillStyle = COLOURS.hud;
  ctx.fillRect(0, 0, WORLD_WIDTH, 36);
  ctx.fillStyle = COLOURS.text;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`🔥 Embers ${state.player.embers}/6`, 14, 23);
  ctx.fillText(`🗝 Keys ${state.player.keys}/3`, 150, 23);
  ctx.fillText(`🪨 Pebbles ${state.player.pebbles}`, 270, 23);
  ctx.fillText(zoneNameFor(state.player.x), 420, 23);
  const minutes = Math.floor(state.timeSeconds / 60);
  const seconds = Math.floor(state.timeSeconds % 60);
  ctx.textAlign = 'right';
  ctx.fillText(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`, WORLD_WIDTH - 14, 23);
  // Suspicion bar, inside the top bar so it never covers the floor.
  const barW = 180;
  const barX = 830;
  ctx.fillStyle = '#2a2118';
  ctx.fillRect(barX, 13, barW, 10);
  ctx.fillStyle = suspicion > 70 ? '#ff5040' : suspicion > 35 ? '#ffb03a' : '#ffd66e';
  ctx.fillRect(barX, 13, barW * (suspicion / 100), 10);
  ctx.strokeStyle = 'rgba(245,236,215,0.6)';
  ctx.strokeRect(barX, 13, barW, 10);
  ctx.fillStyle = COLOURS.text;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('SUSPICION', barX - 8, 23);
  // Controls hint along the bottom.
  ctx.fillStyle = 'rgba(10, 8, 6, 0.65)';
  ctx.fillRect(0, WORLD_HEIGHT - 26, WORLD_WIDTH, 26);
  ctx.fillStyle = COLOURS.muted;
  ctx.font = '13px sans-serif';
  ctx.fillText('WASD / arrows move · Shift sneak · Click throw a pebble · E pick up · H help · P pause', WORLD_WIDTH / 2, WORLD_HEIGHT - 8);
  if (state.toastLeft > 0) {
    ctx.fillStyle = 'rgba(10, 8, 6, 0.85)';
    const tw = 360;
    ctx.fillRect(WORLD_WIDTH / 2 - tw / 2, 78, tw, 30);
    ctx.fillStyle = '#ffe9b0';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(state.toastText, WORLD_WIDTH / 2, 98);
  }
  drawMinimap(ctx, state);
}

function drawPanel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8, 6, 5, 0.78)';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  const pw = 640;
  const ph = 120 + lines.length * 30;
  const px = WORLD_WIDTH / 2 - pw / 2;
  const py = WORLD_HEIGHT / 2 - ph / 2;
  ctx.fillStyle = '#241a10';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(px, py, pw, ph);
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, WORLD_WIDTH / 2, py + 52);
  ctx.fillStyle = COLOURS.text;
  ctx.font = '17px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, WORLD_WIDTH / 2, py + 92 + i * 30));
}

export function drawTitle(ctx, timeSeconds) {
  ctx.fillStyle = '#120d08';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  const glow = ctx.createRadialGradient(640, 300, 20, 640, 300, 420);
  glow.addColorStop(0, 'rgba(255, 196, 92, 0.28)');
  glow.addColorStop(1, 'rgba(255, 196, 92, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  const bob = Math.sin(timeSeconds * 2) * 4;
  ctx.fillStyle = COLOURS.lantern;
  ctx.beginPath();
  ctx.arc(640, 190 + bob, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOURS.text;
  ctx.font = 'bold 56px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LANTERN WATCH', WORLD_WIDTH / 2, 300);
  ctx.fillStyle = COLOURS.ember;
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('The Ember Archive', WORLD_WIDTH / 2, 344);
  ctx.fillStyle = COLOURS.muted;
  ctx.font = '18px sans-serif';
  ctx.fillText('You are the night archivist. Cross the lantern-lit archive, gather the 3 wing keys,', WORLD_WIDTH / 2, 392);
  ctx.fillText('and reach the exit vault unseen. Hide in shadow, behind shelves — and mind the cones.', WORLD_WIDTH / 2, 418);
  ctx.fillStyle = COLOURS.text;
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText('WASD / arrows move · Shift sneak · Click throw a pebble · E pick up · H help · P pause', WORLD_WIDTH / 2, 478);
  ctx.fillStyle = COLOURS.exit;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Press ENTER to begin', WORLD_WIDTH / 2, 530);
  ctx.fillStyle = COLOURS.muted;
  ctx.font = '14px sans-serif';
  ctx.fillText('An original stealth game · guards patrol learnable routes · suspicion gives you a chance to recover', WORLD_WIDTH / 2, 580);
}

export function drawScene(ctx, state) {
  if (state.mode === 'title') {
    drawTitle(ctx, state.timeSeconds);
    return;
  }
  drawFloor(ctx, state.level, state.timeSeconds);
  for (const guard of state.guards) drawVisionCone(ctx, guard, state.level.solids);
  drawSolids(ctx, state.level);
  drawPickups(ctx, state.level, state.timeSeconds);
  for (const guard of state.guards) drawGuard(ctx, guard);
  drawPlayer(ctx, state.player, state.level, state.timeSeconds);
  drawHud(ctx, state);

  if (state.mode === 'help') {
    drawPanel(ctx, 'HOW TO PLAY', [
      'Stay out of the yellow cones — shelves, crates and walls block a guard’s sight.',
      'Shadow + sneaking (Shift) shrinks how far guards can see you.',
      'Suspicion rises in a cone and falls when you hide. Fill it and the guard chases.',
      'Click to throw a pebble: guards leave their route to investigate the noise.',
      'Collect all 3 wing keys, then reach the EXIT VAULT at the top right.',
      'Press H to return to the game · P pauses · R restarts',
    ], COLOURS.lantern);
  } else if (state.mode === 'paused') {
    drawPanel(ctx, 'PAUSED', ['The archive holds its breath.', 'Press P to keep sneaking · R to restart'], COLOURS.muted);
  } else if (state.mode === 'win') {
    drawPanel(ctx, 'UNSEEN — YOU ESCAPED', [
      `Time ${state.stats.timeText} · Embers ${state.player.embers}/6 · Keys ${state.player.keys}/3`,
      `Times spotted: ${state.stats.timesSpotted} · Pebbles left: ${state.player.pebbles}`,
      'The archive never knew you were there. Press R to play again.',
    ], COLOURS.exit);
  } else if (state.mode === 'caught') {
    drawPanel(ctx, 'SPOTTED!', [
      'A warden caught the archivist in the lantern light.',
      `You lasted ${state.stats.timeText} and gathered ${state.player.embers} embers.`,
      'Press R to try again — learn the patrol, use the shadows.',
    ], '#ff5040');
  }
}
