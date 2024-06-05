importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.12.0/dist/tf.min.js');

async function trainModel(trainUserInputs, trainMovieInputs, trainOutputs, valUserInputs, valMovieInputs, valOutputs, numUsers, numMovies, statusCallback, progressBarCallback) {
    
    // Preparar los datos de entrenamiento
    const trainUserTensor = tf.tensor2d(trainUserInputs, [trainUserInputs.length, 1]);
    const trainMovieTensor = tf.tensor2d(trainMovieInputs, [trainMovieInputs.length, 1]);
    const trainRatingsTensor = tf.tensor1d(trainOutputs);

    // Preparar los datos de validación
    const valUserTensor = tf.tensor2d(valUserInputs, [valUserInputs.length, 1]);
    const valMovieTensor = tf.tensor2d(valMovieInputs, [valMovieInputs.length, 1]);
    const valRatingsTensor = tf.tensor1d(valOutputs);
    
    // Crear el modelo de factorización de matrices
    const userInput = tf.input({ shape: [1], name: 'userInput' });
    const movieInput = tf.input({ shape: [1], name: 'movieInput' });

    const userEmbeddingLayer = tf.layers.embedding({ inputDim: numUsers, outputDim: 2, inputLength: 1 });
    const movieEmbeddingLayer = tf.layers.embedding({ inputDim: numMovies, outputDim: 2, inputLength: 1 });

    const userEmbedding = userEmbeddingLayer.apply(userInput);
    const movieEmbedding = movieEmbeddingLayer.apply(movieInput);

    const userVector = tf.layers.flatten().apply(userEmbedding);
    const movieVector = tf.layers.flatten().apply(movieEmbedding);

    // Añadir bias a las embeddings
    const userBias = tf.layers.embedding({ inputDim: numUsers, outputDim: 1, inputLength: 1 }).apply(userInput);
    const movieBias = tf.layers.embedding({ inputDim: numMovies, outputDim: 1, inputLength: 1 }).apply(movieInput);

    const userBiasVector = tf.layers.flatten().apply(userBias);
    const movieBiasVector = tf.layers.flatten().apply(movieBias);

    // Calcular el dot product y añadir bias
    const dotProduct = tf.layers.dot({ axes: -1 }).apply([userVector, movieVector]);

    // Sumar los biases
    const addBias = tf.layers.add().apply([dotProduct, userBiasVector, movieBiasVector]);

    const scaledOutput = tf.layers.activation({ activation: 'relu' }).apply(addBias);

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
    const totalBatches = Math.ceil(trainUserInputs.length / batchSize) * epochs;

    let batchCount = 0;
    let epochCount = 0;
    let last_loss = null;
    let last_val_loss = null;
    const lossHistory = [];
    const valLossHistory = [];

    await model.fit([trainUserTensor, trainMovieTensor], trainRatingsTensor, {
        epochs: epochs,
        batchSize: batchSize,
        validationData: [[valUserTensor, valMovieTensor], valRatingsTensor],
        callbacks: {
            onBatchEnd: async (batch, logs) => {
                batchCount++;
                const progress = (batchCount / totalBatches) * 100;
                progressBarCallback(progress);
                if (last_loss == null) { last_loss = logs.loss.toFixed(4); }
            },
            onEpochEnd: async (epoch, logs) => { 
                epochCount++;
                last_loss = logs.loss.toFixed(4);
                last_val_loss = logs.val_loss.toFixed(4);
                lossHistory.push(last_loss);
                valLossHistory.push(last_val_loss);
                const userEmbeddings = await userEmbeddingLayer.getWeights()[0].array();
                const movieEmbeddings = await movieEmbeddingLayer.getWeights()[0].array();
                self.postMessage({ type: 'plot', lossHistory, valLossHistory, userEmbeddings, movieEmbeddings });

                statusCallback(`[Epoch ${epochCount}] Train_loss: ${last_loss}, Val_loss: ${last_val_loss}`);

            },
            onTrainEnd: () => {
                statusCallback('Entrenamiento completado!');
                progressBarCallback(100);
            }
        }
    });
}

self.addEventListener('message', async (event) => {
    const { trainUserInputs, trainMovieInputs, trainOutputs, valUserInputs, valMovieInputs, valOutputs, numUsers, numMovies } = event.data;
    await trainModel(trainUserInputs, trainMovieInputs, trainOutputs, valUserInputs, valMovieInputs, valOutputs, numUsers, numMovies, (status) => {
        self.postMessage({ type: 'status', status });
    }, (progress) => {
        self.postMessage({ type: 'progress', progress });
    });
});
