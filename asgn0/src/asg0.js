// DrawTriangle.js (c) 2012 matsuda
let canvas;
let ctx;
// draw line of specified color based on Vector3 
function drawVector(v, color) {
  const centerx = canvas.width / 2;
  const centery = canvas.height / 2;

  ctx.beginPath();
  // ctx.fillStyle = color;
  ctx.moveTo(centerx, centery);
  ctx.lineTo(centerx + (v.elements[0] * 20), centery - (v.elements[1] * 20));

  ctx.strokeStyle = color;
  ctx.stroke();
}


function handleDrawEvent() {
  const x1 = Number(document.getElementById('x1').value);
  const y1 = Number(document.getElementById('y1').value);

  const x2 = Number(document.getElementById('x2').value);
  const y2 = Number(document.getElementById('y2').value);

  var v1 = new Vector3([x1, y1, 0]);

  var v2 = new Vector3([x2, y2, 0]);

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);        

  drawVector(v1, "red");
  drawVector(v2, "blue");

}

function angleBetween(v1, v2) {
  const magnitude1 = v1.magnitude();
  const magnitude2 = v2.magnitude();

  if (magnitude1 === 0 || magnitude2 === 0) {
    return;
  }

  const dot = Vector3.dot(v1, v2);
  const cosAlpha = dot / (magnitude1 * magnitude2);

  const clamped = Math.max(-1, Math.min(1, cosAlpha)); // need this so if vectors are same, it doesnt return NaN

  const alpha = Math.acos(clamped);
  const angle = alpha * 180 / Math.PI;

  return angle;
}

function areaTriangle(v1, v2) {
  var v3 = Vector3.cross(v1, v2);

  const magnitude = v3.magnitude();
  const area = magnitude / 2;

  return area;
}


function handleDrawOperationEvent() {
  let drawv3 = false;
  let drawv4 = false;

  const x1 = Number(document.getElementById('x1').value);
  const y1 = Number(document.getElementById('y1').value);

  var v1 = new Vector3([x1, y1, 0]);

  var v3 = new Vector3([x1, y1, 0]); // for operation use

  const x2 = Number(document.getElementById('x2').value);
  const y2 = Number(document.getElementById('y2').value);

  var v2 = new Vector3([x2, y2, 0]);
  var v4 = new Vector3([x2, y2, 0]);

  const operation = document.getElementById('operation-select').value;
  const scalar = Number(document.getElementById('scalar').value);

  if (operation == "add") {
    v3.add(v2);
    drawv3 = true;

  } else if (operation == "sub") {
    v3.sub(v2);
    drawv3 = true;

  } else if (operation == "mul") {
    v3.mul(scalar);
    v4.mul(scalar);
    drawv3 = true;
    drawv4 = true;

  } else if (operation == "div") {
    v3.div(scalar);
    v4.div(scalar);
    drawv3 = true;
    drawv4 = true;

  } else if (operation == "mag") {
    const magnitude1 = v1.magnitude();
    const magnitude2 = v2.magnitude();

    console.log("Magnitude v1: ", magnitude1);
    console.log("Magnitude v2: ", magnitude2);

  } else if (operation == "norm") {
    v3.normalize();
    v4.normalize();
    drawv3 = true;
    drawv4 = true;

  } else if (operation == "angle") {
    const angle = angleBetween(v1, v2);
    console.log("Angle: ", angle);

  } else if (operation == "area") {
    const area = areaTriangle(v1, v2);
    console.log("Area: ", area)

  }

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);        

  drawVector(v1, "red");
  drawVector(v2, "blue");
  if (drawv3 == true) {
    drawVector(v3, "green");
  }

  if (drawv4 == true) {
    drawVector(v4, "green");
  }

}


function main() {  
  // Retrieve <canvas> element
  canvas = document.getElementById('example');  
  if (!canvas) { 
    console.log('Failed to retrieve the <canvas> element');
    return false; 
  } 


  // Get the rendering context for 2DCG
  ctx = canvas.getContext('2d');

  // Draw a blue rectangle
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);        // Fill a rectangle with the color

  // var v1 = new Vector3([2.25, 2.25, 0])
  // drawVector(v1, "red");

  const buttonDraw = document.getElementById('draw');
  const buttonDrawOperation = document.getElementById('draw-operation');
  buttonDraw.addEventListener("click", handleDrawEvent);
  buttonDrawOperation.addEventListener("click", handleDrawOperationEvent);
}
