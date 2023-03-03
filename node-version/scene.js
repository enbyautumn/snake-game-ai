import {prng_alea} from './esm-seedrandom.js';

function rectangleSdf(x, y, rx, ry, rw, rh) {
    let dx = Math.max(Math.abs(x - rx) - (rw/2), 0);
    let dy = Math.max(Math.abs(y - ry) - (rh/2), 0);
    return Math.sqrt(dx * dx + dy * dy);
}

function circleSdf(x, y, cx, cy, r) {
    return Math.hypot(x - cx, y - cy) - r;
}

let mapRange = (value, low1, high1, low2, high2) => {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}

export class Scene {
    constructor(size) {
        // this.canvas = document.createElement('canvas');
        // this.context = this.canvas.getContext('2d');

        // this.canvas.width = size;
        // this.canvas.height = size;
        this.size = size;

        this.maxSteps = 10000;
        this.steps = 0;

        this.reward = 0;

        this.stepsSinceFood = 0;
        this.stepsSinceFoodUntilPunishment = 100;

        this.snake = new Snake(this.size / 2, this.size / 2, 0 * Math.PI * 2, 5, 70, this.size, this);
        this.goal = new Goal(100, 100, 10, this.size);

        this.onInit();
    }

    onInit() {
        // let container = document.getElementById('container');
        // container.appendChild(this.canvas);
        // this.goal.respawn();
    }

    destroy() {
        document.body.removeChild(this.canvas);
    }

    step(action) {
        this.snake.step(action);
        this.reward += .001;
        if (this.goal.isColliding(this.snake)) {
            this.reward += 1000;
            this.goal.respawn();
            this.snake.length += 5;
            this.stepsSinceFood = 0;
        }
        if (this.snake.isColliding()) {
            this.reward -= 100;
            return false;
        }
        if (this.steps >= this.maxSteps) {
            return false;
        }

        if (this.stepsSinceFood >= this.stepsSinceFoodUntilPunishment) {
            this.reward -= 10;
            this.stepsSinceFood = 0;
            // return false;
        } 
        this.stepsSinceFood++;
        this.steps++;
        this.draw();
        return true;
    }

    draw() {
        return;
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.snake.draw(this.context);
        this.goal.draw(this.context);

        // let step = 4;
        // for (let x = 0; x < this.size; x += step) {
        //     for (let y = 0; y < this.size; y += step) {
        //         let top = rectangleSdf(x, y, this.size / 2, -10, this.size, 50);
        //         let bottom = rectangleSdf(x, y, this.size / 2, this.size + 10, this.size, 50);
        //         let left = rectangleSdf(x, y, -10, this.size / 2, 50, this.size);
        //         let right = rectangleSdf(x, y, this.size + 10, this.size / 2, 50, this.size);
        //         let dist = Math.min(top, bottom, left, right);

        //         // for (let i = 0; i < this.snake.body.length - 2; i++) {
        //         //     let snakeDist = circleSdf(x, y, this.snake.body[i].x, this.snake.body[i].y, 5);
        //         //     dist = Math.min(snakeDist, dist);
        //         // }
        //         // let goalDist = circleSdf(x, y, this.goal.x, this.goal.y, this.goal.radius);
        //         // dist = Math.min(goalDist, dist);

        //         let colorString = `rgb(${dist}, ${dist > 0 ? 255 : 0}, ${dist})`
        //         this.context.fillStyle = colorString;
        //         this.context.fillRect(x, y, step, step);
        //     }
        // }
        // debugger

        // this.context.strokeStyle = 'red';
        // this.context.lineWidth = 1;
        // this.context.beginPath();
        // let headIndex = this.snake.body.length - 1;
        // this.context.lineTo(this.snake.body[headIndex].x, this.snake.body[headIndex].y);
        // let raycast = Raycast.cast(this.snake.body[headIndex].x, this.snake.body[headIndex].y, this.snake.direction, this);
        // this.context.lineTo(raycast.x, raycast.y);
        // this.context.stroke();
        // console.log(raycast)
        // debugger
    }

    reset(seed) {
        this.goal.resetSeed(seed);
        this.snake = new Snake(this.size / 2, this.size / 2, 0 * Math.PI * 2, 5, 70, this.size, this);
        this.goal.respawn();
        this.steps = 0;
        this.reward = 0;
    }
}

class Goal {
    constructor(x, y, radius, sceneSize) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.sceneSize = sceneSize;

        this.random = null;
    }

    draw(context) {
        return;
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        context.fillStyle = '#FF8170';
        context.fill();
    }

    isColliding(snake) {
        let distance = Math.sqrt(Math.pow(snake.x - this.x, 2) + Math.pow(snake.y - this.y, 2));
        return distance < this.radius + 5;
    }

    respawn() {
        this.x = this.random() * this.sceneSize;
        this.y = this.random() * this.sceneSize;
    }

    resetSeed(seed) {
        this.random = prng_alea(seed);
    }
}

class Snake {
    constructor(x, y, direction = 0, speed, length, sceneSize, scene) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.speed = speed;
        this.length = length;
        this.body = [];
        this.body.push({x: this.x, y: this.y});
        this.scene = scene;

        let eyeSpread = Math.PI;
        let eyeCount = 5;
        this.eyes = [];
        for (let i = 0; i < eyeCount; i++) {
            this.eyes.push(mapRange(i, 0, eyeCount - 1, -eyeSpread, eyeSpread));
        }
        
        // for (let i = 0; i < this.length; i++) {
        //     // this.step();
        // }
        this.sceneSize = sceneSize;

        this.eyeValues = [];
        for (let i = 0; i < this.eyes.length; i++) {
            this.eyeValues.push(0);
        }

