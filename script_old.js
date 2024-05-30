document.addEventListener('DOMContentLoaded', async () => {
    // Comprobar si WebGL está disponible
    if (tf.ENV.get('WEBGL_VERSION') > 0) {
        console.log('WebGL is enabled');
    } else {
        console.log('WebGL is not enabled');
    }

    const statusDiv = document.getElementById('status');
    const progressBar = document.getElementById('progress-bar');
    
    // Cargar los datos
    const response = await fetch('ratings.json');
    const ratings = await response.json();
    
    // Preparar los datos
    const userIds = [...new Set(ratings.map(r => r.userId))];
    const movieIds = [...new Set(ratings.map(r => r.movieId))];
    
    const numUsers = userIds.length;
    const numMovies = movieIds.length;

    const userIdToIndex = Object.fromEntries(userIds.map((id, index) => [id, index]));
    const movieIdToIndex = Object.fromEntries(movieIds.map((id, index) => [id, index]));

    const userInputs = ratings.map(r => userIdToIndex[r.userId]);
    const movieInputs = ratings.map(r => movieIdToIndex[r.movieId]);

    const outputs = ratings.map(r => r.rating);

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
    const addBias = tf.layers.add().apply([dotProduct, userBiasVector, movieBiasVector]);

    const scaledOutput = tf.layers.activation({activation: 'relu'}).apply(addBias);

    // Añadir una sigmoide multiplicada por 5 a la salida
    // const output = tf.layers.activation({activation: 'sigmoid'}).apply(addBias);
    // const scaledOutput = tf.layers.multiply({scalars: [5]}).apply(output);

    const model = tf.model({
        inputs: [userInput, movieInput],
        outputs: scaledOutput
    });

    model.compile({
        optimizer: tf.train.adam(0.0001),
        loss: 'meanSquaredError'
    });

    // Preparar los datos de entrenamiento
    const userTensor = tf.tensor2d(userInputs, [userInputs.length, 1]);
    const movieTensor = tf.tensor2d(movieInputs, [movieInputs.length, 1]);
    const ratingsTensor = tf.tensor1d(outputs);

    // Función para visualizar embeddings
    const plotEmbeddings = async () => {
        const userEmbeddings = await userEmbeddingLayer.getWeights()[0].array();
        const movieEmbeddings = await movieEmbeddingLayer.getWeights()[0].array();

        const userCoords = Array.from({length: numUsers}, (_, i) => userEmbeddings[i]);
        const movieCoords = Array.from({length: numMovies}, (_, i) => movieEmbeddings[i]);

        const userTrace = {
            x: userCoords.map(coord => coord[0]),
            y: userCoords.map(coord => coord[1]),
            mode: 'markers',
            type: 'scatter',
            name: 'Users',
            marker: { color: 'blue' }
        };

        const movieTrace = {
            x: movieCoords.map(coord => coord[0]),
            y: movieCoords.map(coord => coord[1]),
            mode: 'markers',
            type: 'scatter',
            name: 'Movies',
            marker: { color: 'red' }
        };

        const data = [userTrace, movieTrace];

        Plotly.newPlot('plot', data);
    };

    // Número de épocas y tamaño de batch
    const epochs = 100;
    const batchSize = 256;
    const totalBatches = Math.ceil(userInputs.length / batchSize) * epochs;

    let batchCount = 0;

    // Entrenar el modelo y visualizar embeddings
    await model.fit([userTensor, movieTensor], ratingsTensor, {
        epochs: epochs,
        batchSize: batchSize,
        callbacks: {
            onBatchEnd: async (batch, logs) => {
                batchCount++;
                const progress = (batchCount / totalBatches) * 100;
                progressBar.value = progress;
                statusDiv.textContent = `Batch ${batch + 1}, Epoch ${Math.floor(batch / Math.ceil(userInputs.length / batchSize)) + 1}: loss = ${logs.loss.toFixed(4)}`;
            },
            onEpochEnd: async (epoch, logs) => {
                await plotEmbeddings();
            },
            onTrainEnd: () => {
                statusDiv.textContent = 'Training completed!';
                progressBar.value = 100;
            }
        }
    });
});
