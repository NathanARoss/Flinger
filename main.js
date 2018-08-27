"use strict";

const debugText = document.getElementById("debugText");

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
    gl_FragColor = vec4(texture2D(uSampler, vTexCoord).rgb, 0.75);
}`;

const modelViewMatrix = new Mat4();
const viewMatrix = new Mat4();
const perspectiveMatrix = new Mat4();
const viewPerspectiveMatrix = new Mat4();
const tempMatrix = new Mat4();

const canvas = document.querySelector("canvas");
const gl = canvas.getContext("webgl", { alpha: false, premultipliedAlpha: false });
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
const waterModel = initBox(128, 0, 128, 0);
const textureMap = loadTexture(gl, "texturemap.png");

const camera = [0, 0, 20];

let highestDot = 0;
let prevPointerMovement = Date.now();


gl.useProgram(programInfo.program);

gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, textureMap);
gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

gl.clearColor(0.53, 0.81, 0.92, 1);
gl.enable(gl.DEPTH_TEST);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);


document.body.onresize = function() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    gl.viewport(0, 0, canvas.width, canvas.height);

    const aspectRatio = canvas.clientWidth / canvas.clientHeight;
    Mat4.perspectiveMatrix(perspectiveMatrix, 45, aspectRatio, 0.125, 100);
};
document.body.onresize();


function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
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
        console.log('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
  
    const image = new Image();
    image.src = url;

    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        requestAnimationFrame(drawScene);
    };

    image.onerror = function() {
        const pixel = new Uint8Array([0, 255, 255]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, pixel);

        requestAnimationFrame(drawScene);
    }
  
    return texture;
  }


function drawScene(timestamp) {
    gameLogic.performTicks(timestamp);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const playerX = gameLogic.getX(gameLogic.player, timestamp);
    const playerY = gameLogic.getY(gameLogic.player, timestamp);

    if (!gameLogic.player.held) {
        const rayTowardsNewTarget = [playerX + gameLogic.player.vx * 3 - camera[0], playerY + gameLogic.player.vy * 3 - camera[1]];
        const distance = normalize(rayTowardsNewTarget);

        const speed = distance / 4;

        camera[0] += rayTowardsNewTarget[0] * speed;
        camera[1] += rayTowardsNewTarget[1] * speed;
    }

    Mat4.lookAt(viewMatrix, camera, [camera[0], camera[1], 0], [0, 1, 0]);
    Mat4.multiply(viewPerspectiveMatrix, perspectiveMatrix, viewMatrix);

    gl.enableVertexAttribArray(programInfo.attribLocations.position);
    gl.enableVertexAttribArray(programInfo.attribLocations.texCord);

    {
        const facingRight = gameLogic.player.angle < Math.PI / 2 && gameLogic.player.angle > -Math.PI / 2;
        const scale = [gameLogic.player.r * 2, gameLogic.player.r * (facingRight ? 2 : -2)];
        const position = [playerX, playerY, 0];
        const angle = gameLogic.player.angle;
        drawModel(fishModel, position, scale, angle);
    }

    for (const body of gameLogic.rigidBodies) {
        drawModel(body.model, [body.x, body.y, 0], [body.scale, body.scale], 0);
    }

    gl.enable(gl.BLEND);
    for (const body of gameLogic.bodiesOfWater) {
        drawModel(waterModel, [body.x, body.y, 0.01], [body.width, body.height], 0);
    }
    gl.disable(gl.BLEND);

    gl.disableVertexAttribArray(programInfo.attribLocations.position);
    gl.disableVertexAttribArray(programInfo.attribLocations.texCord);

    requestAnimationFrame(drawScene);
}

function drawModel(model, position, scale, rotationAngle) {
    modelViewMatrix.data.set(Mat4.IDENTITY.data);

    Mat4.translate(modelViewMatrix, modelViewMatrix, position);
    Mat4.rotate(modelViewMatrix, modelViewMatrix, rotationAngle, [0, 0, -1]);
    Mat4.scale(modelViewMatrix, modelViewMatrix, [scale[0] / 254, scale[1] / 254, 1]);

    Mat4.multiply(tempMatrix, viewPerspectiveMatrix, modelViewMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.mvpMatrix, false, tempMatrix.data);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, model.buffer);
    gl.vertexAttribPointer(programInfo.attribLocations.position, 2, gl.BYTE, false, 4, 0);
    gl.vertexAttribPointer(programInfo.attribLocations.texCord, 2, gl.UNSIGNED_BYTE, true, 4, 2);
    gl.drawArrays(model.mode, 0, model.vertexCount);
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

    canvas.onmouseleave = function(event) {
        var e = event.toElement || event.relatedTarget;
        if (e == debugText || e == this) {
           return;
        }
        if (this.down) {
            onpointerup();
        }
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
    this.bodyIndex = -1;
    gameLogic.player.held = false;
    onpointermove(x, y);
}

const onpointermove = (x, y) => {
    const [worldX, worldY] = getWorldSpace(x, y);

    const cursorBodyIndex = gameLogic.getBodyOfWater({x: worldX, y: worldY, r: gameLogic.player.r});
    const playerBodyIndex = gameLogic.getBodyOfWater({x: gameLogic.player.x, y: gameLogic.player.y, r: gameLogic.player.r});
    
    if (this.bodyIndex < 0 && cursorBodyIndex >= 0 && cursorBodyIndex === playerBodyIndex) {
        gameLogic.player.setPosition(worldX, worldY);
        gameLogic.player.setVelocity(0, 0);
    
        gameLogic.player.held = true;
        prevPointerMovement = Date.now();

        this.x = worldX;
        this.y = worldY;
        this.bodyIndex = cursorBodyIndex;
    }
    else if (this.bodyIndex >= 0) {
        const deltaX = worldX - this.x;
        const deltaY = worldY - this.y;
        
        if (deltaX !== 0 && deltaY !== 0) {
            const angle = Math.atan2(-deltaY, deltaX);
            gameLogic.player.setAngle(angle);
        }

        const now = Date.now();

        if (playerBodyIndex < 0) {
            this.bodyIndex = -1;
            gameLogic.player.held = false;
            const deltaTime = (now - prevPointerMovement) / 1000;
            const fling = [deltaX / deltaTime, deltaY / deltaTime];
            let flingSpeed = normalize(fling);
            flingSpeed = Math.min(flingSpeed, 200); //max speed of 200 player height per second
            fling[0] *= flingSpeed;
            fling[1] *= flingSpeed;
            gameLogic.player.setVelocity(...fling);
        } else {
            gameLogic.player.setPosition(worldX, worldY);
        }

        this.x = worldX;
        this.y = worldY;
        prevPointerMovement = now;
    }
}

const onpointerup = () => {
    gameLogic.player.held = false;
    this.bodyIndex = -1;
}

function getWorldSpace(x, y) {
    x = -1 + x / canvas.clientWidth * 2;
    y = 1 - y / canvas.clientHeight * 2;

    const ray = Mat4.getRayFromClipspace(viewPerspectiveMatrix, [x, y]);
    const dist = -camera[2] / ray[2];
    const worldX = ray[0] * dist + camera[0];
    const worldY = ray[1] * dist + camera[1];

    // I apply a 3/5 scale because the results are skewed away from the center of the screen otherwise.
    // at this time, I am not sure why it is necessary
    const bias = 4 / 5;
    return [worldX * bias, worldY * bias];
}