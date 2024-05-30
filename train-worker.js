// train-worker.js

importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.12.0/dist/tf.min.js');

async function trainModel(userInputs, movieInputs, outputs, numUsers, numMovies, statusCallback, progressBarCallback) {
    
    // Preparar los datos de entrenamiento
    const userTensor = tf.tensor2d(userInputs, [userInputs.length, 1]);
    const movieTensor = tf.tensor2d(movieInputs, [movieInputs.length, 1]);
    const ratingsTensor = tf.tensor1d(outputs);
    
    // Crear el modelo de factorización de matrices
    const userInput = tf.input({shape: [1], name: 'userInput'});
    const movieInput = tf.input({shape: [1], name: 'movieInput'});

    const userEmbeddingLayer = tf.layers.embedding({inputDim: numUsers, outputDim: 2, inputLength: 1});
    const movieEmbeddingLayer = tf.layers.embedding({inputDim: numMovies, outputDim: 2, inputLength: 1});

    const userEmbedding = userEmbeddingLayer.apply(userInput);
    const movieEmbedding = movieEmbeddingLayer.apply(movieInput);

    const userVector = tf.layers.flatten().apply(userEmbedding);
    const movieVector = tf.layers.flatten().apply(movieEmbedding);

    // Añadir bias a las embeddings
    const userBias = tf.layers.embedding({inputDim: numUsers, outputDim: 1, inputLength: 1}).apply(userInput);
    const movieBias = tf.layers.embedding({inputDim: numMovies, outputDim: 1, inputLength: 1}).apply(movieInput);

    const userBiasVector = tf.layers.flatten().apply(userBias);
    const movieBiasVector = tf.layers.flatten().apply(movieBias);

    // Calcular el dot product y añadir bias
    const dotProduct = tf.layers.dot({axes: -1}).apply([userVector, movieVector]);

    // Sumar los biases
    const addBias = dotProduct // tf.layers.add().apply([dotProduct, userBiasVector, movieBiasVector]);

    const scaledOutput = tf.layers.activation({activation: 'relu'}).apply(addBias);

    const model = tf.model({
        inputs: [userInput, movieInput],
        outputs: scaledOutput
    });

    model.compile({
        optimizer: tf.train.adam(0.0005),
        loss: 'meanSquaredError'
    });

    // Entrenar el modelo
    const epochs = 100;
    const batchSize = 128;
    const totalBatches = Math.ceil(userInputs.length / batchSize) * epochs;

    let batchCount = 0;
    let epochCount = 0;
    let last_loss = null;

    await model.fit([userTensor, movieTensor], ratingsTensor, {
        epochs: epochs,
        batchSize: batchSize,
        callbacks: {
            onBatchEnd: async (batch, logs) => {
                batchCount++;
                const progress = (batchCount / totalBatches) * 100;
                progressBarCallback(progress);
                if(last_loss == null){ last_loss = logs.loss.toFixed(4) }
                statusCallback(`Batch ${batch + 1}, Epoch ${epochCount + 1}: loss = ${last_loss}`);
            },
            onEpochEnd: async (epoch, logs) => { 
                epochCount++;
                last_loss = logs.loss.toFixed(4)
                const userEmbeddings = await userEmbeddingLayer.getWeights()[0].array();
                const movieEmbeddings = await movieEmbeddingLayer.getWeights()[0].array();
                self.postMessage({ type: 'plot', userEmbeddings, movieEmbeddings});
            },
            onTrainEnd: () => {
                statusCallback('Training completed!');
                progressBarCallback(100);
            }
        }
    });
}

self.addEventListener('message', async (event) => {
    const { userInputs, movieInputs, outputs, numUsers, numMovies } = event.data;
    await trainModel(userInputs, movieInputs, outputs, numUsers, numMovies, (status) => {
        self.postMessage({ type: 'status', status });
    }, (progress) => {
        self.postMessage({ type: 'progress', progress });
    });
});
