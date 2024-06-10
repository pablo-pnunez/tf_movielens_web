importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js');

async function trainModel(trainData, valData, numUsers, numMovies, newUserIndex, statusCallback, progressBarCallback) {
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

    const userEmbeddingLayer = tf.layers.embedding({ inputDim: numUsers, outputDim: 2, inputLength: 1});
    const movieEmbeddingLayer = tf.layers.embedding({ inputDim: numMovies, outputDim: 2, inputLength: 1 });

    const userEmbedding = userEmbeddingLayer.apply(userInput);
    const betterMovieEmbedding = movieEmbeddingLayer.apply(betterMovieInput);
    const worseMovieEmbedding = movieEmbeddingLayer.apply(worseMovieInput);

    const userVector = tf.layers.flatten().apply(userEmbedding);
    const betterMovieVector = tf.layers.flatten().apply(betterMovieEmbedding);
    const worseMovieVector = tf.layers.flatten().apply(worseMovieEmbedding);

    // Añadir capas de Dropout
    const dropoutRate = 0.1; // Puedes ajustar esta tasa según sea necesario
    const userVectorWithDropout = tf.layers.dropout({ rate: dropoutRate }).apply(userVector);
    const betterMovieVectorWithDropout = tf.layers.dropout({ rate: dropoutRate }).apply(betterMovieVector);
    const worseMovieVectorWithDropout = tf.layers.dropout({ rate: dropoutRate }).apply(worseMovieVector);

    // Calcular el producto escalar
    const betterDotProduct = tf.layers.dot({ axes: -1 }).apply([userVectorWithDropout, betterMovieVectorWithDropout]);
    const worseDotProduct = tf.layers.dot({ axes: -1 }).apply([userVectorWithDropout, worseMovieVectorWithDropout]);

    // Simulación de la resta y cálculo del margen
    const minus_worse = tf.layers.multiply().apply([worseDotProduct, minusOneInput]);
    const margin_diff = tf.layers.add().apply([marginInput, minus_worse, betterDotProduct]);
    const marginLoss = tf.layers.maximum().apply([margin_diff, zeroInput]);

    let model = tf.model({
        inputs: [userInput, betterMovieInput, worseMovieInput, minusOneInput, zeroInput, marginInput],
        outputs: marginLoss
    });

    model.compile({
        optimizer: tf.train.adam(0.0001),
        loss: 'meanSquaredError'
    });

    // Entrenar el modelo
    const epochs = 100;
    const batchSize = 256;
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
                //const progress = (batchCount / totalBatches) * 100;
                //progressBarCallback(progress);
                progressBarCallback(batchCount, totalBatches, epochs);
                if (last_loss == null) { last_loss = logs.loss.toFixed(4); }
            },
            onEpochEnd: async (epoch, logs) => { 
                epochCount++;
                last_loss = logs.loss.toFixed(4);
                last_val_loss = logs.val_loss.toFixed(4);
                lossHistory.push(last_loss);
                valLossHistory.push(last_val_loss);

                // Obtener los embeddings y considerar solo los dos primeros elementos para el gráfico
                const userEmbeddings = (await userEmbeddingLayer.getWeights()[0].array()).map(embedding => embedding.slice(0, 2));
                const movieEmbeddings = (await movieEmbeddingLayer.getWeights()[0].array()).map(embedding => embedding.slice(0, 2));

                // Hacer predicciones para el nuevo usuario
                const newUserEmbedding = tf.tensor(userEmbeddings[newUserIndex]);
                const movieEmbeddingsTensor = tf.tensor(movieEmbeddings);
                const predictions = await tf.matMul(movieEmbeddingsTensor, newUserEmbedding.reshape([2, 1])).array();

                self.postMessage({ type: 'plot', lossHistory, valLossHistory, userEmbeddings, movieEmbeddings });
                self.postMessage({ type: 'predictions', predictions: predictions.flat(), newUserIndex });

                statusCallback(`(Epoch ${epochCount}) Train_loss: ${last_loss}, Val_loss: ${last_val_loss}`);
            },
            onTrainEnd: () => {
                statusCallback('Entrenamiento completado!');
                progressBarCallback(totalBatches, totalBatches, epochs);
                //progressBarCallback(100);
            }
        }
    });
}

self.addEventListener('message', async (event) => {
    const { trainData, valData, numUsers, numMovies, newUserIndex } = event.data;
    await trainModel(trainData, valData, numUsers, numMovies, newUserIndex, (status) => {
        self.postMessage({ type: 'status', status });
    }, (batchCount, totalBatches, epochs) => {
        self.postMessage({ type: 'progress', batchCount, totalBatches, epochs});
        //self.postMessage({ type: 'progress', progress });
    });
});
