/** @type {HTMLCanvasElement} */
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
canvas.width = 1000;
canvas.height = 1000;
let mapRange = (value, low1, high1, low2, high2) => low2 + (high2 - low2) * (value - low1) / (high1 - low1);
let approxEqual = (a, b, epsilon = 0.0001) => Math.abs(a - b) < epsilon;

class Obstacle {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.isGoal = true;
    }

    draw() {
        ctx.fillStyle = `#FF8170`
        ctx.fillRect(this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
    }

    collidesWith(player) {
        if (Math.abs(player.x - this.x) < (this.width / 2) && Math.abs(player.y - this.y) < (this.height / 2)) {
            return true;
        }
        return false;
    }
}

class Goal {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
    }

    draw() {
        ctx.fillStyle = `#A6FF70`
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    collidesWith(player) {
        let distance = Math.hypot(player.x - this.x, player.y - this.y);
        if (distance < this.radius) {
            return true;
        }
        return false;
    }
}

function rectangleSdf(x, y, rx, ry, rw, rh) {
    let dx = Math.max(Math.abs(x - rx) - (rw/2), 0);
    let dy = Math.max(Math.abs(y - ry) - (rh/2), 0);
    return Math.sqrt(dx * dx + dy * dy);
}

class Raycast {
    static cast(position, direction, obstacles) {
        let maxSteps = 1000;
        let pos = {x: position.x, y: position.y};
        let step = 0;
        let closest = null;
        let closestDistance = Math.hypot(canvas.width, canvas.height);
        while (step < maxSteps) {
            obstacles.forEach(obstacle => {
                let distance = rectangleSdf(pos.x, pos.y, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                if (distance < closestDistance) {
                    closest = obstacle;
                    closestDistance = distance;
                }
            });
            pos.x += Math.cos(direction) * closestDistance;
            pos.y += Math.sin(direction) * closestDistance;
            step++;
        }
        return {
            hit: closest,
            distance: Math.hypot(pos.x - position.x, pos.y - position.y),
            x: pos.x,
            y: pos.y
        };
    }
}

const eyeCount = 5;
const eyeSpread = Math.PI / 2;

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.direction = -Math.PI / 2;
        this.speed = 10;
        this.eyes = [];
        for (let i = 0; i < eyeCount; i++) {
            this.eyes.push(
                mapRange(i, 0, eyeCount - 1, -eyeSpread / 2, eyeSpread / 2)
            );
        }
        this.eyeValues = [];
        for (let i = 0; i < eyeCount; i++) {
            this.eyeValues.push(0);
        }
    }

    draw() {
        ctx.fillStyle = `#191919`
        ctx.beginPath();
        ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `#191919`
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.lineTo(this.x, this.y);
        ctx.lineTo(this.x + Math.cos(this.direction) * 20, this.y + Math.sin(this.direction) * 20);
        ctx.stroke();

        ctx.strokeStyle = `red`;
        ctx.lineWidth = 1;
        this.eyes.forEach(eye => {
            let dist = Raycast.cast(this, this.direction + eye, obstacles).distance;
            ctx.beginPath();
            ctx.lineTo(this.x, this.y);
            ctx.lineTo(this.x + Math.cos(this.direction + eye) * dist, this.y + Math.sin(this.direction + eye) * dist);
            ctx.stroke();
        })
    }

    moveFoward() {
        this.x += Math.cos(this.direction) * this.speed;
        this.y += Math.sin(this.direction) * this.speed;
    }

    turnLeft() {
        this.direction -= 0.1;
    }

    turnRight() {
        this.direction += 0.1;
    }

    step(action) {
        if (action == 'left') {
            this.turnLeft();
        }
        if (action == 'right') {
            this.turnRight();
        }
        if (action == 'forward') {
            this.moveFoward();
        }
        this.eyeValues = this.getEyes();
    }

    getEyes() {
        let eyes = [];
        this.eyes.forEach(eye => {
            eyes.push(Raycast.cast(this, this.direction + eye, obstacles).distance);
        });
        return eyes;
    }
}

let player = new Player(500, 900);
let obstacles = [
    new Obstacle(500, 0, 1000, 50),
    new Obstacle(0, 500, 10, 1000),
    new Obstacle(1000, 500, 10, 1000),
    new Obstacle(500, 1000, 1000, 10),

    new Obstacle(300, 700, 600, 50),
    new Obstacle(700, 500, 600, 50),
    new Obstacle(300, 300, 600, 50),

];
let goal = new Goal(500, 100, 10);

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    player.draw();
    obstacles.forEach(obstacle => obstacle.draw());
    goal.draw();
}

draw();

Math.sigmoid = (x) => {
    return 1 / (1 + Math.exp(-x));
}

class EyeInputNode {
    constructor(player, eyeIndex) {
        this.player = player;
        this.eyeIndex = eyeIndex;
    }
    value() {
        return this.player.eyeValues[this.eyeIndex];
    }
}

class InputNode {
    constructor(fn) {
        this.fn = fn;
    }
    value() {
        return this.fn();
    }
}

class Node {
    constructor(...inputs) {
        this.inputs = inputs;
        this.weights = [];
        for (let i = 0; i < inputs.length; i++) {
            this.weights.push(Math.random() * 2 - 1);
        }
    }

    value() {
        let sum = 0;
        for (let i = 0; i < this.inputs.length; i++) {
            sum += this.inputs[i].value() * this.weights[i];
        }
        return Math.sigmoid(sum);
    }
}

