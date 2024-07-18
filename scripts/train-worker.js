importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js');


class MarginLayer extends tf.layers.Layer {
    constructor() { super({}); }
    // In this case, the output is like one of the inputs.
    computeOutputShape(inputShapes) { return inputShapes[0]; }
    // call() is where we do the computation.
    call(inputs, kwargs) { 
        const [input1, input2] = inputs;
        // Restar con margen
        const best_sub_worst = tf.sub(input1, input2);
        const final = tf.sub(tf.scalar(1.0), best_sub_worst);
        return final;
    }
    // Every layer needs a unique name.
    getClassName() { return 'MarginLayer'; }
}

// Función para crear el modelo
function createModel(numUsers, numMovies, config) {

    const userInput = tf.input({ shape: [1], name: 'userInput' });
    const betterMovieInput = tf.input({ shape: [1], name: 'betterMovieInput' });
    const worseMovieInput = tf.input({ shape: [1], name: 'worseMovieInput' });

    const initializer = config.reproducible ? tf.initializers.glorotUniform({ seed: 2533 }) : tf.initializers.glorotUniform();

    const userEmbeddingLayer = tf.layers.embedding({ inputDim: numUsers, outputDim: config.embeddingDim, inputLength: 1, embeddingsInitializer: initializer });
    const movieEmbeddingLayer = tf.layers.embedding({ inputDim: numMovies, outputDim: config.embeddingDim, inputLength: 1, embeddingsInitializer: initializer });

    const userEmbedding = userEmbeddingLayer.apply(userInput);
    const betterMovieEmbedding = movieEmbeddingLayer.apply(betterMovieInput);
    const worseMovieEmbedding = movieEmbeddingLayer.apply(worseMovieInput);

    const userVector = tf.layers.flatten().apply(userEmbedding);
    const betterMovieVector = tf.layers.flatten().apply(betterMovieEmbedding);
    const worseMovieVector = tf.layers.flatten().apply(worseMovieEmbedding);

    const userVectorWithDropout = tf.layers.dropout({ rate: config.dropoutRate }).apply(userVector);
    const betterMovieVectorWithDropout = tf.layers.dropout({ rate: config.dropoutRate }).apply(betterMovieVector);
    const worseMovieVectorWithDropout = tf.layers.dropout({ rate: config.dropoutRate }).apply(worseMovieVector);

    const betterDotProduct = tf.layers.dot({ axes: -1 }).apply([userVectorWithDropout, betterMovieVectorWithDropout]);
    const worseDotProduct = tf.layers.dot({ axes: -1 }).apply([userVectorWithDropout, worseMovieVectorWithDropout]);

    const marginLayer = new MarginLayer().apply([betterDotProduct, worseDotProduct])

    const model = tf.model({
        inputs: [userInput, betterMovieInput, worseMovieInput],
        outputs: marginLayer // Configurar dos salidas
    });

    function customLoss(yTrue, yPred) {
        return tf.maximum(yTrue, yPred);
      }
    
    model.compile({
        optimizer: tf.train.adam(config.learningRate),
        loss: customLoss,
    });

    return { model, userEmbeddingLayer, movieEmbeddingLayer };
}

// Función para entrenar el modelo
async function trainModel(trainData, valData, numUsers, numMovies, newUserIndex, config, statusCallback, progressBarCallback) {
    // Crear el modelo
    const { model, userEmbeddingLayer, movieEmbeddingLayer } = createModel(numUsers, numMovies, config);

    const trainUserTensor = tf.tensor2d(trainData.u, [trainData.u.length, 1]);
    const trainBetterMovieTensor = tf.tensor2d(trainData.b, [trainData.b.length, 1]);
    const trainWorseMovieTensor = tf.tensor2d(trainData.w, [trainData.w.length, 1]);

    const valUserTensor = tf.tensor2d(valData.u, [valData.u.length, 1]);
    const valBetterMovieTensor = tf.tensor2d(valData.b, [valData.b.length, 1]);
    const valWorseMovieTensor = tf.tensor2d(valData.w, [valData.w.length, 1]);

    const totalBatches = Math.ceil(trainData.u.length / config.batchSize) * config.epochs;

    let batchCount = 0;
    let epochCount = 0;
    const lossHistory = [];
    const valLossHistory = [];

    await model.fit([trainUserTensor, trainBetterMovieTensor, trainWorseMovieTensor], tf.zeros([trainData.u.length]), {
        epochs: config.epochs,
        batchSize: config.batchSize,
        shuffle: config.reproducible ? false : true, // Ensure reproducibility
        validationData: [[valUserTensor, valBetterMovieTensor, valWorseMovieTensor], tf.zeros([valData.u.length])],
        callbacks: {
            onBatchEnd: async (batch, logs) => {
                batchCount++;
                progressBarCallback(batchCount, totalBatches, config.epochs);
            },
            onEpochEnd: async (epoch, logs) => {
                epochCount++;
                lossHistory.push(logs.loss.toFixed(4));
                valLossHistory.push(logs.val_loss.toFixed(4));

                const userEmbeddings = (await userEmbeddingLayer.getWeights()[0].array()).map(embedding => embedding.slice(0, 2));
                const movieEmbeddings = (await movieEmbeddingLayer.getWeights()[0].array()).map(embedding => embedding.slice(0, 2));

                self.postMessage({ type: 'plot', lossHistory, valLossHistory, userEmbeddings, movieEmbeddings });

                // Si hay usuario nuevo
                if(newUserIndex!=null){
                    const newUserEmbedding = tf.tensor(userEmbeddings[newUserIndex]);
                    const movieEmbeddingsTensor = tf.tensor(movieEmbeddings);
                    const predictions = await tf.matMul(movieEmbeddingsTensor, newUserEmbedding.reshape([2, 1])).array();
                    self.postMessage({ type: 'predictions', predictions: predictions.flat(), newUserIndex });
                }

                statusCallback(`(Epoch ${epochCount}) Train_loss: ${logs.loss.toFixed(4)}, Val_loss: ${logs.val_loss.toFixed(4)}`);
            },
            onTrainEnd: () => {
                statusCallback('Entrenamiento completado!');
                progressBarCallback(totalBatches, totalBatches, config.epochs);
                self.postMessage({ type: 'onTrainEnd'}); // Enviar mensaje para activar botones
            }
        }
    });
}


self.addEventListener('message', async (event) => {
    const { trainData, valData, numUsers, numMovies, newUserIndex, config} = event.data;

    // Entrenar el modelo
    await trainModel(trainData, valData, numUsers, numMovies, newUserIndex, config, (status) => {
        self.postMessage({ type: 'status', status });
    }, (batchCount, totalBatches, epochs) => {
        self.postMessage({ type: 'progress', batchCount, totalBatches, epochs });
    });
});
