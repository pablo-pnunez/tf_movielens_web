document.addEventListener('DOMContentLoaded', async () => {
    let trainWorker;

    // Obtener elementos de la interfaz
    const consola = document.getElementById('console');
    const btnStart = document.getElementById('btn-start');
    const btnStop = document.getElementById('btn-stop');
    const progressBar = document.getElementsByClassName('progress-bar')[0];

    // Funciones para la consola
    let queue = [];
    let isWriting = false;
    const console_log = (line) => {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const timestamp = `[${hours}:${minutes}:${seconds}] `;
        const fullLine = "\n" + timestamp + line;
    
        queue.push(fullLine);
        processQueue();
    };

    const processQueue = () => {
        if (isWriting || queue.length === 0) return;
    
        isWriting = true;
        const line = queue.shift();
        let index = 0;
    
        const writeCharacter = () => {
            if (index < line.length) {
                consola.textContent += line.charAt(index);
                index++;
                setTimeout(writeCharacter, 5); // Ajusta el tiempo para la velocidad de escritura
            } else {
                consola.scrollTop = consola.scrollHeight;
                isWriting = false;
                processQueue(); // Procesar la siguiente línea en la cola
            }
        };
    
        writeCharacter();
    };

    // Comprobar si WebGL está disponible
    if (tf.ENV.get('WEBGL_VERSION') > 0) {
        console_log('WebGL is enabled');

    } else {
        console_log('WebGL is not enabled');
    }
    
    // Cargar los datos de entrenamiento
    console_log("Cargando los datos de entrenamiento...");
    let trainData, valData;
    try {
        const trainResponse = await fetch('data/regression/ratings_train.json');
        trainData = await trainResponse.json();
        console_log("Datos de entrenamiento cargados.");
        
        console_log("Cargando los datos de validación...");
        const valResponse = await fetch('data/regression/ratings_val.json');
        valData = await valResponse.json();
        console_log("Datos de validación cargados.");
    } catch (error) {
        console_log(`Error al cargar los datos: ${error}`);
        return;
    }

    // Habilitar los botones una vez que los datos se han cargado
    btnStart.disabled = false;

    // Preparar los datos de entrenamiento
    console_log("Preprocesando datos...");

    const processData = (data) => {
        const userInputs = data.u;
        const movieInputs = data.m;
        const outputs = data.r;
        const numUsers = Math.max(...userInputs) + 1; // Asumiendo que los IDs son consecutivos empezando desde 0
        const numMovies = Math.max(...movieInputs) + 1; // Asumiendo que los IDs son consecutivos empezando desde 0
        return { userInputs, movieInputs, outputs, numUsers, numMovies };
    };

    const trainProcessed = processData(trainData);
    const valProcessed = processData(valData);

    const numUsers = Math.max(trainProcessed.numUsers, valProcessed.numUsers);
    const numMovies = Math.max(trainProcessed.numMovies, valProcessed.numMovies);

    console_log(`#Usuarios: ${numUsers} #Peliculas: ${numMovies}`);

    let embeddingsPlotCreated = false;
    let lossPlotCreated = false;
    
    // Función para habilitar o deshabilitar los botones durante el entrenamiento
    const toggleButtons = (isTraining) => {
        btnStart.disabled = isTraining;
        btnStop.disabled = !isTraining;
    };

    // Función para iniciar el entrenamiento del modelo en el Web Worker
    const startTraining = () => {
        console_log("Iniciando entrenamiento...");

        trainWorker = new Worker('train-worker.js');
        
        // Deshabilitar/habilitar botones
        toggleButtons(true);

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
            trainData: { u: trainProcessed.userInputs, m: trainProcessed.movieInputs, r: trainProcessed.outputs },
            valData: { u: valProcessed.userInputs, m: valProcessed.movieInputs, r: valProcessed.outputs },
            numUsers, numMovies 
        });
    };

    // Función para detener el entrenamiento del modelo en el Web Worker
    const stopTraining = () => {
        console_log("Entrenamiento detenido");

        if (trainWorker) {
            trainWorker.terminate();
            progressBar.value = 0;
            progressBar.style.width = '0%';
            trainWorker = null;

            // Habilitar btn-start y deshabilitar btn-stop
            toggleButtons(false);
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
        const layout = {
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

        const layout = {
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