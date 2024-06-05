document.addEventListener('DOMContentLoaded', async () => {
    let trainWorker;
    let consola = document.getElementById('console');

    // Función para la console
    const console_log = (line) => {
        consola.textContent = consola.textContent+"\n"+line;
        consola.scrollTop = consola.scrollHeight;
    };


    const btnStart = document.getElementById('btn-start');
    const btnStop = document.getElementById('btn-stop');
    
    // Comprobar si WebGL está disponible
    if (tf.ENV.get('WEBGL_VERSION') > 0) {
        console.log('WebGL is enabled');
    } else {
        console.log('WebGL is not enabled');
    }

    const statusDiv = document.getElementById('status');
    const progressBar = document.getElementsByClassName('progress-bar')[0]
    
    // Cargar los datos de entrenamiento
    console_log("Cargando los datos de entrenamiento...");
    const trainResponse = await fetch('ratings_train.json');
    const trainRatings = await trainResponse.json();

    // Cargar los datos de validación
    console_log("Cargando los datos de validación...");
    const valResponse = await fetch('ratings_val.json');
    const valRatings = await valResponse.json();

    // Habilitar los botones una vez que los datos se han cargado
    btnStart.disabled = false;

    // Preparar los datos de entrenamiento
    console_log("Preprocesando datos...");

    const trainUserIds = [...new Set(trainRatings.map(r => r.userId))];
    const trainMovieIds = [...new Set(trainRatings.map(r => r.movieId))];

    const trainUserIdToIndex = Object.fromEntries(trainUserIds.map((id, index) => [id, index]));
    const trainMovieIdToIndex = Object.fromEntries(trainMovieIds.map((id, index) => [id, index]));

    const trainUserInputs = trainRatings.map(r => trainUserIdToIndex[r.userId]);
    const trainMovieInputs = trainRatings.map(r => trainMovieIdToIndex[r.movieId]);
    const trainOutputs = trainRatings.map(r => r.rating);

    // Preparar los datos de validación
    const valUserIds = [...new Set(valRatings.map(r => r.userId))];
    const valMovieIds = [...new Set(valRatings.map(r => r.movieId))];

    const valUserIdToIndex = Object.fromEntries(valUserIds.map((id, index) => [id, index]));
    const valMovieIdToIndex = Object.fromEntries(valMovieIds.map((id, index) => [id, index]));

    const valUserInputs = valRatings.map(r => valUserIdToIndex[r.userId]);
    const valMovieInputs = valRatings.map(r => valMovieIdToIndex[r.movieId]);
    const valOutputs = valRatings.map(r => r.rating);

    const numUsers = Math.max(trainUserIds.length, valUserIds.length);
    const numMovies = Math.max(trainMovieIds.length, valMovieIds.length);

    let embeddingsPlotCreated = false;
    let lossPlotCreated = false;
    
    // Función para iniciar el entrenamiento del modelo en el Web Worker
    const startTraining = () => {
        console_log("Iniciando entrenamiento...");

        trainWorker = new Worker('train-worker.js');
        
        // Deshabilitar btn-start y habilitar btn-stop
        btnStart.disabled = true;
        btnStop.disabled = false;

        // Escuchar los mensajes del Web Worker para el entrenamiento
        trainWorker.addEventListener('message', (event) => {
            const { type, status, progress, lossHistory, valLossHistory, userEmbeddings, movieEmbeddings } = event.data;
            if (type === 'status') {
                console_log(status);
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
                    createLossPlot(lossHistory, valLossHistory);
                    lossPlotCreated = true;
                } else {
                    updateLossPlot(lossHistory, valLossHistory);
                }
            }
        });

        // Iniciar el entrenamiento del modelo en el Web Worker
        trainWorker.postMessage({ 
            trainUserInputs, trainMovieInputs, trainOutputs, 
            valUserInputs, valMovieInputs, valOutputs, 
            numUsers, numMovies 
        });
    };

    // Función para detener el entrenamiento del modelo en el Web Worker
    const stopTraining = () => {
        console_log("Entrenamiento detenido");

        if (trainWorker) {
            trainWorker.terminate();
            statusDiv.textContent = 'Training stopped';
            progressBar.value = 0;
            progressBar.style.width = '0%';
            trainWorker = null;

            // Habilitar btn-start y deshabilitar btn-stop
            btnStart.disabled = false;
            btnStop.disabled = true;
        }
    };

    // Event listeners para los botones
    btnStart.addEventListener('click', startTraining);
    btnStop.addEventListener('click', stopTraining);

    // Función para visualizar embeddings
    const createEmbeddingsPlot = async (userEmbeddings, movieEmbeddings, numUsers, numMovies) => {
        const userCoords = Array.from({ length: numUsers }, (_, i) => userEmbeddings[i]);
        const movieCoords = Array.from({ length: numMovies }, (_, i) => movieEmbeddings[i]);

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
            margin: { t: 50, l: 50, r: 50, b: 50 },
            legend: { x: 1, xanchor: 'right', y: 1 }
        };

        Plotly.newPlot('emb-plot', data, layout, { responsive: true });
    };

    const updateEmbeddingsPlot = async (userEmbeddings, movieEmbeddings) => {
        const userCoords = Array.from({ length: userEmbeddings.length }, (_, i) => userEmbeddings[i]);
        const movieCoords = Array.from({ length: movieEmbeddings.length }, (_, i) => movieEmbeddings[i]);

        Plotly.restyle('emb-plot', 'x', [userCoords.map(coord => coord[0]), movieCoords.map(coord => coord[0])]);
        Plotly.restyle('emb-plot', 'y', [userCoords.map(coord => coord[1]), movieCoords.map(coord => coord[1])]);
    };

    const createLossPlot = (lossHistory, valLossHistory) => {
        const trainTrace = {
            x: lossHistory.map((_, i) => i + 1),
            y: lossHistory,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Train Loss',
            line: { color: 'blue' }
        };

        const valTrace = {
            x: valLossHistory.map((_, i) => i + 1),
            y: valLossHistory,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Validation Loss',
            line: { color: 'red' }
        };

        var layout = {
            margin: { t: 50, l: 50, r: 50, b: 50 },
            legend: { x: 1, xanchor: 'right', y: 1 }
        };
        
        const data = [trainTrace, valTrace];
        Plotly.newPlot('loss-plot', data, layout, { responsive: true });
    };

    const updateLossPlot = (lossHistory, valLossHistory) => {
        Plotly.restyle('loss-plot', 'x', [lossHistory.map((_, i) => i + 1), valLossHistory.map((_, i) => i + 1)]);
        Plotly.restyle('loss-plot', 'y', [lossHistory, valLossHistory]);
    };

});