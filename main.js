"use strict";

const debugText = document.getElementById("debugText");

const vsSource =
`attribute vec4 aPosition;
attribute float aPackedColor;

uniform mat4 uMVPMatrix;

varying lowp vec3 vColor;

void main(void) {
    gl_Position = uMVPMatrix * aPosition;

    vec3 color; //extract colors from 0bBBBBBGGGGGGRRRRR
    color.b = floor(aPackedColor / 32.0 / 64.0);
    color.g = floor(aPackedColor / 32.0) - color.b * 64.0;
    color.r = aPackedColor - color.g * 32.0 - color.b * 32.0 * 64.0;
    vColor = color / vec3(31.0, 63.0, 31.0);
}`;

const fsSource =
`varying lowp vec3 vColor;

void main(void) {
    gl_FragColor = vec4(vColor, 1.0);
}`;

const scaledTexturedVsSource =
`attribute vec4 aPosition;
attribute vec2 aTexCoord;

uniform mat4 uMVPMatrix;

varying mediump vec2 vTexCoord;

void main(void) {
    gl_Position = uMVPMatrix * aPosition;
    vTexCoord = aTexCoord * 1024.0;
}`;

const texturedFsSource =
`varying mediump vec2 vTexCoord;
uniform sampler2D uSampler;

void main(void) {
    //gl_FragColor = vec4(fract(vTexCoord), 0, 0);
    gl_FragColor = texture2D(uSampler, vTexCoord);
}`;

const modelViewMatrix = new Mat4();
const viewMatrix = new Mat4();
const perspectiveMatrix = new Mat4();
const viewPerspectiveMatrix = new Mat4();
const tempMatrix = new Mat4();

const canvas = document.querySelector("canvas");
const gl = canvas.getContext("webgl", {
    alpha: false,
    depth: true, //needed for depth culling
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    stencil: false,
});

const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

const programInfo = {
    program: shaderProgram,
    attribLocations: {
        position: gl.getAttribLocation(shaderProgram, 'aPosition'),
        packedColor: gl.getAttribLocation(shaderProgram, 'aPackedColor'),
    },
    uniformLocations: {
        mvpMatrix: gl.getUniformLocation(shaderProgram, 'uMVPMatrix'),
    },
};

const scaledTextureShaderProgram = initShaderProgram(gl, scaledTexturedVsSource, texturedFsSource);

const scaledTextureProgramInfo = {
    program: scaledTextureShaderProgram,
    attribLocations: {
        position: gl.getAttribLocation(scaledTextureShaderProgram, 'aPosition'),
        texCord: gl.getAttribLocation(scaledTextureShaderProgram, 'aTexCoord'),
    },
    uniformLocations: {
        mvpMatrix: gl.getUniformLocation(scaledTextureShaderProgram, 'uMVPMatrix'),
        uSampler: gl.getUniformLocation(scaledTextureShaderProgram, 'uSampler'),
    },
};

const backgroundModel = initTexturedBox(gl, 0, 0, 255, 255);

const gridTexture = loadTexture(gl, "gridcell.png");

const gameLogic = new GameLogic();

const DEFAULT_CAMERA_DISTANCE = 25;
const camera = [0, 0, DEFAULT_CAMERA_DISTANCE];
const camTarget = [0, 0];
const cameraUp = [0, 1, 0];
let cameraZoomOut = 1;

let prevPointerMovement = performance.now();
let previousFrameTime = performance.now();


//gl.clearColor(0.53, 0.81, 0.92, 1);
gl.clearColor(0x74/255, 0x74/255, 0x74/255, 1);
gl.enable(gl.DEPTH_TEST);


