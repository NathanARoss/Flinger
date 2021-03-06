import {
    initCircle,
    initPolygon,
} from "./model-builder.mjs";

import {
    normalize,
    reflect,
} from "./matrix-math.mjs";

export class GameLogic {
    constructor(gl) {
        const fishModel = initCircle(gl, 5, 1, 1, 0);
        //const waterBox = initBox(gl, 0, 0.412, 0.58);
        const waterCircle = initCircle(gl, 5, 0, 0.412, 0.58);

        this.player = new PhysicsObj(0, 0, 0.5, fishModel);

        this.bodiesOfWater = [];
        //this.bodiesOfWater.push(new StaticSquare(0, -50000, 100000, 100000, waterBox));
        //this.bodiesOfWater.push(new StaticSquare(0, 15, 2.5, 3.5, waterBox));
        this.bodiesOfWater.push(new StaticCircle(0, 0, 5, waterCircle));
        this.bodiesOfWater.push(new StaticCircle(15, 15, 5, waterCircle));
        this.bodiesOfWater.push(new StaticCircle(0, 30, 5, waterCircle));
        this.bodiesOfWater.push(new StaticCircle(-30, 30, 5, waterCircle));

        this.rigidBodies = [];
        let verticies = [
            5, 15,
            -10, 14,
            -10, 16,
        ];
        this.rigidBodies.push(new StaticRigidBody(gl, 0, 0, verticies, 255, [1, 1, 1]))

        verticies = [
            -29, 35,
            -29, 25,
            -31, 24,
            -31, 36,
        ]
        this.rigidBodies.push(new StaticRigidBody(gl, 0, 0, verticies, 255, [1, 1, 1]))

        this.lastTick = -1;
    }

    tick() {
        this.player.tick(this);
    }

    performTicks(timestamp) {
        this.lastTick = Math.max(this.lastTick, timestamp - msPerTick * 5);

        while (this.lastTick + msPerTick < timestamp) {
            this.tick(this);
            this.lastTick += msPerTick;
        }
    }

    getX(physicsObj, timestamp) {
        return physicsObj.prevX + (physicsObj.x - physicsObj.prevX) * Math.max(0, timestamp - this.lastTick) / msPerTick;
    }

    getY(physicsObj, timestamp) {
        return physicsObj.prevY + (physicsObj.y - physicsObj.prevY) * Math.max(0, timestamp - this.lastTick) / msPerTick;
    }

    getBodyOfWater(circle) {
        for (const body of this.bodiesOfWater) {
            if (body.isColliding(circle)) {
                return body;
            }
        }
        return null;
    }

    togglePhysics() {
        if (this.lastTick === 1e100) {
            this.lastTick = performance.now();
        } else {
            this.lastTick = 1e100;
        }
    }
}

//tick rate is global because it is a debug feature
let ticksPerSecond = 0;
let msPerTick = 0;

export function setTickRateScale(scale, gameLogic) {
    ticksPerSecond = 50 * scale;
    msPerTick = 1000 / ticksPerSecond;

    if (gameLogic) {
        gameLogic.lastTick = performance.now();
    }
}

setTickRateScale(1);

