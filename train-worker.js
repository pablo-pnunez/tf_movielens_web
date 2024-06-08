importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js');


async function trainModel(trainData, valData, numUsers, numMovies, statusCallback, progressBarCallback) {
    // Preparar los datos de entrenamiento
    const trainUserTensor = tf.tensor2d(trainData.u, [trainData.u.length, 1]);
    const trainBetterMovieTensor = tf.tensor2d(trainData.b, [trainData.b.length, 1]);
    const trainWorseMovieTensor = tf.tensor2d(trainData.w, [trainData.w.length, 1]);

    // Preparar los datos de validación
    const valUserTensor = tf.tensor2d(valData.u, [valData.u.length, 1]);
    const valBetterMovieTensor = tf.tensor2d(valData.b, [valData.b.length, 1]);
    const valWorseMovieTensor = tf.tensor2d(valData.w, [valData.w.length, 1]);

    // Crear el modelo de factorización de matrices
    const userInput = tf.input({ shape: [1], name: 'userInput' });
    const betterMovieInput = tf.input({ shape: [1], name: 'betterMovieInput' });
    const worseMovieInput = tf.input({ shape: [1], name: 'worseMovieInput' });

    // El puto tf no tiene permite mezclar escalares y capas, además no tiene sub para restar
    const zeroInput = tf.input({ shape: [1], name: 'zeros' });
    const minusOneInput = tf.input({ shape: [1], name: 'minusOne' });
    const marginInput = tf.input({ shape: [1], name: 'margin' });

    const userEmbeddingLayer = tf.layers.embedding({ inputDim: numUsers, outputDim: 2, inputLength: 1 });
    const movieEmbeddingLayer = tf.layers.embedding({ inputDim: numMovies, outputDim: 2, inputLength: 1 });

    const userEmbedding = userEmbeddingLayer.apply(userInput);
    const betterMovieEmbedding = movieEmbeddingLayer.apply(betterMovieInput);
    const worseMovieEmbedding = movieEmbeddingLayer.apply(worseMovieInput);

    const userVector = tf.layers.flatten().apply(userEmbedding);
    const betterMovieVector = tf.layers.flatten().apply(betterMovieEmbedding);
    const worseMovieVector = tf.layers.flatten().apply(worseMovieEmbedding);

    // Calcular el producto escalar
    const betterDotProduct = tf.layers.dot({ axes: -1 }).apply([userVector, betterMovieVector]);
    const worseDotProduct = tf.layers.dot({ axes: -1 }).apply([userVector, worseMovieVector]);

    // Crear la función de margen
    // const margin = tf.scalar(1.0);
    // const diff = tf.layers.subtract().apply([betterDotProduct, worseDotProduct]);
    // const marginLoss = tf.layers.add().apply([tf.layers.maximum().apply([tf.layers.subtract().apply([margin, diff]), tf.scalar(0)])]);

    // Simulación de la resta y cálculo del margen
    const minus_worse = tf.layers.multiply().apply([worseDotProduct, minusOneInput]);
    const margin_diff = tf.layers.add().apply([marginInput, minus_worse, betterDotProduct]);
    const marginLoss = tf.layers.maximum().apply([margin_diff, zeroInput]);

    const model = tf.model({
        inputs: [userInput, betterMovieInput, worseMovieInput, minusOneInput, zeroInput, marginInput],
        outputs: marginLoss
    });

    model.compile({
        optimizer: tf.train.adam(0.0005),
        loss: 'meanSquaredError'
    });

    // Entrenar el modelo
    const epochs = 10;
    const batchSize = 1024;
    const totalBatches = Math.ceil(trainData.u.length / batchSize) * epochs;

    let batchCount = 0;
    let epochCount = 0;
    let last_loss = null;
    let last_val_loss = null;
    const lossHistory = [];
    const valLossHistory = [];

    // Crear tensores para las entradas auxiliares
    const trainMinusOneTensor = tf.fill([trainData.u.length, 1], -1);
    const trainZeroTensor = tf.zeros([trainData.u.length, 1]);
    const trainMarginTensor = tf.fill([trainData.u.length, 1], 1.0); // Margen de 1.0

    const valMinusOneTensor = tf.fill([valData.u.length, 1], -1);
    const valZeroTensor = tf.zeros([valData.u.length, 1]);
    const valMarginTensor = tf.fill([valData.u.length, 1], 1.0); // Margen de 1.0


    await model.fit([trainUserTensor, trainBetterMovieTensor, trainWorseMovieTensor, trainMinusOneTensor, trainZeroTensor, trainMarginTensor], tf.zeros([trainData.u.length]), {
        epochs: epochs,
        batchSize: batchSize,
        validationData: [[valUserTensor, valBetterMovieTensor, valWorseMovieTensor, valMinusOneTensor, valZeroTensor, valMarginTensor], tf.zeros([valData.u.length])],
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

                statusCallback(`(Epoch ${epochCount}) Train_loss: ${last_loss}, Val_loss: ${last_val_loss}`);
            },
            onTrainEnd: () => {
                statusCallback('Entrenamiento completado!');
                progressBarCallback(100);
            }
        }
    });
}

self.addEventListener('message', async (event) => {
    const { trainData, valData, numUsers, numMovies } = event.data;
    await trainModel(trainData, valData, numUsers, numMovies, (status) => {
        self.postMessage({ type: 'status', status });
    }, (progress) => {
        self.postMessage({ type: 'progress', progress });
    });
});