document.body.onresize = function() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    gl.viewport(0, 0, canvas.width, canvas.height);

    const aspectRatio = canvas.clientWidth / canvas.clientHeight;
    Mat4.perspectiveMatrix(perspectiveMatrix, 45, aspectRatio, 0.125, 1024);
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
        gl.generateMipmap(gl.TEXTURE_2D);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

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

    const progress = (timestamp - previousFrameTime) / 250;
    camera[0] = camera[0] + (gameLogic.player.gravityX - camera[0]) * progress;
    camera[1] = camera[1] + (gameLogic.player.gravityY - camera[1]) * progress;

    if (!gameLogic.player.held) {
        camTarget[0] = camTarget[0] + (playerX - camTarget[0]) * progress;
        camTarget[1] = camTarget[1] + (playerY - camTarget[1]) * progress;
    }
    previousFrameTime = timestamp;
    
    Mat4.lookAt(viewMatrix, camera, [...camTarget, 0], cameraUp);
    Mat4.multiply(viewPerspectiveMatrix, perspectiveMatrix, viewMatrix);

    gl.useProgram(programInfo.program);
    gl.enableVertexAttribArray(programInfo.attribLocations.position);
    gl.enableVertexAttribArray(programInfo.attribLocations.packedColor);

    {
        const facingRight = gameLogic.player.angle < Math.PI / 2 && gameLogic.player.angle > -Math.PI / 2;
        const scale = [gameLogic.player.r * 2, gameLogic.player.r * (facingRight ? 2 : -2)];
        const position = [playerX, playerY, 0];
        const angle = gameLogic.player.angle;
        drawModel(gameLogic.player.model, position, scale, angle);
    }

    for (const body of gameLogic.rigidBodies) {
        drawModel(body.model, [body.x, body.y, -0.1], [body.scale, body.scale], 0);
    }

    for (const body of gameLogic.bodiesOfWater) {
        drawModel(body.model, [body.x, body.y, -0.2], body.scale, 0);
    }

    drawBackgroundGrid();

    gl.disableVertexAttribArray(programInfo.attribLocations.position);
    gl.disableVertexAttribArray(programInfo.attribLocations.packedColor);

    requestAnimationFrame(drawScene);
}

function drawModel(model, position, scale, rotationAngle) {
    modelViewMatrix.data.set(Mat4.IDENTITY.data);

    Mat4.translate(modelViewMatrix, modelViewMatrix, [...position, 0]);
    Mat4.rotate(modelViewMatrix, modelViewMatrix, rotationAngle, [0, 0, -1]);
    Mat4.scale(modelViewMatrix, modelViewMatrix, [scale[0] / 254, scale[1] / 254, 1]);

    Mat4.multiply(tempMatrix, viewPerspectiveMatrix, modelViewMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.mvpMatrix, false, tempMatrix.data);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, model.buffer);
    gl.vertexAttribPointer(programInfo.attribLocations.position, 2, gl.BYTE, false, 4, 0);
    gl.vertexAttribPointer(programInfo.attribLocations.packedColor, 1, gl.UNSIGNED_SHORT, false, 4, 2);
    gl.drawArrays(model.mode, 0, model.vertexCount);
}

function drawBackgroundGrid() {
    gl.useProgram(scaledTextureProgramInfo.program);
    gl.enableVertexAttribArray(scaledTextureProgramInfo.attribLocations.position);

    modelViewMatrix.data.set(Mat4.IDENTITY.data);

    Mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -5, 0]);
    Mat4.scale(modelViewMatrix, modelViewMatrix, [1024 / 254, 1024 / 254, 1]);

    Mat4.multiply(tempMatrix, viewPerspectiveMatrix, modelViewMatrix);
    gl.uniformMatrix4fv(scaledTextureProgramInfo.uniformLocations.mvpMatrix, false, tempMatrix.data);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, backgroundModel.buffer);
    gl.vertexAttribPointer(scaledTextureProgramInfo.attribLocations.position, 2, gl.BYTE, false, 4, 0);
    gl.vertexAttribPointer(scaledTextureProgramInfo.attribLocations.texCord, 2, gl.UNSIGNED_BYTE, true, 4, 2);
    gl.drawArrays(backgroundModel.mode, 0, backgroundModel.vertexCount);

    gl.disableVertexAttribArray(scaledTextureProgramInfo.attribLocations.position);
}



