class GameLogic {
    constructor() {
        this.player = new PhysicsObj(0, 1, 1/32);

        this.lastTick = -1;
        this.millisecondsPerTick = 20;
    }

    tick() {
        this.player.tick();
    }

    performTicks(timestamp) {
        this.lastTick = Math.max(this.lastTick, timestamp - 100);

        while (this.lastTick + this.millisecondsPerTick < timestamp) {
            this.tick();
            this.lastTick += this.millisecondsPerTick;
        }
    }

    getX(physicsObj, timestamp) {
        return physicsObj.prevX + (physicsObj.x - physicsObj.prevX) * (timestamp - this.lastTick) / this.millisecondsPerTick;
    }

    getY(physicsObj, timestamp) {
        return physicsObj.prevY + (physicsObj.y - physicsObj.prevY) * (timestamp - this.lastTick) / this.millisecondsPerTick;
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

        debugText.textContent = `position: (${this.x.toFixed(2)}, ${this.y.toFixed(2)})\nvelocity: (${this.vx.toFixed(2)}, ${this.vy.toFixed(2)})`;

        if (!this.held) {
            //this.vy -= 0.002;
            this.x += this.vx;
            this.y += this.vy;
    
            // if (this.y < this.r) {
            //     this.vx *= 0.9;
            //     this.vy = -this.vy * 0.9;
            //     this.y = this.r;
            // }

            // if (this.x < -1 + this.r) {
            //     this.vy *= 0.9;
            //     this.vx = -this.vx * 0.9;
            //     this.x = -1 + this.r;
            // }

            // if (this.x > 1 - this.r) {
            //     this.vy *= 0.9;
            //     this.vx = -this.vx * 0.9;
            //     this.x = 1 - this.r;
            // }
        }
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    setVelocity(vx, vy) {
        this.vx = vx * gameLogic.millisecondsPerTick / 1000;
        this.vy = vy * gameLogic.millisecondsPerTick / 1000;
    }

    setAngle(angle) {
        this.angle = angle;
    }
}