        let goalEyeSpread = Math.PI;
        let goalEyeCount = 9;
        this.goalEyes = [];
        for (let i = 0; i < goalEyeCount; i++) {
            this.goalEyes.push(mapRange(i, 0, goalEyeCount - 1, -goalEyeSpread, goalEyeSpread));
        }

        this.goalEyeValues = [];
        for (let i = 0; i < this.goalEyes.length; i++) {
            this.goalEyeValues.push(0);
        }
        // this.updateEyes();
    }

    updateEyes() {
        this.eyeValues = [];
        for (let i = 0; i < this.eyes.length; i++) {
            let raycast = Raycast.cast(this.x, this.y, this.direction + this.eyes[i], this.scene);
            this.eyeValues.push(raycast.distance);
        }

        this.goalEyeValues = [];
        for (let i = 0; i < this.goalEyes.length; i++) {
            let raycast = Raycast.castGoal(this.x, this.y, this.direction + this.goalEyes[i], this.scene);
            this.goalEyeValues.push(raycast.distance);
        }
    }

    step(action) {
        if (action == 'left') {
            this.direction -= .1;
        }
        if (action == 'right') {
            this.direction += .1;
        }
        if (action == 'none') {
            this.direction += 0;
        }
        this.x += Math.cos(this.direction) * this.speed;
        this.y += Math.sin(this.direction) * this.speed;
        this.body.push({x: this.x, y: this.y});
        if (this.body.length > this.length) {
            this.body.shift();
        }
        this.updateEyes();
    }

    draw(ctx) {
        return;
        ctx.strokeStyle = '#191919';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        for (let i = 0; i < this.body.length; i++) {
            ctx.beginPath();
            ctx.arc(this.body[i].x, this.body[i].y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = '#191919';
            ctx.fill();
            // ctx.lineTo(this.body[i].x, this.body[i].y);
        }
        // ctx.stroke();
    }

    isColliding() {
        if (this.x < 0 || this.x > this.sceneSize || this.y < 0 || this.y > this.sceneSize) {
            // this.x = this.x % this.sceneSize;
            // this.y = this.y % this.sceneSize;
            return true;
        }
        for (let i = 0; i < this.body.length - 2; i++) {
            let distance = Math.hypot(this.x - this.body[i].x, this.y - this.body[i].y);
            if (distance < 5) {
                return true;
            }
        }
        return false;
    }
}

class Raycast {
    static cast(x, y, angle, scene) {
        // raymarch the scene to raycast the things
        let steps = 0;
        let pos = {x: x, y: y};
        let distance = 0;
        let maxSteps = 10;
        let maxDistance = 1000;
        let minDistance = 1;
        while (steps < maxSteps && distance < maxDistance) {
            let top = rectangleSdf(pos.x, pos.y, scene.size / 2, -10, scene.size, 20);
            let bottom = rectangleSdf(pos.x, pos.y, scene.size / 2, scene.size + 10, scene.size, 20);
            let left = rectangleSdf(pos.x, pos.y, -10, scene.size / 2, 20, scene.size);
            let right = rectangleSdf(pos.x, pos.y, scene.size + 10, scene.size / 2, 20, scene.size);
            // console.log(top, bottom, left, right)
            let dist = Math.min(top, bottom, left, right);

            for (let i = 0; i < scene.snake.body.length - 2; i++) {
                let snakeDist = circleSdf(pos.x, pos.y, scene.snake.body[i].x, scene.snake.body[i].y, 5);
                dist = Math.min(snakeDist, dist);
            }
            // let goalDist = circleSdf(pos.x, pos.y, scene.goal.x, scene.goal.y, scene.goal.radius);
            // dist = Math.min(goalDist, dist);

            distance += dist;
            pos.x += Math.cos(angle) * dist;
            pos.y += Math.sin(angle) * dist;

            if (dist < minDistance) {
                break;
            }

            // console.log(pos)
            steps++;
        }
        return {
            x: pos.x,
            y: pos.y,
            distance: Math.hypot(pos.x - x, pos.y - y)
        }
    }

    static castGoal(x, y, angle, scene) {
        let steps = 0;
        let pos = {x: x, y: y};
        let distance = 0;
        let maxSteps = 10;
        let maxDistance = 1000;
        let minDistance = 1;
        while (steps < maxSteps && distance < maxDistance) {
            // let top = rectangleSdf(pos.x, pos.y, scene.size / 2, -10, scene.size, 20);
            // let bottom = rectangleSdf(pos.x, pos.y, scene.size / 2, scene.size + 10, scene.size, 20);
            // let left = rectangleSdf(pos.x, pos.y, -10, scene.size / 2, 20, scene.size);
            // let right = rectangleSdf(pos.x, pos.y, scene.size + 10, scene.size / 2, 20, scene.size);
            // // console.log(top, bottom, left, right)
            // let dist = Math.min(top, bottom, left, right);

            // for (let i = 0; i < scene.snake.body.length - 2; i++) {
            //     let snakeDist = circleSdf(pos.x, pos.y, scene.snake.body[i].x, scene.snake.body[i].y, 5);
            //     dist = Math.min(snakeDist, dist);
            // }
            let dist = circleSdf(pos.x, pos.y, scene.goal.x, scene.goal.y, scene.goal.radius * 2);

            distance += dist;
            pos.x += Math.cos(angle) * dist;
            pos.y += Math.sin(angle) * dist;

            if (dist < minDistance) {
                break;
            }

            // console.log(pos)
            steps++;
        }
        return {
            x: pos.x,
            y: pos.y,
            distance: Math.hypot(pos.x - x, pos.y - y)
        }
    }
}