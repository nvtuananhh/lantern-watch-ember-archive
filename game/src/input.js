// Keyboard and mouse input, edge-triggered where the game needs it.
// The game polls held keys each fixed step; one-shot actions (pebble
// throws, pause, help) are queued here and consumed once by main.js.

export function createInput(canvas) {
  const keys = new Set();
  const pressedQueue = [];
  let pebbleTarget = null;
  let clicked = false;

  function keyName(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
  }

  function onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    const name = keyName(event);
    if (!event.repeat) pressedQueue.push(name);
    keys.add(name);
  }

  function onKeyUp(event) {
    keys.delete(keyName(event));
  }

  function onMouseDown(event) {
    clicked = true;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    pebbleTarget = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);

  return {
    moveVector() {
      let dx = 0;
      let dy = 0;
      if (keys.has('a') || keys.has('ArrowLeft')) dx -= 1;
      if (keys.has('d') || keys.has('ArrowRight')) dx += 1;
      if (keys.has('w') || keys.has('ArrowUp')) dy -= 1;
      if (keys.has('s') || keys.has('ArrowDown')) dy += 1;
      return { dx, dy };
    },
    isSneaking() {
      return keys.has('Shift');
    },
    consumePressed() {
      return pressedQueue.splice(0, pressedQueue.length);
    },
    wasClicked() {
      return clicked;
    },
    consumePebbleTarget() {
      const target = pebbleTarget;
      pebbleTarget = null;
      clicked = false;
      return target;
    },
    clearClick() {
      clicked = false;
      pebbleTarget = null;
    },
  };
}
