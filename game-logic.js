class GameLogic {
    constructor() {
        this.player = new PhysicsObj(0, 0, 0.5);

        this.bodiesOfWater = [];
        this.bodiesOfWater.push(new StaticSquare(0, -50000, 100000, 100000));
        this.bodiesOfWater.push(new StaticSquare(0, 15, 2.5, 3.5));

        this.rigidBodies = [];
        let verticies = [-100, -50, -50, -10, -20, 5, -10, 0, 0, -10, 10, 0, 20, 5, 50, -10, 100, -50];
        this.rigidBodies.push(new StaticRigidBody(0, 0, verticies, 200, [1, 0.9, 0.4]));
        verticies = [0, -100, -100, 0, -80, 50, -30, 45, 0, 10, 30, 45, 80, 50, 100, 0];
        this.rigidBodies.push(new StaticRigidBody(0, 15, verticies, 10, [1, 0.5, 0.5]));

        this.lastTick = -1;
        this.MS_PER_TICK = 0;
        this.TICKS_PER_SECOND = 0;
        this.setTickRateScale(1);
    }

    tick() {
        this.player.tick();
    }

    performTicks(timestamp) {
        this.lastTick = Math.max(this.lastTick, timestamp - this.MS_PER_TICK * 5);

        while (this.lastTick + this.MS_PER_TICK < timestamp) {
            this.tick();
            this.lastTick += this.MS_PER_TICK;
        }
    }

    getX(physicsObj, timestamp) {
        return physicsObj.prevX + (physicsObj.x - physicsObj.prevX) * Math.max(0, timestamp - this.lastTick) / this.MS_PER_TICK;
    }

    getY(physicsObj, timestamp) {
        return physicsObj.prevY + (physicsObj.y - physicsObj.prevY) * Math.max(0, timestamp - this.lastTick) / this.MS_PER_TICK;
    }

    getBodyOfWater(circle) {
        for (let i = 0; i < this.bodiesOfWater.length; ++i) {
            if (this.bodiesOfWater[i].isColliding(circle)) {
                return i;
            }
        }
        return -1;
    }

    setTickRateScale(scale) {
        this.TICKS_PER_SECOND = 50 * scale;
        this.MS_PER_TICK = 1000 / this.TICKS_PER_SECOND;
        this.lastTick = performance.now();
    }

    togglePhysics() {
        if (this.lastTick === 1e100) {
            this.lastTick = performance.now();
        } else {
            this.lastTick = 1e100;
        }
    }
}

class PhysicsObj {
    constructor(x = 0, y = 0, r = 1, vx = 0, vy = 0, angle = 0) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.prevX = x;
        this.prevY = y;
        this.vx = vx;
        this.vy = vy;
        this.angle = angle;
    }

    tick() {
        this.prevX = this.x;
        this.prevY = this.y;
        
        debugText.textContent = `position: (${this.x.toFixed(2)}, ${this.y.toFixed(2)})\nvelocity: (${(this.vx * gameLogic.TICKS_PER_SECOND).toFixed(2)}, ${(this.vy * gameLogic.TICKS_PER_SECOND).toFixed(2)})`;

        if (!this.held) {
            const steps = Math.ceil(Math.max(Math.abs(this.vx / this.r), Math.abs(this.vy / this.r)));
            const stepX = this.vx / steps;
            const stepY = this.vy / steps;

            this.vy -= 1 / 64;

            for (let i = 0; i < steps; ++i) {
                this.x += stepX;
                this.y += stepY;

                const collisionData = this.getCollisionData();
                if (collisionData) {
                    this.x += collisionData.normal[0] * collisionData.magnitude;
                    this.y += collisionData.normal[1] * collisionData.magnitude;
                    const bounce = reflect([this.vx, this.vy], collisionData.normal);
                    this.vx = bounce[0] * 0.7;
                    this.vy = bounce[1] * 0.7;
                    break;
                }
            }

            if (gameLogic.getBodyOfWater({x: this.x, y: this.y, r: this.r / 4}) >= 0) {
                this.vx = 0;
                this.vy = 0;
            }
        }
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    setVelocity(vx, vy) {
        this.vx = vx / gameLogic.TICKS_PER_SECOND;
        this.vy = vy / gameLogic.TICKS_PER_SECOND;
    }

    setAngle(angle) {
        this.angle = angle;
    }

    getCollisionData() {
        for (const body of gameLogic.rigidBodies) {
            const collisionData = body.getCollisionData(this);
            if (collisionData)
                return collisionData;
        }

        return null;
    }
}

class StaticSquare {
    constructor(x = 0, y = 0, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    isColliding(circle) {
        const cornerX = Math.max(0, Math.abs(circle.x - this.x) - this.width / 2);
        const cornerY = Math.max(0, Math.abs(circle.y - this.y) - this.height / 2);

        return cornerX**2 + cornerY**2 < circle.r**2;
    }
}

class StaticRigidBody {
    constructor(x, y, verticies, scale, color) {
        this.x = x;
        this.y = y;
        this.verticies = [];
        for (let i = 0; i < verticies.length; i += 2) {
            this.verticies[i] = verticies[i] / 254 * scale + x;
            this.verticies[i+1] = verticies[i+1] / 254 * scale + y;
        }
        this.verticies.push(this.verticies[0], this.verticies[1]);

        this.model = initPolygon(verticies, ...color);
        this.scale = scale;
    }

    getCollisionData(physicsObj) {
        const {x, y, r} = physicsObj;
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
                    return {normal, magnitude};
                }
            }
            //corner
            else {
                const [px, py] = (u < 0) ? [x1, y1] : [x2, y2];

                const dx = x - px;
                const dy = y - py;
                if (dx**2 + dy**2 < r2) {
                    const normal = [dx, dy];
                    const magnitude = normalize(normal);
                    return {normal, magnitude};
                }
            }
        }

        return null;
    }
}