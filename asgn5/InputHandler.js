const pressedKeys = new Set();

function keyDownHandler(event) {
  pressedKeys.add(event.code);
}

function keyUpHandler(event) {
  pressedKeys.delete(event.code);
}

document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);

export function isKeyDown(code) {
  return pressedKeys.has(code);
}
