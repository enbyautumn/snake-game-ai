// main.mjs
import {Scene} from './scene.js';
import {Brain} from './brain.js';

let chartCtx = document.getElementById('canvas').getContext('2d');

let chart = new Chart(chartCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            {
                label: 'Best Reward',
                data: [],
                borderWidth: 1
            },
            {
                label: 'Average Reward',
                data: [],
                borderWidth: 1
            }
        ],
    },
    options: {
        animation: false
    }
});

Math.sigmoid = (x) => 1 / (1 + Math.exp(-x))

let sceneCount = 64;
let scenes = [];
let brains = [];
for (let i = 0; i < sceneCount; i++) {
    scenes.push(new Scene(1000));
    brains.push(new Brain([19, 25, 30, 40, 30, 20, 15, 8, 3]));
}

let seed = Math.random().toString();
scenes.forEach((scene) => {
    scene.reset(seed);
})

let stepBatchSize = 0;
let stepBatchStepSize = 100;
let maxStepBatchSize = 1000;

function runAllUntilDone(scenes) {
    return new Promise((resolve) => {
        let scenesRunning = scenes.map((scene, i) => {
            return {
                scene,
                done: false,
                brain: brains[i],
            };
        })

        let step = (i) => {
            if (i == undefined) {
                i = stepBatchSize;
            }
            scenesRunning.forEach((sceneRunning) => {
                if (!sceneRunning.done) {
                    let inputs = [
                        () => sceneRunning.scene.snake.x / sceneRunning.scene.size,
                        () => sceneRunning.scene.snake.y / sceneRunning.scene.size,
                        () => sceneRunning.scene.snake.direction,
                        () => sceneRunning.scene.goal.x / sceneRunning.scene.size,
                        () => sceneRunning.scene.goal.y / sceneRunning.scene.size,
                        () => sceneRunning.scene.snake.eyeValues[0],
                        () => sceneRunning.scene.snake.eyeValues[1],
                        () => sceneRunning.scene.snake.eyeValues[2],
                        () => sceneRunning.scene.snake.eyeValues[3],
                        () => sceneRunning.scene.snake.eyeValues[4],
                        () => sceneRunning.scene.snake.goalEyeValues[0],
                        () => sceneRunning.scene.snake.goalEyeValues[1],
                        () => sceneRunning.scene.snake.goalEyeValues[2],
                        () => sceneRunning.scene.snake.goalEyeValues[3],
                        () => sceneRunning.scene.snake.goalEyeValues[4],
                        () => sceneRunning.scene.snake.goalEyeValues[5],
                        () => sceneRunning.scene.snake.goalEyeValues[6],
                        () => sceneRunning.scene.snake.goalEyeValues[7],
                        () => sceneRunning.scene.snake.goalEyeValues[8],
                    ]
                    let maxOutput = sceneRunning.brain.evaluate(inputs);
                    let actions = ['left', 'right', 'none'];
                    let action = actions[maxOutput];
                    // let action = actions[Math.floor(Math.random() * 2)];
                    sceneRunning.done = !sceneRunning.scene.step(action);
                }
            });
            if (scenesRunning.some((sceneRunning) => !sceneRunning.done)) {
                if (i > 0) {
                    step(i - 1);
                } else {
                    setTimeout(step, 0);
                }
                // setTimeout(step, 0);
                // requestAnimationFrame(step);
            } else {
                resolve(scenesRunning.map((sceneRunning) => sceneRunning.scene.reward));
            }
        }

        setTimeout(step, 0);
    })
}


document.addEventListener('keydown', (e) => {
    if (e.key == ' ') {
        stepBatchSize += stepBatchStepSize;
        if (stepBatchSize > maxStepBatchSize) {
            stepBatchSize = 0;
        }
    }

    if (e.key == 'r') {
        stepBatchSize = 0;
    }

    // console.log('Space pressed', stepBatchSize)
})

// load brain

function saveGeneration(generation) {
    localStorage.setItem('generation', generation);
}

function loadGeneration() {
    return parseInt(localStorage.getItem('generation')) || 0;
}

let generations = 100000;
let topN = 8;
let mutateAmt = .1;
let shouldLoad = prompt('Load brain?') == 'y';
let startGen = 0;
let loadFromFile = false;

if (loadFromFile) {
    let url = './brain'
    await fetch(url).then((response) => {
        return response.text();
    }).then((json) => {
        localStorage.setItem('brain', json);
    })
}
if (shouldLoad && localStorage.getItem('brain')) {
    startGen = loadGeneration();
    for (let i = 0; i < brains.length; i++) {
        brains[i].loadBrain();
    }
}

for (let i = startGen; i < generations; i++) {
    console.log('Generation:', i)
    let rewards = await runAllUntilDone(scenes);
    let best = rewards.reduce((best, reward, i) => {
        if (reward > best.reward) { 
            return {
                reward,
                index: i,
            }
        } else {
            return best;
        }
    }, {reward: -Infinity, index: 0});

    let sortedByReward = rewards.map((reward, i) => {
        return {
            reward,
            index: i,
        }
    }).sort((a, b) => b.reward - a.reward);
    let top = sortedByReward.slice(0, topN);
    let topBrains = top.map((top) => brains[top.index]);
    
    // let bestBrain = brains[best.index];
    console.log(topBrains)
    let bestBrain = Brain.haveSex(topBrains);

    let averageReward = rewards.reduce((sum, reward) => sum + reward, 0) / rewards.length;

    console.log('Best reward:', best.reward, ' Brain #: ', best.index, bestBrain.brain.slice(), ' Average reward: ', averageReward);

    chart.data.labels.push(i);
    chart.data.datasets[0].data.push(best.reward);
    chart.data.datasets[1].data.push(averageReward);
    chart.update();

    Brain.saveBrain(bestBrain);
    saveGeneration(i);

    brains = brains.map((brain) => {
        brain.brain = Brain.haveSex(topBrains).brain.slice();
        brain.mutate(mutateAmt);
        return brain;
    })

    let seed = Math.random().toString();
    scenes.forEach((scene) => {
        scene.reset(seed);
    })
}