let eyeInputs = [];
for (let i = 0; i < eyeCount; i++) {
    eyeInputs.push(new EyeInputNode(player, i));
}
eyeInputs.push(new InputNode(() => player.direction));
eyeInputs.push(new InputNode(() => player.x));
eyeInputs.push(new InputNode(() => player.y));
eyeInputs.push(new InputNode(() => goal.x));
eyeInputs.push(new InputNode(() => goal.y));

let brainStructure = [
    // 10+5
    10,
    15,
    10,
    3,
]

let previousLayer = eyeInputs;
brainStructure.forEach(layer => {
    let nodes = [];
    for (let i = 0; i < layer; i++) {
        nodes.push(new Node(...previousLayer));
    }
    previousLayer = nodes;
})
let output = previousLayer;

console.log(output[0].value());
console.log(output[1].value());
console.log(output[2].value());

function runUntilDone() {
    return new Promise((resolve, reject) => {
        player.x = 500;
        player.y = 960;
        player.direction = 0;
        let reward = Math.hypot(goal.y - player.y, goal.x - player.x);
        let maxSteps = 500;
        let steps = 0;
        let done = false;
        let whenDone = () => {
            let distToGoal = Math.hypot(goal.y - player.y, goal.x - player.x);
            reward -= distToGoal;
            
            let goalDirection = Math.atan2(goal.y - player.y, goal.x - player.x);
            let raycastDistance = Raycast.cast(player, goalDirection, obstacles).distance;
            if (distToGoal < raycastDistance) {
                reward += 100;
            }

            if (distToGoal < 50) {
                reward += 1000;
            }

            // reward = parseFloat(prompt("award"))
            resolve(reward);
        }
        let run = () => {
            if (!done && steps < maxSteps) {
                setTimeout(run, 0);
                // requestAnimationFrame(run);
                step();
                obstacles.forEach(obstacle => {
                    if (obstacle.collidesWith(player)) {
                        // console.log('collided with obstacle');
                        done = true;
                    }
                })
                if (player.x < 0 || player.x > canvas.width || player.y < 0 || player.y > canvas.height) {
                    // console.log('out of bounds');
                    done = true;
                }
                // let distToGoal = Math.hypot(goal.y - player.y, goal.x - player.x);
                // reward += 10;
                // reward -= 0.01;
                // if (distToGoal < 10) {
                //     done = true;
                //     reward += 100;
                // }
                steps += 1;
                // console.log(steps, reward)
            } else {
                whenDone();
            }
        }

        run();
    })
}

function step() {
    let action = null;
    // get greatest output
    let max = -Infinity;
    output.forEach((node, i) => {
        let value = node.value();
        if (value > max) {
            max = value;
            action = i;
        }
    })

    switch(action) {
        case 0:
            action = 'left';
            break;
        case 1:
            action = 'right';
            break;
        case 2:
            action = 'forward';
            break;
        case 3:
            action = 'none';
            break;
    }

    player.step(action);
    draw();
    // requestAnimationFrame(step);
}

function getBrain() {
    let weights = [];

    let each = (node) => {
        if (node.weights) {
            // node.weights.forEach((weight, i) => {
            //     node.weights[i] = weight + (.1 * (Math.random() * 2 - 1));
            // })
            weights.push(node.weights.slice());
            node.inputs.forEach(each);
        }
    }

    output.forEach(node => {
        node.inputs.forEach(each);
    })

    return weights;
}

function setBrain(weights) {
    let index = 0;
    let each = (node) => {
        if (node.weights) {
            node.weights = weights[index].slice();
            index += 1;
            node.inputs.forEach(each);
        }
    }

    output.forEach(node => {
        node.inputs.forEach(each);
    })
}

function newBrain() {
    let each = (node) => {
        if (node.weights) {
            node.weights.forEach((weight, i) => {
                node.weights[i] = Math.random() * 2 - 1;
            })
            node.inputs.forEach(each);
        }
    }

    output.forEach(node => {
        node.inputs.forEach(each);
    })
}

function mutateBrain(amt = .1) {
    let each = (node) => {
        if (node.weights) {
            node.weights.forEach((weight, i) => {
                node.weights[i] = weight + (amt * (Math.random() * 2 - 1));
            })
            node.inputs.forEach(each);
        }
    }

    output.forEach(node => {
        node.inputs.forEach(each);
    })
}

let generations = 1000;
let bestBrain = null;
let batchSize = 10;
let brains = []
for (let i = 0; i < batchSize; i++) {
    newBrain();
    brains.push(getBrain());
}

for (let i = 0; i < generations; i++) {
    let rewards = [];
    console.log('generation', i)

    for (let i = 0; i < batchSize; i++) {
        console.log('brain', i)
        setBrain(brains[i]);
        await runUntilDone().then(reward => {
            rewards.push(reward);
        });
    }
    // console.log('meow')

    let bestReward = Math.max(...rewards);
    bestBrain = brains[rewards.indexOf(bestReward)].slice();
    console.log(bestBrain)
    console.log('best reward', bestReward)
    // setBrain(bestBrain);
    brains = [];
    for (let i = 0; i < batchSize; i++) {
        // brains.push(bestBrain.slice());
        setBrain(bestBrain);
        mutateBrain(.1);
        brains.push(getBrain());
        // mutateBrain();
        // setBrain(brains[i]);
    }
}

await runUntilDone();