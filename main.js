"use strict";

const vsSource =
`attribute vec4 aPosition;
attribute vec2 aTexCoord;

uniform mat4 uMVPMatrix;

varying lowp vec2 vTexCoord;

void main(void) {
    gl_Position = uMVPMatrix * aPosition;
    vTexCoord = aTexCoord;
}`;

const fsSource =
`varying lowp vec2 vTexCoord;

uniform sampler2D uSampler;

void main(void) {
    gl_FragColor = texture2D(uSampler, vTexCoord);
}`;

let aspectRatio = 1;

const modelViewMatrix = new Mat4();
const perspectiveMatrix = new Mat4();
const tempMatrix = new Mat4();

const canvas = document.querySelector("canvas");
const gl = canvas.getContext("webgl");
const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

const programInfo = {
    program: shaderProgram,
    attribLocations: {
        position: gl.getAttribLocation(shaderProgram, 'aPosition'),
        texCord: gl.getAttribLocation(shaderProgram, 'aTexCoord'),
    },
    uniformLocations: {
        mvpMatrix: gl.getUniformLocation(shaderProgram, 'uMVPMatrix'),
        uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
    },
};


const gameLogic = new GameLogic();

const fishModel = initCircleModel(gl, 5);
const floorModel = initFloor(gl, 0);
const fishTexture = loadTexture(gl, "fish.png");

let camX = 0;
let camY = 0.5;


gl.useProgram(programInfo.program);

gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, fishTexture);
gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

gl.clearColor(0.0, 0.412, 0.58, 1.0);
gl.enable(gl.DEPTH_TEST);

requestAnimationFrame(drawScene);


document.body.onresize = function() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    gl.viewport(0, 0, canvas.width, canvas.height);

    aspectRatio = canvas.clientWidth / canvas.clientHeight;
    Mat4.perspectiveMatrix(perspectiveMatrix, 45, aspectRatio, 0.125, 100);
};
document.body.onresize();


function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function initShaderProgram(gl, vsSource, fsSource) {
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
  
    const pixel = new Uint8Array([0, 255, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, pixel);
  
    const image = new Image();
    image.src = url;
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    };
  
    return texture;
  }


function drawScene(timestamp) {
    gameLogic.performTicks(timestamp);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enableVertexAttribArray(programInfo.attribLocations.position);
    gl.enableVertexAttribArray(programInfo.attribLocations.texCord);

    const playerX = gameLogic.getX(gameLogic.player, timestamp);
    const playerY = gameLogic.getY(gameLogic.player, timestamp);
    drawModel(fishModel, gameLogic.player.r, [playerX, playerY]);
    drawModel(floorModel, 10, [0, 0]);

    /*const scale = 1/256;
    const zOffset = -0.9;
    drawModel(fishModel, scale , [-0.5, -0.5]);
    drawModel(fishModel, scale , [0.5, -0.5]);
    drawModel(fishModel, scale , [-0.5, 0.5]);
    drawModel(fishModel, scale , [0.5, 0.5]);
    drawModel(fishModel, scale , [0, 0]);*/

    gl.disableVertexAttribArray(programInfo.attribLocations.position);
    gl.disableVertexAttribArray(programInfo.attribLocations.texCord);

    requestAnimationFrame(drawScene);
}

function drawModel(model, scale, [x, y]) {
    Mat4.translate(modelViewMatrix, Mat4.IDENTITY, [x - camX, y - camY, -0.9]);
    Mat4.scale(modelViewMatrix, modelViewMatrix, [scale, scale, 1]);

    Mat4.multiply(tempMatrix, perspectiveMatrix, modelViewMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.mvpMatrix, false, tempMatrix.data);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, model.buffer);
    gl.vertexAttribPointer(programInfo.attribLocations.position, 2, model.positionType, true, 4, 0);
    gl.vertexAttribPointer(programInfo.attribLocations.texCord, 2, gl.UNSIGNED_BYTE, true, 4, 2);
    gl.drawArrays(gl.TRIANGLES, 0, model.vertexCount);
}



{
    canvas.touchId = -1;

    canvas.onmousedown = function(event) {
        onpointerdown(event.x, event.y);
        this.down = true;
    }

    canvas.onmousemove = function(event) {
        if (this.down == true)
            onpointermove(event.x, event.y);
    }

    canvas.onmouseup = function(event) {
        onpointerup();
        this.down = false;
    }

    canvas.addEventListener("touchstart", function(event) {
        if (this.touchId === -1) {
            const touch = event.changedTouches[0];
            this.touchId = touch.identifier;
            onpointerdown(touch.pageX, touch.pageY);
        }
    })

    function existingTouchHandler(event) {
        event.preventDefault();

        for (const touch of event.changedTouches) {
          if (touch.identifier === this.touchId) {
            switch (event.type) {
              case "touchmove":
                onpointermove(touch.pageX, touch.pageY);
              break;
      
              case "touchend":
              case "touchcancel":
                onpointerup();
                this.touchId = -1;
              break;
            }
          }
        }
      }

    canvas.addEventListener("touchmove", existingTouchHandler);
    canvas.addEventListener("touchend", existingTouchHandler);
    canvas.addEventListener("touchcancel", existingTouchHandler);
}

const onpointerdown = (x, y) => {
    x /= window.innerWidth;
    y = 1 - y / window.innerHeight;

    this.x = (x - 0.5) * aspectRatio + camX;
    this.y = y - 0.5 + camY;

    gameLogic.player.held = true;
    gameLogic.player.prevX = this.x;
    gameLogic.player.prevY = this.y;
    gameLogic.player.x = this.x;
    gameLogic.player.y = this.y;
    gameLogic.player.vx = 0;
    gameLogic.player.vy = 0;

    //console.log(this.x, this.y);
}

const onpointermove = (x, y) => {
    x /= window.innerWidth;
    y = 1 - y / window.innerHeight;

    this.x = (x - 0.5) * aspectRatio + camX;
    this.y = y - 0.5 + camY;

    gameLogic.player.prevX = gameLogic.player.x;
    gameLogic.player.prevY = gameLogic.player.y;
    gameLogic.player.x = this.x;
    gameLogic.player.y = this.y;

}

const onpointerup = () => {
    gameLogic.player.held = false;
    gameLogic.player.vx = gameLogic.player.x - gameLogic.player.prevX;
    gameLogic.player.vy = gameLogic.player.y - gameLogic.player.prevY;
}