{
    canvas.touchId = -1;

    canvas.onmousedown = function(event) {
        onpointerdown(event.x, event.y);
        this.down = true;
    };

    canvas.onmousemove = function(event) {
        if (this.down == true)
            onpointermove(event.x, event.y);
    };

    canvas.onmouseup = function(event) {
        onpointerup();
        this.down = false;
    };

    canvas.onmouseleave = function(event) {
        var e = event.toElement || event.relatedTarget;
        if (e == debugText || e == this) {
           return;
        }
        if (this.down) {
            onpointerup();
        }
        this.down = false;
    };

    canvas.addEventListener("touchstart", function(event) {
        if (this.touchId === -1) {
            const touch = event.changedTouches[0];
            this.touchId = touch.identifier;
            onpointerdown(touch.pageX, touch.pageY);
        }
    });

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

document.onkeydown = function(event) {
    if (event.key >= '0' && event.key <= '9') {
        const tickRateScale = Math.pow(1/2, parseInt(event.key));
        gameLogic.setTickRateScale(tickRateScale);
    }

    if (event.key === ".") {
        gameLogic.togglePhysics();
    }
}

document.onwheel = function(event) {
    if (event.deltaY > 0) {
        ++cameraZoomOut;
    } else {
        --cameraZoomOut;
    }

    const scale = Math.pow(2, cameraZoomOut / 4);
    camera[2] = DEFAULT_CAMERA_DISTANCE * scale;
    console.log("camera distance", (scale * 100).toFixed(1), "%");
}

const onpointerdown = (x, y) => {
    this.bodyIndex = -1;
    gameLogic.player.held = false;
    onpointermove(x, y);
}

const onpointermove = (x, y) => {
    const [worldX, worldY] = getWorldSpace(x, y);

    const playerBodyIndex = gameLogic.getBodyOfWater({x: gameLogic.player.x, y: gameLogic.player.y, r: 0});
    
    if (!gameLogic.player.held && playerBodyIndex >= 0) {
        gameLogic.player.setVelocity(0, 0);
    
        gameLogic.player.held = true;
        prevPointerMovement = performance.now();

        this.x = worldX;
        this.y = worldY;
    }
    else if (gameLogic.player.held) {
        const deltaX = worldX - this.x;
        const deltaY = worldY - this.y;
        
        if (deltaX !== 0 && deltaY !== 0) {
            const angle = Math.atan2(-deltaY, deltaX);
            gameLogic.player.setAngle(angle);
        }

        const now = performance.now();

        if (playerBodyIndex < 0) {
            gameLogic.player.held = false;
        } else {
            gameLogic.player.addPosition(deltaX, deltaY);
        }

        const deltaTime = (now - prevPointerMovement) / 1000;
        const fling = [deltaX / deltaTime, deltaY / deltaTime];
        let flingSpeed = normalize(fling);
        flingSpeed = Math.min(flingSpeed, 50); //max speed of 200 player height per second
        fling[0] *= flingSpeed;
        fling[1] *= flingSpeed;
        gameLogic.player.setVelocity(...fling);

        this.x = worldX;
        this.y = worldY;
        prevPointerMovement = now;
    }
}

const onpointerup = () => {
    gameLogic.player.held = false;
}

function getWorldSpace(x, y) {
    x = -1 + x / canvas.clientWidth * 2;
    y = 1 - y / canvas.clientHeight * 2;
    
    const direction = [camTarget[0] - camera[0], camTarget[1] - camera[1], -camera[2]];
    Mat4.lookAt(viewMatrix, [0, 0, 0], direction, cameraUp);
    Mat4.multiply(viewPerspectiveMatrix, perspectiveMatrix, viewMatrix);
    const ray = Mat4.getRayFromClipspace(viewPerspectiveMatrix, [x, y]);
    const dist = -camera[2] / ray[2];
    const worldX = ray[0] * dist + camera[0];
    const worldY = ray[1] * dist + camera[1];

    return [worldX, worldY];
}