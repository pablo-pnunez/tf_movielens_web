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

    // Crear un nuevo Web Worker para el entrenamiento del modelo
    const trainWorker = new Worker('train-worker.js');

    // Escuchar los mensajes del Web Worker para el entrenamiento
    trainWorker.addEventListener('message', (event) => {
        const { type, status, progress } = event.data;
        if (type === 'status') {
            statusDiv.textContent = status;
        } else if (type === 'progress') {
            progressBar.value = progress;
        } else if (type === 'plot') {
            const { userEmbeddings, movieEmbeddings } = event.data;
            plotEmbeddings(userEmbeddings, movieEmbeddings, numUsers, numMovies);
        }
    });

    // Iniciar el entrenamiento del modelo en el Web Worker
    trainWorker.postMessage({ userInputs, movieInputs, outputs, numUsers, numMovies });

    // Función para visualizar embeddings
    const plotEmbeddings = async (userEmbeddings, movieEmbeddings, numUsers, numMovies) => {
        // const userEmbeddings = await userEmbeddingLayer.getWeights()[0].array();
        // const movieEmbeddings = await movieEmbeddingLayer.getWeights()[0].array();

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


});