export class PhysicsObj {
    constructor(x = 0, y = 0, r = 1, model, vx = 0, vy = 0, angle = 0) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.prevX = x;
        this.prevY = y;
        this.vx = vx;
        this.vy = vy;
        this.angle = angle;
        this.model = model;
        this.gravityX = 0;
        this.gravityY = 0;
    }

    tick(gameLogic) {
        this.prevX = this.x;
        this.prevY = this.y;

        debugText.textContent = "position: (" + this.x.toFixed(2) + ", " + this.y.toFixed(2) + ")\n" +
            "velocity: (" + (this.vx * ticksPerSecond).toFixed(2) + ", " + (this.vy * ticksPerSecond).toFixed(2) + ")";

        if (!this.held) {
            const friction = 255 / 256;
            const gravity = [this.gravityX - this.x, this.gravityY - this.y];

            normalize(gravity);
            this.vx = (this.vx + gravity[0] / 64) * friction;
            this.vy = (this.vy + gravity[1] / 64) * friction;

            this.moveBySteps(gameLogic, this.vx, this.vy);

            const body = gameLogic.getBodyOfWater({
                x: this.x,
                y: this.y,
                r: this.r / 4
            });
            if (body) {
                this.vx *= 0.8;
                this.vy *= 0.8;
                this.gravityX = body.x;
                this.gravityY = body.y;
            }
        }
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    moveBySteps(gameLogic, dx, dy) {
        const steps = Math.ceil(Math.max(Math.abs(dx / this.r), Math.abs(dy / this.r)));
        const stepX = dx / steps;
        const stepY = dy / steps;

        for (let i = 0; i < steps; ++i) {
            this.x += stepX;
            this.y += stepY;

            const collisionData = this.getCollisionData(gameLogic);
            if (collisionData) {
                this.x += collisionData.normal[0] * collisionData.magnitude;
                this.y += collisionData.normal[1] * collisionData.magnitude;
                const bounce = reflect([dx, dy], collisionData.normal);
                this.vx = bounce[0] * 0.7;
                this.vy = bounce[1] * 0.7;
                break;
            }
        }
    }

    setVelocity(vx, vy) {
        this.vx = vx / ticksPerSecond;
        this.vy = vy / ticksPerSecond;
    }

    setAngle(angle) {
        this.angle = angle;
    }

    getCollisionData(gameLogic) {
        for (const body of gameLogic.rigidBodies) {
            const collisionData = body.getCollisionData(this);
            if (collisionData)
                return collisionData;
        }

        return null;
    }
}

export class StaticSquare {
    constructor(x = 0, y = 0, width, height, model) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.model = model;
    }

    isColliding(circle) {
        const cornerX = Math.max(0, Math.abs(circle.x - this.x) - this.width / 2);
        const cornerY = Math.max(0, Math.abs(circle.y - this.y) - this.height / 2);

        return cornerX ** 2 + cornerY ** 2 < circle.r ** 2;
    }

    get scale() {
        return [this.width, this.height];
    }
}

export class StaticCircle {
    constructor(x = 0, y = 0, radius, model) {
        this.x = x;
        this.y = y;
        this.r = radius;
        this.model = model;
    }

    isColliding(circle) {
        const dX = circle.x - this.x
        const dY = circle.y - this.y;

        return dX ** 2 + dY ** 2 < (circle.r + this.r) ** 2;
    }

    get scale() {
        return [this.r * 2, this.r * 2];
    }
}

export class StaticRigidBody {
    constructor(gl, x, y, verticies, scale, color) {
        this.x = x;
        this.y = y;
        this.verticies = [];
        for (let i = 0; i < verticies.length; i += 2) {
            this.verticies[i] = verticies[i] / 254 * scale + x;
            this.verticies[i + 1] = verticies[i + 1] / 254 * scale + y;
        }
        this.verticies.push(this.verticies[0], this.verticies[1]);

        this.model = initPolygon(gl, verticies, ...color);
        this.scale = scale;
    }

    getCollisionData(physicsObj) {
        const {
            x,
            y,
            r
        } = physicsObj;
        const r2 = r * r;;

        for (let i = 0, length = this.verticies.length; i < length; i += 2) {
            const [x1, y1, x2, y2] = this.verticies.slice(i, i + 4);

            const v1x = x2 - x1;
            const v1y = y2 - y1;
            const v2x = x - x1;
            const v2y = y - y1;
            const u = (v2x * v1x + v2y * v1y) / (v1y * v1y + v1x * v1x);

            //edge
            if (u >= 0 && u <= 1) {
                const dot = (x1 + v1x * u - x) ** 2 + (y1 + v1y * u - y) ** 2;
                if (dot < r2) {
                    const normal = [-v1y, v1x];
                    normalize(normal);

                    const magnitude = r - Math.sqrt(dot);
                    return {
                        normal,
                        magnitude
                    };
                }
            }
            //corner
            else {
                const [px, py] = (u < 0) ? [x1, y1] : [x2, y2];

                const dx = x - px;
                const dy = y - py;
                if (dx ** 2 + dy ** 2 < r2) {
                    const normal = [dx, dy];
                    const magnitude = normalize(normal);
                    return {
                        normal,
                        magnitude
                    };
                }
            }
        }

        return null;
    }
}