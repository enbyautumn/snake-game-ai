export class Brain {
    constructor(layerConfig = [3, 3]) {
        this.layerConfig = layerConfig;
        this.brain = [];
        // for each layer, skipping the input layer
        let prevNodeCount = layerConfig[0];
        for (let i = 1; i < layerConfig.length; i++) {
            let layer = [];
            // for each node in the layer
            for (let j = 0; j < layerConfig[i]; j++) {
                let weights = [];
                for (let k = 0; k < prevNodeCount; k++) {
                    weights.push(Math.random() * 2 - 1);
                }
                layer.push(weights);
            }
            this.brain.push(layer);
            prevNodeCount = layerConfig[i];
        }
    }

    evaluate(inputs) {
        let prevLayerValues = inputs.map((input) => input());
        // for each layer
        for (let i = 0; i < this.brain.length; i++) {
            let newValues = [];
            // for each node
            for (let j = 0; j < this.brain[i].length; j++) {
                let sum = 0;
                // for each weight
                for (let k = 0; k < this.brain[i][j].length; k++) {
                    sum += this.brain[i][j][k] * prevLayerValues[k];
                }
                let value = Math.sigmoid(sum);
                newValues.push(value);
            }
            prevLayerValues = newValues;
        }
        // get index of max value
        let maxIndex = 0;
        let maxValue = Math.max(...prevLayerValues);
        maxIndex = prevLayerValues.indexOf(maxValue);
        return maxIndex;
    }

    mutate(amt = .1) {
        let newBrain = this.brain.map((layer) => {
            return layer.map((node) => {
                return node.map((weight) => {
                    let newWeight = weight;
                    newWeight += amt * (Math.random() * 2 - 1);
                    return newWeight;
                })
            })
        })
        this.brain = newBrain;
    }

    static haveSex(brains) {
        let newBrainArray = brains[0].brain.map((layer, i) => {
            return layer.map((node, j) => {
                return node.map((weight, k) => {
                    let newWeight = weight;
                    let randomBrain = brains[Math.floor(Math.random() * brains.length)];
                    newWeight = randomBrain.brain[i][j][k];
                    return newWeight;
                })
            })
        })
        let newBrain =  new Brain(this.layerConfig);
        newBrain.brain = newBrainArray;
        return newBrain;
    }

    static saveBrain(brain) {
        let brainString = JSON.stringify(brain.brain);
        localStorage.setItem('brain', brainString);
    }

    loadBrain() {
        let brainString = localStorage.getItem('brain');
        let brainArray = JSON.parse(brainString);
        this.brain = brainArray;
    }

}
