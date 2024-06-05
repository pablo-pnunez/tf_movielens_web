document.addEventListener('DOMContentLoaded', async () => {
    // Comprobar si WebGL está disponible
    if (tf.ENV.get('WEBGL_VERSION') > 0) {
        console.log('WebGL is enabled');
    } else {
        console.log('WebGL is not enabled');
    }

    const statusDiv = document.getElementById('status');
    const progressBar = document.getElementsByClassName('progress-bar')[0] //.getElementById('progress-bar');
    
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

    let embeddingsPlotCreated = false;
    let lossPlotCreated = false;

    // Escuchar los mensajes del Web Worker para el entrenamiento
    trainWorker.addEventListener('message', (event) => {
        const { type, status, progress, lossHistory, userEmbeddings, movieEmbeddings } = event.data;
        if (type === 'status') {
            statusDiv.textContent = status;
        } else if (type === 'progress') {
            progressBar.value = progress;
            progressBar.style.width = `${progress}%`;
        } else if (type === 'plot') {
            if (!embeddingsPlotCreated) {
                createEmbeddingsPlot(userEmbeddings, movieEmbeddings, numUsers, numMovies);
                embeddingsPlotCreated = true;
            } else {
                updateEmbeddingsPlot(userEmbeddings, movieEmbeddings);
            }
            if (!lossPlotCreated) {
                createLossPlot(lossHistory);
                lossPlotCreated = true;
            } else {
                updateLossPlot(lossHistory);
            }
        }
    });

    // Iniciar el entrenamiento del modelo en el Web Worker
    trainWorker.postMessage({ userInputs, movieInputs, outputs, numUsers, numMovies });

    // Función para visualizar embeddings
    const createEmbeddingsPlot = async (userEmbeddings, movieEmbeddings, numUsers, numMovies) => {
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
        var layout = { 
            margin: {t:50, l:50, r:50, b:50},
            legend: { x: 1, xanchor: 'right', y: 1 }
        };

        Plotly.newPlot('emb-plot', data, layout, {responsive: true});
    };

    const updateEmbeddingsPlot = async (userEmbeddings, movieEmbeddings) => {
        const userCoords = Array.from({length: userEmbeddings.length}, (_, i) => userEmbeddings[i]);
        const movieCoords = Array.from({length: movieEmbeddings.length}, (_, i) => movieEmbeddings[i]);

        Plotly.restyle('emb-plot', 'x', [userCoords.map(coord => coord[0]), movieCoords.map(coord => coord[0])]);
        Plotly.restyle('emb-plot', 'y', [userCoords.map(coord => coord[1]), movieCoords.map(coord => coord[1])]);
    };

    const createLossPlot = (lossHistory) => {
        const trace = {
            x: lossHistory.map((_, i) => i + 1),
            y: lossHistory,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Loss',
        };

        var layout = { margin: {t:50, l:50, r:50, b:50} };
        const data = [trace];
        Plotly.newPlot('loss-plot', data, layout, {responsive: true});
    };

    const updateLossPlot = (lossHistory) => {
        Plotly.restyle('loss-plot', 'x', [lossHistory.map((_, i) => i + 1)]);
        Plotly.restyle('loss-plot', 'y', [lossHistory]);
    };


});
