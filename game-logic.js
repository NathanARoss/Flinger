class GameLogic {
    constructor() {
        this.player = new PhysicsObj(0, 0, 0.5);

        this.bodiesOfWater = [];
        this.bodiesOfWater.push(new StaticSquare(0, -50000, 100000, 100000));

        this.rigidBodies = [];
        const verticies = [-100, -50, -50, -10, -20, 5, -10, 0, 0, -10, 10, 0, 20, 5, 50, -10, 100, -50];
        this.rigidBodies.push(new StaticRigidBody(0, 0, verticies, 200));

        this.lastTick = -1;
        this.MS_PER_TICK = 20;
        this.TICKS_PER_SECOND = 1000 / this.MS_PER_TICK;
    }

    tick() {
        this.player.tick();
    }

    performTicks(timestamp) {
        this.lastTick = Math.max(this.lastTick, timestamp - 100);

        while (this.lastTick + this.MS_PER_TICK < timestamp) {
            this.tick();
            this.lastTick += this.MS_PER_TICK;
        }
    }

    getX(physicsObj, timestamp) {
        return physicsObj.prevX + (physicsObj.x - physicsObj.prevX) * (timestamp - this.lastTick) / this.MS_PER_TICK;
    }

    getY(physicsObj, timestamp) {
        return physicsObj.prevY + (physicsObj.y - physicsObj.prevY) * (timestamp - this.lastTick) / this.MS_PER_TICK;
    }

    getBodyOfWater(circle) {
        for (let i = 0; i < this.bodiesOfWater.length; ++i) {
            if (this.bodiesOfWater[i].isColliding(circle)) {
                return i;
            }
        }
        return -1;
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
            this.x += this.vx;
            this.y += this.vy;
            this.vy -= 1 / 64;

            const collisionData = this.getCollisionData();
            if (collisionData) {
                this.x += collisionData.normal[0] * collisionData.magnitude;
                this.y += collisionData.normal[1] * collisionData.magnitude;
                const bounce = reflect([this.vx, this.vy], collisionData.normal);
                this.vx = bounce[0] * 0.7;
                this.vy = bounce[1] * 0.7;
            }

            if (this.isInWater()) {
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

    isInWater() {
        return gameLogic.getBodyOfWater({x: this.x, y: this.y, r: 0.1}) >= 0;
    }

    getCollisionData() {
        for (const body of gameLogic.rigidBodies) {
            for (let i = 0, length = body.verticies.length; i < length; i += 2) {
                const x1 = body.verticies[i];
                const y1 = body.verticies[i + 1];
                const x2 = body.verticies[(i + 2) % length];
                const y2 = body.verticies[(i + 3) % length];

                const v1x = x2 - x1;
                const v1y = y2 - y1;
                const v2x = this.x - x1;
                const v2y = this.y - y1;
                const u = (v2x * v1x + v2y * v1y) / (v1y * v1y + v1x * v1x);

                //edge
                if (u >= 0 && u <= 1) {
                    const dot = (x1 + v1x * u - this.x) ** 2 + (y1 + v1y * u - this.y) ** 2;
                    if (dot < this.r**2) {
                        const normal = [-v1y, v1x];
                        normalize(normal);

                        const magnitude = this.r - Math.sqrt(dot);
                        return {normal, magnitude};
                    }
                }
                //corner
                else {
                    const [px, py] = (u < 0) ? [x1, y1] : [x2, y2];

                    const dx = this.x - px;
                    const dy = this.y - py;
                    if (dx**2 + dy**2 < this.r**2) {
                        const normal = [dx, dy];
                        const magnitude = normalize(normal);
                        return {normal, magnitude};
                    }
                }
            }
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
    constructor(x, y, verticies, scale) {
        this.x = x;
        this.y = y;
        this.verticies = [];
        for (let i = 0; i < verticies.length; i += 2) {
            this.verticies[i] = verticies[i] / 254 * scale + x;
            this.verticies[i+1] = verticies[i+1] / 254 * scale + y;
        }

        this.model = initPolygon(verticies, 130, 0);
        this.scale = scale;
    }
}