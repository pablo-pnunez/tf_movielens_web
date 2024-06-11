import {console_log} from './scripts/console.js';
import { addMoviesToTable, addUserRatingsToTrainingData, updatePredictions } from './scripts/table.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Poner los tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
    
    let trainWorker;

    // Obtener elementos de la interfaz
    const consola = document.getElementById('console');
    const epoch_progressBar = document.getElementById('epoch-pgb');
    const batch_progressBar = document.getElementById('batch-pgb');

    const randomSeed = document.getElementById('random-seed');
    const embSize = document.getElementById('emb-size');
    const regularizer = document.getElementById('regularizer');
    const nEpochs = document.getElementById('n-epochs');
    const batchSize = document.getElementById('batch-size');
    const learningRate = document.getElementById('learning-rate');

    const btnStart = document.getElementById('btn-start');
    const btnStop = document.getElementById('btn-stop');
    const btnReset = document.getElementById('btn-reset');

    // Comprobar si WebGL está disponible
    if (tf.ENV.get('WEBGL_VERSION') > 0) {
        console_log('WebGL is enabled');
    } else {
        console_log('WebGL is not enabled');
    }

    // Cargar los datos de entrenamiento
    console_log("Cargando los datos de entrenamiento...");
    let trainData, valData, numUsers, numMovies, movies, infoData, userData;
    try {
        const trainResponse = await fetch('data/ranking/train.json');
        trainData = await trainResponse.json();

        console_log("Cargando los datos de validación...");
        const valResponse = await fetch('data/ranking/test.json');
        valData = await valResponse.json();

        console_log("Cargando información del dataset...");

        const movieResponse = await fetch('data/ranking/movies.json');
        movies = await movieResponse.json();

        const infoResponse = await fetch('data/ranking/info.json');
        infoData = await infoResponse.json();
        numUsers = infoData.numUsers[0];
        numMovies = infoData.numItems[0];

        const userResponse = await fetch('data/ranking/user.json');
        userData = await userResponse.json();

        console_log("Datos cargados.");

    } catch (error) {
        console_log(`Error al cargar los datos: ${error}`);
        return;
    }

    // Habilitar los botones una vez que los datos se han cargado
    btnStart.disabled = false;

    // Rellenar la tabla
    addMoviesToTable(movies, userData);

    // Crear datatables
    const table = new DataTable('#new-user-table', {
        columnDefs: [{ orderable: false, targets: 1 }],
        dom: 'frtp',
        pagingType: 'simple_numbers',
        responsive: true,
        language: {
            url: 'es-ES.json',
        },
    });

    // Info
    console_log(`#Usuarios: ${numUsers} #Peliculas: ${numMovies}`);

    let embeddingsPlotCreated = false;
    let lossPlotCreated = false;

    // Función para habilitar o deshabilitar los botones durante el entrenamiento
    const toggleButtons = (isTraining) => {
        btnStart.disabled = isTraining;
        btnStop.disabled = !isTraining;
        btnReset.disabled = isTraining;

        randomSeed.disabled = isTraining;
        embSize.disabled = isTraining;
        regularizer.disabled = isTraining;
        nEpochs.disabled = isTraining;
        batchSize.disabled = isTraining;
        learningRate.disabled = isTraining;
    };

    // Función para iniciar el entrenamiento del modelo en el Web Worker
    const startTraining = () => {
        console_log("Iniciando entrenamiento...");

        // cambiar los nombres de las columnas

        // Recuperar las valoraciones del usuario desde la tabla y añadirlas al conjunto
        const { trainProcessed, newUserIndex } = addUserRatingsToTrainingData(numUsers, trainData)

        //Si hay valoraciones del usuario nuevo, tenemos un usuario más
        if (newUserIndex !== null) { numUsers+=1;};

        // Crear el worker con el modelo
        trainWorker = new Worker('train-worker.js');

        // Deshabilitar/habilitar botones
        toggleButtons(true);

        // Escuchar los mensajes del Web Worker para el entrenamiento
        trainWorker.addEventListener('message', (event) => {
            const { type, status, batchCount, totalBatches, epochs, lossHistory, valLossHistory, userEmbeddings, movieEmbeddings, predictions } = event.data;
            if (type === 'status') {
                console_log(status);
            } else if (type === 'progress') {
                const train_progress = (batchCount / totalBatches) * 100;
                const batches_epoch = (totalBatches / epochs)
                const epoch_progress = ((batchCount % batches_epoch) / batches_epoch) * 100;

                epoch_progressBar.value = train_progress;
                epoch_progressBar.style.width = `${train_progress}%`;

                batch_progressBar.value = epoch_progress;
                batch_progressBar.style.width = `${epoch_progress}%`;

            } else if (type === 'plot') {
                if (!embeddingsPlotCreated) {
                    createEmbeddingsPlot(userEmbeddings, movieEmbeddings, numUsers, numMovies, newUserIndex);
                    embeddingsPlotCreated = true;
                } else {
                    updateEmbeddingsPlot(userEmbeddings, movieEmbeddings, newUserIndex);
                }
                if (!lossPlotCreated) {
                    createLossPlot(lossHistory, valLossHistory);
                    lossPlotCreated = true;
                } else {
                    updateLossPlot(lossHistory, valLossHistory);
                }
            }else if (type === 'predictions') {
                updatePredictions(predictions);
            }
        });

        // Iniciar el entrenamiento del modelo en el Web Worker
        trainWorker.postMessage({ 
            trainData: { u: trainProcessed.u, b: trainProcessed.b, w: trainProcessed.w },
            valData: { u: valData.u, b: valData.b, w: valData.w },
            numUsers, numMovies, newUserIndex
        });
    };

    // Función para detener el entrenamiento del modelo en el Web Worker
    const stopTraining = () => {
        console_log("Entrenamiento detenido");

        if (trainWorker) {
            trainWorker.terminate();
            batch_progressBar.value = 0;
            batch_progressBar.style.width = '0%';

            epoch_progressBar.value = 0;
            epoch_progressBar.style.width = '0%';

            trainWorker = null;

            // Habilitar btn-start y deshabilitar btn-stop
            toggleButtons(false);
        }
    };

    // Event listeners para los botones
    btnStart.addEventListener('click', startTraining);
    btnStop.addEventListener('click', stopTraining);

    // Función para visualizar embeddings
    const createEmbeddingsPlot = async (userEmbeddings, movieEmbeddings, numUsers, numMovies, newUserIndex = null) => {
        const userCoords = Array.from({ length: numUsers }, (_, i) => userEmbeddings[i]);
        const movieCoords = Array.from({ length: numMovies }, (_, i) => movieEmbeddings[i]);

        const userTrace = { x: userCoords.map(coord => coord[0]), y: userCoords.map(coord => coord[1]), mode: 'markers', type: 'scatter', name: 'Users', marker: { color: '#03a9f4' } };

        const movieTrace = { x: movieCoords.map(coord => coord[0]), y: movieCoords.map(coord => coord[1]), text: movies.Title, hoverinfo: 'text', mode: 'markers', type: 'scatter', name: 'Movies', marker: { symbol: 'square', color: '#f44336' } };

        const data = [userTrace, movieTrace];
        
        // Si se ha añadido un usuario nuevo
        if (newUserIndex !== null) {
            const newUserTrace = { x: [userCoords[newUserIndex][0]], y: [userCoords[newUserIndex][1]], mode: 'markers', type: 'scatter', name: 'New User', marker: { color: '#ff9800' } };
            data.push(newUserTrace);
        }

        const layout = {
            margin: { t: 50, l: 50, r: 50, b: 50 },
            legend: { x: 1, xanchor: 'right', y: 1 },
            xaxis: { title: 'X' },
            yaxis: { title: 'Y' },
        };

        Plotly.newPlot('emb-plot', data, layout, { responsive: true });
    };

    const updateEmbeddingsPlot = async (userEmbeddings, movieEmbeddings, newUserIndex = null) => {
        const userCoords = Array.from({ length: userEmbeddings.length }, (_, i) => userEmbeddings[i]);
        const movieCoords = Array.from({ length: movieEmbeddings.length }, (_, i) => movieEmbeddings[i]);
    
        const data = [
            { x: userCoords.map(coord => coord[0]), y: userCoords.map(coord => coord[1]), type: 'scatter', mode: 'markers', name: 'Users', marker: { color: '#03a9f4' } },
            { x: movieCoords.map(coord => coord[0]), y: movieCoords.map(coord => coord[1]), type: 'scatter', mode: 'markers', name: 'Movies', marker: { symbol: 'square', color: '#f44336' } }
        ];
    
        if (newUserIndex !== null) {
            const newUserTrace = { x: [userCoords[newUserIndex][0]], y: [userCoords[newUserIndex][1]], type: 'scatter', mode: 'markers', name: 'New User', marker: { color: '#ff9800'} };
            data.push(newUserTrace);
        }
    
        Plotly.react('emb-plot', data, { margin: { t: 50, l: 50, r: 50, b: 50 }, legend: { x: 1, xanchor: 'right', y: 1 }, xaxis: { title: 'X' }, yaxis: { title: 'Y' } }, { responsive: true });
    };

    const createLossPlot = (lossHistory, valLossHistory) => {
        const trainTrace = {
            x: lossHistory.map((_, i) => i + 1),
            y: lossHistory,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Train Loss',
            line: { color: '#9e9e9e' }
        };

        const valTrace = {
            x: valLossHistory.map((_, i) => i + 1),
            y: valLossHistory,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Validation Loss',
            line: { color: '#4caf50' }
        };

        const layout = {
            margin: { t: 50, l: 50, r: 50, b: 50 },
            xaxis: { title: 'Epoch' },
            yaxis: { title: 'Loss' },
            legend: { x: 1, xanchor: 'right', y: 1 }
        };

        const data = [trainTrace, valTrace];
        Plotly.newPlot('loss-plot', data, layout, { responsive: true });
    };

    const updateLossPlot = (lossHistory, valLossHistory) => {
        const trainTrace = {
            x: lossHistory.map((_, i) => i + 1),
            y: lossHistory,
            mode: 'lines+markers',
            name: 'Train Loss',
            line: { color: '#9e9e9e' }
        };

        const valTrace = {
            x: valLossHistory.map((_, i) => i + 1),
            y: valLossHistory,
            mode: 'lines+markers',
            name: 'Validation Loss',
            line: { color: '#4caf50' }
        };

        const layout = {
            margin: { t: 50, l: 50, r: 50, b: 50 },
            xaxis: { title: 'Epoch' },
            yaxis: { title: 'Loss' },
            legend: { x: 1, xanchor: 'right', y: 1 }
        };

        Plotly.react('loss-plot', [trainTrace, valTrace], layout, { responsive: true });
    };
});
