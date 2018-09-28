class GameLogic {
    constructor() {
        const fishModel = initCircle(gl, 5, 1, 1, 0);
        this.waterCircle = initCircle(gl, 5, 0, 0.412, 0.58);
        
        this.player = new PhysicsObj(0, 0, 0.5, fishModel);

        this.bodiesOfWater = [];
        this.rigidBodies = [];

        this.lastTick = -1;
        this.MS_PER_TICK = 0;
        this.TICKS_PER_SECOND = 0;
        this.setTickRateScale(1);

        const parent = this;
        const propertiesForm = document.getElementById("object-properties");
        this.properties = new Map();
        for (const input of propertiesForm.querySelectorAll("input")) {
            this.properties.set(input.id, input);
            input.disabled = true;
            input.addEventListener("change", function(event) {
                if (parent.selectedObject) {
                    console.log(event.target.id, ":", event.target.value);
                    parent.selectedObject[event.target.id] = event.target.value;
                }
            });
        }

        this.selectedObject = null;
        this.draggedObject = null;
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

    resumePhysics() {
        this.lastTick = performance.now();
    }

    pausePhysics() {
        this.lastTick = 1e100;
    }

    spawnObject(objName) {
        switch (objName) {
            case "body-of-water":
                const newWater = new StaticCircle(0, 0, 1, this.waterCircle);
                this.bodiesOfWater.push(newWater);

                this.properties.forEach(prop => prop.disabled = true);
                for (const prop of ["x", "y", "size"]) {
                    this.properties.get(prop).disabled = false;
                    this.properties.get(prop).value = newWater[prop];
                }
        
                this.selectedObject = newWater;
                this.draggedObject = {obj: newWater, xOff: 0, yOff: 0};
            break;

            case "polygon-obstacle":
                //TODO
            break;

            default:
                console.log("unrecognized object:", objName);
            return;
        }
    }

    pointerDownWithEditorOpened(worldX, worldY) {
        const cursor = {x: worldX, y: worldY, r: 0};

        //grab the newest body of water, not the oldest
        for (let i = this.bodiesOfWater.length - 1; i >= 0; --i) {
            const body = this.bodiesOfWater[i];
            if (body.isColliding(cursor)) {
                this.selectedObject = body;

                this.properties.forEach(prop => prop.disabled = true);
                for (const prop of ["x", "y", "size"]) {
                    this.properties.get(prop).disabled = false;
                    this.properties.get(prop).value = body[prop];
                }

                this.selectedObject = body;
                this.draggedObject = {obj: body, xOff: body.x - worldX, yOff: body.y - worldY};
                return;
            }
        }
    }

    pointerMovedWithEditorOpened(worldX, worldY) {
        if (this.draggedObject) {
            const {obj, xOff, yOff} = this.draggedObject;

            obj.x = worldX + xOff;
            obj.y = worldY + yOff;
            for (const prop of ["x", "y"]) {
                this.properties.get(prop).value = obj[prop];
            }
        }
    }

    pointerUpWithEditorOpened() {
        this.draggedObject = null;
    }

    wheelScrolledWithEditorOpened(deltaY) {
        if (this.draggedObject) {
            const {obj} = this.draggedObject;

            obj.size = Math.max(obj.size + (deltaY < 0 ? 1 : -1), 0.125);
            this.properties.get("size").value = obj.size;
            return true;
        }

        return false;
    }
}

class PhysicsObj {
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

    tick() {
        this.prevX = this.x;
        this.prevY = this.y;
        
        debugText.textContent = `position: (${this.x.toFixed(2)}, ${this.y.toFixed(2)})\nvelocity: (${(this.vx * gameLogic.TICKS_PER_SECOND).toFixed(2)}, ${(this.vy * gameLogic.TICKS_PER_SECOND).toFixed(2)})`;

        if (!this.held) {
            const friction = 255 / 256;
            const gravity = [this.gravityX - this.x, this.gravityY - this.y];

            normalize(gravity);
            this.vx = (this.vx + gravity[0] / 64) * friction;
            this.vy = (this.vy + gravity[1] / 64) * friction;

            this.addPosition(this.vx, this.vy);

            const bodyOfWater = gameLogic.getBodyOfWater({x: this.x, y: this.y, r: 0});
            if (bodyOfWater >= 0) {
                this.vx *= 0.8;
                this.vy *= 0.8;
                const body = gameLogic.bodiesOfWater[bodyOfWater];
                this.gravityX = body.x;
                this.gravityY = body.y;
            }
        }
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    addPosition(dx, dy) {
        const steps = Math.ceil(Math.max(Math.abs(dx / this.r), Math.abs(dy / this.r)));
        const stepX = dx / steps;
        const stepY = dy / steps;

        for (let i = 0; i < steps; ++i) {
            this.x += stepX;
            this.y += stepY;

            const collisionData = this.getCollisionData();
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

class StaticCircle {
    constructor(x = 0, y = 0, radius, model) {
        this.x = x;
        this.y = y;
        this.size = radius;
        this.model = model;
    }

    isColliding(circle) {
        const dX = circle.x - this.x
        const dY = circle.y - this.y;

        return dX**2 + dY**2 < (circle.r + this.size)**2;
    }
    
    get scale() {
      return [this.size * 2, this.size * 2];
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
        this.size = scale;
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